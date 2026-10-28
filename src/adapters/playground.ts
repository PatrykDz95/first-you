import { createDomAdapter } from './dom';

/** Fake chat on the extension's own playground page (dev + e2e). Selectors match entrypoints/playground. */
export const playgroundAdapter = createDomAdapter('playground', [], {
  input: '#pg-input',
  sendButton: '#pg-send',
  attachment: null,
  userMessage: '.pg-msg-user',
});
