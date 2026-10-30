// Gallery: every effect with its preview, schemes and pair, filtered by scheme.
import {badges, groupOf, loadCatalogue, onSiteColour, onSiteTheme, root, text} from './common.js';
import {outcomeOf, place} from './place.js';

const list = document.querySelector('[data-cards]');
const filters = document.querySelector('[data-filters]');

const catalogue = await loadCatalogue();
const byId = new Map(catalogue.effects.map((entry) => [entry.id, entry]));

for (const entry of catalogue.effects) {
  const item = document.createElement('li');
  item.className = 'card';
  item.dataset.id = entry.id;
  item.dataset.group = groupOf(entry);
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
  link.href = new URL(`effect/${entry.id}/`, root).href;
  link.textContent = text(entry.label);
  title.append(link);
  const description = document.createElement('p');
  description.className = 'card__desc small';
  description.textContent = text(entry.description);
  const marks = badges(entry);
  body.append(title, marks, description);
  item.append(media, body);
  list.append(item);
}

const counts = {all: catalogue.effects.length, dual: catalogue.counts.dual, dark: catalogue.counts.dark, light: catalogue.counts.light};
// The filter is a segmented Button Group of the Framework, with the counts on its segments.
const FILTERS = [['all', 'Все'], ['dual', 'Двухтемные'], ['dark', 'Тёмные'], ['light', 'Светлые']];
filters.setAttribute('items', JSON.stringify(FILTERS.map(([value, label]) => ({value, label, count: counts[value]}))));

const applyFilter = (filter) => {
  if (filters.getAttribute('value') !== filter) filters.setAttribute('value', filter);
  for (const card of list.children) {
    const on = filter === 'all' || card.dataset.group === filter;
    card.hidden = !on;
  }
  const url = new URL(location.href);
  if (filter === 'all') url.searchParams.delete('schemes'); else url.searchParams.set('schemes', filter);
  history.replaceState(null, '', url);
};
filters.addEventListener('change', (event) => { if (FILTERS.some(([value]) => value === event.detail?.value)) applyFilter(event.detail.value); });
const initial = new URL(location.href).searchParams.get('schemes');
applyFilter(['dual', 'dark', 'light'].includes(initial) ? initial : 'all');

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
  console.error('Эффект не запустился:', error?.reason ?? error);
});
placeIntro();
// The core switches the scheme with the page theme; the note follows it.
onSiteTheme(() => setTimeout(() => introHandle && describeIntro(introHandle), 60));
// A new main colour: the effect reads its tones again.
onSiteColour(() => { introHandle?.destroy(); introHandle = null; placeIntro(); });
document.documentElement.dataset.ready = 'true';
