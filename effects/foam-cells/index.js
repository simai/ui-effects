// Foam cells (foam-cells) -- SIMAI Framework light background effect, simai.effect 1.0.0.
// One module, no imports, no network. Generated from the effects-lab light sources.

// Shared runtime of the light set, copied into every module so each stays one file with no imports.
// It owns the canvas, sizing (pixel ratio capped at 2), theme colours, the pointer, the frame loop
// and every rule of simai.effect 1.0.0: still frame for reduced motion, idle while hidden or off
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

// Foam cells: cellular (Worley) noise from a grid of slowly wandering seeds. The gap between the
// nearest and second-nearest seed draws soft membranes; distance to the nearest shades each cell.
export function mount(host, settings, context) {
  const r = rng(23);
  let buffer = null;
  let bctx = null;
  let image = null;
  let bw = 0;
  let bh = 0;
  let gc = 0;
  let gr = 0;
  let seeds = null;
  let sx = null;
  let sy = null;
  return run(host, settings, context, {
    still: 6,
    resize(api) {
      const cell = 6 / api.quality;
      bw = Math.min(260, Math.ceil(api.w / cell) + 1);
      bh = Math.min(170, Math.ceil(api.h / cell) + 1);
      buffer = buffer || api.doc.createElement('canvas');
      buffer.width = bw;
      buffer.height = bh;
      bctx = buffer.getContext('2d');
      image = bctx.createImageData(bw, bh);
      const size = api.values.density;
      gc = Math.ceil(api.w / size) + 4;
      gr = Math.ceil(api.h / size) + 4;
      seeds = new Float32Array(gc * gr * 3);
      for (let i = 0; i < gc * gr; i += 1) { seeds[i * 3] = r(); seeds[i * 3 + 1] = r(); seeds[i * 3 + 2] = r() * 6.283; }
      sx = new Float32Array(gc * gr);
      sy = new Float32Array(gc * gr);
    },
    draw(api) {
      const {ctx, w, h, t, values, colors} = api;
      const size = values.density;
      for (let j = 0; j < gr; j += 1) {
        for (let i = 0; i < gc; i += 1) {
          const q = j * gc + i;
          const ph = seeds[q * 3 + 2];
          sx[q] = i - 2 + 0.5 + (seeds[q * 3] - 0.5) * 0.5 + 0.26 * Math.sin(t * 0.35 + ph);
          sy[q] = j - 2 + 0.5 + (seeds[q * 3 + 1] - 0.5) * 0.5 + 0.26 * Math.cos(t * 0.29 + ph * 1.3);
        }
      }
      const tone = api.tone(values.tone);
      const k = 0.3 + 0.4 * (values.intensity / 100);
      const wall = mix(colors.surface, tone, 0.42 * k);
      const core = mix(colors.surface, tone, 0.1 * k);
      const rim = mix(colors.surface, [255, 255, 255], 0.7);
      const style = values.style;
      const lines = style !== 'pebbles';
      const shade = style !== 'membranes';
      const p = api.pointer;
      const lens = values.interactive ? p.on * 0.4 : 0;
      const lx = p.x * w;
      const ly = p.y * h;
      const fx = w / (bw - 1);
      const fy = h / (bh - 1);
      const data = image.data;
      let o = 0;
      for (let j = 0; j < bh; j += 1) {
        for (let i = 0; i < bw; i += 1) {
          let x = i * fx;
          let y = j * fy;
          if (lens > 0) {
            const dx = x - lx;
            const dy = y - ly;
            const m = 1 - lens * Math.exp(-(dx * dx + dy * dy) / 36000);
            x = lx + dx * m;
            y = ly + dy * m;
          }
          const gx = x / size;
          const gy = y / size;
          const ci = Math.floor(gx) + 2;
          const cj = Math.floor(gy) + 2;
          let d1 = 9;
          let d2 = 9;
          for (let b = cj - 1; b <= cj + 1; b += 1) {
            if (b < 0 || b >= gr) continue;
            for (let a = ci - 1; a <= ci + 1; a += 1) {
              if (a < 0 || a >= gc) continue;
              const q = b * gc + a;
              const dx = sx[q] - gx;
              const dy = sy[q] - gy;
              const d = dx * dx + dy * dy;
              if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
            }
          }
          const f1 = Math.sqrt(d1);
          const edge = Math.sqrt(d2) - f1;
          let rr = colors.surface[0];
          let gg = colors.surface[1];
          let bb = colors.surface[2];
          if (shade) {
            const s = clamp(f1 * 1.4, 0, 1);
            rr = rim[0] + (core[0] - rim[0]) * s;
            gg = rim[1] + (core[1] - rim[1]) * s;
            bb = rim[2] + (core[2] - rim[2]) * s;
          }
          if (lines) {
            let m = 1 - edge / 0.16;
            if (m > 0) {
              m *= m * (3 - 2 * m);
              rr += (wall[0] - rr) * m;
              gg += (wall[1] - gg) * m;
              bb += (wall[2] - bb) * m;
            }
          }
          data[o] = rr;
          data[o + 1] = gg;
          data[o + 2] = bb;
          data[o + 3] = 255;
          o += 4;
        }
      }
      bctx.putImageData(image, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(buffer, 0, 0, bw, bh, 0, 0, w, h);
    },
  });
}
