# Adding a chat site (Claude, Gemini)

Selectors are never guessed. They come from a DOM capture of the current site.

1. Open a **new chat** on the site, logged in.
2. Send: `Write the word zebra-lamp without the hyphen, nothing else.` and wait for the reply.
3. Hover your message and click **Edit**, so the inline editor is open. Leave it open.
4. In the main prompt field type, without sending: `ZZ_INPUT_MARKER test` and attach any small image.
5. DevTools → Console, paste `docs/capture-dom.js`, press Enter (type `allow pasting` first if Chrome asks).
6. The JSON is in the clipboard. Save it as `claude.txt` / `gemini.txt` and hand it over.

From the capture: `input`, `sendButton`, `attachment`, `userMessage`, `excludeWithin` go into
`src/adapters/<site>.ts`, and a minimized copy of the DOM into `tests/fixtures/<site>.html` for e2e.
