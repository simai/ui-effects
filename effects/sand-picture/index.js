// Sand picture (simai.effect 1.1.0; schemes light and dark): sand runs down from above in streams and settles in smooth dunes of the theme's two colours; the picture sinks slowly, and the landscape keeps changing.
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

// A sand picture: liquid between two panes, the upper half of the frame out of sight above the area.
// Sand breaks away from it in curtains and runs down in thin streams that wander and stop, settles
// in the liquid and lands on smooth, broad dunes, so the colours lie in wavy bands, now one, now the
// other, each band one colour. Two colours: the theme's main one and the text colour, held soft.
// When the dunes reach two fifths of the height, the whole picture sinks slowly, as if the sand
// drained to the hidden half, and new layers keep landing on top: the landscape is new all the
// time. A click lets sand run down above the pointer.
const SCENE = {
  home: 'light', seed: 23, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), a: read('--sf-primary-40', '#005bbe'), b: read('--sf-neutral-10', '#1a1b21')}
    : {ground: read('--sf-neutral-5', '#111318'), a: read('--sf-primary-80', '#adc6ff'), b: read('--sf-neutral-90', '#e2e2e9')},
  setup(env, random) {
    const {w, h, values} = env;
    const cell = 2, cols = Math.max(8, Math.ceil(w / cell)), rows = Math.max(8, Math.ceil(h / cell));
    const state = {cell, cols, rows, random, height: new Float32Array(cols), image: new ImageData(cols, rows), canvas: new OffscreenCanvas(cols, rows), grains: [], streams: [], sink: 0, last: null, colours: null};
    state.ctx = state.canvas.getContext('2d');
    state.px = new Uint32Array(state.image.data.buffer);
    paletteOf(env, state);
    state.px.fill(state.colours.ground);
    const count = Math.round(2 + values.density / 25);
    for (let i = 0; i < count; i += 1) state.streams.push(stream(state, random() * cols, i));
    // The dunes of earlier minutes, laid straight onto the ground: the first frame has a landscape.
    for (let n = 0, total = cols * rows * 0.3; n < total; n += 1) {
      const sv = state.streams[n % count];
      if (n % 300 === 0) for (const one of state.streams) one.x = (one.x + (random() - 0.5) * cols * 0.5 + cols) % cols;
      land(state, Math.floor(sv.x + (random() - 0.5) * sv.width * 6), grain(state, sv, n / total * 240));
    }
    return state;
  },
  click(env, x) { const st = env.state; st.streams.push(Object.assign(stream(st, x / st.cell, st.streams.length), {life: 3.5, rate: 2.2})); },
  draw(env, t) {
    const {ctx, w, h, state, values} = env;
    const {cols, rows, cell, random, height} = state;
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    if (state.k !== values.intensity) paletteOf(env, state);
    // Streams wander, break off and start again; a clicked one runs out.
    const flow = 300 * (0.4 + values.density / 100) / Math.max(1, state.streams.length) * cols / 400;
    state.streams = state.streams.filter((sv) => sv.life === undefined || (sv.life -= dt) > 0);
    for (const sv of state.streams) {
      sv.x = (sv.x + (noise2(t * 0.08, sv.seed) - 0.5) * dt * 40 + cols) % cols;
      const on = sv.life !== undefined ? 1 : smooth(clamp((noise2(t * 0.12, sv.seed + 40) - 0.35) * 4, 0, 1));
      for (let n = flow * (sv.rate ?? 1) * on * dt; n > 0; n -= 1) {
        if (n < 1 && random() > n) break;
        state.grains.push({x: sv.x + (random() - 0.5) * sv.width, y: -random() * 6, v: 6 + random() * 10, c: grain(state, sv, t)});
      }
    }
    // Grains sink through the liquid at a gentle pace and land on the dune below.
    const kept = [];
    for (const g of state.grains) {
      g.v = Math.min(55, g.v + 60 * dt);
      g.y += g.v * dt;
      g.x += (random() - 0.5) * 0.3;
      const col = ((Math.round(g.x) % cols) + cols) % cols;
      if (g.y >= rows - height[col] - 1) land(state, col, g.c); else kept.push(g);
    }
    state.grains = kept;
    // Past the middle, the picture sinks a row at a time.
    let mean = 0;
    for (let i = 0; i < cols; i += 1) mean += height[i];
    if (mean / cols > rows * 0.4 && (state.sink += dt) > 0.25) {
      state.sink = 0;
      state.px.copyWithin(cols, 0, (rows - 1) * cols);
      state.px.fill(state.colours.ground, 0, cols);
      for (let i = 0; i < cols; i += 1) height[i] = Math.max(0, height[i] - 1);
    }
    state.ctx.putImageData(state.image, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(state.canvas, 0, 0, cols * cell, rows * cell);
    ctx.imageSmoothingEnabled = true;
    const img = state.colours.css;
    for (const g of state.grains) { ctx.fillStyle = img(g.c); ctx.fillRect(g.x * cell, g.y * cell, cell, cell); }
  },
};
// The theme's colours as packed pixels; each grain is one of twelve soft tones of the two colours.
function paletteOf(env, state) {
  const {tones, values} = env;
  const k = values.intensity / 100;
  const pack = (c) => (255 << 24) | ((c[2] | 0) << 16) | ((c[1] | 0) << 8) | (c[0] | 0);
  // Each colour in six close shades, so a band reads as one colour with the grain of sand in it.
  const tonesOf = (c, s) => Array.from({length: 6}, (_, i) => mixc(tones.ground, c, s * (0.82 + i * 0.05) * (0.5 + k * 0.7)));
  const list = [...tonesOf(tones.a, 0.3), ...tonesOf(tones.b, 0.17)];
  const packed = list.map(pack), styles = list.map((c) => rgba(c));
  const old = state.colours;
  state.colours = {ground: pack(tones.ground), list: packed, css: (i) => styles[i]};
  state.k = values.intensity;
  // A new intensity recolours what is already laid: every pixel keeps its tone index.
  if (old) {
    const map = new Map(old.list.map((v, i) => [v, packed[i]]));
    map.set(old.ground, state.colours.ground);
    for (let i = 0; i < state.px.length; i += 1) state.px[i] = map.get(state.px[i]) ?? state.px[i];
  }
}
function stream(state, x, i) { return {x, seed: i * 17.3 + 5, width: 2 + state.random() * 5}; }
// A grain's tone: the band the stream lays now, one colour or the other, mixed only for the moment
// it changes, and one of the colour's close shades.
function grain(state, sv, t) {
  const share = clamp((noise2(t * 0.05, sv.seed * 0.1 + 9) - 0.5) * 24 + 0.5, 0, 1);
  return (state.random() < share ? 0 : 6) + Math.floor(state.random() * 6);
}
// A grain lands on a column, then slides down whichever side is steeper, so the dunes stay smooth.
function land(state, col, c) {
  const {cols, rows, height, px, random} = state;
  col = ((col % cols) + cols) % cols;
  if (height[col] >= rows - 1) return;
  let x = col;
  for (let i = 0; i < 160; i += 1) {
    // A grain slides off any step of two cells, and down any slope steeper than one cell in three:
    // the dunes lie at about twenty degrees, not forty-five.
    const h = height[x], l1 = x > 0 ? h - height[x - 1] : 0, r1 = x < cols - 1 ? h - height[x + 1] : 0;
    const l = x > 2 ? h - height[x - 3] : l1, r = x < cols - 3 ? h - height[x + 3] : r1;
    const to = l + l1 > r + r1 || (l + l1 === r + r1 && random() < 0.5) ? x - 1 : x + 1;
    const step = to < x ? l1 : r1, slope = to < x ? l : r;
    if (step < 1 || (step < 2 && slope < 2)) break;
    x = to;
  }
  // Then it creeps a little along the surface, never uphill: the liquid rounds the crests.
  for (let i = 0; i < 6; i += 1) {
    const to = x + (random() < 0.5 ? -1 : 1);
    if (to < 0 || to >= cols || height[to] > height[x] - 1 + random()) break;
    x = to;
  }
  height[x] += 1;
  px[(rows - height[x]) * cols + x] = state.colours.list[c];
}

export function mount(host, settings, context = {}) {
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
