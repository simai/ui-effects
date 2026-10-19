// Paper hills (paper-hills) -- SIMAI Framework light background effect, simai.effect 1.1.0.
// One module, no imports, no network. Generated from the effects-lab light sources.

// Shared runtime of the light set, copied into every module so each stays one file with no imports.
// It owns the canvas, sizing (pixel ratio capped at 2), theme colours, the pointer, the frame loop
// and every rule of simai.effect 1.1.0: still frame for reduced motion, idle while hidden or off
// screen, nothing left behind after destroy.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const TONES = {primary: 'primary', secondary: 'secondary', tertiary: 'tertiary', ink: 'ink'};

function run(host, settings, context, spec) {
  const doc = host.ownerDocument;
  const win = doc.defaultView || globalThis;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  let placed = null;
  if (win.getComputedStyle(host).position === 'static') {
    placed = host.style.position;
    host.style.position = 'relative';
  }
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const api = {canvas, ctx, doc, w: 1, h: 1, ratio: 1, quality: 1, t: 0, still: false,
    values: {...settings}, colors: null, pointer: {x: 0.5, y: 0.5, on: 0, tx: 0.5, ty: 0.5, to: 0}};
  const motion = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const scheme = win.matchMedia ? win.matchMedia('(prefers-color-scheme: dark)') : null;
  let reduced = Boolean(context && context.reducedMotion) || Boolean(motion && motion.matches);
  let paused = false;
  let onScreen = true;
  let destroyed = false;
  let dirty = false;
  let frame = 0;
  let last = 0;
  let cost = 0;
  let slow = 0;
  let listening = false;

  const readTheme = () => {
    const probe = doc.createElement('i');
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
    host.append(probe);
    const one = doc.createElement('canvas');
    one.width = one.height = 1;
    const c1 = one.getContext('2d', {willReadFrequently: true});
    const read = (name, fallback) => {
      probe.style.color = `var(${name}, ${fallback})`;
      c1.fillStyle = fallback;
      c1.fillStyle = win.getComputedStyle(probe).color;
      c1.fillRect(0, 0, 1, 1);
      const d = c1.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    // Palette tones only, never theme roles: a tone keeps its value in both
    // themes, so this light effect looks the same on a light or a dark page.
    // The host forces its area into .theme-light for the text over it.
    api.colors = {
      surface: read('--sf-neutral-98', '#faf9fe'),
      ink: read('--sf-neutral-10', '#1a1b1f'),
      primary: read('--sf-primary-40', '#005bbe'),
      secondary: read('--sf-secondary-40', '#535e77'),
      tertiary: read('--sf-tertiary-40', '#7c4c86'),
      primary80: read('--sf-primary-80', '#acc7ff'),
    };
    probe.remove();
    api.tone = (key) => api.colors[TONES[key] || 'primary'];
  };

  const paint = () => {
    if (doc.hidden) { dirty = true; return; }
    dirty = false;
    ctx.setTransform(api.ratio, 0, 0, api.ratio, 0, 0);
    spec.draw(api);
  };
  const resize = () => {
    const box = host.getBoundingClientRect();
    api.w = Math.max(1, box.width);
    api.h = Math.max(1, box.height);
    api.ratio = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(api.w * api.ratio));
    canvas.height = Math.max(1, Math.round(api.h * api.ratio));
    if (spec.resize) spec.resize(api);
    paint();
  };
  const live = () => !destroyed && !paused && !reduced && onScreen && !doc.hidden;
  const tick = (now) => {
    frame = 0;
    if (!live()) return;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    api.t += dt * api.values.speed / 100;
    const p = api.pointer;
    const k = 1 - Math.exp(-dt * 3);
    p.x += (p.tx - p.x) * k;
    p.y += (p.ty - p.y) * k;
    p.on += (p.to - p.on) * k;
    const begin = win.performance.now();
    paint();
    // Graceful degradation: a frame that keeps costing more than ~4 ms lowers the quality a step.
    cost = cost * 0.9 + (win.performance.now() - begin) * 0.1;
    if (cost > 4 && api.quality > 0.5) {
      if (++slow > 40) {
        slow = 0;
        cost = 0;
        api.quality = Math.max(0.5, api.quality - 0.25);
        if (spec.resize) spec.resize(api);
      }
    } else slow = 0;
    frame = win.requestAnimationFrame(tick);
  };
  const sync = () => {
    if (live()) {
      if (!frame) {
        last = win.performance.now();
        frame = win.requestAnimationFrame(tick);
      }
    } else if (frame) {
      win.cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  const still = () => {
    api.still = reduced;
    if (reduced) {
      api.t = spec.still || 10;
      api.pointer.on = api.pointer.to = 0;
    }
  };

  const onPointer = (event) => {
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const p = api.pointer;
    p.tx = x;
    p.ty = y;
    p.to = x > -0.05 && x < 1.05 && y > -0.05 && y < 1.05 ? 1 : 0;
  };
  const onLeave = (event) => { if (!event.relatedTarget) api.pointer.to = 0; };
  const listen = () => {
    const want = Boolean(api.values.interactive) && !reduced && !destroyed;
    if (want === listening) return;
    listening = want;
    const verb = want ? 'addEventListener' : 'removeEventListener';
    win[verb]('pointermove', onPointer, {passive: true});
    doc[verb]('pointerout', onLeave, {passive: true});
    if (!want) api.pointer.to = 0;
  };

  const refreshTheme = () => {
    if (destroyed) return;
    readTheme();
    if (spec.theme) spec.theme(api);
    paint();
  };
  const onVisibility = () => {
    if (!doc.hidden && dirty) paint();
    sync();
  };
  const onMotion = () => {
    reduced = Boolean(context && context.reducedMotion) || Boolean(motion && motion.matches);
    still();
    listen();
    paint();
    sync();
  };

  readTheme();
  still();
  if (spec.init) spec.init(api);
  resize();
  const sizes = new win.ResizeObserver(resize);
  sizes.observe(host);
  const sight = win.IntersectionObserver ? new win.IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }) : null;
  if (sight) sight.observe(host);
  const themeWatch = new win.MutationObserver(refreshTheme);
  const watched = {attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-sf-theme', 'data-color-scheme']};
  themeWatch.observe(doc.documentElement, watched);
  if (doc.body) themeWatch.observe(doc.body, watched);
  doc.addEventListener('visibilitychange', onVisibility);
  if (motion && motion.addEventListener) motion.addEventListener('change', onMotion);
  if (scheme && scheme.addEventListener) scheme.addEventListener('change', refreshTheme);
  listen();
  sync();

  return {
    update(next) {
      if (destroyed) return;
      api.values = {...api.values, ...next};
      readTheme();
      listen();
      if (spec.resize) spec.resize(api);
      paint();
      sync();
    },
    pause() { paused = true; sync(); },
    resume() { paused = false; sync(); },
    refreshTheme,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      sync();
      listen();
      sizes.disconnect();
      if (sight) sight.disconnect();
      themeWatch.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      if (motion && motion.removeEventListener) motion.removeEventListener('change', onMotion);
      if (scheme && scheme.removeEventListener) scheme.removeEventListener('change', refreshTheme);
      if (spec.destroy) spec.destroy(api);
      canvas.width = canvas.height = 0;
      canvas.remove();
      if (placed !== null) host.style.position = placed;
    },
  };
}

// Seeded random numbers and smooth 2D value noise (0..1), kept small and table-driven.
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const valueNoise = (seed) => {
  const r = rng(seed);
  const v = new Float32Array(256);
  const p = new Uint8Array(512);
  for (let i = 0; i < 256; i += 1) { v[i] = r(); p[i] = i; }
  for (let i = 255; i > 0; i -= 1) { const j = (r() * (i + 1)) | 0; const s = p[i]; p[i] = p[j]; p[j] = s; }
  for (let i = 0; i < 256; i += 1) p[i + 256] = p[i];
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = x - xi;
    const fy = y - yi;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const X = xi & 255;
    const Y = yi & 255;
    const a = v[p[p[X] + Y]];
    const b = v[p[p[X + 1] + Y]];
    const c = v[p[p[X] + Y + 1]];
    const d = v[p[p[X + 1] + Y + 1]];
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
};

// Paper hills: cut-paper ridges in aerial perspective. Far layers are pale and slow, near layers
// deeper and faster; mist settles in each valley. The ridges fill the whole height, so any window
// cut into the page shows land or sky, never a hole.
const MOODS = {
  dawn: {sky: [250, 214, 190], land: 'tertiary', haze: [255, 236, 222]},
  day: {sky: null, land: 'primary', haze: null},
  mist: {sky: [222, 226, 232], land: 'secondary', haze: [240, 242, 246]},
};

export function mount(host, settings, context) {
  const noise = valueNoise(41);
  return run(host, settings, context, {
    still: 50,
    draw(api) {
      const {ctx, w, h, t, values, colors} = api;
      const mood = MOODS[values.mood] || MOODS.day;
      const land = colors[mood.land];
      const sky = mood.sky || colors.primary80;
      const haze = mood.haze || mix(colors.surface, [255, 255, 255], 0.6);
      const k = 0.55 + 0.45 * (values.intensity / 100);
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.6);
      g.addColorStop(0, css(mix(colors.surface, sky, 0.3 * k)));
      g.addColorStop(1, css(mix(colors.surface, haze, 0.5)));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const n = values.density;
      const p = api.pointer;
      const shift = values.interactive ? (p.x - 0.5) * p.on : 0;
      const lift = values.interactive ? (p.y - 0.5) * p.on : 0;
      const stepX = Math.max(6, 10 / api.quality);
      for (let i = 0; i < n; i += 1) {
        const depth = (i + 1) / n;
        const base = h * (0.3 + 0.66 * depth);
        const amp = h * (0.08 + 0.1 * depth);
        const scale = 1 / (260 + 340 * (1 - depth));
        const off = t * (4 + 22 * depth) - shift * 40 * depth;
        const col = mix(colors.surface, land, (0.05 + 0.27 * depth * depth) * k);
        const deep = mix(col, haze, 0.55);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = -stepX; x <= w + stepX; x += stepX) {
          const u = (x + off) * scale + i * 17.3;
          const y = base - lift * 18 * depth - amp * (noise(u, i * 3.7) * 0.75 + noise(u * 2.7, i * 5.1 + 9) * 0.25);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w + stepX, h);
        ctx.closePath();
        const fill = ctx.createLinearGradient(0, base - amp, 0, Math.min(h, base + h * 0.25));
        fill.addColorStop(0, css(col));
        fill.addColorStop(1, css(deep));
        ctx.fillStyle = fill;
        ctx.fill();
      }
    },
  });
}
