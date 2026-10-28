// Watercolour (simai.effect 1.1.0; light scheme only): drops of paint touch wet paper and bloom into stains with ragged edges.
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

// Watercolour on wet paper: a drop of paint touches the paper and blooms into a stain with ragged
// edges, a darker rim where the pigment gathers, and a few spatters. Stains dry into the paper and
// slowly fade, so the sheet keeps changing; each load lays them in a new order. A click drops paint;
// a press-drag is a wet brush.
const BLOOM = 7; // seconds a stain takes to spread
const SCENE = {
  home: 'light', seed: 81, start: 30, fresh: true, reseed: ['density'],
  tones: (read) => ({paper: read('--sf-neutral-98', '#faf9fe'), inks: [read('--sf-primary-70', '#7fabff'), read('--sf-tertiary-70', '#c798cd'), read('--sf-primary-60', '#4a8eff'), read('--sf-tertiary-60', '#ac7eb2'), read('--sf-secondary-70', '#a0abc4')]}),
  setup(env, random) {
    const {w, h, tones} = env;
    const paper = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const p = paper.getContext('2d');
    p.fillStyle = rgba(tones.paper);
    p.fillRect(0, 0, w, h);
    const state = {paper, p, live: [], next: 0, period: 7 - env.values.density / 25, last: null};
    // The sheet already holds the stains of the first seconds, dried.
    const before = Math.floor((SCENE.start - BLOOM) / state.period);
    for (let i = 0; i < before; i += 1) bake(env, state, spawn(env, state, i, i * state.period), BLOOM * 1.2);
    state.next = before;
    return state;
  },
  click(env, x, y) { env.state.live.push(stain(env, x, y, 0.9 + hash2(x, y) * 0.5, env.time ?? 0, Math.floor(hash2(y, x) * 5))); },
  press(env, x, y) { env.state.last = [x, y]; },
  release(env) { env.state.last = null; },
  draw(env, t) {
    const {ctx, w, h, state, pointer} = env;
    env.time = t;
    // New stains on their own clock, each from a fixed seed.
    while (state.next * state.period <= t) { state.live.push(spawn(env, state, state.next, state.next * state.period)); state.next += 1; }
    // The wet brush: paint laid along the drag.
    if (pointer.down && state.last) {
      const x = pointer.x * w, y = pointer.y * h;
      if (Math.hypot(x - state.last[0], y - state.last[1]) > 22) { state.live.push(stain(env, x, y, 0.35, t, 2)); state.last = [x, y]; }
    }
    // Dried stains fade into the paper, very slowly.
    state.p.fillStyle = rgba(env.tones.paper, 0.0025);
    state.p.fillRect(0, 0, w, h);
    ctx.drawImage(state.paper, 0, 0, w, h);
    state.live = state.live.filter((s) => {
      const age = t - s.born;
      if (age > BLOOM * 1.2) { bake(env, state, s, age); return false; }
      paint(ctx, env, s, age);
      return true;
    });
    if (state.live.length > 40) state.live.splice(0, state.live.length - 40).forEach((s) => bake(env, state, s, BLOOM * 1.2));
  },
};
function spawn(env, state, i, born) {
  // The salt is new on every mount: the stains fall in a new order after each reload.
  const j = i + env.salt;
  const x = hash2(j, 11) * env.w, y = hash2(j, 23) * env.h;
  return stain(env, x, y, 0.7 + hash2(j, 37) * 0.8, born, Math.floor(hash2(j, 41) * 5));
}
function stain(env, x, y, size, born, ink) {
  const R = Math.min(env.w, env.h) * 0.22 * size * (0.6 + env.values.intensity / 200);
  const seed = x * 0.013 + y * 0.007;
  const specks = Array.from({length: 10}, (_, k) => [hash2(k, seed * 100) * 6.283, 1 + hash2(seed * 50, k) * 0.5, 1 + hash2(k, k + seed) * 2.5]);
  return {x, y, R, born, ink, seed, specks};
}
// A stain's outline at a given spread: a ragged circle, its edge wobbling with noise.
function outline(ctx, s, r, wobble, layer = 0) {
  ctx.beginPath();
  for (let i = 0; i <= 64; i += 1) {
    const a = i / 64 * Math.PI * 2;
    const n = noise2(Math.cos(a) * 1.6 + s.seed * 7 + layer * 2.3, Math.sin(a) * 1.6 + s.seed * 3) * 0.55 + noise2(Math.cos(a) * 4 + s.seed + layer, Math.sin(a) * 4) * 0.3 + noise2(Math.cos(a) * 11 + layer, Math.sin(a) * 11 + s.seed) * 0.15;
    const rr = r * (0.72 + n * wobble);
    if (i) ctx.lineTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr); else ctx.moveTo(s.x + Math.cos(a) * rr, s.y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function paint(ctx, env, s, age) {
  const grow = 1 - Math.exp(-age / (BLOOM / 3));
  const r = s.R * grow;
  if (r < 1) return;
  const ink = env.tones.inks[s.ink];
  // Washes: many thin, soft layers, each with its own ragged edge, so the colour pools unevenly.
  ctx.save();
  ctx.filter = 'blur(3px)';
  for (let layer = 0; layer < 6; layer += 1) {
    ctx.fillStyle = rgba(ink, 0.05);
    outline(ctx, s, r * (1 - layer * 0.11), 0.6, layer);
    ctx.fill();
  }
  // The rim: pigment gathers at the edge as the wash dries, a soft darker line.
  ctx.filter = 'blur(1px)';
  ctx.strokeStyle = rgba(ink, 0.14 * Math.min(1, grow * 1.4));
  ctx.lineWidth = 2;
  outline(ctx, s, r, 0.6, 0);
  ctx.stroke();
  ctx.restore();
  for (const [a, reach, size] of s.specks) {
    ctx.fillStyle = rgba(ink, 0.22 * grow);
    ctx.beginPath();
    ctx.arc(s.x + Math.cos(a) * r * reach, s.y + Math.sin(a) * r * reach, size, 0, Math.PI * 2);
    ctx.fill();
  }
}
function bake(env, state, s, age) { paint(state.p, env, s, age); }

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
