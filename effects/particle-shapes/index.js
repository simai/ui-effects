// Particle text (simai.effect 1.1.0; schemes dark and light): particles hold a text, scatter from a click and come back.
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

// Particles hold a text of one or more lines, breathing a little, and now and then scatter and gather
// again. The text fits the area by itself (size 100 % fills it comfortably). A click scatters the part
// of the text it lands on, and the particles fly back; holding the button whirls the ones nearby.
const SCENE = {
  home: 'dark', seed: 177, reseed: ['density', 'text', 'size'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), dot: read('--sf-primary-40', '#005bbe'), alt: read('--sf-tertiary-40', '#7c4c86')}
    : {ground: read('--sf-neutral-5', '#111318'), dot: read('--sf-primary-80', '#acc7ff'), alt: read('--sf-tertiary-80', '#e9b4f2')},
  setup(env, random) {
    const lines = String(env.values.text || 'SIMAI').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 4);
    if (!lines.length) lines.push('SIMAI');
    // Fit: the widest line takes about 70 % of the width and the block at most 55 % of the height,
    // then scaled by the size setting.
    const probe = new OffscreenCanvas(8, 8).getContext('2d');
    probe.font = '700 100px system-ui, sans-serif';
    const widest = Math.max(...lines.map((line) => probe.measureText(line).width), 1);
    const lineHeight = Math.max(12, Math.min(env.w * 0.7 / widest * 100, env.h * 0.55 / (lines.length * 1.12)) * (env.values.size / 100));
    const off = new OffscreenCanvas(Math.ceil(env.w), Math.ceil(lineHeight * lines.length * 1.15 + 8));
    const o = off.getContext('2d');
    o.fillStyle = '#fff';
    o.font = `700 ${lineHeight}px system-ui, sans-serif`;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    lines.forEach((line, i) => o.fillText(line, off.width / 2, lineHeight * 0.6 + i * lineHeight * 1.12));
    const pixels = o.getImageData(0, 0, off.width, off.height).data;
    const step = Math.max(2, Math.round(lineHeight / 28 * (1.6 - env.values.density / 100)));
    const top = (env.h - off.height) / 2;
    const particles = [];
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
      if (pixels[(y * off.width + x) * 4 + 3] < 128) continue;
      const home = [random() * env.w, random() * env.h];
      particles.push({target: [x, y + top], home, x: x, y: y + top, vx: 0, vy: 0, phase: random() * 6, alt: random() < 0.2});
    }
    return {particles, size: 1.6, whirl: false, reach: Math.min(env.w, env.h) * 0.16};
  },
  click(env, x, y) {
    // Only the part of the text under the click comes apart.
    const reach = env.state.reach;
    for (const p of env.state.particles) {
      const ex = p.x - x, ey = p.y - y, d = Math.hypot(ex, ey) || 1;
      if (d > reach) continue;
      const kick = 14 * (1 - d / reach) + 4;
      p.vx += ex / d * kick + (hash2(p.x, p.y) - 0.5) * 3; p.vy += ey / d * kick + (hash2(p.y, p.x) - 0.5) * 3;
    }
  },
  press(env) { env.state.whirl = true; },
  release(env) { env.state.whirl = false; },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    const k = values.intensity / 100;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    // Every 24 seconds the text comes apart for a while and gathers again.
    const c = (t / 24) % 1;
    const form = c < 0.8 ? 1 : c < 0.9 ? 1 - smooth((c - 0.8) / 0.1) : smooth((c - 0.9) / 0.1);
    const px = pointer.x * w, py = pointer.y * h;
    for (const p of state.particles) {
      const tx = mix(p.home[0], p.target[0], form) + Math.sin(t * 0.7 + p.phase) * 1.2;
      const ty = mix(p.home[1], p.target[1], form) + Math.cos(t * 0.6 + p.phase) * 1.2;
      // A spring back to its place, damped.
      p.vx += (tx - p.x) * 0.02; p.vy += (ty - p.y) * 0.02;
      if (state.whirl && pointer.down) {
        const ex = p.x - px, ey = p.y - py, d = Math.hypot(ex, ey) || 1;
        if (d < state.reach * 1.4) { const f = (1 - d / (state.reach * 1.4)) * 2.2; p.vx += -ey / d * f - ex / d * f * 0.3; p.vy += ex / d * f - ey / d * f * 0.3; }
      }
      p.vx *= 0.9; p.vy *= 0.9;
      p.x += p.vx; p.y += p.vy;
      ctx.fillStyle = rgba(p.alt ? tones.alt : tones.dot, (scheme === 'light' ? 0.6 : 0.7) * k * (0.45 + 0.55 * form));
      ctx.fillRect(p.x - state.size / 2, p.y - state.size / 2, state.size, state.size);
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
