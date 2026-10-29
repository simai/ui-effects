// Cloud chamber (simai.effect 1.1.0; dark scheme only): particle tracks in mist: short thick alpha tracks, long curling electrons, a rare muon right across; each track flashes in and melts away.
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

// A cloud chamber: a dark box of cold vapour where the paths of charged particles show as threads
// of mist. Alpha particles leave short thick straight tracks, electrons long thin ones that wander
// and, in a magnetic field, curl into spirals; now and then a muon crosses the whole box. Each
// track flashes in at once, then spreads, sinks and melts away. The pointer is a radioactive
// sample that throws alpha tracks; a click is a shower of particles.
const SCENE = {
  home: 'dark', seed: 71, fresh: true, reseed: ['density'],
  tones: (read) => ({top: read('--sf-neutral-6', '#16181d'), low: read('--sf-neutral-4', '#0c0e13'), mist: read('--sf-neutral-90', '#e2e2eb'), haze: read('--sf-neutral-20', '#2f3036')}),
  setup(env, random) {
    const {w, h} = env;
    const own = rng(71 + env.salt);
    const state = {tracks: [], random: own, last: null, time: 0, due: 0, sample: 0};
    // Tracks of the last few seconds are still in the air on the first frame.
    for (let i = 0; i < rate(env) * 3.5; i += 1) state.tracks.push(track(env, own, null, -own() * 3.5));
    return state;
  },
  click(env, x, y) {
    const s = env.state;
    for (let i = 0; i < 7; i += 1) s.tracks.push(track(env, s.random, {x, y, kind: i % 3 ? 'beta' : 'alpha', angle: Math.PI / 2 + (s.random() - 0.5) * 1.2}, s.time));
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env;
    const k = values.intensity / 100;
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    state.time += dt;
    const now = state.time, random = state.random;
    state.due += rate(env) * dt;
    for (; state.due >= 1; state.due -= 1) state.tracks.push(track(env, random, null, now));
    // The sample under the pointer throws an alpha track every half second or so.
    if (pointer.on && dt) { state.sample += dt; if (state.sample > 0.45) { state.sample = 0; state.tracks.push(track(env, random, {x: pointer.x * w, y: pointer.y * h, kind: 'alpha', angle: random() * 6.28}, now)); } }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.top));
    g.addColorStop(1, rgba(tones.low));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // A faint drifting haze of vapour.
    for (let i = 0; i < 5; i += 1) {
      const cx = w * ((i * 0.23 + now * 0.004 * (i % 2 ? 1 : -1)) % 1 + 1) % w, cy = h * (0.2 + 0.15 * i), r = Math.max(w, h) * 0.3;
      const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      haze.addColorStop(0, rgba(tones.haze, 0.18));
      haze.addColorStop(1, rgba(tones.haze, 0));
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = rgba(tones.mist);
    const kept = [];
    for (const tr of state.tracks) {
      const age = now - tr.born;
      if (age > tr.life) continue;
      kept.push(tr);
      if (age < 0) continue;
      // In at once, then the mist thins as it spreads.
      const fade = Math.min(1, age / 0.08) * (1 - age / tr.life) ** 1.4;
      const shown = Math.min(1, age / 0.12);
      const spread = 1 + age * 0.9, sink = age * 5;
      const {drops, path} = tr, count = Math.floor(drops.length / 3 * shown), steps = Math.floor(path.length / 2 * shown);
      // The thread: a soft wide line under a thin bright one, both widening as the mist spreads.
      ctx.beginPath();
      for (let i = 0; i < steps; i += 1) ctx[i ? 'lineTo' : 'moveTo'](path[i * 2], path[i * 2 + 1] + sink);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = rgba(tones.mist);
      ctx.globalAlpha = fade * tr.bright * (0.35 + k * 0.6) * 0.22;
      ctx.lineWidth = tr.width * 2.2 * spread;
      ctx.stroke();
      ctx.globalAlpha = fade * tr.bright * (0.35 + k * 0.6) * 0.75;
      ctx.lineWidth = tr.width * 0.9 * spread;
      ctx.stroke();
      ctx.globalAlpha = fade * tr.bright * (0.35 + k * 0.6);
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        const o = i * 3, s = drops[o + 2] * (0.8 + age * 0.25);
        ctx.rect(drops[o] + tr.jx[i % 8] * (spread - 1), drops[o + 1] + sink + tr.jy[i % 8] * (spread - 1), s, s);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    state.tracks = kept;
  },
};
// New tracks a second: the density setting, scaled by the area.
function rate(env) { return (1.2 + env.values.density / 100 * 4) * clamp(env.w * env.h / 450000, 0.4, 1.8); }
function track(env, random, from, born) {
  const {w, h, values} = env;
  const roll = random();
  const kind = from?.kind ?? (roll < 0.4 ? 'alpha' : roll < 0.86 ? 'beta' : 'muon');
  let x = from?.x ?? random() * w, y = from?.y ?? random() * h, a = from?.angle ?? random() * 6.28;
  let length, width, bend = 0, wander, bright, life;
  if (kind === 'alpha') { length = 40 + random() * 70; width = 2.6; wander = 0.01; bright = 0.85; life = 2.2 + random(); }
  else if (kind === 'beta') { length = 140 + random() * 320; width = 1.1; wander = 0.09; bright = 0.6; life = 2.8 + random() * 1.4; bend = values.field === false ? 0 : (random() < 0.5 ? -1 : 1) * (0.004 + random() * 0.01); }
  else {
    // A muon crosses the whole box from one edge.
    const side = random() < 0.5; x = side ? random() * w : -10; y = side ? -10 : random() * h;
    a = side ? Math.PI / 2 + (random() - 0.5) * 0.8 : (random() - 0.5) * 0.6; length = Math.hypot(w, h) * 1.2; width = 0.9; wander = 0.004; bright = 0.45; life = 2 + random();
  }
  // Droplets along the path: x, y, size.
  const points = [], path = [];
  const steps = Math.floor(length / 2);
  for (let i = 0; i < steps; i += 1) {
    // An electron loses energy as it goes, so its spiral tightens.
    a += (random() - 0.5) * wander + bend * (1 + i / steps * 3);
    x += Math.cos(a) * 2; y += Math.sin(a) * 2;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) break;
    path.push(x, y);
    const per = kind === 'alpha' ? 2 : random() < 0.5 ? 1 : 0;
    for (let j = 0; j < per; j += 1) points.push(x + (random() - 0.5) * width * 1.6, y + (random() - 0.5) * width * 1.6, width * (0.5 + random() * 0.6));
    // An alpha track now and then knocks out an electron: a short curly branch.
    if (kind !== 'beta' && random() < 0.012) {
      let bx = x, by = y, ba = a + (random() < 0.5 ? 1.3 : -1.3);
      for (let s = 0; s < 18; s += 1) { ba += 0.18; bx += Math.cos(ba) * 1.6; by += Math.sin(ba) * 1.6; points.push(bx, by, 0.9); }
    }
  }
  const jx = [], jy = [];
  for (let i = 0; i < 8; i += 1) { jx.push((random() - 0.5) * width * 2); jy.push((random() - 0.5) * width * 2); }
  return {drops: new Float32Array(points), path: new Float32Array(path), width, jx, jy, born, life, bright};
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
