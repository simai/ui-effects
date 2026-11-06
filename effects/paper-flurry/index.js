// Paper flurry (simai.effect 1.1.0; schemes light and dark): a heap of document sheets is tossed up
// from below, the sheets flutter and swing down like falling leaves of paper; a press scatters them.
//
// The lifecycle is the catalogue template's: one canvas in the host, devicePixelRatio capped at 2,
// a seeded scene (the still frame is the same on every mount; while it moves, every mount tosses a
// new heap), one still frame for reduced motion, no frames while the tab is hidden or the area is
// off screen, and nothing left behind. Colours are palette tones of the theme, read through a probe
// so var() chains settle.

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


// A flurry of paper: a heap of document sheets is tossed up from below, mostly on the right and
// centre-right so the text on the left stays clear. The sheets slow at the top, turn over and swing
// down like falling leaves of paper, and drift out at the bottom; a new toss comes every few
// seconds. Depth sets size, paleness and pace: far sheets are small, pale and slow. A turning sheet
// is foreshortened along one axis only (its width or height times the cosine of the turn), then
// rotated in the plane: no perspective and no skew. The pointer blows near sheets aside; a press
// is a gust that scatters them outwards and up, spinning, and tosses a few new sheets from there.
const SCENE = {
  home: 'light', seed: 613, reseed: ['amount', 'size'], fresh: true,
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), paper: read('--sf-neutral-100', '#ffffff'), back: read('--sf-neutral-95', '#f0f0f6'),
      edge: read('--sf-neutral-80', '#c6c6cf'), ink: read('--sf-neutral-70', '#abaab3'), shade: read('--sf-neutral-20', '#2f3036'),
      accents: [read('--sf-primary-80', '#acc7ff'), read('--sf-secondary-80', '#bec6dc'), read('--sf-tertiary-80', '#ddbce0')]}
    : {ground: read('--sf-neutral-5', '#111318'), paper: read('--sf-neutral-20', '#2f3036'), back: read('--sf-neutral-10', '#1a1b20'),
      edge: read('--sf-neutral-30', '#45464e'), ink: read('--sf-neutral-50', '#76777f'), shade: read('--sf-neutral-0', '#000000'),
      accents: [read('--sf-primary-40', '#005bbe'), read('--sf-secondary-40', '#565e71'), read('--sf-tertiary-40', '#705575')]},
  setup(env) {
    const {w, h} = env;
    const random = rng(SCENE.seed + env.salt);
    const s = unit(env);
    // Three launch places for this mount, weighted to the right; a fourth, rarer one in the middle.
    const sites = [0.56 + random() * 0.08, 0.7 + random() * 0.08, 0.84 + random() * 0.1, 0.36 + random() * 0.1];
    const state = {sheets: [], random, sites, last: null, next: 0.6 + random() * 1.2, prev: null, gusts: []};
    // The first frame (and the still one) already has sheets in the air, falling, at every height.
    const n = Math.round(count(env) * 1.6);
    for (let i = 0; i < n; i += 1) {
      const p = sheet(env, random, w * site(state, random), h * (0.04 + random() * 0.92), 0, 0);
      p.vy = p.fall * (0.6 + random() * 0.4); p.vx = (random() - 0.5) * 40 * s; p.age = 3; p.turn = p.turn0;
      state.sheets.push(p);
    }
    // One toss caught on its way up, so the still frame shows the heap opening as well.
    toss(env, state, w * sites[1], h + 20 * s, Math.round(count(env) * 0.6), 0.55);
    for (const p of state.sheets) if (p.age === 0) { p.age = 0.55; p.x += p.vx * 0.5; p.y += p.vy * 0.5; p.vy *= 0.45; p.vx *= 0.6; }
    state.sheets.sort((a, b) => a.z - b.z);
    return state;
  },
  press(env, x, y) {
    const {state, w, h} = env, random = state.random, s = unit(env);
    // The gust: every sheet near the point is thrown outwards and up and spins faster.
    const reach = Math.max(w, h) * 0.32;
    for (const p of state.sheets) {
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      if (d > reach) continue;
      const f = (1 - d / reach) ** 1.4 * (0.5 + 0.5 * p.z);
      p.vx += (dx / d) * f * 520 * s;
      p.vy += (dy / d) * f * 420 * s - f * 320 * s;
      p.turn += (random() < 0.5 ? -1 : 1) * f * (5 + random() * 5);
      p.vr += (random() - 0.5) * f * 5;
      p.age = Math.min(p.age, 0.2);
    }
    state.gusts.push({x, y, r: 0, a: 1});
    // A small new toss from the point itself.
    toss(env, state, x, y, 4 + Math.round(env.values.amount / 25), 0.75);
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    const k = values.intensity / 100;
    const s = unit(env);
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.back, scheme === 'light' ? 0.5 : 0.35)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const random = state.random;
    // The next toss: a heap from one of the launch places, every few seconds.
    if (dt > 0) {
      state.next -= dt;
      if (state.next <= 0) {
        toss(env, state, w * site(state, random), h + 20 * s, count(env), 1);
        state.next = 3.2 + random() * 2.2;
      }
    }
    // The pointer is a soft breath of air: near sheets drift away from it and along its motion.
    let px = 0, py = 0, mvx = 0, mvy = 0, air = false;
    if (pointer.on && dt > 0) {
      px = pointer.x * w; py = pointer.y * h; air = true;
      if (state.prev) { mvx = clamp((px - state.prev[0]) / dt, -1500, 1500); mvy = clamp((py - state.prev[1]) / dt, -1500, 1500); }
      state.prev = [px, py];
    } else state.prev = null;
    const reach = 150 * s;
    const kept = [];
    for (const p of state.sheets) {
      const pace = 0.45 + 0.55 * p.z;
      const st = dt * pace;
      p.age += st;
      // Paper in air: gravity, a drag that rises as the sheet turns flat, and a swing like a leaf.
      p.turn += (p.turn0 - p.turn) * Math.min(1, st * 0.9);
      p.flip += p.turn * st;
      const flat = Math.abs(Math.cos(p.flip));
      p.phase += p.swing * st;
      const drag = (1.1 + flat * 2.4) * Math.min(1, 0.03 + p.age * 0.7);
      p.vx += (Math.sin(p.phase) * p.reach * s - p.vx) * Math.min(1, drag * st * 0.45);
      p.vy += 360 * s * st;
      p.vx *= Math.exp(-drag * st * 0.5);
      p.vy *= Math.exp(-drag * st);
      if (p.vy > p.fall) p.vy += (p.fall - p.vy) * Math.min(1, st * 10);
      if (air) {
        const dx = p.x - px, dy = p.y - py, d = Math.hypot(dx, dy) || 1;
        if (d < reach) {
          const f = (1 - d / reach) ** 2 * (0.4 + 0.6 * p.z);
          p.vx += ((dx / d) * 260 * s + mvx * 0.9) * f * dt;
          p.vy += ((dy / d) * 200 * s + mvy * 0.7) * f * dt;
          p.turn += Math.sign(dx || 1) * f * dt * 4;
        }
      }
      p.vr *= Math.exp(-st * 0.8);
      // The sheet leans into its swing, as a falling sheet does.
      p.roll += (p.lean + p.vx * 0.0045 / s - p.roll) * Math.min(1, st * 2.2) + p.vr * st;
      p.x += p.vx * st; p.y += p.vy * st;
      if (p.y > h + p.ht + 40 || p.x < -200 * s || p.x > w + 200 * s) continue;
      kept.push(p);
      paint(env, p, k);
    }
    // A faint ring where a gust left the point.
    for (const q of state.gusts) {
      q.r += dt * 520 * s; q.a -= dt * 1.6;
      if (q.a <= 0) continue;
      ctx.strokeStyle = rgba(tones.edge, 0.35 * q.a * k);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
    }
    state.gusts = state.gusts.filter((q) => q.a > 0);
    state.sheets = kept.length > 240 ? kept.slice(kept.length - 240) : kept;
  },
};
// Lengths scale with the area's height, within limits.
function unit(env) { return clamp(env.h / 600, 0.6, 1.5); }
// Sheets in one toss: the amount setting, and a little more on a wide area.
function count(env) { return Math.max(2, Math.round((3 + env.values.amount / 100 * 12) * clamp(env.w / 1440, 0.5, 1.4))); }
function site(state, random) { const r = random(); return state.sites[r < 0.3 ? 0 : r < 0.6 ? 1 : r < 0.9 ? 2 : 3] + (random() - 0.5) * 0.06; }
function toss(env, state, x, y, n, power) {
  const random = state.random, s = unit(env);
  for (let i = 0; i < n; i += 1) {
    const a = -Math.PI / 2 + (random() - 0.5) * 0.9, v = (640 + random() * 360) * s * power;
    const p = sheet(env, random, x + (random() - 0.5) * 40 * s, y + random() * 30 * s, Math.cos(a) * v, Math.sin(a) * v * (0.75 + 0.3 * random()));
    state.sheets.push(p);
  }
  state.sheets.sort((a, b) => a.z - b.z);
}
function sheet(env, random, x, y, vx, vy) {
  const s = unit(env), z = random() ** 0.8;
  const wd = (26 + 54 * z) * s * (env.values.size / 100);
  const rows = [];
  for (let i = 0, n = 6 + Math.floor(random() * 5); i < n; i += 1) rows.push(i % 4 === 3 ? 0 : 0.45 + random() * 0.55);
  const turn0 = (random() < 0.5 ? -1 : 1) * (0.5 + random() * 1.3);
  return {x, y, vx, vy, z, wd, ht: wd * 1.414, rows, axis: random() < 0.6 ? 1 : 0, flip: random() * 6.28, turn0, turn: turn0 * (2.2 + random() * 1.5),
    roll: (random() - 0.5) * 1.2, lean: (random() - 0.5) * 0.6, vr: (random() - 0.5) * 2, phase: random() * 6.28, swing: 1 + random() * 1.1,
    reach: 30 + random() * 40, fall: (32 + random() * 20) * s, tint: random() < 0.4 ? 1 + Math.floor(random() * 3) : 0, age: 0};
}
// One sheet: a soft shadow, the paper (lit face or plain back), and on the face a header bar and
// grey lines of text. Far sheets sink into the ground colour.
function paint(env, p, k) {
  const {ctx, tones, scheme} = env;
  const light = scheme === 'light';
  const c = Math.cos(p.flip), fore = Math.max(0.06, Math.abs(c)), face = c >= 0;
  const fade = (1 - p.z) * (light ? 0.55 : 0.35);
  const w = p.wd, h = p.ht;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.roll);
  // The shadow falls down and right, a little softer and larger for near sheets.
  const off = (2 + p.z * 5) * (0.4 + 0.6 * fore);
  ctx.fillStyle = rgba(tones.shade, (light ? 0.05 : 0.22) * (0.4 + 0.6 * p.z) * k);
  if (p.axis) { ctx.scale(1, fore); } else ctx.scale(fore, 1);
  ctx.beginPath(); ctx.roundRect(-w / 2 + off * 0.5, -h / 2 + off, w + off * 0.6, h + off * 0.6, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-w / 2 + off * 0.3, -h / 2 + off * 0.5, w, h, 2); ctx.fill();
  // Edge-on, the paper catches less light.
  const tone = mixc(tones.paper, tones.back, (face ? 0 : 0.45) + (1 - fore) * 0.35);
  ctx.fillStyle = rgba(mixc(tone, tones.ground, fade));
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 1.5); ctx.fill();
  ctx.strokeStyle = rgba(mixc(tones.edge, tones.ground, fade), (light ? 0.75 : 0.6) * (0.5 + 0.5 * k));
  ctx.lineWidth = 0.8;
  ctx.stroke();
  if (face && fore > 0.18) {
    const pad = w * 0.12, bar = h * 0.065, a = (0.35 + 0.55 * k) * (0.45 + 0.55 * p.z);
    ctx.fillStyle = rgba(p.tint ? tones.accents[p.tint - 1] : tones.edge, a * (p.tint ? (light ? 0.75 : 0.85) : 0.8));
    ctx.fillRect(-w / 2 + pad, -h / 2 + pad, (w - pad * 2) * 0.62, bar);
    if (w > 16) {
      ctx.fillStyle = rgba(tones.ink, a * (light ? 0.55 : 0.6));
      const lh = h * 0.022, gap = (h - pad * 2 - bar * 2) / (p.rows.length + 0.5);
      p.rows.forEach((r, i) => { if (r) ctx.fillRect(-w / 2 + pad, -h / 2 + pad + bar * 2 + gap * i, (w - pad * 2) * r, Math.max(0.8, lh)); });
    }
  }
  ctx.restore();
}

function mountScene(host, settings, context = {}) {
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

// The fixed palettes: on the effect's own layer they stand in for the theme's colour scales, so the
// effect reads them as it reads the theme. Each is a dark ground, the threads' mass, the bright
// colour and the hot one; the tones between are blended. 'theme' leaves the theme's scales alone.
const PALETTES = {
  turquoise: [[6, 11, 15], [12, 72, 90], [66, 178, 202], [216, 246, 255]],
  ocean: [[5, 9, 18], [16, 50, 118], [76, 148, 244], [214, 232, 255]],
  violet: [[10, 7, 20], [58, 28, 122], [162, 116, 252], [238, 226, 255]],
  rose: [[15, 6, 12], [104, 22, 74], [246, 104, 160], [255, 226, 238]],
  emerald: [[5, 13, 12], [8, 76, 62], [56, 190, 142], [216, 255, 238]],
  sunset: [[14, 7, 14], [84, 26, 74], [244, 146, 98], [255, 236, 214]],
  gold: [[12, 10, 6], [74, 54, 20], [226, 176, 82], [255, 242, 208]],
  silver: [[8, 10, 13], [42, 50, 60], [148, 166, 186], [242, 247, 255]],
};
// 'custom' builds the four from one colour, the colour setting (a hex): a dark ground of its hue,
// its mass, the colour itself and its light.
const rgbOf = (hex) => (/^#[0-9a-f]{6}$/iu.test(hex ?? '') ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : [59, 130, 246]);
const customStops = (hex) => { const c = rgbOf(hex); return [c.map((v) => 4 + v * 0.05), c.map((v) => v * 0.42), c, c.map((v) => v + (255 - v) * 0.86)]; };
const SCALE_TONES = [0, 4, 5, 6, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
function paintLayer(host, name, colour) {
  const stops = name === 'custom' ? customStops(colour) : PALETTES[name], at = [4, 30, 65, 95];
  for (const family of ['primary', 'secondary', 'tertiary']) for (const tone of SCALE_TONES) {
    const key = `--sf-${family}-${tone}`;
    if (!stops) { host.style.removeProperty(key); continue; }
    let i = 0;
    while (i < 2 && tone > at[i + 1]) i += 1;
    const u = Math.max(0, Math.min(1, (tone - at[i]) / (at[i + 1] - at[i])));
    host.style.setProperty(key, `rgb(${stops[i].map((v, c) => Math.round(v + (stops[i + 1][c] - v) * u)).join(' ')})`);
  }
}
export function mount(host, settings = {}, context = {}) {
  let palette = settings.palette, colour = settings.colour;
  paintLayer(host, palette, colour);
  const scene = mountScene(host, settings, context);
  return {
    ...scene,
    update(next = {}, nextContext = {}) {
      scene.update(next, nextContext);
      if (next.palette !== palette || (next.palette === 'custom' && next.colour !== colour)) { palette = next.palette; colour = next.colour; paintLayer(host, palette, colour); scene.refreshTheme?.(); }
    },
    destroy() { scene.destroy(); paintLayer(host); },
  };
}
