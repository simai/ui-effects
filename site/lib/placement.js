// ui-effects placement: theme mode, pair, windows mode and integrity loading
// for simai.effect 1.0 effects.
//
// This module is a stand-in. The SIMAI Framework core will ship the same
// behaviour as simai.effect 1.1 (manifest `schemes`/`pair`, `themeMode`,
// windows mode, declarative `data-sf-effect` mount, integrity loading). When it
// does, the catalogue site and the published snippets call the core instead,
// and this file is removed. Until then it stays small and depends only on
// today's `SF.Effects.mountEffect`.
//
// Theme policy (owner decision 2026-10-19):
// - an effect draws the schemes it declares (`dark`, `light` or both) and may
//   name a `pair` that draws the other scheme in the same role;
// - a placement has a theme mode: `auto` (the page theme, default), `dark` or
//   `light`; a fixed mode the effect cannot draw is refused, never offered;
// - in `auto`, an effect that lacks the page scheme shows its pair; without a
//   pair a dark effect stays dark and a light effect is not shown;
// - the effect's area takes the theme it is drawn in (`theme-dark`/`theme-light`).
//
// An effect reference is plain data, as the catalogue lists it:
//   {id, base: '<url of the effect folder>/', files: {'effect.json': '<sha256>',
//    'index.js': '<sha256>'}, schemes: ['dark'], pair: <reference> | null}
// Every file is fetched, checked against its SHA-256 and only then run.

export const SCHEMES = ['dark', 'light'];
export const THEME_MODES = ['auto', 'dark', 'light'];

// The modes a placement of this effect may choose: auto, and each scheme it draws.
export const allowedModes = (effect) => ['auto', ...SCHEMES.filter((scheme) => effect.schemes.includes(scheme))];

// effect x page theme x mode -> what is shown and how.
// outcome: 'as-is' | 'pair' | 'dark-kept' | 'hidden'.
export function resolveTheme(effect, pageTheme, mode = 'auto') {
  if (!allowedModes(effect).includes(mode)) throw new RangeError(`${effect.id} cannot draw the ${mode} scheme`);
  const target = mode === 'auto' ? pageTheme : mode;
  if (effect.schemes.includes(target)) return {shown: effect, drawn: target, outcome: 'as-is', target};
  const pair = effect.pair;
  if (pair && pair.schemes.includes(target)) return {shown: pair, drawn: target, outcome: 'pair', target};
  if (effect.schemes.includes('dark')) return {shown: effect, drawn: 'dark', outcome: 'dark-kept', target};
  return {shown: null, drawn: target, outcome: 'hidden', target};
}

// The page theme around an element: the nearest theme class above it, else the system.
// `from` is where the search starts: the area's parent when the area itself takes the effect's theme.
export function pageThemeOf(element, from = element.parentElement) {
  const themed = from?.closest('.theme-dark, .theme-light');
  if (themed) return themed.classList.contains('theme-dark') ? 'dark' : 'light';
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// A catalogue entry (catalogue/index.json) -> an effect reference under `root`.
export function referenceFrom(catalogue, id, root) {
  const byId = new Map(catalogue.effects.map((entry) => [entry.id, entry]));
  const make = (entryId, withPair) => {
    const entry = byId.get(entryId);
    if (!entry) throw new Error(`${entryId} is not in the catalogue`);
    const files = Object.fromEntries(entry.files.filter((file) => /\.(json|js)$/u.test(file.path)).map((file) => [file.path, file.sha256]));
    return {id: entry.id, base: new URL(entry.path, root).href, files, schemes: entry.schemes, pair: withPair && entry.pair ? make(entry.pair, false) : null};
  };
  return make(id, true);
}

const hex = (buffer) => Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
async function verified(url, sha256) {
  if (!/^[0-9a-f]{64}$/u.test(sha256 ?? '')) throw new Error(`no SHA-256 for ${url}`);
  const response = await fetch(url, {credentials: 'omit'});
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== sha256) throw new Error(`${url}: SHA-256 does not match the catalogue`);
  return bytes;
}

const loaded = new Map();
// Fetches an effect's manifest and module, checks both, imports the module.
export function loadEffect(effect) {
  const key = `${effect.base}#${effect.files['index.js']}`;
  if (!loaded.has(key)) {
    loaded.set(key, (async () => {
      const [manifestBytes, moduleBytes] = await Promise.all(['effect.json', 'index.js'].map((name) => verified(new URL(name, effect.base).href, effect.files[name])));
      const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
      if (manifest.id !== effect.id) throw new Error(`${effect.base}: manifest id ${manifest.id}`);
      const url = URL.createObjectURL(new Blob([moduleBytes], {type: 'text/javascript'}));
      try {
        return {manifest, module: await import(url)};
      } finally {
        URL.revokeObjectURL(url);
      }
    })());
    loaded.get(key).catch(() => loaded.delete(key));
  }
  return loaded.get(key);
}

const STYLE = `:where([data-effect-area]){position:relative;isolation:isolate}
[data-effect-host]{position:absolute;inset:0;overflow:hidden;z-index:-1}
:where([data-effect-drawn]){background-color:var(--sf-surface-0);color:var(--sf-on-surface)}
[data-effect-state="shown"] [data-effect-window]{background-color:transparent}`;
const addStyle = (document) => {
  if (document.querySelector('style[data-effect-placement]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-effect-placement', '');
  style.textContent = STYLE;
  document.head.append(style);
};

const whenEffects = (timeout = 15000) => new Promise((resolve, reject) => {
  const started = Date.now();
  const tick = () => {
    if (globalThis.SF?.Effects?.mountEffect) resolve(globalThis.SF.Effects);
    else if (Date.now() - started > timeout) reject(new Error('SF.Effects is not on the page: connect the SIMAI Framework core first'));
    else setTimeout(tick, 50);
  };
  tick();
});

const roundedRect = (x, y, w, h, r) => {
  const q = Math.min(r, w / 2, h / 2);
  return `M${x + q} ${y}H${x + w - q}A${q} ${q} 0 0 1 ${x + w} ${y + q}V${y + h - q}A${q} ${q} 0 0 1 ${x + w - q} ${y + h}H${x + q}A${q} ${q} 0 0 1 ${x} ${y + h - q}V${y + q}A${q} ${q} 0 0 1 ${x + q} ${y}Z`;
};

// Mounts an effect into an area under the theme policy.
//   area      the element the effect fills (hero) or the group of windows;
//   effect    an effect reference (see above);
//   themeMode 'auto' | 'dark' | 'light';
//   settings  stored values for the chosen effect (the pair, if shown, takes its defaults);
//   windows   a selector of the windows inside the area: one scene behind the
//             group, visible only through them; omit for a plain area;
//   context   extra fields for the effect's mount context (e.g. {reducedMotion: true});
//   onChange  called with {shown, drawn, outcome, target, error} after each change.
// Answers {ready, state, update(settings), setThemeMode(mode), pause(), resume(), destroy()}.
export function mountPlacement(area, {effect, themeMode = 'auto', settings = {}, windows = null, context = null, onChange = null} = {}) {
  const document = area.ownerDocument;
  addStyle(document);
  const ownArea = !area.hasAttribute('data-effect-area');
  area.setAttribute('data-effect-area', '');
  let host = area.querySelector(':scope > [data-effect-host]');
  const ownHost = !host;
  if (!host) {
    host = document.createElement('div');
    host.setAttribute('data-effect-host', '');
    area.prepend(host);
  }
  let mode = themeMode;
  let values = {...settings};
  let handle = null;
  let token = 0;
  let paused = false;
  let destroyed = false;
  const state = {shown: null, drawn: null, outcome: null, target: null, error: null};
  const windowList = () => (windows ? [...area.querySelectorAll(windows)] : []);
  const report = () => onChange?.({...state, shown: state.shown?.id ?? null});

  // Only the elements this placement themed lose their theme class again.
  let themed = [];
  const unpaint = () => {
    for (const element of themed) {
      element.classList.remove('theme-dark', 'theme-light');
      element.removeAttribute('data-effect-drawn');
    }
    themed = [];
  };
  const paint = () => {
    unpaint();
    themed = windows ? [host, ...windowList()] : [area, host];
    for (const element of themed) {
      element.classList.add(`theme-${state.drawn}`);
      element.setAttribute('data-effect-drawn', state.drawn);
    }
    area.setAttribute('data-effect-state', state.shown ? 'shown' : 'hidden');
    clip();
  };
  // Windows mode: the host spans the group and is clipped to the windows.
  const clip = () => {
    if (!windows) return;
    const box = host.getBoundingClientRect();
    host.style.clipPath = `path('${windowList().map((element) => {
      const rect = element.getBoundingClientRect();
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
      return roundedRect(rect.left - box.left, rect.top - box.top, rect.width, rect.height, radius);
    }).join('') || 'M0 0Z'}')`;
  };
  const resize = new ResizeObserver(clip);
  if (windows) {
    resize.observe(area);
    windowList().forEach((element) => resize.observe(element));
  }

  const withScheme = (manifest, stored, scheme) => {
    const setting = manifest.settings?.find((item) => item.key === 'scheme' && item.type === 'choice');
    return setting?.options?.some((option) => option.value === scheme) ? {...stored, scheme} : stored;
  };
  let current = null; // {manifest} of what is mounted
  const unmount = () => {
    handle?.destroy();
    handle = null;
    current = null;
  };
  const settle = async () => {
    if (destroyed) return;
    const next = resolveTheme(effect, pageThemeOf(area, windows ? area : area.parentElement), mode);
    const same = next.shown && state.shown === next.shown && handle;
    Object.assign(state, next, {error: null});
    paint();
    if (!next.shown) {
      token += 1;
      unmount();
      report();
      return;
    }
    const stored = next.shown === effect ? values : {};
    if (same) {
      handle.update(withScheme(current.manifest, stored, next.drawn));
      report();
      return;
    }
    const mine = ++token;
    unmount();
    try {
      const [Effects, {manifest, module}] = await Promise.all([whenEffects(), loadEffect(next.shown)]);
      if (mine !== token || destroyed) return;
      const extra = context ? Object.freeze({...context}) : null;
      const wrapped = extra ? {mount: (target, given, base) => module.mount(target, given, Object.freeze({...base, ...extra}))} : module;
      handle = Effects.mountEffect(host, {manifest, module: wrapped, stored: withScheme(manifest, stored, next.drawn)});
      current = {manifest};
      if (paused) handle.pause();
    } catch (error) {
      if (mine !== token) return;
      state.error = String(error?.message ?? error);
      host.replaceChildren();
    }
    clip();
    report();
  };

  // In auto mode the placement follows the page theme.
  const observer = new MutationObserver(() => { if (mode === 'auto') settle(); });
  observer.observe(document.documentElement, {attributes: true, attributeFilter: ['class', 'data-theme']});
  if (document.body) observer.observe(document.body, {attributes: true, attributeFilter: ['class', 'data-theme']});
  const scheme = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
  const onScheme = () => { if (mode === 'auto') settle(); };
  scheme?.addEventListener?.('change', onScheme);

  const ready = settle();
  return {
    ready,
    state,
    update(next) {
      values = {...next};
      if (handle && state.shown === effect) handle.update(withScheme(current.manifest, values, state.drawn));
    },
    setThemeMode(next) {
      if (!allowedModes(effect).includes(next)) throw new RangeError(`${effect.id} cannot draw the ${next} scheme`);
      mode = next;
      return settle();
    },
    refresh: () => settle(),
    pause() { paused = true; handle?.pause(); },
    resume() { paused = false; handle?.resume(); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      token += 1;
      unmount();
      observer.disconnect();
      resize.disconnect();
      scheme?.removeEventListener?.('change', onScheme);
      unpaint();
      area.removeAttribute('data-effect-state');
      host.style.clipPath = '';
      if (ownHost) host.remove();
      if (ownArea) area.removeAttribute('data-effect-area');
    },
  };
}
