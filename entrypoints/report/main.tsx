import { render } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { browser } from 'wxt/browser';
import '../../src/pages/base.css';
import './style.css';
import type { PromptCategory } from '../../src/classifier/types';
import { eventsBetween } from '../../src/db/repository';
import type { PromptEvent } from '../../src/db/schema';
import { customTriggersItem, reportReadyItem } from '../../src/settings/storage';
import { weekRange } from '../../src/core/time';
import {
  anonymousNumbers,
  highlights,
  mirror,
  summaryKey,
  topCategory,
  weekStats,
  type Highlight,
} from '../../src/report/compute';
import { buildCardSvg, svgToPngBlob, type CardLine } from '../../src/report/card';
import { ANON_FORM_URL } from '../../src/config';
import { formatDate, useI18n, useItem, useSettings } from '../../src/pages/hooks';

/** Local date of the week start, YYYY-MM-DD (not UTC: Monday 00:00 local would shift a day west of UTC). */
const weekLabel = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function Report() {
  const settings = useSettings();
  const triggers = useItem(customTriggersItem) ?? [];
  const { t, tf, lang } = useI18n(settings);
  const [offset, setOffset] = useState<0 | -1>(0);
  const [events, setEvents] = useState<PromptEvent[] | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const cur = weekRange(Date.now(), offset);
  const prev = weekRange(Date.now(), offset - 1);

  useEffect(() => {
    void reportReadyItem.setValue(null); // clears the "•" badge
  }, []);
  useEffect(() => {
    setEvents(null);
    void eventsBetween(prev.from, cur.to).then(setEvents);
  }, [offset]);

  const catLabel = (c: PromptCategory) => (c === 'other' ? t('topic.other') : t(`category.${c}.title`));
  const stats = useMemo(() => (events ? weekStats(events, cur.from, cur.to) : null), [events]);
  const prevStats = useMemo(() => (events ? weekStats(events, prev.from, prev.to) : null), [events]);

  if (!settings || !stats || !prevStats) return null;
  const hasPrev = prevStats.prompts > 0;
  const hl = highlights(stats, hasPrev ? prevStats : null);
  const key = summaryKey(stats, hasPrev ? prevStats : null);
  const top = topCategory(stats);
  const rangeLabel = `${formatDate(lang, cur.from)} – ${formatDate(lang, cur.to - 1)}`;

  const line = (h: Highlight): CardLine & { delta?: string } => {
    switch (h.kind) {
      case 'tries':
        return {
          big: String(h.value),
          small: tf('report.h.tries', { n: h.value }),
          ...(h.delta !== null && h.delta !== 0
            ? { delta: tf('report.h.delta', { d: h.delta > 0 ? `+${h.delta}` : String(h.delta) }) }
            : {}),
        };
      case 'check':
        return { big: `${h.hit}/${h.total}`, small: t('report.h.check') };
      case 'edit':
        return { big: `${h.little}/${h.total}`, small: t('report.h.edit') };
    }
  };
  const lines = hl.map(line);
  const summaryText = tf(`summary.${key}`, {
    n: stats.prompts,
    category: top ? catLabel(top.category).toLowerCase() : '',
  });

  const svg = lines.length
    ? buildCardSvg({ title: t('report.cardTitle'), week: rangeLabel, lines, footer: t('report.cardFooter') })
    : null;

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2500);
  };
  const downloadCard = async () => {
    const blob = await svgToPngBlob(svg!);
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'first-you-week.png' }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const copyCard = async () => {
    const blob = await svgToPngBlob(svg!);
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    say(t('report.copied'));
  };
  const anonData = anonymousNumbers(stats, weekLabel(cur.from), browser.runtime.getManifest().version);
  const shareAnon = async () => {
    await navigator.clipboard.writeText(JSON.stringify(anonData, null, 2));
    say(t('report.anonCopied'));
    void browser.tabs.create({ url: ANON_FORM_URL });
  };

  const byCategory = Object.entries(stats.triesByCategory).sort((a, b) => b[1] - a[1]) as [PromptCategory, number][];
  const phraseName = (id: string) => triggers.find((x) => x.id === id)?.phrase ?? t('options.removedPhrase');
  const checkTotal = stats.check.hit + stats.check.close + stats.check.miss;
  const editTotal = stats.edit.little + stats.edit.lot;
  const mir = mirror(stats);

  return (
    <main>
      <header>
        <div>
          <h1>{t('report.title')}</h1>
          <p class="range">{rangeLabel}</p>
        </div>
        <div class="weeks" role="group">
          <button aria-pressed={offset === 0} onClick={() => setOffset(0)}>
            {t('report.thisWeek')}
          </button>
          <button aria-pressed={offset === -1} onClick={() => setOffset(-1)}>
            {t('report.lastWeek')}
          </button>
        </div>
      </header>

      {lines.length > 0 && (
        <div class="stats">
          {lines.map((l, i) => (
            <div class="stat" key={i}>
              <p class="big">{l.big}</p>
              <p class="small">{l.small}</p>
              {l.delta && <p class="delta">{l.delta}</p>}
            </div>
          ))}
        </div>
      )}
      <p class="summary">{summaryText}</p>

      {stats.prompts > 0 && (
        <details>
          <summary>{t('report.details')}</summary>
          {byCategory.length > 0 && (
            <>
              <p>
                <strong>{t('report.d.tries')}</strong>
              </p>
              <ul>
                {byCategory.map(([c, n]) => (
                  <li key={c}>
                    {catLabel(c)}: {n}
                    {hasPrev && (
                      <span class="muted"> ({tf('report.d.prev', { n: prevStats.triesByCategory[c] ?? 0 })})</span>
                    )}
                    {c === 'custom' && (
                      <ul>
                        {Object.entries(stats.triesByPhrase).map(([id, k]) => (
                          <li key={id}>
                            „{phraseName(id)}”: {k}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <p>{tf('report.d.modes', { r: stats.reviews, c: stats.compares })}</p>
            </>
          )}
          {checkTotal > 0 && <p>{tf('report.d.check', stats.check)}</p>}
          {editTotal > 0 && <p>{tf('report.d.edit', stats.edit)}</p>}
          {stats.windows > 0 && <p class="muted">{tf('report.d.skips', { s: stats.skips, m: stats.misfires })}</p>}
        </details>
      )}

      {mir.length > 0 && (
        <section>
          <h2>{t('report.mirror')}</h2>
          <p class="hint">{tf('report.mirrorHint', { n: stats.prompts })}</p>
          <ul class="bars">
            {mir.map((m) => (
              <li key={m.topic}>
                <span>{t(`topic.${m.topic}`)}</span>
                <span class="bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(m.share * 100)}%` }} />
                </span>
                <span class="n">{Math.round(m.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>{t('report.card')}</h2>
        {svg ? (
          <>
            <img class="card-preview" alt={t('report.card')} src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} />
            <div class="row">
              <button class="btn primary" onClick={() => void downloadCard()}>
                {t('report.download')}
              </button>
              <button class="btn" onClick={() => void copyCard().catch(() => {})}>
                {t('report.copy')}
              </button>
            </div>
          </>
        ) : (
          <p class="hint">{t('report.noCard')}</p>
        )}
      </section>

      {ANON_FORM_URL && stats.prompts > 0 && (
        <section>
          <h2>{t('report.anonTitle')}</h2>
          <p class="hint">
            {t('report.anonHint')}{' '}
            <a href={browser.runtime.getURL('/privacy.html')} target="_blank" rel="noopener">
              {t('privacy.link')}
            </a>
          </p>
          <details class="preview">
            <summary>{t('report.anonPreview')}</summary>
            <pre>{JSON.stringify(anonData, null, 2)}</pre>
          </details>
          <div class="row">
            <button class="btn" onClick={() => void shareAnon().catch(() => {})}>
              {t('report.anon')}
            </button>
          </div>
        </section>
      )}
      {flash && (
        <p class="ok" role="status">
          {flash}
        </p>
      )}
    </main>
  );
}

render(<Report />, document.getElementById('app')!);
