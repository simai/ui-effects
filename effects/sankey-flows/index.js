// Sankey flows (simai.effect 1.1.0; schemes light and dark): wide soft ribbons flow from left to
// right through a middle column, splitting and merging as on a Sankey diagram.
//
// The lifecycle is the catalogue template's: one canvas in the host, devicePixelRatio capped at 2,
// a seeded scene (the same picture on every mount at the defaults), one still frame for reduced
// motion, no frames while the tab is hidden or the area is off screen, and nothing left behind.
// Colours are palette tones of the theme, read through a probe so var() chains settle.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const hash2 = (x, y) => {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t) => t * t * (3 - 2 * t);
const noise2 = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  return mix(mix(hash2(ix, iy), hash2(ix + 1, iy), fx), mix(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), fx), fy);
};

function readTones(host, scheme) {
  const doc = host.ownerDocument;
  const probe = doc.createElement('i');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  host.append(probe);
  const pixel = doc.createElement('canvas').getContext('2d', {willReadFrequently: true});
  const read = (name, fallback) => {
    probe.style.color = `var(${name}, ${fallback})`;
    pixel.fillStyle = fallback;
    pixel.fillStyle = getComputedStyle(probe).color;
    pixel.fillRect(0, 0, 1, 1);
    const d = pixel.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const tones = SCENE.tones(read, scheme);
  probe.remove();
  return tones;
}

const SCENE = {
  home: 'light', seed: 641, reseed: ['flows'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), node: read('--sf-neutral-40', '#5d5e66'),
      ribbons: [read('--sf-primary-60', '#4a8cf0'), read('--sf-tertiary-60', '#a4869f'), read('--sf-secondary-60', '#8990a5'), read('--sf-primary-70', '#7eabff')]}
    : {ground: read('--sf-neutral-5', '#111318'), low: read('--sf-neutral-10', '#1a1b20'), node: read('--sf-neutral-70', '#abacb4'),
      ribbons: [read('--sf-primary-50', '#2a74de'), read('--sf-tertiary-50', '#8a6d8f'), read('--sf-secondary-50', '#6f778b'), read('--sf-primary-40', '#005bbe')]},
  setup(env, random) {
    const n = clamp(Math.round(env.values.flows ?? 6), 3, 9);
    // Every flow is a path: a node on the left, one in the middle, one on the right.
    const counts = [3, n > 5 ? 3 : 2, 3];
    const paths = Array.from({length: n}, (_, p) => ({
      nodes: [p % counts[0], Math.floor(random() * counts[1]), Math.floor(random() * counts[2])],
      seed: random() * 40, colour: p, phase: random(),
    }));
    return {counts, paths, shapes: []};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    const k = values.intensity / 100;
    const light = scheme === 'light';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.8)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const {counts, paths} = state;
    const value = paths.map((path) => 0.35 + noise2(t * 0.06 + path.seed, path.seed));
    const xs = [-w * 0.04, w * 0.5, w * 1.04];
    // Stack the nodes of each column; inside a node the flows keep the order of their other end.
    const gapY = h * 0.05;
    const scale = (h * 0.72) / Math.max(1e-6, value.reduce((a, b) => a + b, 0));
    const slots = paths.map(() => [[0, 0], [0, 0], [0, 0], [0, 0]]);
    for (let c = 0; c < 3; c += 1) {
      const sizes = Array.from({length: counts[c]}, (_, node) => paths.reduce((sum, path, p) => sum + (path.nodes[c] === node ? value[p] * scale : 0), 0));
      const total = sizes.reduce((a, b) => a + b, 0) + gapY * (counts[c] - 1);
      let y = (h - total) / 2;
      for (let node = 0; node < counts[c]; node += 1) {
        const members = paths.map((path, p) => p).filter((p) => paths[p].nodes[c] === node);
        // Incoming side sorted by the left end, outgoing side by the right end.
        for (const side of c === 1 ? [0, 1] : [c === 0 ? 1 : 0]) {
          const other = side === 0 ? c - 1 : c + 1;
          let at = y;
          for (const p of [...members].sort((a, b) => paths[a].nodes[other] - paths[b].nodes[other] || a - b)) {
            slots[p][c === 0 ? 0 : c === 2 ? 3 : 1 + side] = [at, at + value[p] * scale];
            at += value[p] * scale;
          }
        }
        if (c === 1 && sizes[node] > 0) {
          ctx.fillStyle = rgba(tones.node, (light ? 0.35 : 0.4) * k);
          ctx.fillRect(xs[1] - 3, y, 6, sizes[node]);
        }
        y += sizes[node] + gapY;
      }
    }
    // Ribbons: two stages per path, each a band between cubic curves, lit by a slow travelling glow.
    const shapes = [];
    paths.forEach((path, p) => {
      for (let stage = 0; stage < 2; stage += 1) {
        const [a0, a1] = slots[p][stage === 0 ? 0 : 2];
        const [b0, b1] = slots[p][stage === 0 ? 1 : 3];
        const x0 = xs[stage] + (stage === 1 ? 3 : 0), x1 = xs[stage + 1] - (stage === 0 ? 3 : 0), xm = (x0 + x1) / 2;
        const shape = new Path2D();
        shape.moveTo(x0, a0);
        shape.bezierCurveTo(xm, a0, xm, b0, x1, b0);
        shape.lineTo(x1, b1);
        shape.bezierCurveTo(xm, b1, xm, a1, x0, a1);
        shape.closePath();
        shapes.push([shape, p]);
      }
    });
    let lit = -1;
    if (pointer.on) for (const [shape, p] of shapes) if (ctx.isPointInPath(shape, pointer.x * w * (ctx.getTransform().a), pointer.y * h * (ctx.getTransform().d))) lit = p;
    for (const [shape, p] of shapes) {
      const colour = tones.ribbons[paths[p].colour % tones.ribbons.length];
      const base = (light ? 0.24 : 0.3) * k * (p === lit ? 1.9 : 1);
      const glow = ctx.createLinearGradient(0, 0, w, 0);
      const at = (t * 0.05 + paths[p].phase) % 1;
      glow.addColorStop(0, rgba(colour, base));
      glow.addColorStop(clamp(at - 0.18, 0.001, 0.997), rgba(colour, base));
      glow.addColorStop(clamp(at, 0.002, 0.998), rgba(colour, base * 1.6));
      glow.addColorStop(clamp(at + 0.18, 0.003, 0.999), rgba(colour, base));
      glow.addColorStop(1, rgba(colour, base));
      ctx.fillStyle = glow;
      ctx.fill(shape);
    }
  },
  start: 5,
};

function mountScene(host, settings, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const env = {ctx, w: 1, h: 1, values: {...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, pointer: {x: 0.5, y: 0.5, on: false, down: false, px: 0, py: 0}, still: false};
  env.tones = readTones(host, env.scheme);
  env.still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  // A scene marked fresh lays a new pattern on every mount while it moves; a still frame keeps the
  // seeded one, so a reduced-motion page and the checks that sample it see the same picture.
  env.salt = SCENE.fresh && !env.still ? Math.floor(Math.random() * 1e6) : 0;
  let paused = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let t = SCENE.start ?? 0;

  const setup = () => { env.state = SCENE.setup(env, rng(SCENE.seed ?? 7)); };
  const draw = () => SCENE.draw(env, t);
  const loop = (now) => {
    frame = 0;
    t += clamp((now - (last || now)) / 1000, 0, 0.05) * (env.values.speed / 100);
    last = now;
    draw();
    schedule();
  };
  const schedule = () => {
    if (frame || env.still || paused || !visible || doc.hidden) return;
    frame = win.requestAnimationFrame(loop);
  };
  const stop = () => {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const resize = () => {
    const box = host.getBoundingClientRect();
    const ratio = Math.min(2, win.devicePixelRatio || 1);
    env.w = Math.max(1, box.width);
    env.h = Math.max(1, box.height);
    canvas.width = Math.round(env.w * ratio);
    canvas.height = Math.round(env.h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    setup();
    draw();
  };
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  const screen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else stop(); });
  screen.observe(host);
  const onVisibility = () => (doc.hidden ? stop() : schedule());
  doc.addEventListener('visibilitychange', onVisibility);
  const onMotion = () => { env.still = Boolean(context.reducedMotion) || motion.matches; if (env.still) { stop(); draw(); } else schedule(); };
  motion?.addEventListener?.('change', onMotion);
  // Pointer reactions listen on the window, passively: the host takes no pointer events.
  const onPointer = (event) => {
    const box = host.getBoundingClientRect();
    env.pointer.x = (event.clientX - box.left) / Math.max(1, box.width);
    env.pointer.y = (event.clientY - box.top) / Math.max(1, box.height);
    env.pointer.on = env.values.interactive !== false && env.pointer.x >= 0 && env.pointer.x <= 1 && env.pointer.y >= 0 && env.pointer.y <= 1;
  };
  win.addEventListener('pointermove', onPointer, {passive: true});
  // Press, drag and click inside the area: the host takes no pointer events, so they are read from
  // the window, inside the host's box, and never from a link, a button or a field over it.
  let pressed = null;
  const inside = (event) => {
    if (env.values.interactive === false || env.still || paused) return null;
    if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return null;
    const box = host.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    return x >= 0 && y >= 0 && x <= box.width && y <= box.height ? [x, y] : null;
  };
  const onDown = (event) => {
    if (event.button !== 0) return;
    const at = inside(event);
    if (!at) return;
    pressed = {x: at[0], y: at[1], time: event.timeStamp};
    env.pointer.down = true;
    env.pointer.px = at[0];
    env.pointer.py = at[1];
    SCENE.press?.(env, at[0], at[1]);
    schedule();
  };
  const onUp = (event) => {
    if (!pressed) return;
    const box = host.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    env.pointer.down = false;
    SCENE.release?.(env, x, y);
    if (Math.hypot(x - pressed.x, y - pressed.y) < 6 && event.timeStamp - pressed.time < 400) SCENE.click?.(env, x, y);
    pressed = null;
    schedule();
  };
  const onCancel = () => { pressed = null; env.pointer.down = false; };
  win.addEventListener('pointerdown', onDown, {passive: true});
  win.addEventListener('pointerup', onUp, {passive: true});
  win.addEventListener('pointercancel', onCancel, {passive: true});

  resize();
  schedule();

  return {
    update(next, nextContext = {}) {
      const before = env.values;
      env.values = {...next};
      if (nextContext.scheme !== undefined && nextContext.scheme !== env.scheme) {
        env.scheme = nextContext.scheme;
        env.tones = readTones(host, env.scheme);
      }
      if ((SCENE.reseed ?? []).some((key) => before[key] !== env.values[key]) || nextContext.scheme !== undefined) setup();
      if (!env.values.interactive) env.pointer.on = false;
      draw();
    },
    refreshTheme() { env.tones = readTones(host, env.scheme); draw(); },
    pause() { paused = true; stop(); },
    resume() { paused = false; schedule(); },
    destroy() {
      stop();
      sizes.disconnect();
      screen.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      motion?.removeEventListener?.('change', onMotion);
      win.removeEventListener('pointermove', onPointer);
      win.removeEventListener('pointerdown', onDown);
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onCancel);
      canvas.remove();
    },
  };
}

// The fixed palettes: on the effect's own layer they stand in for the theme's colour scales, so the
// effect reads them as it reads the theme. Each is a dark ground, the threads' mass, the bright
// colour and the hot one; the tones between are blended. 'theme' leaves the theme's scales alone.
const PALETTES = {
  turquoise: [[6, 11, 15], [12, 72, 90], [66, 178, 202], [216, 246, 255]],
  ocean: [[5, 9, 18], [16, 50, 118], [76, 148, 244], [214, 232, 255]],
  violet: [[10, 7, 20], [58, 28, 122], [162, 116, 252], [238, 226, 255]],
  rose: [[15, 6, 12], [104, 22, 74], [246, 104, 160], [255, 226, 238]],
  emerald: [[5, 13, 12], [8, 76, 62], [56, 190, 142], [216, 255, 238]],
  sunset: [[14, 7, 14], [84, 26, 74], [244, 146, 98], [255, 236, 214]],
  gold: [[12, 10, 6], [74, 54, 20], [226, 176, 82], [255, 242, 208]],
  silver: [[8, 10, 13], [42, 50, 60], [148, 166, 186], [242, 247, 255]],
};
// 'custom' builds the four from one colour, the colour setting (a hex): a dark ground of its hue,
// its mass, the colour itself and its light.
const rgbOf = (hex) => (/^#[0-9a-f]{6}$/iu.test(hex ?? '') ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : [59, 130, 246]);
const customStops = (hex) => { const c = rgbOf(hex); return [c.map((v) => 4 + v * 0.05), c.map((v) => v * 0.42), c, c.map((v) => v + (255 - v) * 0.86)]; };
const SCALE_TONES = [0, 4, 5, 6, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
function paintLayer(host, name, colour) {
  const stops = name === 'custom' ? customStops(colour) : PALETTES[name], at = [4, 30, 65, 95];
  for (const family of ['primary', 'secondary', 'tertiary']) for (const tone of SCALE_TONES) {
    const key = `--sf-${family}-${tone}`;
    if (!stops) { host.style.removeProperty(key); continue; }
    let i = 0;
    while (i < 2 && tone > at[i + 1]) i += 1;
    const u = Math.max(0, Math.min(1, (tone - at[i]) / (at[i + 1] - at[i])));
    host.style.setProperty(key, `rgb(${stops[i].map((v, c) => Math.round(v + (stops[i + 1][c] - v) * u)).join(' ')})`);
  }
}
export function mount(host, settings = {}, context = {}) {
  let palette = settings.palette, colour = settings.colour;
  paintLayer(host, palette, colour);
  const scene = mountScene(host, settings, context);
  return {
    ...scene,
    update(next = {}, nextContext = {}) {
      scene.update(next, nextContext);
      if (next.palette !== palette || (next.palette === 'custom' && next.colour !== colour)) { palette = next.palette; colour = next.colour; paintLayer(host, palette, colour); scene.refreshTheme?.(); }
    },
    destroy() { scene.destroy(); paintLayer(host); },
  };
}
