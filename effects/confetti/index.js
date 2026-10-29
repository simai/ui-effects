// Confetti (simai.effect 1.1.0; schemes light and dark): paper confetti from a popper drifts down from above, tumbling in the air; a press fires a popper upwards.
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

// Confetti after a popper: paper pieces in the theme's colours drift down from above, each one
// tumbling (it narrows and widens as it turns) and swaying on the air, with a few curled ribbons
// among them. Pressing the button fires a popper from the point: a burst shoots up in a cone,
// slows, and the pieces flutter down with the rest.
const SCENE = {
  home: 'light', seed: 37, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), paper: [read('--sf-primary-60', '#4a8eff'), read('--sf-tertiary-60', '#ac7eb2'), read('--sf-warning-70', '#e08f2c'), read('--sf-error-70', '#ff897d'), read('--sf-success-70', '#4cbb6f'), read('--sf-secondary-60', '#00a2b0')]}
    : {ground: read('--sf-neutral-5', '#111318'), paper: [read('--sf-primary-60', '#4a8eff'), read('--sf-tertiary-60', '#ac7eb2'), read('--sf-warning-60', '#c0780a'), read('--sf-error-50', '#de3730'), read('--sf-success-50', '#2e9a54'), read('--sf-secondary-50', '#008792')]},
  setup(env, random) {
    const {w, h} = env;
    const state = {pieces: [], random, last: null, rain: 0};
    // The air is already full of falling pieces on the first frame.
    for (let i = 0, n = rate(env) * h / 35; i < n; i += 1) state.pieces.push(piece(env, random, random() * w, random() * h, 0, 20 + random() * 25));
    return state;
  },
  press(env, x, y) {
    const {state} = env, random = state.random;
    // The popper: a cone of pieces straight up, fast, and a few ribbons.
    for (let i = 0; i < 140; i += 1) {
      const a = -Math.PI / 2 + (random() - 0.5) * 0.9, v = 380 + random() * 620;
      state.pieces.push(piece(env, random, x, y, Math.cos(a) * v, Math.sin(a) * v, i % 9 === 0));
    }
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values} = env;
    const k = values.intensity / 100;
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    const random = state.random;
    // New pieces enter from above the area.
    state.rain += rate(env) * dt;
    for (; state.rain >= 1; state.rain -= 1) state.pieces.push(piece(env, random, random() * w, -10 - random() * 20, 0, 25 + random() * 20, random() < 0.06));
    const kept = [];
    for (const p of state.pieces) {
      // Paper in air: gravity, a strong drag that rises as the piece turns flat, and a sway.
      p.spin += p.turn * dt;
      const flat = Math.abs(Math.cos(p.spin));
      // A popper piece flies almost free for its first half second, then the air takes it.
      p.age += dt;
      const drag = (1.2 + flat * 2.2) * Math.min(1, 0.12 + p.age * 1.6);
      p.vx += (Math.sin(t * p.sway + p.seed) * 26 - p.vx) * Math.min(1, drag * dt * 0.5);
      p.vy += 420 * dt;
      p.vx *= Math.exp(-drag * dt * 0.6);
      p.vy *= Math.exp(-drag * dt);
      if (p.vy > p.fall) p.vy += (p.fall - p.vy) * Math.min(1, dt * 4);
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.roll += p.vx * dt * 0.012;
      if (p.y > h + 30) continue;
      kept.push(p);
      const colour = tones.paper[p.colour];
      // The face lit, the back a little darker.
      const back = Math.cos(p.spin) < 0;
      ctx.fillStyle = rgba(back ? mixc(colour, tones.ground, 0.25) : colour, (0.55 + 0.4 * k) * p.alpha);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.roll);
      if (p.ribbon) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 12; i += 1) { const s = i / 12; const px = Math.sin(s * 9 + p.spin) * 4 * flat + 1; ctx[i ? 'lineTo' : 'moveTo'](px, (s - 0.5) * p.size * 4); }
        ctx.stroke();
      } else {
        ctx.scale(1, 0.15 + 0.85 * flat);
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      }
      ctx.restore();
    }
    state.pieces = kept.length > 1600 ? kept.slice(kept.length - 1600) : kept;
  },
};
// Pieces per second from above: the density setting.
function rate(env) { return env.w * (0.01 + env.values.density / 100 * 0.03); }
function piece(env, random, x, y, vx, vy, ribbon = false) {
  return {x, y, vx, vy, ribbon, round: random() < 0.18, colour: Math.floor(random() * 6), size: 6 + random() * 6, spin: random() * 6.28, turn: 1.2 + random() * 2.8, roll: random() * 6.28, sway: 0.4 + random() * 0.7, seed: random() * 9, fall: 26 + random() * 22, alpha: 0.8 + random() * 0.2, age: vy < 0 ? 0 : 1};
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
