// Murmuration (simai.effect 1.1.0; schemes light and dark): a great flock of starlings moves as one: it stretches, folds and thickens again.
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

// A murmuration: a great flock of starlings at dusk moving as one body. Each bird keeps close to
// its neighbours, matches their heading and keeps a little room, and the whole cloud follows a slow
// wandering lead, so it stretches, folds, thins into ribbons and thickens again. The pointer is a
// falcon the flock swerves round, opening a hole that closes behind it; a click startles the birds
// near it into a burst.
const SCENE = {
  home: 'light', seed: 91, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {top: read('--sf-primary-95', '#ecf0ff'), low: read('--sf-warning-95', '#ffeee1'), bird: read('--sf-neutral-20', '#2f3036')}
    : {top: read('--sf-neutral-5', '#111318'), low: read('--sf-primary-10', '#001a41'), bird: read('--sf-neutral-80', '#c6c6cf')},
  setup(env, random) {
    const {w, h} = env;
    // Fewer birds on a small area, so the cloud keeps its size against the frame.
    const n = Math.round((700 + env.values.density * 16) * clamp(w * h / 600000, 0.35, 1.5));
    const birds = new Float32Array(n * 4);
    for (let i = 0; i < n; i += 1) {
      const a = random() * 6.28, r = random() * Math.min(w, h) * 0.2;
      birds[i * 4] = w * 0.5 + Math.cos(a) * r * 1.6; birds[i * 4 + 1] = h * 0.4 + Math.sin(a) * r;
      birds[i * 4 + 2] = Math.cos(a + 1.6) * 2; birds[i * 4 + 3] = Math.sin(a + 1.6) * 2;
    }
    const state = {n, birds, random, last: null, startle: [], cell: 24, time: 0};
    // The flock has been flying for a while before the first frame: it already has its shape.
    for (let i = 0; i < 360; i += 1) fly(env, state, i / 60, 1);
    state.time = 6;
    return state;
  },
  click(env, x, y) { env.state.startle.push({x, y, born: env.time ?? 0}); },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme} = env;
    const k = values.intensity / 100;
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    state.time += dt;
    env.time = state.time;
    fly(env, state, state.time, dt * 60);
    const {n, birds} = state;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.top));
    g.addColorStop(1, rgba(tones.low));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Each bird a short dark stroke along its heading: dense where the flock folds.
    ctx.strokeStyle = rgba(tones.bird, (scheme === 'light' ? 0.5 : 0.45) * (0.5 + k * 0.7));
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < n; i += 1) {
      const o = i * 4, x = birds[o], y = birds[o + 1];
      ctx.moveTo(x, y);
      ctx.lineTo(x - birds[o + 2] * 0.9, y - birds[o + 3] * 0.9);
    }
    ctx.stroke();
  },
};
// One step of the flock.
function fly(env, state, t, frames) {
  const {w, h, pointer} = env;
  const {n, birds, cell} = state;
  // The lead the flock follows: a slow loop through the area, kept off its edges.
  const lx = w * (0.5 + 0.3 * Math.sin(t * 0.13) * Math.cos(t * 0.05)), ly = h * (0.48 + 0.14 * Math.sin(t * 0.21 + 1));
  const fx = pointer.on ? pointer.x * w : -1e4, fy = pointer.on ? pointer.y * h : -1e4;
  state.startle = state.startle.filter((s) => t - s.born < 1.2);
  // A grid of buckets: each bird looks only at the birds in its own and the next cells.
  const cols = Math.ceil(w / cell) + 2, rows = Math.ceil(h / cell) + 2;
  const heads = new Int32Array(cols * rows).fill(-1), next = new Int32Array(n);
  const key = (x, y) => (clamp(Math.floor(y / cell) + 1, 0, rows - 1)) * cols + clamp(Math.floor(x / cell) + 1, 0, cols - 1);
  for (let i = 0; i < n; i += 1) { const c = key(birds[i * 4], birds[i * 4 + 1]); next[i] = heads[c]; heads[c] = i; }
  const speed = 2.6;
  for (let i = 0; i < n; i += 1) {
    const o = i * 4, x = birds[o], y = birds[o + 1];
    let vx = birds[o + 2], vy = birds[o + 3];
    let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, m = 0;
    const gx = Math.floor(x / cell) + 1, gy = Math.floor(y / cell) + 1;
    for (let yy = gy - 1; yy <= gy + 1; yy += 1) for (let xx = gx - 1; xx <= gx + 1; xx += 1) {
      if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
      for (let j = heads[yy * cols + xx], seen = 0; j >= 0 && seen < 7; j = next[j]) {
        if (j === i) continue;
        const dx = birds[j * 4] - x, dy = birds[j * 4 + 1] - y, d2 = dx * dx + dy * dy;
        if (d2 > cell * cell) continue;
        seen += 1; m += 1;
        cx += dx; cy += dy; ax += birds[j * 4 + 2]; ay += birds[j * 4 + 3];
        if (d2 < 64) { sx -= dx / (d2 + 1); sy -= dy / (d2 + 1); }
      }
    }
    if (m) { vx += (cx / m) * 0.012 + (ax / m - vx) * 0.08 + sx * 1.2; vy += (cy / m) * 0.012 + (ay / m - vy) * 0.08 + sy * 1.2; }
    // Towards the lead, gently, and away from the edges.
    vx += (lx - x) * 0.0005 * (1 + (x < 0 || x > w ? 4 : 0)); vy += (ly - y) * 0.0007 * (1 + (y < 0 || y > h ? 4 : 0));
    // The falcon and the startles push the birds away, hard.
    const px = x - fx, py = y - fy, pd = px * px + py * py, reach = 90;
    if (pd < reach * reach) { const f = (1 - Math.sqrt(pd) / reach) * 0.9; vx += px / Math.sqrt(pd + 1) * f; vy += py / Math.sqrt(pd + 1) * f; }
    for (const s of state.startle) { const qx = x - s.x, qy = y - s.y, q = Math.hypot(qx, qy) + 1, band = q - (t - s.born) * 260; if (Math.abs(band) < 40) { vx += qx / q * 1.2; vy += qy / q * 1.2; } }
    const v = Math.hypot(vx, vy) || 1, want = speed * (0.9 + 0.2 * Math.sin(i + t));
    vx = vx / v * want; vy = vy / v * want;
    birds[o] = x + vx * frames; birds[o + 1] = y + vy * frames; birds[o + 2] = vx; birds[o + 3] = vy;
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
