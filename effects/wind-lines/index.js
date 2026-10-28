// North wind (simai.effect 1.1.0; dark scheme only): thin wind lines follow unseen currents and bend round obstacles.
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
  home: 'dark', seed: 21, reseed: ['density'],
  tones: (read) => ({ground: read('--sf-neutral-5', '#111318'), a: read('--sf-primary-80', '#acc7ff'), b: read('--sf-secondary-80', '#bcc6e0'), deep: read('--sf-primary-20', '#002f66')}),
  setup(env, random) {
    const n = Math.round(env.w * env.h / 9000 * (0.4 + env.values.density / 60));
    const lines = Array.from({length: n}, () => ({x: random() * env.w, y: random() * env.h, age: random() * 200, alt: random() < 0.3}));
    const state = {lines, warm: false};
    return state;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env;
    const k = values.intensity / 100;
    if (!state.warm) {
      // A fixed number of steps before the first frame: the same trails on every mount.
      ctx.fillStyle = rgba(tones.ground);
      ctx.fillRect(0, 0, w, h);
      state.warm = true;
      for (let i = 0; i < 90; i += 1) step(env, t - (90 - i) * 0.03, k);
    }
    step(env, t, k);
  },
};
function step(env, t, k) {
  const {ctx, w, h, tones, state, pointer} = env;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(tones.ground, 0.035);
  ctx.fillRect(0, 0, w, h);
  const scale = 1 / 260;
  const px = pointer.x * w, py = pointer.y * h;
  ctx.lineWidth = 1.4;
  for (const line of state.lines) {
    let angle = (noise2(line.x * scale + t * 0.05, line.y * scale) - 0.5) * Math.PI * 2.2 + 0.4;
    let vx = Math.cos(angle), vy = Math.sin(angle) * 0.6;
    if (pointer.on) {
      // The pointer is a stone in the stream: the wind bends round it.
      const dx = line.x - px, dy = line.y - py, d = Math.hypot(dx, dy);
      if (d < 140) { const push = (1 - d / 140) * 2; vx += dx / d * push; vy += dy / d * push; }
    }
    const nx = line.x + vx * 1.6, ny = line.y + vy * 1.6;
    ctx.strokeStyle = rgba(line.alt ? tones.b : tones.a, 0.5 * k);
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    line.x = nx; line.y = ny; line.age += 1;
    if (line.x < -10 || line.x > w + 10 || line.y < -10 || line.y > h + 10 || line.age > 400) {
      line.x = hash2(line.age, line.y) * w * 0.3; line.y = hash2(line.x * 7, line.age) * h; line.age = 0;
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
