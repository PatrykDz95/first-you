import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { markdownToHtml } from '../../src/pages/markdown';

describe('markdownToHtml', () => {
  it('renders headings, lists, bold, links; escapes HTML', () => {
    const html = markdownToHtml('# T\n\nA **b** <x>\n\n- one\n- [two](https://e.com)\n\n## S');
    expect(html).toContain('<h1>T</h1>');
    expect(html).toContain('<p>A <strong>b</strong> &lt;x&gt;</p>');
    expect(html).toContain('<li><a href="https://e.com" target="_blank" rel="noopener">two</a></li>');
    expect(html).toContain('<h2>S</h2>');
  });
  it('only links https', () => {
    expect(markdownToHtml('[x](javascript:alert(1))')).not.toContain('<a');
  });
});

describe('privacy policies', () => {
  const read = (f: string) => readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
  it('PL and EN have the same sections', () => {
    const count = (s: string) => (s.match(/^## /gm) ?? []).length;
    expect(count(read('PRIVACY.md'))).toBe(count(read('PRIVACY.pl.md')));
  });
});
