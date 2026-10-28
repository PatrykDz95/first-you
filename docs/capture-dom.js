// First You — DOM capture for a chat site (claude.ai, gemini.google.com, chatgpt.com).
// Paste into DevTools Console on the chat page after doing the steps in docs/ADAPTERS.md.
// Copies a JSON with the composer, one user turn (with the edit editor open) and one AI turn.
// Long texts are cut, images and SVG paths stripped. Sidebar and account data are not captured.
(() => {
  const MAX = 80;
  const strip = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll('svg').forEach((s) => s.replaceChildren());
    c.querySelectorAll('img').forEach((i) => i.setAttribute('src', '...'));
    c.querySelectorAll('style,script').forEach((s) => s.remove());
    const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) if (w.currentNode.nodeValue.length > MAX) w.currentNode.nodeValue = w.currentNode.nodeValue.slice(0, MAX) + '…';
    return c.outerHTML;
  };
  // Chat titles in the sidebar repeat the conversation text and are personal: never match there.
  const OUTSIDE = 'nav, aside, header, [role="navigation"], [role="complementary"], [role="banner"]';
  const findText = (t, root, notIn) => {
    let hit = null;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const el = w.currentNode.parentElement;
      if (!w.currentNode.nodeValue.includes(t) || (notIn && notIn.contains(el))) continue;
      if (el.closest(OUTSIDE) || !el.getClientRects().length) continue;
      hit = el;
    }
    return hit;
  };
  const fields = [...document.querySelectorAll('textarea, input, [contenteditable="true"], [contenteditable=""]')];
  const field = fields.find((f) => (f.value ?? f.textContent ?? '').includes('ZZ_INPUT_MARKER'));
  if (!field) return console.error('No ZZ_INPUT_MARKER in the prompt field. Fields:', fields.map((f) => f.tagName + ' ' + String(f.className).slice(0, 60)));
  // Composer: nearest ancestor that also contains a button (send).
  let composer = field.closest('form');
  if (!composer) { composer = field; while (composer.parentElement && !composer.querySelector('button')) composer = composer.parentElement; composer = composer.parentElement || composer; }
  const user = findText('zebra-lamp', document.body, composer)
    || [...document.querySelectorAll('textarea')].find((t) => t.value.includes('zebra-lamp') && !composer.contains(t));
  const ai = findText('zebralamp', document.body, composer);
  if (!user || !ai) return console.error('Missing the "zebra-lamp" / "zebralamp" exchange in this chat.', { user: !!user, ai: !!ai });
  const turnRoot = (a, b) => { let x = a; while (x.parentElement && !x.parentElement.contains(b)) x = x.parentElement; return x; };
  const tooBig = (el) => el.querySelector(OUTSIDE) || el.querySelectorAll('*').length > 4000;
  if (tooBig(turnRoot(user, ai)) || tooBig(turnRoot(ai, user)) || tooBig(composer)) {
    return console.error('Capture would include the sidebar or the whole page. Close the sidebar and run again.');
  }
  const out = {
    site: location.host,
    lang: document.documentElement.lang,
    input: field.tagName + ' ' + [...field.attributes].map((a) => `${a.name}="${a.value.slice(0, 60)}"`).join(' '),
    composer: strip(composer),
    userTurn: strip(turnRoot(user, ai)),
    aiTurn: strip(turnRoot(ai, user)),
  };
  const json = JSON.stringify(out, null, 1);
  window.__czas = json;
  try { copy(json); console.log('%cCopied (' + json.length + ' chars).', 'font-size:15px;color:green'); }
  catch { console.log('Run: copy(window.__czas)'); }
})();
