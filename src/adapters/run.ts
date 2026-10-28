import type { SiteAdapter } from './types';
import { startFirstYou } from '../core/firstYou';

/** Shared content-script body: stay silent unless the adapter is configured, never break the chat. */
export async function runOnSite(adapter: SiteAdapter): Promise<void> {
  if (!adapter.isConfigured()) return;
  try {
    await startFirstYou(adapter);
  } catch (e) {
    console.debug('[first-you] disabled on this page', e);
  }
}
