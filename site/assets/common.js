// Shared parts of the catalogue site: configuration, the site theme, the
// catalogue and the Russian names.

export const config = JSON.parse(document.getElementById('site-config').textContent);
export const root = new URL(config.root, document.baseURI);

// --- Site theme -----------------------------------------------------------------
// The theme class on <html> is the page theme every effect placement follows.
const THEME_KEY = 'ui-effects-theme';
const listeners = new Set();
export const siteTheme = () => (document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light');
export function setSiteTheme(theme, remember = true) {
  const html = document.documentElement;
  html.classList.remove('theme-light', 'theme-dark');
  html.classList.add(`theme-${theme}`);
  if (remember) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (error) { /* storage blocked: the choice lasts for this page */ }
  }
  syncThemeButtons();
  listeners.forEach((listener) => listener(theme));
}
export const onSiteTheme = (listener) => listeners.add(listener);
function syncThemeButtons() {
  const theme = siteTheme();
  document.querySelectorAll('[data-site-theme]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.siteTheme === theme)));
}
document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-site-theme]');
  if (button) setSiteTheme(button.dataset.siteTheme);
});
// Without a stored choice the site follows the system.
const stored = () => { try { return localStorage.getItem(THEME_KEY); } catch (error) { return null; } };
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  if (!stored()) setSiteTheme(event.matches ? 'dark' : 'light', false);
});
syncThemeButtons();

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

export function badges(entry, byId) {
  const box = document.createElement('span');
  box.className = 'badges';
  for (const scheme of entry.schemes) {
    const badge = document.createElement('span');
    badge.className = `badge badge--${scheme}`;
    badge.textContent = schemeName(scheme);
    box.append(badge);
  }
  if (entry.pair && byId.get(entry.pair)) {
    const badge = document.createElement('span');
    badge.className = 'badge badge--pair';
    badge.textContent = `пара: ${text(byId.get(entry.pair).label)}`;
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
