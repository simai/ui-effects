// Shared parts of the catalogue site: configuration, the site theme, the
// catalogue and the Russian names.

export const config = JSON.parse(document.getElementById('site-config').textContent);
export const root = new URL(config.root, document.baseURI);

// --- Site theme -----------------------------------------------------------------
// The Framework's Loader keeps the theme: the header's theme switch and the
// effect page's «Тема страницы» call it, it stores the choice and puts
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
// The page-theme switches (segmented Button Groups) show the drawn theme.
function syncThemeButtons() {
  const theme = siteTheme();
  document.querySelectorAll('[data-site-theme-group]').forEach((group) => { if (group.getAttribute('value') !== theme) group.setAttribute('value', theme); });
}
function themeChanged() {
  syncThemeButtons();
  listeners.forEach((listener) => listener(siteTheme()));
}
window.addEventListener('sf-theme-change', themeChanged);
document.addEventListener('change', (event) => {
  const group = event.target.closest?.('[data-site-theme-group]');
  if (group && (event.detail?.value === 'light' || event.detail?.value === 'dark')) setSiteTheme(event.detail.value);
});
syncThemeButtons();

// --- Main colour -------------------------------------------------------------------
// The header's theme generator (Framework) makes the whole theme from one
// colour and applies it to the page; the choice is kept in this browser and
// applied again before the first paint (partials/head.html). Effects read
// palette tones when they mount, so they are placed again after a change.
const COLOUR_KEY = 'ui-effects-colour';
const colourListeners = new Set();
export const onSiteColour = (listener) => colourListeners.add(listener);
const generator = document.querySelector('[data-site-colour]');
if (generator) {
  try {
    const kept = localStorage.getItem(COLOUR_KEY);
    if (kept) generator.setAttribute('value', kept);
  } catch (error) { /* storage blocked: the Framework's own colour */ }
  generator.addEventListener('sf-theme-generator-apply', (event) => {
    const value = event.detail?.value ?? '';
    try {
      if (value) localStorage.setItem(COLOUR_KEY, value); else localStorage.removeItem(COLOUR_KEY);
    } catch (error) { /* storage blocked: the colour lasts for this page */ }
    colourListeners.forEach((listener) => listener(value));
  });
}

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
