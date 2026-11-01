// Gallery: every effect as a picture with its name, subject and themes, filtered
// by category (the closed set in the catalogue) and by the theme it draws, in
// the catalogue's order or, with the votes service, the most liked first.
import {config, groupOf, home, loadCatalogue, onSiteColour, onSiteTheme, root, schemesName, siteColour, siteTheme, t, text} from './common.js';
import {outcomeOf, place} from './place.js';
import {loadStats} from './votes.js';

const list = document.querySelector('[data-cards]');
const categoryFilter = document.querySelector('[data-categories]');
const schemeFilter = document.querySelector('[data-schemes]');
const empty = document.querySelector('[data-empty]');
const sortPicker = document.querySelector('[data-sort]');

const catalogue = await loadCatalogue();
const categoryNames = new Map(catalogue.categories.map((category) => [category.id, text(category.label)]));

// A card is the picture and three lines under it: the name, the subject and
// themes, and a short description. The whole card is one link.
for (const entry of catalogue.effects) {
  const item = document.createElement('li');
  item.className = 'card';
  item.dataset.id = entry.id;
  item.dataset.group = groupOf(entry);
  item.dataset.categories = entry.categories.join(' ');
  const image = document.createElement('img');
  image.className = 'card__img';
  image.src = new URL(`${entry.path}preview.png`, root).href;
  image.alt = '';
  image.loading = 'lazy';
  image.width = 640;
  image.height = 360;
  const media = document.createElement('div');
  media.className = 'card__media';
  media.append(image);
  const body = document.createElement('div');
  body.className = 'card__body';
  const title = document.createElement('h3');
  title.className = 'card__title';
  const link = document.createElement('a');
  link.href = new URL(`effect/${entry.id}/`, home).href;
  link.textContent = text(entry.label);
  title.append(link);
  const meta = document.createElement('p');
  meta.className = 'card__meta';
  meta.textContent = [...entry.categories.map((category) => categoryNames.get(category)), schemesName(entry)].join(' · ');
  const description = document.createElement('p');
  description.className = 'card__desc';
  description.textContent = text(entry.description);
  body.append(title, meta, description);
  item.append(media, body);
  list.append(item);
}

// Both filters are Framework dropdowns. Each offers only what gives at least one effect under the
// other filter, with how many it gives. The choice is kept in the address.
const CATEGORIES = ['all', ...catalogue.categories.map((category) => category.id)];
const SCHEMES = ['all', 'dual', 'dark', 'light'];
const state = {category: 'all', schemes: 'all'};
const inCategory = (card, category) => category === 'all' || card.dataset.categories.split(' ').includes(category);
const inSchemes = (card, schemes) => schemes === 'all' || card.dataset.group === schemes;
const optionsOf = (values, name, count, chosen) => values
  .map((value) => ({value, n: count(value)}))
  .filter(({value, n}) => n > 0 || value === chosen)
  .map(({value, n}) => ({text: `${name(value)} · ${n}`, value}));
const fill = (picker, options, value) => {
  if (JSON.stringify(picker.options) !== JSON.stringify(options)) picker.options = options;
  if (picker.value !== value) picker.setAttribute('value', value);
};
const applyFilters = () => {
  const cards = [...list.children];
  fill(categoryFilter, optionsOf(CATEGORIES, (value) => (value === 'all' ? t('gallery.allCategories') : categoryNames.get(value)),
    (value) => cards.filter((card) => inCategory(card, value) && inSchemes(card, state.schemes)).length, state.category), state.category);
  fill(schemeFilter, optionsOf(SCHEMES, (value) => t(`scheme.${value}`),
    (value) => cards.filter((card) => inCategory(card, state.category) && inSchemes(card, value)).length, state.schemes), state.schemes);
  let shown = 0;
  for (const card of list.children) {
    const on = inCategory(card, state.category) && inSchemes(card, state.schemes);
    card.hidden = !on;
    if (on) shown += 1;
  }
  empty.hidden = shown > 0;
  const url = new URL(location.href);
  for (const [key, value] of [['category', state.category], ['schemes', state.schemes]]) {
    if (value === 'all') url.searchParams.delete(key); else url.searchParams.set(key, value);
  }
  history.replaceState(null, '', url);
};
categoryFilter.addEventListener('change', (event) => {
  if (event.target !== categoryFilter || !CATEGORIES.includes(categoryFilter.value)) return;
  state.category = categoryFilter.value;
  applyFilters();
});
schemeFilter.addEventListener('change', (event) => {
  if (event.target !== schemeFilter || !SCHEMES.includes(schemeFilter.value)) return;
  state.schemes = schemeFilter.value;
  applyFilters();
});
const asked = new URL(location.href).searchParams;
if (CATEGORIES.includes(asked.get('category'))) state.category = asked.get('category');
if (SCHEMES.includes(asked.get('schemes'))) state.schemes = asked.get('schemes');
applyFilters();

// Popular: the lower Wilson bound of the share of likes first (a few likes do
// not outrank many), then how many browsers took the code, then the catalogue.
const SORTS = ['catalogue', 'popular'];
const catalogueOrder = [...list.children];
let stats = null;
const sortCards = (sort) => {
  const usage = (card) => (stats[card.dataset.id]?.copied ?? 0) + (stats[card.dataset.id]?.downloaded ?? 0);
  const order = sort === 'popular'
    ? [...catalogueOrder].sort((a, b) => (stats[b.dataset.id]?.score ?? 0) - (stats[a.dataset.id]?.score ?? 0) || usage(b) - usage(a))
    : catalogueOrder;
  list.append(...order);
  const url = new URL(location.href);
  if (sort === 'popular') url.searchParams.set('sort', sort); else url.searchParams.delete('sort');
  history.replaceState(null, '', url);
};
loadStats().then((answer) => {
  if (!answer) return;
  stats = answer;
  sortPicker.options = SORTS.map((value) => ({text: t(`sort.${value}`), value}));
  const sort = SORTS.includes(asked.get('sort')) ? asked.get('sort') : 'catalogue';
  sortPicker.setAttribute('value', sort);
  sortPicker.hidden = false;
  if (sort !== 'catalogue') sortCards(sort);
});
sortPicker.addEventListener('change', (event) => {
  if (event.target !== sortPicker || !SORTS.includes(sortPicker.value) || !stats) return;
  sortCards(sortPicker.value);
});

// The pictures follow the theme and the colour: each card in view draws its effect once, as a still
// frame in the page's scheme and colour, and lets the effect go. Every frame is kept in the browser's
// Cache Storage under the effect, its scheme and the colour (and this build's commit), so a theme or
// colour seen before comes back at once, on this visit and the next; only a new one is drawn, three
// cards at a time. The stored preview stays until a frame is ready, and for good if none can be drawn.
const STILLS = `ui-effects-stills-${config.commit}`;
const shown = new Map();
let store = null;
const openStore = () => (store ??= (globalThis.caches ? caches.open(STILLS).catch(() => null) : Promise.resolve(null)));
globalThis.caches?.keys().then((names) => names.filter((name) => name.startsWith('ui-effects-stills-') && name !== STILLS).forEach((name) => caches.delete(name))).catch(() => {});
// A single-scheme effect keeps its own scheme whatever the page's, so only the colour names it.
const stillKey = (card) => new URL(`stills/${card.dataset.id}/${card.dataset.group === 'dual' ? siteTheme() : 'own'}/${encodeURIComponent(siteColour() || 'theme')}.webp`, root).href;
const showStill = (card, key) => {
  if (!shown.has(key) || stillKey(card) !== key) return false;
  card.querySelector('.card__img').src = shown.get(key);
  card.dataset.still = 'theme';
  return true;
};
const inView = new Set(), waiting = new Set();
let drawing = 0;
const pause = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
async function frameOf(card) {
  const holder = document.createElement('div');
  holder.className = 'card__still';
  card.querySelector('.card__media').append(holder);
  let handle = null;
  try {
    handle = await place(holder, {id: card.dataset.id, themeMode: 'auto', reducedMotion: true});
    let canvas = null;
    for (let i = 0; i < 40 && !(canvas?.width > 1); i += 1) { await pause(25); canvas = holder.querySelector('canvas'); }
    if (!(canvas?.width > 1)) return null;
    await new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); });
    return await new Promise((resolve) => { canvas.toBlob(resolve, 'image/webp', 0.9); });
  } catch { return null; } finally {
    handle?.destroy();
    holder.remove();
  }
}
async function drawStill(card) {
  const key = stillKey(card);
  if (showStill(card, key)) return;
  const cache = await openStore();
  let blob = await cache?.match(key).then((response) => response?.blob()).catch(() => null);
  if (!blob) {
    blob = await frameOf(card);
    if (!blob) return;
    cache?.put(key, new Response(blob, {headers: {'content-type': 'image/webp'}})).catch(() => {});
  }
  const url = URL.createObjectURL(blob), next = new Image();
  next.src = url;
  await next.decode().catch(() => {});
  shown.set(key, url);
  showStill(card, key);
}
async function drawWaiting() {
  if (drawing >= 3) return;
  drawing += 1;
  while (waiting.size && !document.hidden) {
    const [card] = waiting;
    waiting.delete(card);
    await drawStill(card);
  }
  drawing -= 1;
}
// Cards whose frame for the page's theme and colour is at hand change at once; the rest in view wait.
const askStills = () => {
  for (const card of list.children) showStill(card, stillKey(card));
  for (const card of inView) if (stillKey(card) !== card.dataset.key) { card.dataset.key = stillKey(card); waiting.add(card); }
  for (let i = 0; i < 3; i += 1) drawWaiting();
};
const watcher = new IntersectionObserver((entries) => {
  for (const {target, isIntersecting} of entries) {
    if (isIntersecting) { inView.add(target); delete target.dataset.key; } else { inView.delete(target); waiting.delete(target); }
  }
  askStills();
}, {rootMargin: '200px'});
for (const card of list.children) watcher.observe(card);
document.addEventListener('visibilitychange', askStills);
onSiteTheme(() => setTimeout(askStills, 60));
onSiteColour(() => askStills());

// The intro is itself a placement: star-flight in auto mode, drawn in the page's scheme.
const intro = document.querySelector('[data-intro]');
const describeIntro = (handle) => {
  intro.dataset.state = outcomeOf(handle, {id: 'star-flight', mode: 'auto'}).outcome;
};
let introHandle = null;
const placeIntro = () => place(intro, {id: 'star-flight', themeMode: 'auto'}).then((handle) => {
  introHandle?.destroy();
  introHandle = handle;
  describeIntro(handle);
}, (error) => {
  intro.dataset.state = 'error';
  console.error(t('effect.failed', {reason: error?.reason ?? error}));
});
placeIntro();
// The core switches the scheme with the page theme; the note follows it.
onSiteTheme(() => setTimeout(() => introHandle && describeIntro(introHandle), 60));
// A new main colour: the effect reads its tones again.
onSiteColour(() => { introHandle?.destroy(); introHandle = null; placeIntro(); });
document.documentElement.dataset.ready = 'true';
