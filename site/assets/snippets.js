// «Получить код»: the snippets of the configurator. Every URL is pinned by
// commit (ui-effects: the published commit, injected at build; ui: the
// locked Framework release) and every file is checked against its SHA-256
// from the catalogue before it runs.

import {lang, t, text} from './common.js';

const indent = (code, prefix) => code.split('\n').map((line) => (line ? prefix + line : line)).join('\n');
const quote = (value) => `'${String(value).replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
const attr = (value) => String(value).replace(/&/gu, '&amp;').replace(/'/gu, '&#39;').replace(/</gu, '&lt;');

// A single-scheme effect keeps its scheme on any page, so «as the page» is
// written as that scheme.
const themeOf = (entry, mode) => (mode === 'auto' && entry.schemes.length === 1 ? entry.schemes[0] : mode);
const themeNote = (entry, mode) => (mode !== 'auto' ? t('code.theme.author') : entry.schemes.length === 1 ? t('code.theme.one', {scheme: t(`scheme.${entry.schemes[0]}.short`)}) : t('code.theme.page'));

// The Framework, with SF_BOOT_CONFIG.effects naming the catalogue at this commit:
// the core loads every effect from there and checks each file against its index.
export function connectSnippet(config) {
  const base = config.framework.base;
  return `<!-- ${t('code.connect', {pair: config.framework.pair})} -->
<link rel="stylesheet" href="${base}core/css/core.min.css">
<script>
  window.sfPath = '${base}';
  window.SF_BOOT_CONFIG = Object.assign(window.SF_BOOT_CONFIG || {}, {
    effects: {catalogue: '${config.cdn}'},
  });
</script>
<script src="${base}core/js/core.min.js"></script>`;
}

const heroStyle = () => `<style>
  /* ${t('code.hero.style')} */
  .effect-hero { display: flex; align-items: center; min-height: 28rem; padding: 3rem 1.5rem; background: var(--sf-surface-0); }
  .effect-hero__body { max-width: 36rem; }
</style>`;
const heroBody = () => `  <div class="effect-hero__body">
    <h1>${t('code.hero.title')}</h1>
    <p>${t('code.hero.lead')}</p>
  </div>`;

const windowsStyle = () => `<style>
  .effect-windows { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
  .effect-card { display: flex; flex-direction: column; justify-content: flex-end; min-height: 9rem; padding: 1rem; border-radius: 0.75rem; background: var(--sf-surface-container); color: var(--sf-on-surface); }
  .effect-card h3, .effect-card p { margin: 0; }
  .effect-card h3 { font-size: 1.25rem; }
  /* ${t('code.windows.style')} */
  [data-sf-effect-state="running"] [data-sf-effect-window] { background: transparent; }
</style>`;
const windowsCards = () => `  <li class="effect-card" data-sf-effect-window><div class="effect-card__text"><h3>${t('card.analytics')}</h3><p>${t('code.card.analytics')}</p></div></li>
  <li class="effect-card" data-sf-effect-window><div class="effect-card__text"><h3>${t('card.requests')}</h3><p>${t('code.card.requests')}</p></div></li>
  <li class="effect-card" data-sf-effect-window><div class="effect-card__text"><h3>${t('card.team')}</h3><p>${t('code.card.team')}</p></div></li>
  <li class="effect-card"><div class="effect-card__text"><h3>${t('card.security')}</h3><p>${t('code.card.plain')}</p></div></li>`;

// Markup alone: the core finds the attributes and places the effect.
export function htmlSnippet({config, entry, mode, layout, values, about = true}) {
  const settings = attr(JSON.stringify(values));
  const off = about ? '' : '\n    data-sf-effect-about="false"';
  const head = `<!-- ${t('code.head.html', {label: text(entry.label), id: entry.id, commit: config.commit.slice(0, 12)})} -->`;
  if (layout === 'windows') {
    return `${head}
<ul class="effect-windows"
    data-sf-effect-windows="${entry.id}"
    data-sf-effect-theme="${themeOf(entry, mode)}"
    data-sf-effect-settings='${settings}'${off}>
${windowsCards()}
</ul>
${windowsStyle()}`;
  }
  return `${head}
<section class="effect-hero"
         data-sf-effect="${entry.id}"
         data-sf-effect-theme="${themeOf(entry, mode)}"
         data-sf-effect-settings='${settings}'${off.replace('\n    ', '\n         ')}>
${heroBody()}
</section>
${heroStyle()}`;
}

// The same from a script, for a page that places effects itself.
export function jsSnippet({config, entry, mode, layout, values, about = true}) {
  const windows = layout === 'windows';
  return `// ${t('code.head.js', {label: text(entry.label), id: entry.id, commit: config.commit.slice(0, 12)})}
// ${t('code.js.core')}
// ${t('code.js.core2')}
const area = document.querySelector('[data-effect-area]');${about ? '' : `\narea.dataset.sfEffectAbout = 'false'; // ${t('code.js.about')}`}
const placement = await SF.Effects.placeEffect(area, {
  effect: ${quote(entry.id)},
  themeMode: ${quote(themeOf(entry, mode))}, // ${themeNote(entry, mode)}
  settings: ${indent(JSON.stringify(values, null, 2), '  ').trimStart()},${windows ? `\n  windows: true, // ${t('code.js.windows')}` : `\n  // ${t('code.js.windows.off')}`}
});
if (!placement) console.warn('${t('code.js.failed')}', area.dataset.sfEffectReason);`;
}

export const jsonSnippet = ({values}) => JSON.stringify(values, null, 2);

// A whole page around the snippets, for the downloaded example.
export function examplePage({entry, connect, parts}) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t('code.example.title', {label: text(entry.label)})}</title>
${connect}
<style>
  body { margin: 0; padding: 1.5rem; display: grid; gap: 1.5rem; background: var(--sf-surface-0); color: var(--sf-on-surface); font-family: system-ui, sans-serif; }
</style>
</head>
<body>
${parts.join('\n\n')}
</body>
</html>
`;
}
