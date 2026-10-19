// Gallery: every effect with its preview, schemes and pair, filtered by scheme.
import {badges, groupOf, loadCatalogue, root, text} from './common.js';
import {mountPlacement, referenceFrom} from '../lib/placement.js';

const list = document.querySelector('[data-cards]');
const shown = document.querySelector('[data-shown]');
const filters = [...document.querySelectorAll('[data-filter]')];

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
    : entry.pair ? `${entry.schemes[0] === 'dark' ? 'Светлая' : 'Тёмная'} пара: «${text(byId.get(entry.pair).label)}».`
      : entry.schemes[0] === 'dark' ? 'Без пары: на светлой странице остаётся тёмным.' : 'Без пары: на тёмной странице не показывается.';
  const marks = badges({...entry, pair: null}, byId);
  body.append(title, marks, description, pair);
  item.append(image, body);
  list.append(item);
}

const counts = {all: catalogue.effects.length, dual: catalogue.counts.dual, dark: catalogue.counts.dark, light: catalogue.counts.light};
for (const [key, value] of Object.entries(counts)) document.querySelector(`[data-count="${key}"]`).textContent = String(value);

const applyFilter = (filter) => {
  filters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
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
filters.forEach((button) => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
const initial = new URL(location.href).searchParams.get('schemes');
applyFilter(['dual', 'dark', 'light'].includes(initial) ? initial : 'all');

// The intro is itself a placement: nebula-mesh in auto mode, its pair on a light page.
const intro = document.querySelector('[data-intro]');
const note = document.querySelector('[data-intro-note]');
mountPlacement(intro, {
  effect: referenceFrom(catalogue, 'nebula-mesh', root),
  themeMode: 'auto',
  onChange: (state) => {
    intro.dataset.state = state.error ? 'error' : state.outcome;
    note.textContent = state.outcome === 'pair'
      ? `Фон этого блока — «${text(byId.get(state.shown).label)}», светлая пара эффекта «${text(byId.get('nebula-mesh').label)}». На тёмной странице вернётся он сам.`
      : `Фон этого блока — «${text(byId.get('nebula-mesh').label)}». На светлой странице его заменит пара, «${text(byId.get('mist-gradient').label)}».`;
  },
});
document.documentElement.dataset.ready = 'true';
