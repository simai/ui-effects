// Leaf shadows (leaf-shadows) -- SIMAI Framework light background effect, simai.effect 1.1.0.
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

// Leaf shadows (komorebi): shadows of branches falling on a sunlit wall. Branch sprites are drawn and
// blurred once, then only placed and swayed each frame, so wind costs a few image draws.
const DAY = {
  morning: {warm: [255, 214, 170], lean: -0.5, stretch: 1.15, blur: 2.5},
  noon: {warm: [255, 244, 222], lean: 0.05, stretch: 1, blur: 1.2},
  evening: {warm: [255, 190, 140], lean: 0.6, stretch: 1.3, blur: 3.5},
};

export function mount(host, settings, context) {
  const sprites = [];
  let clusters = [];
  let shadeKey = '';
  const branch = (api, seed, colour, blur) => {
    const r = rng(seed);
    const size = 300;
    const shape = api.doc.createElement('canvas');
    shape.width = shape.height = size;
    const s = shape.getContext('2d');
    s.fillStyle = s.strokeStyle = css(colour);
    s.lineCap = 'round';
    const twig = (x, y, angle, length, width, depth) => {
      const ex = x + Math.cos(angle) * length;
      const ey = y + Math.sin(angle) * length;
      s.lineWidth = width;
      s.beginPath();
      s.moveTo(x, y);
      s.quadraticCurveTo((x + ex) / 2 + (r() - 0.5) * 20, (y + ey) / 2 + (r() - 0.5) * 20, ex, ey);
      s.stroke();
      const leaves = 4 + ((r() * 4) | 0);
      for (let i = 0; i < leaves; i += 1) {
        const q = 0.25 + (i / leaves) * 0.8;
        const lx = x + (ex - x) * q;
        const ly = y + (ey - y) * q;
        const side = i % 2 ? 1 : -1;
        const la = angle + side * (0.6 + r() * 0.5);
        const ll = 14 + r() * 14;
        s.save();
        s.translate(lx + Math.cos(la) * ll * 0.55, ly + Math.sin(la) * ll * 0.55);
        s.rotate(la);
        s.beginPath();
        s.ellipse(0, 0, ll * 0.62, ll * 0.26, 0, 0, Math.PI * 2);
        s.fill();
        s.restore();
      }
      if (depth > 0) {
        twig(ex, ey, angle - 0.5 + r() * 0.3, length * 0.7, width * 0.7, depth - 1);
        twig(ex, ey, angle + 0.3 + r() * 0.3, length * 0.65, width * 0.7, depth - 1);
      }
    };
    twig(10, size * (0.4 + r() * 0.2), (r() - 0.5) * 0.4, 95, 4, 2);
    const soft = api.doc.createElement('canvas');
    soft.width = soft.height = size;
    const c = soft.getContext('2d');
    c.filter = `blur(${blur}px)`;
    c.drawImage(shape, 0, 0);
    return soft;
  };
  const build = (api) => {
    const day = DAY[api.values.daytime] || DAY.morning;
    const shadow = mix(api.colors.ink, api.colors.primary, 0.35);
    const key = `${api.values.daytime}|${shadow.join()}`;
    if (key !== shadeKey) {
      shadeKey = key;
      sprites.length = 0;
      for (let i = 0; i < 3; i += 1) sprites.push(branch(api, 17 + i * 31, shadow, day.blur + i * 1.5));
    }
    const r = rng(91);
    const step = 300 - api.values.density * 1.4;
    clusters = [];
    for (let y = -step * 0.6; y < api.h + step * 0.6; y += step * 0.7) {
      for (let x = -step * 0.6; x < api.w + step * 0.6; x += step) {
        if (r() > 0.45 + api.values.density / 120) continue;
        clusters.push({x: x + (r() - 0.5) * step * 0.6, y: y + (r() - 0.5) * step * 0.5, rot: (r() - 0.5) * 1.6 + day.lean,
          scale: 0.8 + r() * 0.7, sprite: (r() * 3) | 0, phase: r() * 6.283, depth: r()});
      }
    }
  };
  return run(host, settings, context, {
    still: 4,
    resize: build,
    theme: build,
    draw(api) {
      const {ctx, w, h, t, values, colors} = api;
      const day = DAY[values.daytime] || DAY.morning;
      const glowA = mix(colors.surface, day.warm, 0.22);
      const glowB = mix(colors.surface, day.warm, 0.06);
      const g = ctx.createLinearGradient(day.lean < 0 ? 0 : w, 0, day.lean < 0 ? w : 0, h);
      g.addColorStop(0, css(glowA));
      g.addColorStop(1, css(glowB));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const p = api.pointer;
      const gust = values.interactive ? p.on : 0;
      const depthAlpha = 0.05 + 0.2 * (values.intensity / 100);
      for (const c of clusters) {
        let sway = 0.05 * Math.sin(t * 0.8 + c.phase) + 0.025 * Math.sin(t * 1.9 + c.phase * 1.7);
        if (gust > 0) {
          const dx = (c.x - p.x * w) / 320;
          const dy = (c.y - p.y * h) / 320;
          sway *= 1 + 2 * gust * Math.exp(-(dx * dx + dy * dy));
        }
        ctx.save();
        ctx.globalAlpha = depthAlpha * (0.55 + 0.45 * c.depth);
        ctx.translate(c.x + Math.sin(t * 0.6 + c.phase) * 6, c.y);
        ctx.rotate(c.rot + sway);
        ctx.scale(c.scale * day.stretch, c.scale);
        ctx.drawImage(sprites[c.sprite], -20, -150);
        ctx.restore();
      }
    },
  });
}
