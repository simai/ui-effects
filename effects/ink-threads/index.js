// Ink threads (ink-threads) -- SIMAI Framework background effect, simai.effect 1.1.0; schemes light and dark.
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
    values: {...settings, scheme: context?.scheme ?? 'light'}, colors: null, pointer: {x: 0.5, y: 0.5, on: 0, tx: 0.5, ty: 0.5, to: 0}};
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
    // themes, so the picture does not depend on the page theme. The `scheme`
    // setting picks one of two designed tone sets: light draws a paper ground
    // with 40 tones, dark a deep ground with 80 tones. The host gives the area
    // the matching theme class (.theme-light / .theme-dark) for the text over it.
    api.dark = api.values.scheme === 'dark';
    api.colors = api.dark ? {
      surface: mix(read('--sf-neutral-5', '#0f0f12'), read('--sf-primary-10', '#001a40'), 0.4),
      ink: read('--sf-neutral-90', '#e3e2e6'),
      primary: read('--sf-primary-80', '#acc7ff'),
      secondary: read('--sf-secondary-80', '#bbc6e4'),
      tertiary: read('--sf-tertiary-80', '#ecb2f5'),
      primary80: read('--sf-primary-30', '#004494'),
    } : {
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
    update(next, context) {
      if (destroyed) return;
      api.values = {...api.values, ...next, scheme: context?.scheme ?? api.values.scheme};
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

// Ink threads: fine strands of ink carried by a slow flow field, each pulling a fading tail.
// Strands are batched by how far through their life they are, so the whole field is a handful of strokes.
export function mount(host, settings, context) {
  const noise = valueNoise(3);
  const r = rng(77);
  let count = 0;
  let len = 0;
  let trail = null;
  let head = null;
  let age = null;
  let life = null;
  let accent = null;
  let cx = null;
  let cy = null;
  let lastT = 0;
  let warm = false;
  const spawn = (api, i) => {
    const x = r() * api.w;
    const y = r() * api.h;
    for (let k = 0; k < len; k += 1) { trail[(i * len + k) * 2] = x; trail[(i * len + k) * 2 + 1] = y; }
    head[i] = 0;
    cx[i] = x;
    cy[i] = y;
    age[i] = 0;
    life[i] = 6 + r() * 10;
  };
  const step = (api, dt) => {
    const {w, h, t, values} = api;
    const p = api.pointer;
    const pull = values.interactive ? p.on : 0;
    const vx0 = p.x * w;
    const vy0 = p.y * h;
    const v = 34;
    for (let i = 0; i < count; i += 1) {
      let x = cx[i];
      let y = cy[i];
      const a = (noise(x / 420 + t * 0.03, y / 420 - t * 0.02) * 2 - 1) * Math.PI * 2.2;
      let dx = Math.cos(a) * v;
      let dy = Math.sin(a) * v;
      if (pull > 0) {
        const rx = x - vx0;
        const ry = y - vy0;
        const f = pull * Math.exp(-(rx * rx + ry * ry) / 40000) * 2.2;
        dx += -ry * f * 0.4;
        dy += rx * f * 0.4;
      }
      x += dx * dt;
      y += dy * dt;
      age[i] += dt;
      if (age[i] > life[i] || x < -40 || y < -40 || x > w + 40 || y > h + 40) { spawn(api, i); continue; }
      cx[i] = x;
      cy[i] = y;
      // A tail point is kept every few pixels, so the tail length is in distance, not in frames.
      const o = (i * len + head[i]) * 2;
      const gx = x - trail[o];
      const gy = y - trail[o + 1];
      if (gx * gx + gy * gy > 49) {
        head[i] = (head[i] + 1) % len;
        const n = (i * len + head[i]) * 2;
        trail[n] = x;
        trail[n + 1] = y;
      }
    }
  };
  const build = (api) => {
    count = Math.round(api.values.density * api.quality);
    len = api.values.trail;
    trail = new Float32Array(count * len * 2);
    head = new Uint16Array(count);
    age = new Float32Array(count);
    life = new Float32Array(count);
    accent = new Uint8Array(count);
    cx = new Float32Array(count);
    cy = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      spawn(api, i);
      age[i] = r() * life[i];
      accent[i] = r() < 0.18 ? 1 : 0;
    }
    lastT = api.t;
    warm = false;
  };
  return run(host, settings, context, {
    still: 0,
    resize: build,
    draw(api) {
      const {ctx, w, h, values, colors} = api;
      if (!warm) {
        // Let the strands grow their tails before the first frame is shown.
        for (let k = 0; k < len * 4 + 40; k += 1) step(api, 1 / 20);
        warm = true;
        lastT = api.t;
      }
      const dt = clamp(api.t - lastT, 0, 0.1) * 1.4;
      lastT = api.t;
      if (dt > 0) step(api, dt);
      // Light: ink on warm paper. Dark: threads of light (80 tones) on a deep ground, a little
      // thinner and softer, so they read as filaments, not as negative ink.
      ctx.fillStyle = css(api.dark ? colors.surface : mix(colors.surface, [250, 247, 240], 0.35));
      ctx.fillRect(0, 0, w, h);
      const main = mix(colors.surface, api.tone(values.tone), api.dark ? 0.8 : 0.62);
      const second = mix(colors.surface, values.tone === 'tertiary' ? colors.primary : colors.tertiary, api.dark ? 0.7 : 0.55);
      const bands = [new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D(), new Path2D()];
      for (let i = 0; i < count; i += 1) {
        const phase = Math.sin(Math.PI * clamp(age[i] / life[i], 0, 1));
        const band = (accent[i] ? 3 : 0) + (phase > 0.66 ? 2 : phase > 0.33 ? 1 : 0);
        const path = bands[band];
        let k = (head[i] + 1) % len;
        let o = (i * len + k) * 2;
        path.moveTo(trail[o], trail[o + 1]);
        for (let s = 1; s < len; s += 1) {
          k = (k + 1) % len;
          o = (i * len + k) * 2;
          path.lineTo(trail[o], trail[o + 1]);
        }
        path.lineTo(cx[i], cy[i]);
      }
      ctx.lineWidth = api.dark ? 0.8 : 0.9;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const alpha = api.dark ? 0.2 + 0.44 * (values.intensity / 100) : 0.2 + 0.45 * (values.intensity / 100);
      for (let b = 0; b < 6; b += 1) {
        ctx.strokeStyle = css(b < 3 ? main : second, alpha * [0.3, 0.65, 1][b % 3]);
        ctx.stroke(bands[b]);
      }
    },
  });
}
