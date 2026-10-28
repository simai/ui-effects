// Sand picture (simai.effect 1.1.0; schemes light and dark): coloured sand between two panes runs down in streams into layered hills; the picture turns over and the landscape is new each time.
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

// A sand picture: two panes of glass with liquid and coloured sand between them. The sand rests in
// wavy layers in the upper half, held up by the liquid, and runs down in thin streams wherever it
// breaks through, piling into layered hills in the lower half, steep in the liquid, with the colours
// folding into each other. When the upper half has run out, the picture turns over and the sand that
// made the hills runs down again into a new landscape. A click turns it over at once.
const SCENE = {
  home: 'light', seed: 23, reseed: ['density', 'colours'],
  tones: (read, scheme) => scheme === 'light'
    ? {liquid: read('--sf-neutral-98', '#faf9fe'), deep: read('--sf-neutral-95', '#f0f0f7'), sand: [read('--sf-primary-80', '#adc6ff'), read('--sf-tertiary-80', '#e9b4f2'), read('--sf-warning-90', '#ffddb6'), read('--sf-neutral-80', '#c6c6cf'), read('--sf-secondary-80', '#4fd8e8')]}
    : {liquid: read('--sf-neutral-5', '#111318'), deep: read('--sf-neutral-10', '#1a1b21'), sand: [read('--sf-primary-30', '#00458f'), read('--sf-tertiary-30', '#62356c'), read('--sf-warning-30', '#6d3a00'), read('--sf-neutral-20', '#2f3036'), read('--sf-secondary-30', '#004f56')]},
  setup(env, random) {
    const {w, h, values} = env;
    // One cell is a few pixels: the grid is small enough to run every frame.
    const cell = 2, cols = Math.max(8, Math.ceil(w / cell)), rows = Math.max(8, Math.ceil(h / cell));
    const state = {cell, cols, rows, mid: Math.floor(rows / 2), colour: new Uint8Array(cols * rows), shade: new Uint8Array(cols * rows), moving: new Uint8Array(cols * rows), random, flip: null, idle: 0, image: new ImageData(cols, rows), canvas: new OffscreenCanvas(cols, rows)};
    state.ctx = state.canvas.getContext('2d');
    fill(state, Math.round(values.colours), values.density / 100);
    // Start part way through, so the first frame already holds hills.
    for (let i = 0; i < (env.still ? 700 : 340); i += 1) step(state);
    return state;
  },
  click(env) { if (!env.state.flip) env.state.flip = {born: env.time ?? 0}; },
  draw(env, t) {
    const {ctx, w, h, tones, state, values} = env;
    env.time = t;
    const k = values.intensity / 100;
    const dt = state.last === undefined ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    // Turning over: a half turn in a second and a half, then the grid is the other way up.
    let turn = 0;
    if (state.flip) {
      turn = Math.min(1, (t - state.flip.born) / 1.5);
      if (turn >= 1) { state.colour.reverse(); state.shade.reverse(); state.moving.fill(0); holes(state); state.flip = null; state.idle = 0; turn = 0; }
    } else {
      for (let i = 0, n = dt > 0 ? 2 : 0; i < n; i += 1) step(state);
      // Once the upper half has run out, wait a little and turn over.
      if (dt > 0 && upper(state) < state.cols * 0.6) { state.idle += dt; if (state.idle > 3) state.flip = {born: t}; }
    }
    const {cols, rows, colour, shade, image} = state;
    const data = image.data, sand = tones.sand.map((c) => mixc(tones.liquid, c, 0.35 + k * 0.65));
    for (let y = 0; y < rows; y += 1) {
      const liquid = mixc(tones.liquid, tones.deep, y / rows);
      for (let x = 0; x < cols; x += 1) {
        const i = y * cols + x, o = i * 4, c = colour[i];
        const rgb = c ? sand[c - 1] : liquid, s = c ? 0.93 + shade[i] / 255 * 0.14 : 1;
        data[o] = rgb[0] * s; data[o + 1] = rgb[1] * s; data[o + 2] = rgb[2] * s; data[o + 3] = 255;
      }
    }
    state.ctx.putImageData(image, 0, 0);
    ctx.fillStyle = rgba(tones.liquid);
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (turn > 0) {
      // While it turns, the picture shrinks just enough for its turned box to stay inside the area.
      const a = smooth(turn) * Math.PI, sin = Math.abs(Math.sin(a)), cos = Math.abs(Math.cos(a));
      const fit = Math.min(1, h / (w * sin + h * cos), w / (w * cos + h * sin));
      ctx.translate(w / 2, h / 2);
      ctx.rotate(a);
      ctx.scale(fit, fit);
      ctx.translate(-w / 2, -h / 2);
    }
    ctx.drawImage(state.canvas, 0, 0, cols * state.cell, rows * state.cell);
    ctx.restore();
  },
};
// The sand in wavy layers over the upper half, the lower half empty, and the gaps it will run through.
function fill(state, count, density) {
  const {cols, rows, mid, colour, shade, random} = state;
  colour.fill(0);
  const top = Math.floor(rows * 0.06);
  const waves = [random() * 9, random() * 9, random() * 9];
  let band = 0, depth = 0, current = 1 + Math.floor(random() * count);
  const bands = [];
  for (let y = top; y < mid; y += 1) {
    if (depth <= 0) { current = 1 + ((current + Math.floor(random() * (count - 1))) % count); depth = 2 + Math.floor(random() * (4 + (1 - density) * 10)); band += 1; }
    bands.push(current);
    depth -= 1;
  }
  for (let x = 0; x < cols; x += 1) {
    const lift = Math.round(Math.sin(x / cols * 6.3 + waves[0]) * 2 + Math.sin(x / cols * 17 + waves[1]) * 1.2);
    for (let y = top; y < mid; y += 1) {
      const i = y * cols + x, b = Math.max(0, Math.min(bands.length - 1, y - top + lift));
      colour[i] = bands[b];
      shade[i] = random() * 255;
    }
  }
  holes(state);
}
// The places along the middle where the sand breaks through the liquid, new after every turn.
function holes(state) {
  const {cols, random} = state;
  state.gaps = new Uint8Array(cols);
  const n = 3 + Math.floor(random() * 4);
  for (let i = 0; i < n; i += 1) {
    const at = Math.floor(random() * cols), width = 1 + Math.floor(random() * 3);
    for (let x = at; x < Math.min(cols, at + width); x += 1) state.gaps[x] = 1;
  }
}
function upper(state) {
  let n = 0;
  for (let i = 0, end = state.mid * state.cols; i < end; i += 1) if (state.colour[i]) n += 1;
  return n;
}
// One step of falling sand, bottom row first, each grain at most one cell: straight down if it can,
// else down and to one side, so it piles into hills. The middle holds except at the gaps, and a gap
// now and then widens, so the streams wander. Above the middle the sand is wet and hangs together:
// a grain falls only once the grain under it has gone (so shafts drain from below), or now and then
// drops off the underside as a drip.
function step(state) {
  const {cols, rows, mid, colour, shade, moving, gaps, random} = state;
  if (random() < 0.02) { const x = Math.floor(random() * cols); gaps[x] = 1; }
  const move = (from, to) => {
    colour[to] = colour[from]; shade[to] = shade[from]; moving[to] = 1;
    colour[from] = 0; moving[from] = 0;
    if (from >= cols && colour[from - cols]) moving[from - cols] = 1;
  };
  for (let y = rows - 2; y >= 0; y -= 1) {
    const blocked = y === mid - 1;
    const left = (y & 1) === 0;
    for (let n = 0; n < cols; n += 1) {
      const x = left ? n : cols - 1 - n, i = y * cols + x;
      if (!colour[i]) continue;
      if (blocked && !gaps[x]) {
        // On the middle the sand creeps sideways into an empty neighbour, and so on to a gap.
        const side = random() < 0.5 ? -1 : 1;
        if (x + side >= 0 && x + side < cols && !colour[i + side] && random() < 0.3) move(i, i + side); else moving[i] = 0;
        continue;
      }
      if (random() < 0.12) continue;
      const below = i + cols, wet = y < mid - 1;
      if (wet && !moving[i] && random() > 0.0025) continue;
      if (!colour[below]) { move(i, below); continue; }
      const side = random() < 0.5 ? -1 : 1;
      for (const dx of [side, -side]) {
        const nx = x + dx;
        if (nx < 0 || nx >= cols || (blocked && !gaps[nx])) continue;
        // Wet sand above the middle holds together: it slides aside only now and then, so it caves in narrow funnels.
        if (!colour[below + dx] && random() < (y < mid ? 0.25 : 0.6)) { move(i, below + dx); break; }
      }
      if (colour[i]) moving[i] = 0;
    }
  }
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
