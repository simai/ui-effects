// Deep ocean (simai.effect 1.1.0; dark scheme only): bubbles rise slowly, plankton glimmers, faint light falls from above.
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
  home: 'dark', seed: 45, reseed: ['density'],
  tones: (read) => ({top: read('--sf-primary-15', '#001d43'), ground: read('--sf-neutral-5', '#111318'), ray: read('--sf-primary-80', '#acc7ff'), bubble: read('--sf-primary-90', '#d7e2ff'), glow: read('--sf-secondary-80', '#bcc6e0')}),
  setup(env, random) {
    const n = Math.round(env.w * env.h / 6000 * (0.3 + env.values.density / 70));
    const bubbles = Array.from({length: Math.round(n / 4)}, () => ({x: random(), y: random(), r: 1 + random() * 3, speed: 0.02 + random() * 0.04, wobble: random() * 6}));
    const plankton = Array.from({length: n}, () => ({x: random(), y: random(), phase: random() * 6, drift: random() * 6}));
    const rays = Array.from({length: 6}, (_, i) => ({x: 0.1 + i * 0.16 + random() * 0.06, width: 0.04 + random() * 0.08, phase: random() * 6}));
    return {bubbles, plankton, rays};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env;
    const k = values.intensity / 100;
    const sea = ctx.createLinearGradient(0, 0, 0, h);
    sea.addColorStop(0, rgba(tones.top));
    sea.addColorStop(1, rgba(tones.ground));
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, w, h);
    // Faint light from the surface, swaying.
    for (const ray of state.rays) {
      const x = (ray.x + Math.sin(t * 0.1 + ray.phase) * 0.03) * w;
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.8);
      g.addColorStop(0, rgba(tones.ray, 0.07 * k));
      g.addColorStop(1, rgba(tones.ray, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - ray.width * w * 0.3, 0);
      ctx.lineTo(x + ray.width * w * 0.3, 0);
      ctx.lineTo(x + ray.width * w + 40, h * 0.8);
      ctx.lineTo(x - 40, h * 0.8);
      ctx.fill();
    }
    for (const p of state.plankton) {
      const x = ((p.x + Math.sin(t * 0.07 + p.drift) * 0.01) % 1) * w, y = ((p.y + t * 0.004) % 1) * h;
      const a = (0.5 + 0.5 * Math.sin(t * 0.8 + p.phase)) * 0.4 * k;
      ctx.fillStyle = rgba(tones.glow, a);
      ctx.fillRect(x, y, 1.4, 1.4);
    }
    ctx.lineWidth = 1;
    for (const b of state.bubbles) {
      let x = b.x * w + Math.sin(t * 1.2 + b.wobble) * 4;
      const y = (1 - ((b.y + t * b.speed) % 1)) * h;
      if (pointer.on) { const dx = x - pointer.x * w; if (Math.abs(dx) < 60 && Math.abs(y - pointer.y * h) < 80) x += Math.sign(dx || 1) * (60 - Math.abs(dx)) * 0.4; }
      ctx.strokeStyle = rgba(tones.bubble, 0.35 * k);
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
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
