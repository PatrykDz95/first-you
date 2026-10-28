import { render } from 'preact';
import { useState } from 'preact/hooks';
import '../../src/pages/base.css';
import './style.css';
import en from '../../PRIVACY.md?raw';
import pl from '../../PRIVACY.pl.md?raw';
import { markdownToHtml } from '../../src/pages/markdown';
import { useI18n, useSettings } from '../../src/pages/hooks';
import type { Lang } from '../../locales';

/** The same documents as PRIVACY.md / PRIVACY.pl.md in the repo, always available offline in the extension. */
function Privacy() {
  const settings = useSettings();
  const { lang } = useI18n(settings);
  const [override, setOverride] = useState<Lang | null>(null);
  const current = override ?? lang;
  const other: Lang = current === 'pl' ? 'en' : 'pl';
  return (
    <main>
      <p class="lang">
        <button onClick={() => setOverride(other)}>{other === 'pl' ? 'Polski' : 'English'}</button>
      </p>
      <article dangerouslySetInnerHTML={{ __html: markdownToHtml(current === 'pl' ? pl : en) }} />
    </main>
  );
}

render(<Privacy />, document.getElementById('app')!);
