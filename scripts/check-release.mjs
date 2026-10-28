// Guard for store builds (`npm run zip`): fails on legal placeholders, warns on things worth a second look.
import { readFileSync } from 'node:fs';

const errors = [];
const warnings = [];
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

for (const f of ['PRIVACY.md', 'PRIVACY.pl.md']) {
  if (read(f).includes('<<CONTACT_EMAIL>>')) errors.push(`${f}: replace <<CONTACT_EMAIL>> with a real contact address.`);
}
// A form URL means data leaves the device: the policy must describe it before release.
if (!/ANON_FORM_URL = ''/.test(read('src/config.ts')) && !/Tally/.test(read('PRIVACY.md'))) {
  errors.push('ANON_FORM_URL is set, but PRIVACY.md does not describe the form. Update the policy first (docs/TALLY.md).');
}
if (/REPO_URL = ''/.test(read('src/config.ts'))) {
  warnings.push('src/config.ts: REPO_URL is empty, so settings show no "Report a problem" link.');
}
for (const site of ['claude', 'gemini']) {
  if (/input: null/.test(read(`src/adapters/${site}.ts`))) {
    warnings.push(
      `src/adapters/${site}.ts has no selectors, but the manifest still asks for access to that site. ` +
        'Store review may flag unused permissions; finish the adapter or remove the site.',
    );
  }
}

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✖ ${e}`);
  process.exit(1);
}
console.log('✔ release check passed');
