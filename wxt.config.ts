import { defineConfig } from 'wxt';
import preact from '@preact/preset-vite';

export default defineConfig({
  // Explicit imports everywhere: keeps src/ modules testable without WXT magic.
  imports: false,
  vite: () => ({
    plugins: [preact()],
    define: {
      // Closed shadow roots in real builds (the page can't read the user's attempt). E2E builds open
      // them so Playwright can click inside; nothing else differs.
      __SHADOW_MODE__: JSON.stringify(process.env.E2E ? 'open' : 'closed'),
    },
  }),
  hooks: {
    // The playground (fake chat for testing) ships only in dev and e2e builds, never to the store.
    'entrypoints:resolved': (wxt, entrypoints) => {
      if (wxt.config.mode === 'production' && !process.env.E2E) {
        const i = entrypoints.findIndex((e) => e.name === 'playground');
        if (i >= 0) entrypoints.splice(i, 1);
      }
    },
  },
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    // Minimal permissions: no tabs, no <all_urls>, no network.
    permissions: ['storage', 'alarms'],
    host_permissions: [
      'https://chatgpt.com/*',
      'https://claude.ai/*',
      'https://gemini.google.com/*',
    ],
  },
});
