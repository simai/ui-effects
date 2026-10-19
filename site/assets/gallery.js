// Gallery: every effect with its preview, schemes and pair, filtered by scheme.
import {badges, groupOf, loadCatalogue, onSiteColour, onSiteTheme, root, text} from './common.js';
import {outcomeOf, place} from './place.js';

const list = document.querySelector('[data-cards]');
const shown = document.querySelector('[data-shown]');
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
  const pair = document.createElement('p');
  pair.className = 'card__pair small';
  pair.textContent = entry.schemes.length > 1
    ? 'Рисует обе схемы.'
    : entry.schemes[0] === 'dark' ? 'На светлой странице остаётся тёмным.' : 'На тёмной странице не показывается.';
  const marks = badges(entry);
  body.append(title, marks, description, pair);
  item.append(image, body);
  list.append(item);
}

const counts = {all: catalogue.effects.length, dual: catalogue.counts.dual, dark: catalogue.counts.dark, light: catalogue.counts.light};
// The filter is a segmented Button Group of the Framework, with the counts on its segments.
const FILTERS = [['all', 'Все'], ['dual', 'Двухтемные'], ['dark', 'Тёмные'], ['light', 'Светлые']];
filters.setAttribute('items', JSON.stringify(FILTERS.map(([value, label]) => ({value, label, count: counts[value]}))));

const applyFilter = (filter) => {
  if (filters.getAttribute('value') !== filter) filters.setAttribute('value', filter);
  let visible = 0;
  for (const card of list.children) {
    const on = filter === 'all' || card.dataset.group === filter;
    card.hidden = !on;
    if (on) visible += 1;
  }
  shown.textContent = `Показано ${visible} из ${counts.all}.`;
  const url = new URL(location.href);
  if (filter === 'all') url.searchParams.delete('schemes'); else url.searchParams.set('schemes', filter);
  history.replaceState(null, '', url);
};
filters.addEventListener('change', (event) => { if (FILTERS.some(([value]) => value === event.detail?.value)) applyFilter(event.detail.value); });
const initial = new URL(location.href).searchParams.get('schemes');
applyFilter(['dual', 'dark', 'light'].includes(initial) ? initial : 'all');

// The intro is itself a placement: constellation-net in auto mode, drawn in the page's scheme.
const intro = document.querySelector('[data-intro]');
const note = document.querySelector('[data-intro-note]');
const describeIntro = (handle) => {
  const state = outcomeOf(handle, {id: 'constellation-net', mode: 'auto'});
  intro.dataset.state = state.outcome;
  note.textContent = `Фон этого блока — «${text(byId.get('constellation-net').label)}»: эффект рисует обе схемы, сейчас ${state.drawn === 'light' ? 'светлую' : 'тёмную'}, и меняется вместе с темой страницы.`;
};
let introHandle = null;
const placeIntro = () => place(intro, {id: 'constellation-net', themeMode: 'auto'}).then((handle) => {
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
