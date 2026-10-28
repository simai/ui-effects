// Spacetime fabric (simai.effect 1.1.0; schemes dark and light): a grid bends round masses; the pointer is a heavy body, a click a gravitational wave.
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

// The fabric of spacetime: a grid that bends round masses. Two small planets orbit and dimple it.
// The pointer is a heavy mass that pulls the grid in; a click sends a gravitational wave across it;
// holding the button grows a black hole that swallows nearby stars and, let go, rings out a burst.
const SCENE = {
  home: 'dark', seed: 141, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), line: read('--sf-primary-40', '#005bbe'), deep: read('--sf-tertiary-40', '#7c4c86'), star: read('--sf-primary-30', '#00458f')}
    : {ground: read('--sf-neutral-5', '#111318'), line: read('--sf-primary-70', '#7fabff'), deep: read('--sf-tertiary-70', '#c798cd'), star: read('--sf-primary-90', '#d7e2ff')},
  setup(env, random) {
    const stars = Array.from({length: Math.round(env.w * env.h / 9000)}, () => ({x: random() * env.w, y: random() * env.h, vx: 0, vy: 0}));
    return {gap: 46 - env.values.density / 4, waves: [], hole: null, stars, pull: 0};
  },
  click(env, x, y) { env.state.waves.push({x, y, born: env.time ?? 0, strength: 1}); },
  press(env, x, y) { env.state.hole = {x, y, mass: 0}; },
  release(env) {
    const {state} = env;
    if (state.hole) state.waves.push({x: state.hole.x, y: state.hole.y, born: env.time ?? 0, strength: 1 + state.hole.mass * 2});
    state.hole = null;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    env.time = t;
    const k = values.intensity / 100;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    // The masses: two planets on slow orbits, the pointer, and a growing black hole.
    const masses = [
      {x: w * (0.5 + 0.3 * Math.cos(t * 0.11)), y: h * (0.5 + 0.28 * Math.sin(t * 0.11)), m: 40},
      {x: w * (0.5 + 0.18 * Math.cos(-t * 0.17 + 2)), y: h * (0.5 + 0.2 * Math.sin(-t * 0.17 + 2)), m: 26},
    ];
    state.pull += ((pointer.on ? 1 : 0) - state.pull) * 0.06;
    if (state.pull > 0.01) masses.push({x: pointer.x * w, y: pointer.y * h, m: 90 * state.pull});
    if (state.hole) {
      state.hole.mass = Math.min(1, state.hole.mass + 0.006);
      if (pointer.down) { state.hole.x += (pointer.x * w - state.hole.x) * 0.2; state.hole.y += (pointer.y * h - state.hole.y) * 0.2; }
      masses.push({x: state.hole.x, y: state.hole.y, m: 90 + 260 * state.hole.mass});
    }
    state.waves = state.waves.filter((wave) => t - wave.born < 6);
    // A point of the grid: pulled toward every mass, and lifted by passing waves. The depth it sinks
    // to brightens it.
    const at = (x, y) => {
      let dx = 0, dy = 0, depth = 0;
      for (const m of masses) {
        const ex = m.x - x, ey = m.y - y, d = Math.hypot(ex, ey) || 1, d2 = d * d + 6400;
        // The pull never carries a point past the mass: the grid dips and does not tear.
        const pull = Math.min(d * 0.55, m.m * 2400 / d2 * 6);
        dx += ex / d * pull; dy += ey / d * pull; depth += m.m * 160 / d2;
      }
      for (const wave of state.waves) {
        const age = t - wave.born, ex = x - wave.x, ey = y - wave.y, d = Math.hypot(ex, ey) || 1;
        const front = age * 220, band = d - front;
        if (Math.abs(band) < 70) { const amp = Math.cos(band / 70 * Math.PI / 2) * 14 * wave.strength * (1 - age / 6); dx += ex / d * amp; dy += ey / d * amp; depth += Math.abs(amp) / 14; }
      }
      return [x + dx, y + dy, Math.min(1, depth)];
    };
    const gap = state.gap, step = 8;
    const alpha = (scheme === 'light' ? 0.28 : 0.26) * k;
    const line = (points) => {
      for (let i = 1; i < points.length; i += 1) {
        const [x0, y0, d0] = points[i - 1], [x1, y1] = points[i];
        ctx.strokeStyle = rgba(mixc(tones.line, tones.deep, d0), alpha * (1 + d0 * 1.6));
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    };
    ctx.lineWidth = 1;
    for (let y = -gap; y < h + gap; y += gap) { const points = []; for (let x = -gap; x <= w + gap; x += step) points.push(at(x, y)); line(points); }
    for (let x = -gap; x < w + gap; x += gap) { const points = []; for (let y = -gap; y <= h + gap; y += step) points.push(at(x, y)); line(points); }
    // Stars drift, and fall into the black hole while it grows.
    for (const star of state.stars) {
      if (state.hole) {
        const ex = state.hole.x - star.x, ey = state.hole.y - star.y, d = Math.hypot(ex, ey) || 1;
        const f = (0.4 + state.hole.mass * 2.5) / Math.max(30, d) * 4;
        star.vx = star.vx * 0.96 + (ex / d * f - ey / d * f * 0.8);
        star.vy = star.vy * 0.96 + (ey / d * f + ex / d * f * 0.8);
        if (d < 8 + state.hole.mass * 10) { star.x = hash2(star.x, t) * w; star.y = hash2(t, star.y) * h; star.vx = star.vy = 0; }
      } else { star.vx *= 0.9; star.vy *= 0.9; }
      star.x += star.vx; star.y += star.vy;
      ctx.fillStyle = rgba(tones.star, 0.5 * k);
      ctx.fillRect(star.x, star.y, 1.4, 1.4);
    }
    if (state.hole) {
      const r = 4 + state.hole.mass * 16;
      ctx.fillStyle = rgba(scheme === 'light' ? [10, 10, 16] : [0, 0, 0]);
      ctx.beginPath(); ctx.arc(state.hole.x, state.hole.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rgba(tones.deep, 0.6 * k);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(state.hole.x, state.hole.y, r + 3, 0, Math.PI * 2); ctx.stroke();
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
