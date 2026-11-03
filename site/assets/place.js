// The site's placements. The engine of the component set `effects` does the
// work (SF.package('effects'), the set this site serves beside its catalogue):
// it loads the effect and its pair from the catalogue with SHA-256 checks,
// picks what to draw under the theme policy, follows the page theme, and runs
// windows mode. This file adds only what the catalogue site needs on top:
// the configurator's still-frame switch and a name for what is shown.

// The engine, once the set has given it: outcomeOf reads it after a placement.
let engine = null;
let Engine = null;
export const whenEffects = (timeout = 15000) => {
  engine ??= new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (globalThis.SF?.package) resolve(globalThis.SF.package('effects').then((api) => { Engine = api; return api; }));
      else if (Date.now() - started > timeout) reject(new Error('SIMAI Framework Core is not on the page'));
      else setTimeout(tick, 50);
    };
    tick();
  });
  return engine;
};

// A module whose mount always gets a reduced-motion context: one still frame.
const still = (module) => ({mount: (host, settings, context) => module.mount(host, settings, Object.freeze({...context, reducedMotion: true}))});

// Loads an effect and its catalogue pair from the configured catalogue.
export async function loadWithPair(id) {
  const Effects = await whenEffects();
  const main = await Effects.loadEffect(id);
  const pair = main.manifest.pair ? await Effects.loadEffect(main.manifest.pair) : null;
  return {Effects, main, pair};
}

// Places an effect on an area: under its content, or with `windows` behind
// the area's [data-effect-window] cards. Answers the core's handle.
export async function place(area, {id, themeMode = 'auto', settings = {}, windows = false, reducedMotion = false}) {
  const {Effects, main, pair} = await loadWithPair(id);
  const wrap = (module) => (reducedMotion ? still(module) : module);
  const common = {
    manifest: main.manifest,
    module: wrap(main.module),
    pair: pair ? {manifest: pair.manifest, module: wrap(pair.module)} : undefined,
    stored: settings,
    themeMode,
  };
  if (windows) return Effects.mountWindows(area, {...common, windows: '[data-effect-window]'});
  const layer = area.ownerDocument.createElement('div');
  layer.setAttribute('data-sf-effect-layer', '');
  area.prepend(layer);
  const handle = Effects.mountEffect(layer, {...common, area});
  return Object.freeze({
    update: handle.update,
    pause: handle.pause,
    resume: handle.resume,
    destroy() {
      handle.destroy();
      layer.remove();
    },
    get effect() { return handle.effect; },
    get scheme() { return handle.scheme; },
    get resolution() { return handle.resolution; },
    get themeMode() { return handle.themeMode; },
  });
}

// What a placement shows now, in the site's words:
// {shown: <id> | null, drawn: 'dark' | 'light', outcome: 'as-is' | 'pair' | 'kept' | 'hidden'}.
export function outcomeOf(handle, {id, pairId, mode}) {
  const Effects = Engine;
  const target = mode === 'auto' ? Effects.pageScheme() : mode;
  const resolution = handle.resolution;
  if (!resolution || resolution.hidden) return {shown: null, drawn: target, outcome: 'hidden', reason: resolution?.reason ?? null};
  if (resolution.effect === 'pair') return {shown: pairId, drawn: resolution.scheme, outcome: 'pair'};
  return {shown: id, drawn: resolution.scheme, outcome: resolution.scheme === target ? 'as-is' : 'kept'};
}
