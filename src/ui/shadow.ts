declare const __SHADOW_MODE__: ShadowRootMode | undefined;
const MODE: ShadowRootMode = typeof __SHADOW_MODE__ === 'undefined' ? 'closed' : __SHADOW_MODE__;

/** A closed shadow root on <html>: page CSS can't reach in, page JS can't read what's inside. */
export function createShadowHost(tag: string, css: string) {
  const host = document.createElement(tag);
  const shadow = host.attachShadow({ mode: MODE });
  const style = document.createElement('style');
  style.textContent = css;
  const container = document.createElement('div');
  shadow.append(style, container);
  document.documentElement.appendChild(host);
  return { host, shadow, container, remove: () => host.remove() };
}
