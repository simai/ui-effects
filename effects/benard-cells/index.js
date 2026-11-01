// Bénard cells (simai.effect 1.1.0; schemes light and dark): a layer of oil warmed from below sorts itself into living honeycomb: flow runs from each centre to the rim; the cells breathe and rearrange.
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

// Bénard cells: a thin layer of oil warmed from below sorts itself into cells like a honeycomb.
// Warm oil wells up in the middle of each cell, spreads to its rim and sinks there; flakes in the
// oil show the flow, running out from each centre. The cells breathe, drift and nudge each other
// into a new pattern all the time. A click warms the oil at the point and a new cell opens there.
const SCENE = {
  home: 'light', seed: 83, fresh: true, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), well: read('--sf-primary-95', '#ecf0ff'), rim: read('--sf-primary-80', '#adc6ff'), flake: read('--sf-neutral-40', '#5d5e66')}
    : {ground: read('--sf-neutral-6', '#16181d'), well: read('--sf-primary-20', '#002e69'), rim: read('--sf-primary-40', '#005bbe'), flake: read('--sf-neutral-70', '#aaabb4')},
  setup(env, random) {
    const {w, h, values} = env;
    const own = rng(83 + env.salt);
    // Smaller cells at a higher density.
    const r = 78 - values.density * 0.36;
    const cells = [];
    const dy = r * 0.866;
    for (let row = -1, y = -dy / 2; y < h + r; row += 1, y += dy) {
      for (let x = (row % 2 ? r / 2 : 0) - r / 2; x < w + r; x += r) cells.push({x: x + (own() - 0.5) * r * 0.5, y: y + (own() - 0.5) * r * 0.5, vx: 0, vy: 0, phase: own() * 6.28, grow: 1});
    }
    const flakes = new Float32Array(Math.round(cells.length * 18) * 3);
    const state = {r, cells, flakes, random: own, last: null, time: 0, target: cells.length, buffer: null, image: null, scale: 4};
    for (let i = 0; i < flakes.length / 3; i += 1) respawn(state, i, own() * 0.9);
    // The layer has been warm for a while: the cells have found their places.
    for (let i = 0; i < 90; i += 1) settle(env, state, 1 / 30, 0);
    for (let i = 0; i < 60; i += 1) flow(env, state, 1 / 30);
    return state;
  },
  click(env, x, y) {
    const s = env.state;
    s.cells.push({x, y, vx: 0, vy: 0, phase: s.random() * 6.28, grow: 0.2});
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme} = env;
    const k = values.intensity / 100;
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    state.time += dt;
    if (dt) { settle(env, state, dt, state.time); flow(env, state, dt); }
    shade(env, k);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.buffer, 0, 0, state.buffer.width, state.buffer.height, 0, 0, state.buffer.width * state.scale, state.buffer.height * state.scale);
    // Flakes: short strokes along the flow, faint where they sink at the rim.
    ctx.strokeStyle = rgba(tones.flake, (scheme === 'light' ? 0.45 : 0.5) * (0.4 + k * 0.6));
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const f = state.flakes;
    for (let i = 0; i < f.length; i += 3) {
      const c = state.cells[f[i + 2]];
      if (!c) continue;
      const dx = f[i] - c.x, dy = f[i + 1] - c.y, d = Math.hypot(dx, dy) || 1;
      ctx.moveTo(f[i], f[i + 1]);
      ctx.lineTo(f[i] - dx / d * 3, f[i + 1] - dy / d * 3);
    }
    ctx.stroke();
  },
};
// The cells push their neighbours to an even spacing, drift on a slow current and breathe.
function settle(env, state, dt, time) {
  const {w, h} = env;
  const {cells, r} = state;
  const grid = buckets(cells, r);
  for (const c of cells) {
    c.grow = Math.min(1, c.grow + dt * 0.4);
    let fx = 0, fy = 0;
    near(grid, r, c.x, c.y, (o) => {
      if (o === c) return;
      const dx = c.x - o.x, dy = c.y - o.y, d = Math.hypot(dx, dy) || 1;
      const want = r * (c.grow + o.grow) / 2;
      if (d < want * 1.2) { const push = (want * 1.2 - d) / want; fx += dx / d * push; fy += dy / d * push; }
    });
    fx += (noise2(c.x * 0.004 + time * 0.05, c.y * 0.004) - 0.5) * 0.6;
    fy += (noise2(c.x * 0.004 + 9, c.y * 0.004 - time * 0.05) - 0.5) * 0.6;
    c.vx = (c.vx + fx * 18 * dt) * Math.exp(-dt * 3);
    c.vy = (c.vy + fy * 18 * dt) * Math.exp(-dt * 3);
    c.x = clamp(c.x + c.vx * dt * 10, -r, w + r);
    c.y = clamp(c.y + c.vy * dt * 10, -r, h + r);
  }
  // A new cell crowds the layer: the most crowded old one closes, one a second.
  if (cells.length > state.target && (state.closing = (state.closing ?? 0) + dt) > 1) {
    state.closing = 0;
    let worst = -1, best = Infinity;
    cells.forEach((c, i) => { if (c.grow < 1) return; let m = Infinity; near(grid, r, c.x, c.y, (o) => { if (o !== c) m = Math.min(m, Math.hypot(c.x - o.x, c.y - o.y)); }); if (m < best) { best = m; worst = i; } });
    if (worst >= 0) cells.splice(worst, 1);
  }
}
// The flakes run out from the centre of their cell and sink at its rim, then well up again.
function flow(env, state, dt) {
  const {cells, flakes, r} = state;
  const grid = buckets(cells, r);
  for (let i = 0; i < flakes.length / 3; i += 1) {
    const o = i * 3, x = flakes[o], y = flakes[o + 1];
    const [a, d1, d2] = nearest(grid, r, x, y);
    if (a < 0 || d2 - d1 < 3) { respawn(state, i, 0); continue; }
    const c = cells[a], dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy) || 1;
    // Fast near the centre, slow as the rim nears.
    const v = 22 * (0.35 + (d2 - d1) / (d1 + d2));
    flakes[o] = x + dx / d * v * dt; flakes[o + 1] = y + dy / d * v * dt; flakes[o + 2] = a;
  }
}
function respawn(state, i, out) {
  const {cells, flakes, r, random} = state;
  const a = Math.floor(random() * cells.length), c = cells[a], ang = random() * 6.28, d = (out + random() * 0.12) * r * 0.5;
  flakes[i * 3] = c.x + Math.cos(ang) * d; flakes[i * 3 + 1] = c.y + Math.sin(ang) * d; flakes[i * 3 + 2] = a;
}
function buckets(cells, r) {
  const map = new Map();
  cells.forEach((c, i) => { const key = `${Math.floor(c.x / r)},${Math.floor(c.y / r)}`; if (!map.has(key)) map.set(key, []); map.get(key).push(i); });
  return {map, cells};
}
function near(grid, r, x, y, visit) {
  const gx = Math.floor(x / r), gy = Math.floor(y / r);
  for (let yy = gy - 1; yy <= gy + 1; yy += 1) for (let xx = gx - 1; xx <= gx + 1; xx += 1) for (const i of grid.map.get(`${xx},${yy}`) ?? []) visit(grid.cells[i]);
}
// The nearest cell and the distances to the nearest two centres.
function nearest(grid, r, x, y) {
  let a = -1, d1 = Infinity, d2 = Infinity;
  const gx = Math.floor(x / r), gy = Math.floor(y / r);
  for (let yy = gy - 1; yy <= gy + 1; yy += 1) for (let xx = gx - 1; xx <= gx + 1; xx += 1) {
    for (const i of grid.map.get(`${xx},${yy}`) ?? []) {
      const c = grid.cells[i], d = Math.hypot(x - c.x, y - c.y) / (0.6 + 0.4 * c.grow);
      if (d < d1) { d2 = d1; d1 = d; a = i; } else if (d < d2) d2 = d;
    }
  }
  return [a, d1, d2];
}
// The layer as a small picture: a light well in each centre, a darker rim where the oil sinks.
function shade(env, k) {
  const {w, h, tones, state, scheme} = env;
  const q = state.scale, bw = Math.ceil(w / q), bh = Math.ceil(h / q);
  if (!state.buffer || state.buffer.width !== bw || state.buffer.height !== bh) {
    state.buffer = env.ctx.canvas.ownerDocument.createElement('canvas');
    state.buffer.width = bw; state.buffer.height = bh;
    state.image = state.buffer.getContext('2d').createImageData(bw, bh);
  }
  const grid = buckets(state.cells, state.r);
  const data = state.image.data, strength = (scheme === 'light' ? 0.75 : 0.7) * (0.45 + k * 0.6);
  for (let y = 0; y < bh; y += 1) for (let x = 0; x < bw; x += 1) {
    const [a, d1, d2] = nearest(grid, state.r, x * q + q / 2, y * q + q / 2);
    let c = tones.ground;
    if (a >= 0) {
      const cell = state.cells[a];
      const breathe = 0.85 + 0.15 * Math.sin(state.time * 0.8 + cell.phase);
      const centre = Math.max(0, 1 - d1 / (state.r * 0.55)) * breathe;
      const rim = Math.max(0, 1 - (d2 - d1) / 7);
      c = mixc(mixc(tones.ground, tones.well, centre * strength), tones.rim, rim * strength * 0.8);
    }
    const o = (y * bw + x) * 4;
    data[o] = c[0]; data[o + 1] = c[1]; data[o + 2] = c[2]; data[o + 3] = 255;
  }
  state.buffer.getContext('2d').putImageData(state.image, 0, 0);
}

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
