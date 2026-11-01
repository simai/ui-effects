// Gallery: every effect as a picture with its name, subject and themes, filtered
// by category (the closed set in the catalogue) and by the theme it draws.
import {groupOf, home, loadCatalogue, onSiteColour, onSiteTheme, root, schemesName, t, text} from './common.js';
import {outcomeOf, place} from './place.js';

const list = document.querySelector('[data-cards]');
const categoryFilter = document.querySelector('[data-categories]');
const schemeFilter = document.querySelector('[data-schemes]');
const empty = document.querySelector('[data-empty]');

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

// Both filters are Framework controls: a segmented Button Group for the subject,
// a dropdown for the theme. The choice is kept in the address.
const CATEGORIES = ['all', ...catalogue.categories.map((category) => category.id)];
const SCHEMES = ['all', 'dual', 'dark', 'light'];
categoryFilter.setAttribute('items', JSON.stringify(CATEGORIES.map((value) => ({value, label: value === 'all' ? t('gallery.all') : categoryNames.get(value)}))));
schemeFilter.options = SCHEMES.map((value) => ({text: t(`scheme.${value}`), value}));
const state = {category: 'all', schemes: 'all'};
const applyFilters = () => {
  if (categoryFilter.getAttribute('value') !== state.category) categoryFilter.setAttribute('value', state.category);
  if (schemeFilter.value !== state.schemes) schemeFilter.setAttribute('value', state.schemes);
  let shown = 0;
  for (const card of list.children) {
    const on = (state.category === 'all' || card.dataset.categories.split(' ').includes(state.category)) && (state.schemes === 'all' || card.dataset.group === state.schemes);
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
  if (!CATEGORIES.includes(event.detail?.value)) return;
  state.category = event.detail.value;
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

// The pictures follow the theme: each card in view draws its effect once, as a still frame, in the
// page's scheme and colour, keeps the frame as an image and lets the effect go. One card at a time;
// the stored preview stays until a frame is ready, and stays for good if one cannot be drawn.
const inView = new Set(), waiting = new Set();
let drawing = false;
const pause = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
async function drawStill(card) {
  card.stale = false;
  const holder = document.createElement('div');
  holder.className = 'card__still';
  card.querySelector('.card__media').append(holder);
  let handle = null;
  try {
    handle = await place(holder, {id: card.dataset.id, themeMode: 'auto', reducedMotion: true});
    let canvas = null;
    for (let i = 0; i < 40 && !(canvas?.width > 1); i += 1) { await pause(25); canvas = holder.querySelector('canvas'); }
    if (!(canvas?.width > 1)) return;
    await new Promise((resolve) => { requestAnimationFrame(() => requestAnimationFrame(resolve)); });
    const blob = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/webp', 0.9); });
    if (!blob || card.stale) return;
    const url = URL.createObjectURL(blob), next = new Image();
    next.src = url;
    await next.decode();
    const image = card.querySelector('.card__img');
    if (card.still) URL.revokeObjectURL(card.still);
    card.still = url;
    image.src = url;
    card.dataset.still = 'theme';
  } catch { /* the stored preview stays */ } finally {
    handle?.destroy();
    holder.remove();
  }
}
async function drawWaiting() {
  if (drawing) return;
  drawing = true;
  while (waiting.size && !document.hidden) {
    const [card] = waiting;
    waiting.delete(card);
    await drawStill(card);
    await pause(20);
  }
  drawing = false;
}
const askStills = (which = () => true) => {
  for (const card of list.children) if (which(card)) card.stale = true;
  for (const card of inView) if (card.stale) waiting.add(card);
  drawWaiting();
};
const watcher = new IntersectionObserver((entries) => {
  for (const {target, isIntersecting} of entries) {
    if (isIntersecting) inView.add(target); else { inView.delete(target); waiting.delete(target); }
  }
  askStills(() => false);
}, {rootMargin: '200px'});
for (const card of list.children) { card.stale = true; watcher.observe(card); }
document.addEventListener('visibilitychange', () => askStills(() => false));
// A single-scheme effect keeps its scheme with the page's, so only a new colour redraws it.
onSiteTheme(() => setTimeout(() => askStills((card) => card.dataset.group === 'dual'), 60));
onSiteColour(() => askStills());

// The intro is itself a placement: hex-conduits in auto mode, drawn in the page's scheme.
const intro = document.querySelector('[data-intro]');
const describeIntro = (handle) => {
  intro.dataset.state = outcomeOf(handle, {id: 'hex-conduits', mode: 'auto'}).outcome;
};
let introHandle = null;
const placeIntro = () => place(intro, {id: 'hex-conduits', themeMode: 'auto'}).then((handle) => {
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
