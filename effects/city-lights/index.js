// City lights (simai.effect 1.1.0; dark scheme only): a city at night from above: a grid of streets, running car lights, warm windows.
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
  home: 'dark', seed: 33, reseed: ['density'],
  tones: (read) => ({ground: read('--sf-neutral-5', '#111318'), street: read('--sf-neutral-15', '#1d2025'), warm: read('--sf-warning-80', '#ffb95c'), cold: read('--sf-primary-90', '#d7e2ff'), red: read('--sf-error-70', '#ff8a7a')}),
  setup(env, random) {
    const cell = 46;
    const cols = Math.ceil(env.w / cell) + 1, rows = Math.ceil(env.h / cell) + 1;
    const windows = [];
    for (let c = 0; c < cols; c += 1) for (let r = 0; r < rows; r += 1) {
      if (random() < 0.55) continue;
      const count = 2 + Math.floor(random() * 5);
      for (let i = 0; i < count; i += 1) windows.push({x: c * cell + 8 + random() * (cell - 18), y: r * cell + 8 + random() * (cell - 18), phase: random() * 50, rate: 0.02 + random() * 0.08});
    }
    const cars = Array.from({length: Math.round((cols + rows) * env.values.density / 25)}, () => {
      const horizontal = random() < 0.5;
      return {horizontal, lane: Math.floor(random() * (horizontal ? rows : cols)) * cell, pos: random(), speed: 0.02 + random() * 0.05, dir: random() < 0.5 ? 1 : -1};
    });
    return {cell, windows, cars};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values} = env;
    const k = values.intensity / 100;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(tones.street, 0.7);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x < w + state.cell; x += state.cell) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y < h + state.cell; y += state.cell) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    // Windows: warm squares that light and go dark on their own slow clocks.
    for (const win of state.windows) {
      const on = Math.sin(win.phase + t * win.rate) > -0.2;
      if (!on) continue;
      ctx.fillStyle = rgba(tones.warm, 0.12 * k);
      ctx.fillRect(win.x - 2, win.y - 2, 7, 7);
      ctx.fillStyle = rgba(tones.warm, 0.6 * k);
      ctx.fillRect(win.x, win.y, 3, 3);
    }
    // Cars: a white head and a red tail running along the streets.
    for (const car of state.cars) {
      const length = car.horizontal ? w : h;
      const p = ((car.pos + t * car.speed * car.dir) % 1 + 1) % 1 * length;
      const x = car.horizontal ? p : car.lane, y = car.horizontal ? car.lane : p;
      const tail = car.dir * 10;
      ctx.fillStyle = rgba(car.dir > 0 ? tones.cold : tones.red, 0.75 * k);
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
      const g = car.horizontal ? ctx.createLinearGradient(x, y, x - tail, y) : ctx.createLinearGradient(x, y, x, y - tail);
      g.addColorStop(0, rgba(car.dir > 0 ? tones.cold : tones.red, 0.35 * k));
      g.addColorStop(1, rgba(tones.ground, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(car.horizontal ? x - tail : x, car.horizontal ? y : y - tail);
      ctx.stroke();
    }
  },
};

export function mount(host, settings, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const env = {ctx, w: 1, h: 1, values: {...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, pointer: {x: 0.5, y: 0.5, on: false}, still: false};
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
      canvas.remove();
    },
  };
}
