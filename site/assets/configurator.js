// Effect page: a live stage (a banner and a group of windows, both placed at
// once), the theme mode limited to what the effect can draw, settings built
// from the manifest, a contrast readout, motion controls on the banner and the
// code.
import {badges, config, formatNumber, formatRatio, loadCatalogue, luminance, modeName, onSiteColour, onSiteTheme, ratio, schemesName, t, text} from './common.js';
import {loadWithPair, outcomeOf, place} from './place.js';
import {connectSnippet, examplePage, htmlSnippet, jsSnippet, jsonSnippet} from './snippets.js';
import {loadStats, myVote, used, vote} from './votes.js';

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

// --- Likes ------------------------------------------------------------------------------
// Two buttons with their counts, shown once the votes service answers. A press
// gives the browser's vote; the same press again takes it back.
const votesBox = $('[data-votes]');
const voteButtons = [...votesBox.querySelectorAll('[data-vote]')];
const showVotes = (counts) => {
  const mine = myVote(id);
  for (const button of voteButtons) {
    const value = Number(button.dataset.vote);
    button.querySelector('[data-count]').textContent = formatNumber(value > 0 ? counts?.up ?? 0 : counts?.down ?? 0, 0);
    button.setAttribute('aria-pressed', String(mine === value));
  }
};
loadStats().then((stats) => {
  if (!stats) return;
  showVotes(stats[id]);
  votesBox.hidden = false;
});
for (const button of voteButtons) {
  button.addEventListener('click', async () => {
    const value = Number(button.dataset.vote);
    voteButtons.forEach((other) => { other.disabled = true; });
    const counts = await vote(id, myVote(id) === value ? 0 : value);
    voteButtons.forEach((other) => { other.disabled = false; });
    if (counts) showVotes(counts);
  });
}

// --- Theme mode: only the modes the effect can draw ------------------------------------
// A segmented Button Group of the Framework; a choice arrives as its change event.
const modeGroup = $('[data-modes]');
modeGroup.setAttribute('items', JSON.stringify(modes.map((mode) => ({value: mode, label: modeName(mode)}))));
modeGroup.setAttribute('value', state.mode);
modeGroup.addEventListener('change', (event) => { if (modes.includes(event.detail?.value)) setMode(event.detail.value); });
const setMode = (mode) => {
  state.mode = mode;
  if (modeGroup.getAttribute('value') !== mode) modeGroup.setAttribute('value', mode);
  forEachPlacement((placement) => placement.update(state.values, {themeMode: mode}));
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
      return {inner: true, element: make('sf-switch', {label, checked: Boolean(value), size: '1'}), read: (event, element) => Boolean(element.checked)};
    case 'choice': {
      // Options go in as a property: given as an attribute, the field does not show the chosen one.
      const element = make('sf-dropdown', {label, size: '1', value: String(value), search: 'false'});
      element.options = setting.options.map((option) => ({text: text(option.label) || String(option.value), value: String(option.value)}));
      return {inner: true, element, read: (event, picker) => picker.value};
    }
    case 'color':
      return {element: make('sf-color', {label, value, size: '1'}), read: (event) => event.detail?.value ?? ''};
    case 'text':
      return {live: true, element: make('sf-textarea', {label, value: value ?? '', rows: 3, maxlength: setting.max, size: '1'}), read: (event, element) => element.value};
    default:
      return {live: true, element: make('sf-input', {label, value: value ?? '', maxlength: setting.max, size: '1'}), read: (event, element) => element.value};
  }
}

function buildForm() {
  form.replaceChildren();
  userSettings.forEach((setting) => {
    const field = document.createElement('div');
    field.className = 'field';
    field.dataset.key = setting.key;
    const {element, read, caption, live, inner} = controlFor(setting, state.values[setting.key]);
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
    const apply = (event) => {
      const checked = checkSetting(setting, read(event, element));
      field.querySelector('.invalid')?.remove();
      if (!checked.ok) {
        const note = document.createElement('p');
        note.className = 'invalid';
        note.textContent = t('effect.invalid');
        field.append(note);
        return;
      }
      state.values = {...state.values, [setting.key]: checked.value};
      forEachPlacement((placement) => placement.update(state.values));
      renderCode();
      scheduleMeasure(300);
    };
    // A text field applies as it is typed, after a short pause. A switch and a dropdown report their
    // change from the field inside them: the native event bubbles to the host, as their contracts say),
    // so any change within them counts and the value is read from the component. A range
    // slider reports its committed value on the host itself; its inner events carry other details.
    let typing = 0;
    if (live) {
      element.addEventListener('input', (event) => { clearTimeout(typing); typing = setTimeout(() => apply(event), 400); });
      element.addEventListener('change', (event) => { clearTimeout(typing); apply(event); });
    } else if (inner) {
      element.addEventListener('change', (event) => apply(event));
    } else {
      element.addEventListener('change', (event) => { if (event.target === element) apply(event); });
    }
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
    case 'kept': return t(current.drawn === 'light' ? 'effect.kept.light' : 'effect.kept.dark');
    case 'hidden': return t('effect.hidden');
    default: return '';
  }
};
function describe(current) {
  const line = $('[data-policy]');
  line.dataset.outcome = current.outcome;
  line.textContent = policyText(current);
  const note = $('[data-settings-note]');
  note.hidden = Boolean(current.shown);
  note.textContent = current.shown ? '' : t('effect.not-shown');
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
  errorBox.textContent = current.error ? t('effect.failed', {reason: current.error}) : '';
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
  pause.setAttribute('aria-label', t(state.paused ? 'demo.resume' : 'demo.pause'));
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
    setReadout(worst >= 4.5 ? 'ok' : 'warn', t('effect.contrast', {ratio: formatRatio(worst)}), worst);
    return;
  }
  const parts = [ratiosOver(hero, '[data-text]'), ratiosOver(cards, '[data-effect-window] [data-text]')];
  if (parts.some((part) => part === null)) { setReadout('none', t('effect.contrast.no-canvas')); return; }
  const ratios = parts.flat().sort((a, b) => a - b);
  if (!ratios.length) { setReadout('none', t('effect.contrast.none')); return; }
  const p5 = ratios[Math.floor(ratios.length * 0.05)];
  setReadout(p5 >= 4.5 ? 'ok' : 'warn', t(p5 >= 4.5 ? 'effect.contrast' : 'effect.contrast.low', {ratio: formatRatio(p5)}), p5);
}
setInterval(() => { if (!state.paused && !document.hidden) measure(); }, 2500);

// --- Get the code ------------------------------------------------------------------
// The blocks are the Framework's code highlight (language bar and copy button);
// a new text goes in through SF.Highlight.refresh, or as plain text without it.
// The Loader does not find the blocks inside the tabs by itself, so the
// component is asked for by name.
// The plugin is asked for as soon as the Loader is there: this module can run before it.
const highlighter = new Promise((resolve) => {
  const started = Date.now();
  let asked = false;
  const tick = () => {
    if (!asked && globalThis.SF?.Loader?.ensurePlugin) { asked = true; globalThis.SF.Loader.ensurePlugin('highlight'); }
    if (globalThis.SF?.Highlight?.refresh) resolve(globalThis.SF.Highlight);
    else if (Date.now() - started > 60000) resolve(null);
    else setTimeout(tick, 100);
  };
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
if (!config.published) $('[data-draft-note]').hidden = false;
layoutPicker.options = ['both', 'hero', 'windows'].map((value) => ({text: t(`panel.download.${value}`), value}));
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
  used(id, 'download');
});
// A copy of the code, by its button or by selecting it, counts once per browser.
const codeTabs = $('[data-code-tabs]');
codeTabs.addEventListener('click', (event) => { if (event.target.closest('.sf-highlight__copy')) used(id, 'copy'); });
codeTabs.addEventListener('copy', () => used(id, 'copy'));

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
const categoryNames = new Map(catalogue.categories.map((category) => [category.id, text(category.label)]));
fact(t('fact.categories'), entry.categories.map((category) => categoryNames.get(category) ?? category).join(', '));
fact(t('fact.schemes'), schemesName(entry));
fact(t('fact.surfaces'), manifest.surfaces.map((surface) => (config.strings[`surface.${surface}`] ? t(`surface.${surface}`) : surface)).join(', '));
fact(t('fact.kit'), t(entry.kit.status === 'pass' ? 'fact.kit.pass' : 'fact.kit.fail', entry.kit));
fact(t('fact.size'), t('fact.size.value', {size: formatNumber(entry.files.find((file) => file.path === 'index.js').size / 1024, 1)}));
fact(t('fact.version'), t('fact.version.value', {version: entry.version, standard: catalogue.standard}));
$('[data-source]').href = `https://github.com/simai/ui-effects/tree/${config.commit}/${entry.path}`;

renderCode();
mount();
html.dataset.ready = 'true';
