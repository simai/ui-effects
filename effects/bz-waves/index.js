// Chemical waves (simai.effect 1.1.0; schemes light and dark): the Belousov–Zhabotinsky reaction: rings run through a dish and spirals keep turning; waves that meet wipe each other out.
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

// Chemical waves, after the Belousov–Zhabotinsky reaction: a dish where the colour runs in rings
// and spirals that keep turning. A wave excites the medium ahead of it and leaves it resting
// behind, so two waves that meet wipe each other out, and a broken wave curls into a spiral. The
// medium is Barkley's model of an excitable reaction, stepped in its fast stable form.
// A click starts a ring; pressing and dragging breaks the waves, and new spirals are born there.
const SCENE = {
  home: 'light', seed: 57, fresh: true, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-warning-95', '#ffeee1'), front: read('--sf-primary-50', '#0074ec'), tail: read('--sf-tertiary-80', '#e7b6ea')}
    : {ground: read('--sf-neutral-5', '#111318'), front: read('--sf-primary-70', '#7aabff'), tail: read('--sf-tertiary-30', '#563e5a')},
  setup(env, random) {
    const {w, h, values} = env;
    const cell = 4, gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
    const own = rng(57 + env.salt);
    const state = {cell, gw, gh, u: new Float32Array(gw * gh), v: new Float32Array(gw * gh), lap: new Float32Array(gw * gh), random, own, last: null, tick: 0, carry: 0, makers: [], image: null, buffer: null};
    // Broken waves that curl into spirals: more of them at a higher density.
    const spirals = Math.round((2 + values.density / 20) * clamp(w * h / 450000, 0.5, 1.6));
    for (let s = 0; s < spirals; s += 1) brokenWave(state, own() * gw, own() * gh, own() * 6.28, 18 + own() * 30);
    // A pacemaker: a spot that fires now and then and sends out rings.
    state.makers.push({x: Math.floor(own() * gw), y: Math.floor(own() * gh), every: 420 + Math.floor(own() * 200), at: Math.floor(own() * 400)});
    // The dish has been running for a while: the spirals have turned.
    for (let i = 0; i < 700; i += 1) react(state);
    return state;
  },
  click(env, x, y) { const s = env.state; excite(s, x / s.cell + 1, y / s.cell + 1, 3, 1); },
  draw(env, t) {
    const {ctx, w, h, state, values, pointer} = env;
    const k = values.intensity / 100;
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    // Seventy steps of the reaction a second at the normal speed.
    state.carry += dt * 70;
    for (; state.carry >= 1; state.carry -= 1) {
      // Pressing and dragging breaks the waves under the pointer: the medium there rests.
      if (pointer.down && pointer.on) excite(state, pointer.x * w / state.cell + 1, pointer.y * h / state.cell + 1, 3, 0);
      react(state);
    }
    paint(env, k);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(state.buffer, 1, 1, state.gw - 2, state.gh - 2, 0, 0, (state.gw - 2) * state.cell, (state.gh - 2) * state.cell);
  },
};
// Barkley's parameters: a and b shape the wave, EPS how sharp its front is; DT the time step and
// H the cell size in the model's units.
const A = 0.75, B = 0.02, EPS = 0.02, DT = 0.03, H = 0.4;
function react(state) {
  const {gw, gh, u, v, lap} = state;
  state.tick += 1;
  for (const m of state.makers) if ((state.tick + m.at) % m.every === 0) excite(state, m.x, m.y, 2, 1);
  // The edges mirror their neighbours: no flow out of the dish.
  for (let x = 0; x < gw; x += 1) { u[x] = u[gw + x]; u[(gh - 1) * gw + x] = u[(gh - 2) * gw + x]; }
  for (let y = 0; y < gh; y += 1) { u[y * gw] = u[y * gw + 1]; u[y * gw + gw - 1] = u[y * gw + gw - 2]; }
  const d = DT / (H * H);
  for (let y = 1; y < gh - 1; y += 1) for (let x = 1; x < gw - 1; x += 1) { const i = y * gw + x; lap[i] = (u[i - 1] + u[i + 1] + u[i - gw] + u[i + gw] - 4 * u[i]) * d; }
  const k = DT / EPS;
  for (let y = 1; y < gh - 1; y += 1) for (let x = 1; x < gw - 1; x += 1) {
    const i = y * gw + x, uu = u[i], vv = v[i], th = (vv + B) / A;
    let next = uu < th ? uu / (1 - k * (1 - uu) * (uu - th)) : (uu + k * uu * (uu - th)) / (1 + k * uu * (uu - th));
    next += lap[i];
    u[i] = next < 0 ? 0 : next > 1 ? 1 : next;
    v[i] = vv + DT * (uu - vv);
  }
}
// Fires the medium in a disk (on 1), or makes it rest (on 0): the wave cannot pass a resting spot.
function excite(state, cx, cy, r, on) {
  const {gw, gh, u, v} = state;
  for (let y = Math.floor(cy - r); y <= cy + r; y += 1) for (let x = Math.floor(cx - r); x <= cx + r; x += 1) {
    if (x < 1 || y < 1 || x >= gw - 1 || y >= gh - 1 || (x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
    const i = y * gw + x;
    if (on) { if (v[i] < 0.3) u[i] = 1; } else { u[i] = 0; v[i] = 0.9; }
  }
}
// A wave segment that can run only one way: excited cells with resting ones behind them. Its free
// ends curl round, and the segment becomes a pair of spirals.
function brokenWave(state, cx, cy, angle, length) {
  const {gw, gh, u, v} = state;
  const dx = Math.cos(angle), dy = Math.sin(angle), nx = -dy, ny = dx;
  for (let s = -length / 2; s <= length / 2; s += 0.5) {
    for (let d = -10; d < 3; d += 0.5) {
      const x = Math.round(cx + dx * s + nx * d), y = Math.round(cy + dy * s + ny * d);
      if (x < 1 || y < 1 || x >= gw - 1 || y >= gh - 1) continue;
      const i = y * gw + x;
      if (d >= 0) u[i] = 1; else v[i] = 0.8;
    }
  }
}
// The dish as a small picture, one pixel a cell, scaled up smoothly onto the canvas: the front
// where the medium fires, a fading tail where it rests.
function paint(env, k) {
  const {tones, state, scheme} = env;
  const {gw, gh, u, v} = state;
  if (!state.buffer || state.buffer.width !== gw || state.buffer.height !== gh) {
    state.buffer = env.ctx.canvas.ownerDocument.createElement('canvas');
    state.buffer.width = gw; state.buffer.height = gh;
    state.image = state.buffer.getContext('2d').createImageData(gw, gh);
  }
  const strength = (scheme === 'light' ? 0.56 : 0.4) * (0.4 + k * 0.7);
  const g = tones.ground, f = tones.front, tl = tones.tail;
  const data = state.image.data;
  for (let i = 0, n = gw * gh; i < n; i += 1) {
    // Only the leading edge of the excited band draws as the front: a thin line.
    const lead = u[i] - v[i] * 1.6, front = (lead > 0 ? Math.min(1, lead * 1.6) : 0) * strength, tail = Math.max(0, v[i] - 0.15) * strength * 0.35;
    const o = i * 4;
    for (let c = 0; c < 3; c += 1) { const back = g[c] + (tl[c] - g[c]) * tail; data[o + c] = back + (f[c] - back) * front; }
    data[o + 3] = 255;
  }
  state.buffer.getContext('2d').putImageData(state.image, 0, 0);
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
