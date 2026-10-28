/**
 * Release configuration. `npm run zip` (scripts/check-release.mjs) refuses to build a store package
 * while the privacy policy has a placeholder, and warns about anything left empty here.
 */

/** Public GitHub repo, e.g. https://github.com/<user>/first-you. Empty = no "Report a problem" link. */
export const REPO_URL = 'https://github.com/PatrykDz95/first-you';

/**
 * Tally form where users paste their anonymous weekly numbers (docs/TALLY.md).
 * Empty = the whole "share anonymous numbers" section is hidden. Disabled in the first release.
 */
export const ANON_FORM_URL = '';
