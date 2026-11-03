// Shared parts of the catalogue site: configuration, the page language and its
// texts, the site theme and the catalogue.

export const config = JSON.parse(document.getElementById('site-config').textContent);
// root: the shared assets, catalogue and effects; home: this language's gallery.
export const root = new URL(config.root, document.baseURI);
export const home = new URL(config.home, document.baseURI);

// --- Language --------------------------------------------------------------------
// The page's texts come with its configuration (site/i18n/<lang>.json); a text of
// the catalogue is taken in the page language, else in English.
export const lang = config.lang;
export const t = (key, values = {}) => (config.strings[key] ?? key).replace(/\{(\w+)\}/gu, (match, name) => (name in values ? String(values[name]) : match));
export const formatNumber = (value, digits) => new Intl.NumberFormat(lang, {minimumFractionDigits: digits, maximumFractionDigits: digits}).format(value);

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

// --- Main colour -------------------------------------------------------------------
// The header's sf-input-color (theme variant) opens the platform colour picker and builds the whole theme
// from the colour while it moves; it stores nothing, so the choice is kept here, in this browser, and
// given back as its value. Effects read palette tones when they mount, so they are placed again once
// a colour is committed or cleared.
const COLOUR_KEY = 'ui-effects-colour';
const colourListeners = new Set();
export const onSiteColour = (listener) => colourListeners.add(listener);
export const siteColour = () => chosen;
const picker = document.querySelector('[data-site-colour]');
let chosen = '';
try { chosen = localStorage.getItem(COLOUR_KEY) ?? ''; } catch (error) { chosen = ''; }
if (picker && chosen) {
  picker.setAttribute('value', chosen);
  // The control applies the kept colour once the theme palette is there; effects are placed again after it.
  const told = () => requestAnimationFrame(() => colourListeners.forEach((listener) => listener(chosen)));
  window.addEventListener('theme-palette:ready', told, {once: true});
}
picker?.addEventListener('change', (event) => {
  if (event.target !== picker) return;
  chosen = picker.value ?? '';
  try {
    if (chosen) localStorage.setItem(COLOUR_KEY, chosen); else localStorage.removeItem(COLOUR_KEY);
  } catch (error) { /* storage blocked: the colour lasts for this page */ }
  colourListeners.forEach((listener) => listener(chosen));
});

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

export const text = (value) => (value && (value[lang] || value.en || Object.values(value)[0])) || '';
export const schemeName = (scheme) => t(scheme === 'light' ? 'scheme.light.short' : 'scheme.dark.short');
export const schemesName = (entry) => (entry.schemes.length > 1 ? t('scheme.both.short') : schemeName(entry.schemes[0]));
export const modeName = (mode) => t(`mode.${mode}`);
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
export const formatRatio = (value) => `${formatNumber(value, 2)}:1`;

// The languages: the globe opens the Framework's menu of this page in every language; a link row
// goes there itself.
// The language of the page is the visitor's choice: the root's redirects take it next time.
try { localStorage.setItem('ui-effects-lang', lang); } catch { /* not kept */ }
const languageButton = document.querySelector('[data-lang-button]');
const languageMenu = document.querySelector('[data-lang-menu]');
if (languageButton && languageMenu) {
  try { languageMenu.entries = JSON.parse(languageMenu.dataset.entries); } catch { /* the menu stays empty */ }
  languageButton.addEventListener('click', () => customElements.whenDefined('sf-menu-context').then(() => languageMenu.toggleFor(languageButton)));
}
