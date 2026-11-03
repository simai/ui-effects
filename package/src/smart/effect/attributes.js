// How <sf-effect>'s attributes map to an effect's settings (simai.effect,
// the element placement): pure functions, so they are tested without a page.
export const RESERVED = Object.freeze(['effect', 'theme', 'windows', 'paused', 'about', 'settings']);
// Global HTML attributes and names a page or a tool reads on every element: a
// setting never takes them as its plain attribute.
const GLOBAL = new Set(['accesskey', 'autocapitalize', 'autofocus', 'class', 'contenteditable', 'dir', 'draggable',
  'enterkeyhint', 'hidden', 'id', 'inert', 'inputmode', 'is', 'itemid', 'itemprop', 'itemref', 'itemscope',
  'itemtype', 'lang', 'nonce', 'part', 'popover', 'role', 'slot', 'spellcheck', 'style', 'tabindex', 'title',
  'translate']);

export const kebab = (key) => String(key).replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);

// The plain attribute of a manifest key, or null when it is reached only as
// setting-<kebab>.
export function attributeName(key) {
  const name = kebab(key);
  if (RESERVED.includes(name) || GLOBAL.has(name)) return null;
  if (/^(?:aria-|data-|setting-)/u.test(name)) return null;
  // An event handler attribute (onclick, onload, ...) would run as script.
  if (/^on[a-z]+$/u.test(name) && name in (globalThis.HTMLElement?.prototype ?? {onclick: null, onload: null})) return null;
  return name;
}

// What the element's attributes say for the manifest's settings, as stored
// values the engine checks: setting-<kebab> first, then the plain attribute,
// then the `settings` JSON. A present boolean attribute with no value is true.
export function readSettings(element, manifest) {
  let stored = {};
  const bulk = element.getAttribute('settings');
  if (bulk) {
    try {
      const parsed = JSON.parse(bulk);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = {...parsed};
      else throw new TypeError('not an object');
    } catch {
      globalThis.console?.warn?.(`sf-effect: settings of ${element.getAttribute('effect')} is not a JSON object; it is ignored`);
    }
  }
  for (const setting of manifest?.settings ?? []) {
    const names = [`setting-${kebab(setting.key)}`, attributeName(setting.key)].filter(Boolean);
    const name = names.find((candidate) => element.hasAttribute(candidate));
    if (!name) continue;
    const value = element.getAttribute(name);
    stored[setting.key] = setting.type === 'boolean' && value === '' ? true : value;
  }
  return stored;
}

