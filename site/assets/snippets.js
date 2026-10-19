// «Получить код»: the snippets of the configurator. Every URL is pinned by
// commit (ui-effects: the published commit, injected at build; ui: the
// locked Framework release) and every file is checked against its SHA-256
// from the catalogue before it runs.

const indent = (code, prefix) => code.split('\n').map((line) => (line ? prefix + line : line)).join('\n');
const quote = (value) => `'${String(value).replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
const attr = (value) => String(value).replace(/&/gu, '&amp;').replace(/'/gu, '&#39;').replace(/</gu, '&lt;');

// The Framework, with SF_BOOT_CONFIG.effects naming the catalogue at this commit:
// the core loads every effect from there and checks each file against its index.
export function connectSnippet(config) {
  const base = config.framework.base;
  return `<!-- SIMAI Framework ${config.framework.pair} и каталог эффектов, оба закреплены по полному коммиту -->
<link rel="stylesheet" href="${base}core/css/core.min.css">
<script>
  window.sfPath = '${base}';
  window.SF_BOOT_CONFIG = Object.assign(window.SF_BOOT_CONFIG || {}, {
    effects: {catalogue: '${config.cdn}'},
  });
</script>
<script src="${base}core/js/core.min.js"></script>`;
}

const heroStyle = `<style>
  /* Область берёт тему, в которой нарисован эффект: фон и текст — из её ролей. */
  .effect-hero { display: flex; align-items: center; min-height: 28rem; padding: 3rem 1.5rem; background: var(--sf-surface-0); color: var(--sf-on-surface); }
  .effect-hero__body { max-width: 36rem; }
</style>`;
const heroBody = `  <div class="effect-hero__body">
    <h1>Заголовок первого экрана</h1>
    <p>Текст над эффектом берёт цвета темы, в которой эффект нарисован.</p>
  </div>`;

const windowsStyle = `<style>
  .effect-windows { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
  .effect-card { display: flex; flex-direction: column; justify-content: flex-end; min-height: 9rem; padding: 1rem; border-radius: 0.75rem; background: var(--sf-surface-container); color: var(--sf-on-surface); }
  .effect-card h3, .effect-card p { margin: 0; }
  /* Окно своего фона не рисует: сквозь него виден эффект. */
  [data-sf-effect-state="running"] [data-sf-effect-window] { background: transparent; }
  /* Подпись над эффектом — на вуали поверхности темы окна. */
  [data-sf-effect-state="running"] [data-sf-effect-window] .effect-card__text { margin: -1rem; padding: 0.75rem 1rem; border-radius: 0 0 0.75rem 0.75rem; background: color-mix(in srgb, var(--sf-surface-0) 84%, transparent); }
</style>`;
const windowsCards = `  <li class="effect-card" data-sf-effect-window><div class="effect-card__text"><h3>Аналитика</h3><p>Показатели за неделю.</p></div></li>
  <li class="effect-card" data-sf-effect-window><div class="effect-card__text"><h3>Заявки</h3><p>Новые и в работе.</p></div></li>
  <li class="effect-card" data-sf-effect-window><div class="effect-card__text"><h3>Команда</h3><p>Роли и доступы.</p></div></li>
  <li class="effect-card"><div class="effect-card__text"><h3>Безопасность</h3><p>Карточка без окна — в теме страницы.</p></div></li>`;

// Markup alone: the core finds the attributes and places the effect.
export function htmlSnippet({config, entry, mode, layout, values}) {
  const settings = attr(JSON.stringify(values));
  const head = `<!-- «${entry.label.ru}» (${entry.id}) из simai/ui-effects@${config.commit.slice(0, 12)}. Нужен фрагмент «Подключение». -->`;
  if (layout === 'windows') {
    return `${head}
<ul class="effect-windows"
    data-sf-effect-windows="${entry.id}"
    data-sf-effect-theme="${mode}"
    data-sf-effect-settings='${settings}'>
${windowsCards}
</ul>
${windowsStyle}`;
  }
  return `${head}
<section class="effect-hero"
         data-sf-effect="${entry.id}"
         data-sf-effect-theme="${mode}"
         data-sf-effect-settings='${settings}'>
${heroBody}
</section>
${heroStyle}`;
}

// The same from a script, for a page that places effects itself.
export function jsSnippet({config, entry, mode, layout, values}) {
  const windows = layout === 'windows';
  return `// «${entry.label.ru}» (${entry.id}) из simai/ui-effects@${config.commit.slice(0, 12)}.
// Ядро берёт эффект${entry.pair ? ' и его пару' : ''} из каталога в SF_BOOT_CONFIG.effects и сверяет каждый файл
// с SHA-256 из индекса каталога, прежде чем запустить.
const area = document.querySelector('[data-effect-area]');
const placement = await SF.Effects.placeEffect(area, {
  effect: ${quote(entry.id)},
  themeMode: ${quote(mode)}, // 'auto' — как у страницы${mode === 'auto' ? '' : '; задан автором'}
  settings: ${indent(JSON.stringify(values, null, 2), '  ').trimStart()},${windows ? "\n  windows: true, // эффект виден только через карточки [data-sf-effect-window]" : ''}
});
if (!placement) console.warn('Эффект не запущен:', area.dataset.sfEffectReason);`;
}

export const jsonSnippet = ({values}) => JSON.stringify(values, null, 2);
