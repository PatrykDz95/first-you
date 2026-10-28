# Chrome Web Store: privacy tab and listing

Privacy policy URL: the public link to `PRIVACY.md` in the GitHub repo (Developer Dashboard → Account → Privacy policy,
and the item's Privacy tab).

## Single purpose

Before you send a prompt to an AI chat in a category you chose to practise, offers a short try of your own first,
and shows a weekly report of your own work. Everything runs locally.

## Permission justifications

- **storage**: saves your settings, your own trigger phrases and local statistics on your device.
- **alarms**: marks the weekly summary on Sunday evening and deletes old local data (tries after 30 days, statistics after 90).
- **Host permissions (chatgpt.com, claude.ai, gemini.google.com)**: reads the prompt you are about to send, on your device
  only, to decide whether to offer the "You first" window. Nothing is sent anywhere.

Remote code: **No.**

## Data usage disclosure

Google requires disclosure even for data handled only locally. Tick:

- **Website content**: the text of the prompt being sent is read on the device to classify it. Not stored, not transmitted.
- **User activity**: per-prompt statistics without text (category, choice, self-rating) stored on the device for the report.

Then certify all three: not sold to third parties; not used for purposes unrelated to the single purpose;
not used for creditworthiness or lending.

The extension makes no network requests. The anonymous-numbers form is disabled in this release (`ANON_FORM_URL` empty).

## In-product disclosure

Onboarding shows what is read and that nothing leaves the device, links the policy, and asks for a click
("Let’s go" / "Just the report") before any processing. Nothing is classified or recorded before that click.

## Listing texts

**Name:** First You — Screen Time for your thinking

**Summary (max 132 chars):**
Try first, then ask AI. For tasks you choose, a quick try of your own before ChatGPT, Claude or Gemini. Local, private.

**Category:** Productivity (alternative: Education). **Languages:** English, Polish.

**Description:**

Handing AI the small stuff is convenient, and that's how skills quietly fade. First You adds a moment of friction only where you ask for it.

Pick what you want to keep doing yourself: writing messages, mental math, recalling facts, understanding a text, forming your own opinion, debugging, or any phrase of your own. When a prompt matches, a small window asks for your own try first: a quick draft, an estimate, a one-sentence guess, a hypothesis about the bug.

Then choose:
• Review my version: your prompt goes out with your try, asking the AI for feedback instead of a rewrite.
• Send and compare: the original goes out unchanged, your try stays next to the answer.
• Skip, I'm in a hurry (2 hours off), or This didn't fit.

Everything else goes straight through, with no delay. At most 3 windows a day by default; categories you keep skipping go quiet for a week.

Weekly report: your own tries, how often your estimates land, how much your drafts needed fixing, and a neutral mirror of what you use AI for. Plus a share card.

Private by design: no account, no server, no analytics. Prompts are read on your device only and never stored or sent anywhere. Open source (MIT).
