/**
 * Share card: SVG built in code, turned into a 1200x630 PNG via canvas on the report page.
 * Numbers only, never conversation content.
 */
export interface CardLine {
  big: string;
  small: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** SVG text doesn't wrap; break by words to fit an approximate width (sans ~0.52em per char). */
export function wrap(text: string, maxChars: number, maxLines = 3): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}

export function buildCardSvg(opts: { title: string; week: string; lines: CardLine[]; footer: string }): string {
  const W = 1200;
  const H = 630;
  const cols = Math.max(1, opts.lines.length);
  const colW = (W - 160) / cols;
  const maxChars = Math.floor((colW - 32) / (28 * 0.52));
  const blocks = opts.lines
    .map((l, i) => {
      const x = 80 + i * colW;
      const small = wrap(l.small, maxChars)
        .map((ln, j) => `<tspan x="0" dy="${j === 0 ? 0 : 34}">${esc(ln)}</tspan>`)
        .join('');
      return `<g transform="translate(${x},300)">
  <text font-family="Charter, 'Iowan Old Style', Georgia, serif" font-size="112" font-weight="600" fill="#1f2a27">${esc(l.big)}</text>
  <text y="56" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="28" fill="#5c6863">${small}</text>
</g>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#f3f5f2"/>
<rect x="0" y="0" width="16" height="${H}" fill="#2f6f5e"/>
<text x="80" y="130" font-family="Charter, 'Iowan Old Style', Georgia, serif" font-size="54" font-weight="600" fill="#1f2a27">${esc(opts.title)}</text>
<text x="80" y="180" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="28" fill="#5c6863">${esc(opts.week)}</text>
${blocks}
<text x="80" y="${H - 56}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" font-size="26" fill="#2f6f5e" font-weight="600">${esc(opts.footer)}</text>
</svg>`;
}

/** Browser only. */
export async function svgToPngBlob(svg: string, width = 1200, height = 630): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.width = width;
    img.height = height;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('card render failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
