// Contour map (contour-map) -- SIMAI Framework background effect, simai.effect 1.1.0; schemes light and dark.
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

// Contour map: isolines of a slowly shifting relief, traced with marching squares on a coarse grid.
// Every fifth level is an index contour, drawn a little heavier, as on a survey sheet.
export function mount(host, settings, context) {
  const n1 = valueNoise(7);
  const n2 = valueNoise(29);
  let field = null;
  let cols = 0;
  let rows = 0;
  let cell = 12;
  return run(host, settings, context, {
    still: 21,
    resize(api) {
      cell = 12 / api.quality;
      cols = Math.ceil(api.w / cell) + 2;
      rows = Math.ceil(api.h / cell) + 2;
      field = new Float32Array(cols * rows);
    },
    draw(api) {
      const {ctx, w, h, t, values, colors} = api;
      const levels = values.density;
      const p = api.pointer;
      const hill = values.interactive ? p.on * 0.45 : 0;
      const hx = p.x * w;
      const hy = p.y * h;
      const s = 1 / 260;
      const drift = t * 0.05;
      for (let j = 0; j < rows; j += 1) {
        const y = j * cell;
        for (let i = 0; i < cols; i += 1) {
          const x = i * cell;
          let v = n1(x * s + drift, y * s - drift * 0.4) * 0.68 + n2(x * s * 2.2 - drift * 0.7, y * s * 2.2 + 4.1 + drift * 0.3) * 0.32;
          if (hill > 0) {
            const dx = (x - hx) / 170;
            const dy = (y - hy) / 170;
            v += hill * Math.exp(-(dx * dx + dy * dy));
          }
          field[j * cols + i] = v * levels;
        }
      }
      const tone = api.tone(values.tone);
      // Light: a survey sheet. Dark: a night chart whose index contours glow a little brighter.
      const k = api.dark ? 0.2 + 0.1 * (values.lineWeight - 0.5) : 0.18 + 0.12 * (values.lineWeight - 0.5);
      const lift = api.dark ? 0.2 : 0.12;
      ctx.fillStyle = css(mix(colors.surface, tone, api.dark ? 0.04 : 0.025));
      ctx.fillRect(0, 0, w, h);
      const minor = new Path2D();
      const major = new Path2D();
      const seg = (path, ax, ay, bx, by) => { path.moveTo(ax, ay); path.lineTo(bx, by); };
      for (let j = 0; j < rows - 1; j += 1) {
        for (let i = 0; i < cols - 1; i += 1) {
          const a = field[j * cols + i];
          const b = field[j * cols + i + 1];
          const c = field[(j + 1) * cols + i + 1];
          const d = field[(j + 1) * cols + i];
          let lo = a < b ? a : b; lo = lo < c ? lo : c; lo = lo < d ? lo : d;
          let hi = a > b ? a : b; hi = hi > c ? hi : c; hi = hi > d ? hi : d;
          const x0 = i * cell;
          const y0 = j * cell;
          for (let l = Math.ceil(lo); l <= hi; l += 1) {
            const path = l % 5 === 0 ? major : minor;
            const pts = [];
            if ((a < l) !== (b < l)) pts.push(x0 + cell * (l - a) / (b - a), y0);
            if ((b < l) !== (c < l)) pts.push(x0 + cell, y0 + cell * (l - b) / (c - b));
            if ((d < l) !== (c < l)) pts.push(x0 + cell * (l - d) / (c - d), y0 + cell);
            if ((a < l) !== (d < l)) pts.push(x0, y0 + cell * (l - a) / (d - a));
            if (pts.length >= 4) seg(path, pts[0], pts[1], pts[2], pts[3]);
            if (pts.length === 8) seg(path, pts[4], pts[5], pts[6], pts[7]);
          }
        }
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = css(mix(colors.surface, tone, k));
      ctx.lineWidth = values.lineWeight;
      ctx.stroke(minor);
      ctx.strokeStyle = css(mix(colors.surface, tone, k + lift));
      ctx.lineWidth = values.lineWeight * 1.7;
      ctx.stroke(major);
    },
  });
}
