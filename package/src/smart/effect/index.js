// <sf-effect>: an animated background drawn under its own content, the one
// element of the component set `effects` (simai/ui-effects; standard
// simai.component-set 1.0.0, element contract simai.effect).
//
//   <script src=".../distr/core/js/core.min.js" data-sf-sets="effects"></script>
//   <sf-effect effect="aurora-curtain" speed="40" palette="violet">…content…</sf-effect>
//
// - `effect` names a catalogue effect by id (checked against the catalogue
//   published with this set, every file by its SHA-256), or the https address
//   of an effect.json, which runs only in a sandboxed frame.
// - Each setting of the effect's manifest is an attribute: the kebab-case of
//   its key (linkDistance -> link-distance), its value checked as the manifest
//   says; an invalid value is dropped for the default and listed in the ready
//   event. A key whose kebab form is a reserved or global attribute name
//   (style, theme, title, ...) is reached as setting-<kebab>; setting-<kebab>
//   works for every key. `settings` takes a JSON object of many; a single
//   attribute wins over it.
// - `theme` (auto | dark | light, auto follows the page), `windows` (the cards
//   are the children marked data-sf-effect-window, or a selector), `paused`
//   (reflected), `about="false"` (no about menu).
// - The children stay where they are: they are the area's content. The effect
//   layer sits under them, out of the accessibility tree and the pointer's way.
// - Events: sf-effect-ready, sf-effect-failed, sf-effect-motion. Methods:
//   pause(), resume(), update(settings). Properties: ready (a Promise),
//   manifest, placement.
//
// A person who asked for less motion sees one still frame; nothing is drawn in
// a hidden tab (the engine's rules, unchanged from SIMAI Framework Core).
import {api, effectSettings, loadEffect, placeEffect} from './engine/engine.js';
import {attributeName, kebab, readSettings} from './attributes.js';
import './scss/index.scss';

const TAG = 'sf-effect';
const SET = 'effects';
function readWindows(element) {
  if (!element.hasAttribute('windows')) return false;
  const value = element.getAttribute('windows').trim();
  if (value === '' || value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

const THEMES = new Set(['auto', 'dark', 'light']);

const readTheme = (element) => {
  const value = element.getAttribute('theme') || 'auto';
  return THEMES.has(value) ? value : 'auto';
};

const config = () => {
  const declared = globalThis.SF_BOOT_CONFIG?.packages?.[SET];
  return declared && typeof declared === 'object' && !Array.isArray(declared) ? declared : {};
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  // Nobody has to wait for it: a refusal is also an event and an attribute.
  promise.catch(() => {});
  return {promise, resolve, reject};
}

export class SfEffect extends HTMLElement {
  constructor() {
    super();
    this.sfPlaced = null;
    this.sfManifest = null;
    this.sfToken = 0;
    this.sfReady = deferred();
    this.sfQuiet = false;
    this.sfObserver = null;
  }

  connectedCallback() {
    if (!this.sfObserver) {
      this.sfObserver = new MutationObserver((records) => this.attributesChanged(records));
    }
    this.sfObserver.observe(this, {attributes: true});
    if (!this.sfPlaced) this.place();
  }

  disconnectedCallback() {
    this.sfObserver?.disconnect();
    this.sfToken += 1;
    this.sfPlaced?.destroy();
    this.sfPlaced = null;
  }

  get ready() {
    return this.sfReady.promise;
  }

  get manifest() {
    return this.sfManifest;
  }

  get placement() {
    const placed = this.sfPlaced;
    if (!placed) return null;
    return Object.freeze({
      scheme: placed.scheme,
      effect: placed.effect,
      resolution: placed.resolution,
      themeMode: placed.themeMode,
      sandboxed: placed.sandboxed,
    });
  }

  pause() {
    this.setMotion(true, 'method');
  }

  resume() {
    this.setMotion(false, 'method');
  }

  // Settings by key: written to the attributes (setting-<kebab> where a plain
  // one is not allowed), which update the running effect without a remount.
  update(settings = {}) {
    for (const [key, value] of Object.entries(settings ?? {})) {
      const name = attributeName(key) ?? `setting-${kebab(key)}`;
      if (value === null || value === undefined || value === false) this.removeAttribute(name);
      else this.setAttribute(name, value === true ? '' : String(value));
    }
  }

  setMotion(paused, source) {
    this.sfQuiet = true;
    this.toggleAttribute('paused', paused);
    this.sfQuiet = false;
    if (!this.sfPlaced) return;
    if (paused) this.sfPlaced.pause();
    else this.sfPlaced.resume();
    this.dispatchEvent(new CustomEvent('sf-effect-motion', {bubbles: true, detail: {paused, source}}));
  }

  attributesChanged(records) {
    if (this.sfQuiet) return;
    const names = new Set(records.map((record) => record.attributeName));
    // The engine's own marks on the element are not the page's word.
    for (const own of ['data-sf-effect-state', 'data-sf-effect-reason', 'data-sf-effect', 'data-sf-effect-about', 'class', 'style']) names.delete(own);
    if (!names.size) return;
    if (names.has('effect') || names.has('windows')) {
      this.place();
      return;
    }
    if (names.has('about')) this.applyAbout();
    if (names.has('paused')) this.setMotion(this.hasAttribute('paused'), 'attribute');
    names.delete('about');
    names.delete('paused');
    if (names.size && this.sfPlaced && this.sfManifest) {
      this.sfPlaced.update(readSettings(this, this.sfManifest), {themeMode: readTheme(this)});
    }
  }

  applyAbout() {
    // The engine reads data-sf-effect-about="false" around the area.
    if (this.getAttribute('about') === 'false') this.setAttribute('data-sf-effect-about', 'false');
    else this.removeAttribute('data-sf-effect-about');
  }

  async place() {
    this.sfToken += 1;
    const token = this.sfToken;
    const reference = (this.getAttribute('effect') || '').trim();
    if (this.sfReady.settled) this.sfReady = deferred();
    this.sfPlaced?.destroy();
    this.sfPlaced = null;
    if (!reference) return;
    this.applyAbout();
    const {foreign} = config();
    let manifest = null;
    try {
      manifest = (await loadEffect(reference, {foreign})).manifest;
    } catch {
      // placeEffect below meets the same refusal and reports it.
    }
    if (token !== this.sfToken || !this.isConnected) return;
    this.sfManifest = manifest;
    const stored = manifest ? readSettings(this, manifest) : {};
    const invalid = manifest ? effectSettings(manifest, stored).invalid : [];
    let failure = null;
    const caught = (event) => {
      failure = {kind: event.type === 'sf-effect-refused' ? 'refused' : 'error', ...event.detail};
    };
    this.addEventListener('sf-effect-refused', caught);
    this.addEventListener('sf-effect-error', caught);
    let placed = null;
    try {
      placed = await placeEffect(this, {effect: reference, settings: stored, themeMode: readTheme(this), windows: readWindows(this), foreign});
    } finally {
      this.removeEventListener('sf-effect-refused', caught);
      this.removeEventListener('sf-effect-error', caught);
    }
    if (token !== this.sfToken || !this.isConnected) {
      placed?.destroy();
      return;
    }
    const ready = this.sfReady;
    ready.settled = true;
    if (!placed) {
      const detail = {effect: reference, kind: 'refused', reason: this.getAttribute('data-sf-effect-reason') || 'failed', ...(failure ?? {})};
      this.dispatchEvent(new CustomEvent('sf-effect-failed', {bubbles: true, detail}));
      ready.reject(detail);
      return;
    }
    this.sfPlaced = placed;
    if (this.hasAttribute('paused')) placed.pause();
    // effect: the id the element names; drawn: what the theme policy chose
    // to draw for it -- 'self', its catalogue 'pair', or null (hidden).
    const detail = Object.freeze({
      effect: manifest?.id ?? reference,
      drawn: placed.effect ?? null,
      version: manifest?.version ?? null,
      scheme: placed.scheme,
      resolution: placed.resolution,
      sandboxed: Boolean(placed.sandboxed),
      invalid: Object.freeze([...invalid]),
    });
    this.dispatchEvent(new CustomEvent('sf-effect-ready', {bubbles: true, detail}));
    ready.resolve(detail);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get(TAG)) {
  customElements.define(TAG, SfEffect);
}

// The set's scripted API, read with SF.package('effects'). The set writes no
// global SIMAI Framework owns (simai.component-package page trust).
globalThis.SF?.RuleLoader?.registerPackage?.(SET, {exports: api});
