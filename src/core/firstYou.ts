import type { SiteAdapter } from '../adapters/types';
import { classify, type ClassifyResult, type CustomTrigger } from '../classifier';
import { customTriggersItem, dailyCounterItem, settingsItem, updateSettings } from '../settings/storage';
import { DEFAULT_SETTINGS, type DailyCounter, type Settings } from '../settings/types';
import { applyDecision, gateWindow, incrementCounter, muteKey, type Decision, type GateReason } from './policy';
import { openFirstYouModal } from '../ui/mount';
import { resolveLang, translator } from '../../locales';
import { buildReviewPrompt, primaryDecision, reviewLang } from './reviewPrompt';
import { send } from '../messaging/protocol';
import type { PromptEvent } from '../db/schema';
import { topicOf } from '../classifier/topic';
import { openOutcomeCard, type CardHandle } from '../ui/card';
import { outcomeGroup } from './outcome';

export interface DebugInfo {
  result: ClassifyResult;
  ongoing: boolean | null;
  gate: { show: boolean; reason?: GateReason };
  decision?: Decision;
}

interface Cache {
  settings: Settings;
  triggers: CustomTrigger[];
  counter: DailyCounter;
}

/**
 * Wires one site adapter to the classifier, the policy and the dialog.
 * The send decision must be synchronous (inside keydown), so settings are cached and kept fresh
 * via storage watchers instead of being read per prompt.
 */
export async function startFirstYou(adapter: SiteAdapter, onDebug?: (d: DebugInfo) => void): Promise<() => void> {
  const cache: Cache = {
    settings: { ...DEFAULT_SETTINGS, ...(await settingsItem.getValue()) },
    triggers: await customTriggersItem.getValue(),
    counter: await dailyCounterItem.getValue(),
  };
  const unwatch = [
    settingsItem.watch((v) => (cache.settings = { ...DEFAULT_SETTINGS, ...v })),
    customTriggersItem.watch((v) => (cache.triggers = v ?? [])),
    dailyCounterItem.watch((v) => (cache.counter = v ?? { date: '', shown: 0 })),
  ];

  let modalOpen = false;
  let card: CardHandle | null = null;
  const closeCard = () => {
    card?.close();
    card = null;
  };

  const record = (event: Omit<PromptEvent, 'id'>, attemptText?: string) =>
    send('recordPrompt', { event, attemptText }).catch((e) => {
      console.debug('[first-you] record failed', e);
      return null;
    });

  // The outcome card steps aside as soon as the user starts typing the next prompt.
  const onTyping = (e: KeyboardEvent) => {
    if (!card || !(e.target instanceof Node)) return;
    const input = adapter.getInput();
    if (input && (input === e.target || input.contains(e.target)) && (e.key.length === 1 || e.key === 'Backspace')) {
      closeCard();
    }
  };
  window.addEventListener('keydown', onTyping, true);

  const detach = adapter.interceptSend((e) => {
    if (modalOpen) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    closeCard();
    // No processing at all before the user has seen the disclosure and clicked a button on onboarding.
    if (!cache.settings.onboardingDone) return;
    const text = adapter.getPromptText();
    if (!text.trim()) return;

    const now = Date.now();
    const ongoing = adapter.isOngoingConversation();
    const result = classify({
      text,
      hasAttachments: adapter.hasAttachments(),
      practiceCategories: cache.settings.practiceCategories,
      customTriggers: cache.triggers,
      ongoing,
    });
    const gate = gateWindow(result, cache.settings, cache.counter, now);
    onDebug?.({ result, ongoing, gate });

    const event: Omit<PromptEvent, 'id'> = {
      createdAt: now,
      site: adapter.id,
      category: result.category,
      topic: topicOf(text),
      ...(result.customTriggerId ? { customPhraseId: result.customTriggerId } : {}),
      wordCount: result.wordCount,
      inConversation: ongoing !== false,
      shownWindow: gate.show,
      decision: 'none',
    };

    if (!gate.show) {
      void record(event);
      return; // the page handles the send as usual, no delay
    }

    e.preventDefault();
    e.stopImmediatePropagation();
    modalOpen = true;
    cache.counter = incrementCounter(cache.counter, now);
    void dailyCounterItem.setValue(cache.counter);

    const uiLang = resolveLang(cache.settings.language);
    const taskType = result.taskType!;
    void openFirstYouModal({ t: translator(uiLang), taskType, primary: primaryDecision(taskType) }).then(
      async ({ decision: picked, attemptText }) => {
        modalOpen = false;
        let decision: Decision = picked;

        if (picked === 'review' && attemptText) {
          // Explicit opt-in: the original prompt stays verbatim on top, the user's version and a
          // "review, don't rewrite" request are appended.
          const reviewed = buildReviewPrompt(text, attemptText, taskType, reviewLang(text, attemptText, uiLang));
          const ok = await adapter.setPromptText(reviewed);
          if (!ok) {
            // Editor didn't accept the change: put the original back and fall back to compare mode.
            await adapter.setPromptText(text);
            decision = 'attempt';
          }
        }

        // Whatever the user picked, the AI gets the prompt right away.
        adapter.submitOriginal();
        onDebug?.({ result, ongoing, gate, decision });
        // Settings first (pause, mute): they must stick even if the user navigates away right after.
        const patch = applyDecision(cache.settings, muteKey(result), decision, Date.now());
        if (Object.keys(patch).length) await updateSettings(patch);
        const saved = await record({ ...event, decision, taskType }, attemptText);

        if (saved && (decision === 'attempt' || decision === 'review')) {
          card = openOutcomeCard({
            t: translator(uiLang),
            group: outcomeGroup(taskType),
            // In review mode the attempt is already in the conversation; show it only when comparing.
            attemptText: decision === 'attempt' ? attemptText : undefined,
            onRate: (outcome) => void send('setOutcome', { id: saved.id, outcome }).catch(() => {}),
          });
        }
      },
    );
  });

  return () => {
    detach();
    closeCard();
    window.removeEventListener('keydown', onTyping, true);
    unwatch.forEach((u) => u());
  };
}
