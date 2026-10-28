import { defineContentScript } from 'wxt/utils/define-content-script';
import { chatgptAdapter } from '../src/adapters/chatgpt';
import { runOnSite } from '../src/adapters/run';

export default defineContentScript({
  matches: ['https://chatgpt.com/*'],
  // document_start: our window-capture listeners must be registered before the page's own.
  runAt: 'document_start',
  main: () => runOnSite(chatgptAdapter),
});
