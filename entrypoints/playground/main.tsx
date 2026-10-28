import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import '../../src/pages/base.css';
import './style.css';
import { playgroundAdapter } from '../../src/adapters/playground';
import { startFirstYou, type DebugInfo } from '../../src/core/firstYou';
import { dailyCounterItem, settingsItem, updateSettings } from '../../src/settings/storage';
import { DEFAULT_SETTINGS, type Settings } from '../../src/settings/types';
import { resolveLang, translator } from '../../locales';

const SAMPLES = [
  'Napisz maila do szefa, że jutro biorę dzień wolnego.',
  'Ile to jest 17 razy 23?',
  'Co to jest fotosynteza?',
  'Czy powinienem uczyć się Go czy Rusta?',
  'Write an email to my landlord about the heating.',
  'podsumuj to',
  'Jak działa Kafka?',
];

type Msg = { role: 'user' | 'ai'; text: string };

function Playground() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [debug, setDebug] = useState<DebugInfo | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const t = translator(resolveLang(settings.language));

  useEffect(() => {
    void settingsItem.getValue().then((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }));
    const unwatch = settingsItem.watch((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }));
    let stop: (() => void) | undefined;
    void startFirstYou(playgroundAdapter, setDebug).then((s) => (stop = s));
    return () => {
      unwatch();
      stop?.();
    };
  }, []);

  // Plays the role of the chat site: only runs when the extension lets the send through.
  const send = () => {
    const prompt = textRef.current.trim();
    if (!prompt) return;
    setMsgs((m) => [...m, { role: 'user', text: prompt }]);
    setText('');
    setStreaming(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'ai', text: `(fake AI answer to: “${prompt.slice(0, 60)}”)` }]);
      setStreaming(false);
    }, 900);
  };

  const reset = async () => {
    await dailyCounterItem.setValue({ date: '', shown: 0 });
    await updateSettings({ pausedUntil: null, mutedCategories: {}, skipStreaks: {} });
    setMsgs([]);
    setDebug(null);
  };

  return (
    <main>
      <h1>{t('playground.title')}</h1>
      <p class="lead">{t('playground.lead')}</p>
      <p class="meta">
        practiceCategories: {settings.practiceCategories.join(', ') || '—'} · onboardingDone:{' '}
        {String(settings.onboardingDone)} · reportOnly: {String(settings.reportOnly)} ·{' '}
        <a href={browser.runtime.getURL('/onboarding.html')}>onboarding</a>
      </p>

      <div class="thread">
        {msgs.map((m, i) => (
          <div key={i} class={m.role === 'user' ? 'pg-msg-user' : 'pg-msg-ai'}>
            {m.text}
          </div>
        ))}
        {streaming && <button id="pg-stop">■</button>}
      </div>

      <div class="composer">
        <textarea
          id="pg-input"
          value={text}
          onInput={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button id="pg-send" onClick={send}>
          {t('playground.send')}
        </button>
      </div>

      <div class="row">
        {SAMPLES.map((s) => (
          <button key={s} onClick={() => setText(s)}>
            {s}
          </button>
        ))}
      </div>
      <div class="row">
        <button onClick={reset}>{t('playground.reset')}</button>
      </div>

      <pre>{debug ? JSON.stringify(debug, null, 2) : '—'}</pre>
    </main>
  );
}

render(<Playground />, document.getElementById('app')!);
