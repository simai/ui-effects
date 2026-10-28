// Shared parts of the catalogue site: configuration, the site theme, the
// catalogue and the Russian names.

export const config = JSON.parse(document.getElementById('site-config').textContent);
export const root = new URL(config.root, document.baseURI);

// --- Site theme -----------------------------------------------------------------
// The Framework's Loader keeps the theme: the header's theme button calls it, it stores the choice and puts
// theme-dark or theme-light on <html>, the page theme every effect follows.
const listeners = new Set();
export const siteTheme = () => (document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light');
export function setSiteTheme(theme) {
  if (globalThis.SF?.Loader?.setTheme?.(theme)) return;
  // Without the Loader's theme: the class alone, for this page.
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark');
  html.classList.add(`theme-${theme}`);
  themeChanged();
}
export const onSiteTheme = (listener) => listeners.add(listener);
function themeChanged() {
  listeners.forEach((listener) => listener(siteTheme()));
}
window.addEventListener('sf-theme-change', themeChanged);

// --- Theme button -------------------------------------------------------------------
// The Framework's sf-theme-button switches light and dark; its glyph is the
// project's: the theme it would switch to (documented in the Theme component).
const glyph = document.querySelector('[data-theme-glyph]');
const showGlyph = () => { if (glyph) glyph.setAttribute('icon', siteTheme() === 'dark' ? 'light_mode' : 'dark_mode'); };
window.addEventListener('sf-theme-change', showGlyph);
showGlyph();

// --- Main colour -------------------------------------------------------------------
// The header's primary palette button opens the platform colour picker; the
// whole theme is built from the colour by SF.ThemePalette, which ships with the
// theme generator's script, loaded here without its panel. The theme follows
// the picker while it moves (a short pause keeps a drag from rebuilding it on
// every step); effects read palette tones when they mount, so they are placed
// again once the colour is committed. The choice is kept in this browser.
const COLOUR_KEY = 'ui-effects-colour';
const FRAMEWORK_COLOUR = '#005bbe';
const colourListeners = new Set();
export const onSiteColour = (listener) => colourListeners.add(listener);
let palette = null;
const loadPalette = () => palette ??= new Promise((resolve) => {
  if (globalThis.SF?.ThemePalette) { resolve(globalThis.SF.ThemePalette); return; }
  const script = document.createElement('script');
  script.src = `${globalThis.sfPath}smart/theme-generator/js/theme-generator.min.js`;
  script.onload = () => resolve(globalThis.SF?.ThemePalette ?? null);
  script.onerror = () => resolve(null);
  document.head.append(script);
});
// The theme goes on <html> as inline custom properties; clearing them returns the Framework's own.
async function applyColour(value) {
  const tools = value ? await loadPalette() : null;
  const root = document.documentElement;
  for (const name of [...root.style]) if (name.startsWith('--sf-')) root.style.removeProperty(name);
  if (value && tools?.isThemeColor(value)) tools.applyTheme(tools.themeFromColor(value));
}
const picker = document.querySelector('[data-site-colour]');
const reset = document.querySelector('[data-site-colour-reset]');
let chosen = '';
try { chosen = localStorage.getItem(COLOUR_KEY) ?? ''; } catch (error) { chosen = ''; }
const show = () => { if (picker) picker.value = chosen || FRAMEWORK_COLOUR; if (reset) reset.hidden = !chosen; };
const commit = async (value) => {
  chosen = value;
  try {
    if (value) localStorage.setItem(COLOUR_KEY, value); else localStorage.removeItem(COLOUR_KEY);
  } catch (error) { /* storage blocked: the colour lasts for this page */ }
  show();
  await applyColour(value);
  colourListeners.forEach((listener) => listener(value));
};
show();
if (chosen) applyColour(chosen).then(() => colourListeners.forEach((listener) => listener(chosen)));
let moving = 0;
picker?.addEventListener('input', () => {
  clearTimeout(moving);
  moving = setTimeout(() => applyColour(picker.value), 120);
});
picker?.addEventListener('change', () => { clearTimeout(moving); commit(picker.value); });
reset?.addEventListener('click', () => commit(''));

// --- Catalogue ------------------------------------------------------------------
let catalogue = null;
export async function loadCatalogue() {
  if (!catalogue) {
    const response = await fetch(new URL('catalogue/index.json', root));
    if (!response.ok) throw new Error(`catalogue: HTTP ${response.status}`);
    catalogue = await response.json();
  }
  return catalogue;
}

export const text = (value) => (value && (value.ru || value.en || Object.values(value)[0])) || '';
export const schemeName = (scheme) => (scheme === 'light' ? 'светлая' : 'тёмная');
export const modeName = (mode) => ({auto: 'Как у страницы', dark: 'Всегда тёмная', light: 'Всегда светлая'}[mode]);
export const TAGS = {
  glow: 'свечение', sky: 'небо', particles: 'частицы', lines: 'линии', geometry: 'геометрия', flow: 'поток',
  gradient: 'градиент', depth: 'глубина', water: 'вода', type: 'знаки', material: 'материал', nature: 'природа',
  paper: 'бумага', print: 'печать', organic: 'органика',
};
export const groupOf = (entry) => (entry.schemes.length > 1 ? 'dual' : entry.schemes[0]);

export function badges(entry) {
  const box = document.createElement('span');
  box.className = 'badges';
  for (const scheme of entry.schemes) {
    const badge = document.createElement('span');
    badge.className = `badge badge--${scheme}`;
    badge.textContent = schemeName(scheme);
    box.append(badge);
  }
  return box;
}

// --- Contrast -------------------------------------------------------------------
const probe = document.createElement('canvas');
probe.width = probe.height = 1;
const probeContext = probe.getContext('2d', {willReadFrequently: true});
export function parseColour(value) {
  probeContext.clearRect(0, 0, 1, 1);
  probeContext.fillStyle = '#000';
  probeContext.fillStyle = value;
  probeContext.fillRect(0, 0, 1, 1);
  const [r, g, b] = probeContext.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}
const channel = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
export const formatRatio = (value) => `${value.toFixed(2).replace('.', ',')}:1`;
