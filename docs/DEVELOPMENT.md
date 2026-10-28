# Development notes

Notes for working on First You. User-facing overview: [../README.md](../README.md).

## Run

```bash
npm install
npm run dev          # opens Chrome with the extension loaded (hot reload)
npm test             # unit tests (classifier, topics, policy, report, i18n)
npm run test:e2e     # E2E build + Playwright (playground, chat-site fixtures, popup, settings, report)
npm run build        # .output/chrome-mv3 → "Load unpacked" in chrome://extensions
npm run zip          # store package; runs scripts/check-release.mjs first
```

The playground (a fake chat that runs the real adapter, classifier, policy and dialog) is at
`chrome-extension://<extension-id>/playground.html`. It ships only in dev (`npm run dev`) and e2e
(`E2E=1`) builds, never in the store package.

## How it fits together

- **Content scripts** (`entrypoints/<site>.content.ts`, `document_start`) register capture-phase
  listeners on `window` for Enter and the send button of the main prompt field, before the page's own
  handlers. The decision to hold a send is synchronous, so settings, phrases and the daily counter are
  cached from `chrome.storage.local` and kept fresh with watchers.
- **Adapters** (`src/adapters`): all site knowledge lives here, as selectors; `dom.ts` is the generic,
  selector-driven implementation and only ever uses visible elements. When a site changes, the
  extension goes silent instead of breaking the chat. Updating them: [`ADAPTERS.md`](ADAPTERS.md).
- **Classifier** (`src/classifier`): strict local rules (PL/EN keyword lists, references for ongoing
  conversations, a `debug` detector for pasted errors) decide about the window. A separate loose topic
  classifier (`topic.ts`) only feeds the report's mirror and never opens a window.
- **Policy** (`src/core/policy.ts`): selected categories, pause, mutes after 3 skips, daily limit.
- **UI on chat sites** (`src/ui`): the dialog and the outcome card in closed shadow roots, so page CSS
  can't reach in and page JS can't read the user's attempt. The dialog takes key events at window
  capture level because chat sites listen to keys globally.
- **Data** (`src/db`): IndexedDB via Dexie, used only by the service worker and extension pages
  (IndexedDB in a content script would belong to the chat site's origin). Content scripts send messages.
- **Report** (`src/report`): computed live from events, any day; a Sunday 18:00 alarm only sets a badge.

## Design decisions

| Decision | Why |
| --- | --- |
| Own typed i18n dictionaries in `locales/` (manifest name via `_locales`) | `chrome.i18n` always follows the browser language; the language can be switched in settings |
| Settings, phrases and the daily counter in `chrome.storage.local` | Content scripts must decide synchronously inside `keydown` |
| No detection of the end of an answer | The outcome card appears right after sending; end-of-stream detection would need fragile, localized selectors on every site |
| Review mode is the only case that changes a prompt | Only on an explicit click, with the original kept verbatim on top; falls back to the original if the editor rejects the change |
| Nothing is classified or recorded before onboarding | The user sees what is read and clicks a button first |

## Privacy and release

- `../PRIVACY.md` / `../PRIVACY.pl.md`: the policy (also shown inside the extension at `privacy.html`).
- `STORE.md`: Chrome Web Store listing texts, privacy tab answers and permission justifications.
- `TALLY.md`: the optional anonymous-numbers form, disabled in the first release.
- `scripts/check-release.mjs`: refuses to build a store package with a placeholder left in the policy,
  or with a form URL the policy doesn't describe.

## Layout

```
entrypoints/    background, <site>.content, onboarding/, popup/, options/, report/, privacy/, playground/
src/adapters/   types.ts, dom.ts (generic), chatgpt.ts, claude.ts, gemini.ts, playground.ts, run.ts
src/classifier/ classify.ts, rules.ts, debug.ts, topic.ts, customTriggers.ts, normalize.ts, keywords.*.ts, references.*.ts
src/core/       policy.ts, firstYou.ts, reviewPrompt.ts, outcome.ts, time.ts
src/db/  src/messaging/  src/settings/  src/pages/  src/ui/  src/report/
locales/        en, pl
tests/          unit/, e2e/, fixtures/ (prompt sets, minimized chat-site DOMs)
docs/           ADAPTERS.md, capture-dom.js, DEVELOPMENT.md, STORE.md, TALLY.md, screenshots/
```
