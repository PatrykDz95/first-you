import { defineContentScript } from 'wxt/utils/define-content-script';
import { geminiAdapter } from '../src/adapters/gemini';
import { runOnSite } from '../src/adapters/run';

export default defineContentScript({
  matches: ['https://gemini.google.com/*'],
  // document_start: our window-capture listeners must be registered before the page's own.
  runAt: 'document_start',
  main: () => runOnSite(geminiAdapter),
});
