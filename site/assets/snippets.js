// «Получить код»: the snippets of the configurator. Every URL is pinned by
// commit (ui-effects: the published commit, injected at build; ui: the
// locked Framework release) and every file is checked against its SHA-256
// from the catalogue before it runs.

const indent = (code, prefix) => code.split('\n').map((line) => (line ? prefix + line : line)).join('\n');
const quote = (value) => `'${String(value).replace(/\\/gu, '\\\\').replace(/'/gu, "\\'")}'`;
const attr = (value) => String(value).replace(/&/gu, '&amp;').replace(/'/gu, '&#39;').replace(/</gu, '&lt;');

const files = (entry) => Object.fromEntries(entry.files.filter((file) => /\.(json|js)$/u.test(file.path)).map((file) => [file.path, file.sha256]));
function reference(entry, pair, pad) {
  const lines = [
    `id: ${quote(entry.id)},`,
    `base: CDN + ${quote(entry.path)},`,
    'files: {',
    ...Object.entries(files(entry)).map(([name, sha]) => `  ${quote(name)}: ${quote(sha)},`),
    '},',
    `schemes: [${entry.schemes.map(quote).join(', ')}],`,
  ];
  if (pair) lines.push(`pair: {\n${indent(reference(pair, null, ''), '  ')}\n},`);
  else lines.push('pair: null,');
  return indent(lines.join('\n'), pad);
}

export function connectSnippet(config) {
  const base = config.framework.base;
  return `<!-- SIMAI Framework ${config.framework.pair}, закреплён по полному коммиту -->
<link rel="stylesheet" href="${base}core/css/core.min.css">
<script>
  window.sfPath = '${base}';
</script>
<script src="${base}core/js/core.min.js"></script>`;
}

export function jsSnippet({config, catalogue, entry, pair, mode, layout, values}) {
  const placement = catalogue.runtime.placement;
  const windows = layout === 'windows';
  return `// «${entry.label.ru}» (${entry.id}) из simai/ui-effects@${config.commit.slice(0, 12)}.
// Каждый файл сверяется с SHA-256 из каталога и только потом запускается.
const CDN = ${quote(config.cdn)};
const PLACEMENT_SHA256 = ${quote(placement.sha256)};
const EFFECT = {
${reference(entry, pair, '  ')}
};
const SETTINGS = ${JSON.stringify(values, null, 2).replace(/\n/gu, '\n')};

async function importVerified(url, sha256) {
  const response = await fetch(url, {credentials: 'omit'});
  if (!response.ok) throw new Error(\`\${url}: HTTP \${response.status}\`);
  const bytes = await response.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hex !== sha256) throw new Error(\`\${url}: SHA-256 не совпадает с каталогом\`);
  const module = URL.createObjectURL(new Blob([bytes], {type: 'text/javascript'}));
  try {
    return await import(module);
  } finally {
    URL.revokeObjectURL(module);
  }
}

// Тема эффекта, пара${windows ? ' и окна' : ''} — placement.js из ui-effects, пока их не взяло
// ядро simai.effect 1.1. Монтирует эффект через SF.Effects.mountEffect.
const {mountPlacement} = await importVerified(CDN + ${quote(placement.path)}, PLACEMENT_SHA256);
const placement = mountPlacement(document.querySelector('[data-effect-area]'), {
  effect: EFFECT,
  themeMode: ${quote(mode)}, // 'auto' — как у страницы${mode === 'auto' ? '' : '; задан автором'}
  settings: SETTINGS,${windows ? "\n  windows: '[data-effect-window]', // эффект виден только через эти карточки" : ''}
});
await placement.ready;
if (placement.state.error) console.error('Эффект не запустился:', placement.state.error);`;
}

const heroMarkup = `<section class="effect-hero" data-effect-area>
  <div class="effect-hero__body">
    <h1>Заголовок первого экрана</h1>
    <p>Текст над эффектом берёт цвета темы, в которой эффект нарисован.</p>
  </div>
</section>
<style>
  .effect-hero { display: flex; align-items: center; min-height: 28rem; padding: 3rem 1.5rem; }
  .effect-hero__body { max-width: 36rem; }
</style>`;

const windowsMarkup = `<ul class="effect-windows" data-effect-area>
  <li class="effect-card" data-effect-window><div class="effect-card__text"><h3>Аналитика</h3><p>Показатели за неделю.</p></div></li>
  <li class="effect-card" data-effect-window><div class="effect-card__text"><h3>Заявки</h3><p>Новые и в работе.</p></div></li>
  <li class="effect-card" data-effect-window><div class="effect-card__text"><h3>Команда</h3><p>Роли и доступы.</p></div></li>
  <li class="effect-card"><div class="effect-card__text"><h3>Безопасность</h3><p>Карточка без окна — в теме страницы.</p></div></li>
</ul>
<style>
  .effect-windows { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
  .effect-card { display: flex; flex-direction: column; justify-content: flex-end; min-height: 9rem; padding: 1rem; border-radius: 0.75rem; background: var(--sf-surface-container); color: var(--sf-on-surface); }
  .effect-card h3, .effect-card p { margin: 0; }
  /* Подпись над эффектом — на вуали поверхности темы окна. */
  [data-effect-state="shown"] [data-effect-window] .effect-card__text { margin: -1rem; padding: 0.75rem 1rem; border-radius: 0 0 0.75rem 0.75rem; background: color-mix(in srgb, var(--sf-surface-0) 84%, transparent); }
</style>`;

export function htmlSnippet(options) {
  const markup = options.layout === 'windows' ? windowsMarkup : heroMarkup;
  return `${markup}
<script type="module">
${indent(jsSnippet(options), '  ')}
</script>`;
}

export function futureSnippet({config, entry, mode, layout, values}) {
  const url = `${config.cdn}${entry.path}effect.json`;
  const settings = attr(JSON.stringify(values));
  if (layout === 'windows') {
    return `<!-- После выхода ядра simai.effect 1.1. Имена атрибутов — из плана ядра. -->
<ul data-sf-effect="${url}"
    data-sf-effect-windows
    data-sf-effect-theme="${mode}"
    data-sf-effect-settings='${settings}'>
  <li data-sf-effect-window>…</li>
  <li data-sf-effect-window>…</li>
  <li>Карточка без окна</li>
</ul>`;
  }
  return `<!-- После выхода ядра simai.effect 1.1. Имена атрибутов — из плана ядра. -->
<section data-sf-effect="${url}"
         data-sf-effect-theme="${mode}"
         data-sf-effect-settings='${settings}'>
  <h1>Заголовок первого экрана</h1>
</section>`;
}

export const jsonSnippet = ({values}) => JSON.stringify(values, null, 2);
