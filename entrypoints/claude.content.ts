import { defineContentScript } from 'wxt/utils/define-content-script';
import { claudeAdapter } from '../src/adapters/claude';
import { runOnSite } from '../src/adapters/run';

export default defineContentScript({
  matches: ['https://claude.ai/*'],
  // document_start: our window-capture listeners must be registered before the page's own.
  runAt: 'document_start',
  main: () => runOnSite(claudeAdapter),
});
