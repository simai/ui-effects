// Effect page: a live stage (a banner and a group of windows, both placed at
// once), the theme mode limited to what the effect can draw, settings built
// from the manifest, a contrast readout, motion controls on the banner and the
// code.
import {badges, config, formatRatio, loadCatalogue, luminance, modeName, onSiteColour, onSiteTheme, ratio, schemeName, text} from './common.js';
import {effectiveMode, loadWithPair, outcomeOf, place} from './place.js';
import {connectSnippet, examplePage, htmlSnippet, jsSnippet, jsonSnippet} from './snippets.js';

const html = document.documentElement;
const id = html.dataset.effect;
const $ = (selector) => document.querySelector(selector);
const hero = $('[data-hero]');
const cards = $('[data-cards]');
const form = $('[data-form]');
const readout = $('[data-readout]');
const errorBox = $('[data-error]');

const catalogue = await loadCatalogue();
const byId = new Map(catalogue.effects.map((entry) => [entry.id, entry]));
const entry = byId.get(id);
// The effect, loaded by the core with SHA-256 checks; the modes offered are
// the ones the core allows.
const {Effects, main} = await loadWithPair(id);
const modes = Effects.allowedModes(main.manifest);

// Two placements of the same effect: the banner and the windows.
const state = {mode: 'auto', values: {}, paused: false, reduced: false, placements: [], last: null};
const forEachPlacement = (call) => state.placements.forEach(call);

// --- Head --------------------------------------------------------------------------
const facts = $('[data-facts]');
facts.append(badges(entry));

// --- Theme mode: only the modes the effect can draw ------------------------------------
// A segmented Button Group of the Framework; a choice arrives as its change event.
const modeGroup = $('[data-modes]');
modeGroup.setAttribute('items', JSON.stringify(modes.map((mode) => ({value: mode, label: modeName(mode)}))));
modeGroup.setAttribute('value', state.mode);
modeGroup.addEventListener('change', (event) => { if (modes.includes(event.detail?.value)) setMode(event.detail.value); });
const setMode = (mode) => {
  state.mode = mode;
  if (modeGroup.getAttribute('value') !== mode) modeGroup.setAttribute('value', mode);
  forEachPlacement((placement) => placement.update(state.values, {themeMode: effectiveMode(entry.schemes, mode)}));
  settleSoon();
  renderCode();
};

// --- Settings ---------------------------------------------------------------------
const {manifest} = main;
const userSettings = manifest.settings;
const defaults = () => Object.fromEntries(userSettings.map((setting) => [setting.key, setting.default]));
state.values = defaults();
const checkSetting = (setting, raw) => (window.SF?.Effects?.checkSetting ? window.SF.Effects.checkSetting(setting, raw) : {ok: true, value: raw});

// Every control is a Framework Smart component; each reports a committed value
// with a change event on its host.
function controlFor(setting, value) {
  const label = text(setting.label);
  const make = (tag, attributes) => {
    const element = document.createElement(tag);
    for (const [name, attribute] of Object.entries(attributes)) if (attribute !== undefined && attribute !== null && attribute !== false) element.setAttribute(name, attribute === true ? '' : String(attribute));
    return element;
  };
  switch (setting.type) {
    case 'integer':
    case 'number':
      // The slider's own label attribute is how a handle shows its value; the field's name is a caption above it.
      return {caption: label, element: make('sf-range-slider', {min: setting.min, max: setting.max, step: setting.step ?? (setting.type === 'integer' ? 1 : (setting.max - setting.min) / 100), value, label: 'tooltip', decimals: setting.type === 'integer' ? '0' : undefined, suffix: setting.unit ? ` ${setting.unit}` : undefined, 'aria-label': label}),
        read: (event) => Number(event.detail?.values?.[0] ?? event.detail?.value)};
    case 'boolean':
      return {element: make('sf-switch', {label, checked: Boolean(value), size: '1'}), read: (event, element) => Boolean(element.checked)};
    case 'choice': {
      // Options go in as a property: given as an attribute, the field does not show the chosen one.
      const element = make('sf-dropdown', {label, size: '1', value: String(value)});
      element.options = setting.options.map((option) => ({text: text(option.label) || String(option.value), value: String(option.value)}));
      return {element, read: (event, picker) => picker.value};
    }
    case 'color':
      return {element: make('sf-color', {label, value, size: '1'}), read: (event) => event.detail?.value ?? ''};
    case 'text':
      return {element: make('sf-textarea', {label, value: value ?? '', rows: 3, maxlength: setting.max, size: '1'}), read: (event, element) => event.detail?.value ?? element.value};
    default:
      return {element: make('sf-input', {label, value: value ?? '', maxlength: setting.max, size: '1'}), read: (event, element) => event.detail?.value ?? element.value};
  }
}

function buildForm() {
  form.replaceChildren();
  userSettings.forEach((setting) => {
    const field = document.createElement('div');
    field.className = 'field';
    field.dataset.key = setting.key;
    const {element, read, caption} = controlFor(setting, state.values[setting.key]);
    if (caption) {
      const name = document.createElement('p');
      name.className = 'field__label';
      name.textContent = caption;
      field.append(name);
    }
    field.append(element);
    if (setting.hint) {
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = text(setting.hint);
      field.append(hint);
    }
    element.addEventListener('change', (event) => {
      if (event.target !== element) return;
      const checked = checkSetting(setting, read(event, element));
      field.querySelector('.invalid')?.remove();
      if (!checked.ok) {
        const note = document.createElement('p');
        note.className = 'invalid';
        note.textContent = 'Значение вне допустимого — эффект его не получит.';
        field.append(note);
        return;
      }
      state.values = {...state.values, [setting.key]: checked.value};
      forEachPlacement((placement) => placement.update(state.values));
      renderCode();
      scheduleMeasure(300);
    });
    form.append(field);
  });
}
buildForm();
$('[data-reset]').addEventListener('click', () => {
  state.values = defaults();
  buildForm();
  forEachPlacement((placement) => placement.update(state.values));
  renderCode();
  scheduleMeasure(300);
});

// --- Mounting -----------------------------------------------------------------------
// One short line, only when the effect is not drawn as the page asks.
const policyText = (current) => {
  switch (current.outcome) {
    case 'kept': return current.drawn === 'light' ? 'Показан светлым: тёмной версии нет.' : 'Показан тёмным: светлой версии нет.';
    case 'hidden': return 'Не показан.';
    default: return '';
  }
};
function describe(current) {
  const line = $('[data-policy]');
  line.dataset.outcome = current.outcome;
  line.textContent = policyText(current);
  const note = $('[data-settings-note]');
  note.hidden = Boolean(current.shown);
  note.textContent = current.shown ? '' : 'Эффект сейчас не показан; настройки применятся, когда он появится.';
}

// What the placements show now: the core follows the page theme on its own,
// so this is read again after every change the site makes or sees.
function settle() {
  const current = state.error
    ? {shown: null, drawn: Effects.pageScheme(), outcome: 'hidden', error: state.error}
    : state.placements[0] ? outcomeOf(state.placements[0], {id, pairId: entry.pair, mode: state.mode}) : null;
  if (!current) return;
  state.last = current;
  errorBox.hidden = !current.error;
  errorBox.textContent = current.error ? `Эффект не запустился: ${current.error}.` : '';
  html.dataset.outcome = current.outcome;
  html.dataset.drawn = current.drawn;
  html.dataset.shown = current.shown ?? '';
  html.dataset.mounted = current.error ? 'error' : current.shown ? 'yes' : 'hidden';
  describe(current);
  scheduleMeasure(900);
}
// The core applies a page theme change from its own observer: read after it.
const settleSoon = () => setTimeout(settle, 60);

let mounting = 0;
async function mount() {
  const mine = ++mounting;
  forEachPlacement((placement) => placement.destroy());
  state.placements = [];
  state.error = null;
  html.dataset.mounted = 'pending';
  readout.dataset.measured = 'false';
  let placements = [];
  try {
    const options = {id, themeMode: state.mode, settings: state.values, reducedMotion: state.reduced};
    placements = await Promise.all([place(hero, options), place(cards, {...options, windows: true})]);
  } catch (error) {
    if (mine !== mounting) return;
    state.error = error?.reason ?? String(error?.message ?? error);
  }
  if (mine !== mounting) { placements.forEach((placement) => placement?.destroy()); return; }
  state.placements = placements;
  if (state.paused) forEachPlacement((placement) => placement.pause());
  settle();
}

// The motion controls sit on the banner and act on both placements.
const pause = $('[data-pause]');
pause.addEventListener('click', () => {
  state.paused = !state.paused;
  pause.setAttribute('aria-pressed', String(state.paused));
  pause.setAttribute('aria-label', state.paused ? 'Продолжить' : 'Пауза');
  pause.title = pause.getAttribute('aria-label');
  forEachPlacement((placement) => (state.paused ? placement.pause() : placement.resume()));
});
const reduced = $('[data-reduced]');
reduced.addEventListener('click', () => {
  state.reduced = !state.reduced;
  reduced.setAttribute('aria-pressed', String(state.reduced));
  reduced.classList.toggle('active', state.reduced);
  mount();
});
onSiteTheme(settleSoon);
// A new main colour: the effect reads its tones again.
onSiteColour(() => mount());

// --- Contrast readout ------------------------------------------------------------------
// Every text over the effect is sampled from the effect's canvas, laid over the
// area's ground and any veil under the text, and compared with the text colour.
// The figure is the 5th percentile: 95 % of the text area is at least that.
const scratch = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
const rgba = (value) => {
  scratch.canvas.width = scratch.canvas.height = 1;
  scratch.clearRect(0, 0, 1, 1);
  scratch.fillStyle = 'rgba(0, 0, 0, 0)';
  scratch.fillStyle = value;
  scratch.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = scratch.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
};
const veilOf = (element, area) => {
  for (let node = element; node && node !== area; node = node.parentElement) {
    // A faded veil declares its full-strength colour; the text sits on that part.
    const declared = getComputedStyle(node).getPropertyValue('--window-veil').trim();
    if (declared && rgba(declared)[3] > 0) return rgba(declared);
    const colour = rgba(getComputedStyle(node).backgroundColor);
    if (colour[3] > 0) return colour;
  }
  return null;
};
// The painted ground under an element: its own and its ancestors' backgrounds,
// composited from the first opaque one up (surface-container is translucent).
const groundOf = (element) => {
  const layers = [];
  for (let node = element; node; node = node.parentElement) {
    const colour = rgba(getComputedStyle(node).backgroundColor);
    if (colour[3] > 0) layers.push(colour);
    if (colour[3] >= 0.999) break;
  }
  let ground = [255, 255, 255];
  for (const [r, g, b, a] of layers.reverse()) ground = [r * a + ground[0] * (1 - a), g * a + ground[1] * (1 - a), b * a + ground[2] * (1 - a)];
  return ground;
};
let timer = 0;
const scheduleMeasure = (delay = 0) => { clearTimeout(timer); timer = setTimeout(measure, delay); };
const setReadout = (status, message, p5 = null) => {
  readout.dataset.state = status;
  readout.dataset.p5 = p5 === null ? '' : p5.toFixed(3);
  readout.dataset.measured = 'true';
  $('[data-readout-text]').textContent = message;
};
// Ratios of every text over one area's effect to the pixels under it.
function ratiosOver(area, selector) {
  const host = area.querySelector(':scope > [data-sf-effect-layer]');
  const canvas = host?.querySelector('canvas');
  if (!canvas || !canvas.width) return null;
  const box = canvas.getBoundingClientRect();
  const sx = canvas.width / box.width;
  const sy = canvas.height / box.height;
  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d', {willReadFrequently: true});
  try { context.drawImage(canvas, 0, 0); } catch (error) { return null; }
  const ground = rgba(getComputedStyle(host).backgroundColor);
  const ratios = [];
  for (const element of area.querySelectorAll(selector)) {
    const ink = luminance(rgba(getComputedStyle(element).color));
    const veil = veilOf(element, area);
    const range = document.createRange();
    range.selectNodeContents(element);
    for (const rect of range.getClientRects()) {
      const x = Math.max(0, Math.floor((rect.left - box.left) * sx));
      const y = Math.max(0, Math.floor((rect.top - box.top) * sy));
      const w = Math.min(copy.width - x, Math.ceil(rect.width * sx));
      const h = Math.min(copy.height - y, Math.ceil(rect.height * sy));
      if (w <= 0 || h <= 0) continue;
      const data = context.getImageData(x, y, w, h).data;
      const stride = 4 * Math.max(1, Math.floor(Math.sqrt((w * h) / 4000)));
      for (let i = 0; i < data.length; i += stride) {
        const a = data[i + 3] / 255;
        let pixel = [0, 1, 2].map((k) => data[i + k] * a + ground[k] * (1 - a));
        if (veil) pixel = pixel.map((value, k) => value * (1 - veil[3]) + veil[k] * veil[3]);
        ratios.push(ratio(ink, luminance(pixel)));
      }
    }
  }
  return ratios;
}
// The banner's text and the windows' captions together; the figure is the 5th
// percentile: 95 % of the text area is at least that.
function measure() {
  const current = state.last;
  if (!current) return;
  if (!current.shown) {
    const texts = [...hero.querySelectorAll('[data-text]'), ...cards.querySelectorAll('[data-effect-window] [data-text]')];
    const worst = Math.min(...texts.map((element) => ratio(luminance(rgba(getComputedStyle(element).color)), luminance(groundOf(element)))));
    setReadout(worst >= 4.5 ? 'ok' : 'warn', `Контраст текста ${formatRatio(worst)}`, worst);
    return;
  }
  const parts = [ratiosOver(hero, '[data-text]'), ratiosOver(cards, '[data-effect-window] [data-text]')];
  if (parts.some((part) => part === null)) { setReadout('none', 'Контраст не измерен: эффект рисует не на canvas.'); return; }
  const ratios = parts.flat().sort((a, b) => a - b);
  if (!ratios.length) { setReadout('none', 'Контраст не измерен.'); return; }
  const p5 = ratios[Math.floor(ratios.length * 0.05)];
  setReadout(p5 >= 4.5 ? 'ok' : 'warn', `Контраст текста ${formatRatio(p5)}${p5 >= 4.5 ? '' : ' — ниже 4,5:1'}`, p5);
}
setInterval(() => { if (!state.paused && !document.hidden) measure(); }, 2500);

// --- Get the code ------------------------------------------------------------------
// The blocks are the Framework's code highlight (language bar and copy button);
// a new text goes in through SF.Highlight.refresh, or as plain text without it.
// The Loader does not find the blocks inside the tabs by itself, so the
// component is asked for by name.
const highlighter = new Promise((resolve) => {
  globalThis.SF?.Loader?.ensurePlugin?.('highlight');
  const started = Date.now();
  const tick = () => (globalThis.SF?.Highlight?.refresh ? resolve(globalThis.SF.Highlight) : Date.now() - started > 60000 ? resolve(null) : setTimeout(tick, 100));
  tick();
});
function setCode(name, source) {
  const code = $(`[data-code="${name}"]`);
  code.textContent = source;
  highlighter.then((highlight) => highlight?.refresh(code.closest('.sf-highlight') ?? code.parentElement, source));
}
function renderCode() {
  const options = {config, catalogue, entry, mode: state.mode, values: state.values};
  setCode('html', htmlSnippet({...options, layout: 'hero'}));
  setCode('html-windows', htmlSnippet({...options, layout: 'windows'}));
  setCode('connect', connectSnippet(config));
  setCode('js', jsSnippet({...options, layout: 'hero'}));
  setCode('json', jsonSnippet(options));
}

// --- Download an example ------------------------------------------------------------
// A standalone page with the snippets as they stand: the connection, then the
// banner, the cards or both, with the current settings and theme mode.
const layoutPicker = $('[data-download-layout]');
layoutPicker.options = [{text: 'Баннер и карточки', value: 'both'}, {text: 'Только баннер', value: 'hero'}, {text: 'Только карточки', value: 'windows'}];
$('[data-download]').addEventListener('click', () => {
  const options = {config, catalogue, entry, mode: state.mode, values: state.values};
  const layout = layoutPicker?.value || 'both';
  const parts = [layout !== 'windows' ? htmlSnippet({...options, layout: 'hero'}) : '', layout !== 'hero' ? htmlSnippet({...options, layout: 'windows'}) : ''].filter(Boolean);
  const page = examplePage({entry, connect: connectSnippet(config), parts});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([page], {type: 'text/html'}));
  link.download = `${entry.id}-example.html`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// --- About the effect ------------------------------------------------------------------
const aboutList = $('[data-facts-list]');
const fact = (term, value) => {
  const row = document.createElement('div');
  const dt = document.createElement('dt');
  dt.textContent = term;
  const dd = document.createElement('dd');
  dd.textContent = value;
  row.append(dt, dd);
  aboutList.append(row);
};
const SURFACES = {'sign-in': 'страница входа', hero: 'первый экран', section: 'раздел', dashboard: 'дашборд', docs: 'документация', product: 'страница продукта'};
fact('Темы', entry.schemes.length > 1 ? 'тёмная и светлая' : schemeName(entry.schemes[0]));
fact('Где уместен', manifest.surfaces.map((surface) => SURFACES[surface] ?? surface).join(', '));
fact('Проверки Framework', entry.kit.status === 'pass' ? `пройдены все ${entry.kit.total}` : `не пройдены (${entry.kit.passed} из ${entry.kit.total})`);
fact('Размер', `${(entry.files.find((file) => file.path === 'index.js').size / 1024).toFixed(1).replace('.', ',')} КБ, без зависимостей и сети`);
fact('Версия', `${entry.version}, стандарт ${catalogue.standard}`);
$('[data-source]').href = `https://github.com/simai/ui-effects/tree/${config.commit}/${entry.path}`;

renderCode();
mount();
html.dataset.ready = 'true';
