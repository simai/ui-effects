// Arrow field (simai.effect 1.1.0; schemes dark and light): the surface is a grid of one glyph
// (arrow, cross, plus, dash, chevron, triangle, compass needle). Each glyph turns like a compass
// needle, with a little overshoot, toward the pointer (or away, around it, along a magnet's field
// lines); near ones first and far ones later, so a turn spreads as a wave. Without a pointer the
// field drifts in a slow wind and follows an unseen wanderer. Near the pointer the glyphs grow and
// brighten as under a lens; a press sends a ring wave and every glyph it passes makes a full turn.
// The lifecycle is the catalogue template's; colours are palette tones read through a probe.

const {min, max, exp, hypot, ceil, sin, cos, atan2, PI} = Math;
const TAU = PI * 2;
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
const wrap = (a) => a - TAU * Math.round(a / TAU);

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

// Glyphs in unit space, pointing along +x. 's' strokes, 'f' fills, 'h' fills the head half.
const GLYPHS = {
  arrow: [['s', [[-0.44, 0], [0.44, 0]], [[0.2, -0.22], [0.45, 0], [0.2, 0.22]]]],
  cross: [['s', [[-0.32, -0.32], [0.32, 0.32]], [[-0.32, 0.32], [0.32, -0.32]]]],
  plus: [['s', [[-0.4, 0], [0.4, 0]], [[0, -0.4], [0, 0.4]]]],
  dash: [['s', [[-0.42, 0], [0.42, 0]]]],
  chevron: [['s', [[-0.16, -0.3], [0.2, 0], [-0.16, 0.3]]]],
  triangle: [['f', [[0.42, 0], [-0.3, 0.27], [-0.3, -0.27]]]],
  needle: [['h', [[0.48, 0], [0, 0.13], [0, -0.13]]], ['s', [[0.48, 0], [0, 0.13], [-0.48, 0], [0, -0.13], [0.48, 0]]]],
};
const NB = 24, LENS = 1.5;

// Background from neutral and primary; glyphs from three families, so 'colour by direction' runs
// through hues in a many-colour palette and through shades in a one-colour one.
const SCENE = {
  home: 'dark', seed: 5309, reseed: ['glyph', 'size', 'grid', 'hues'], fresh: true,
  tones: (read, scheme) => scheme === 'light'
    ? {bg0: read('--sf-neutral-98', '#faf9fe'), bg1: mixc(read('--sf-neutral-98', '#faf9fe'), read('--sf-primary-95', '#ecf0ff'), 0.75),
      ink: [read('--sf-primary-40', '#005bbe'), read('--sf-tertiary-40', '#76517b'), read('--sf-secondary-50', '#6f778b')], glow: read('--sf-primary-90', '#d8e2ff')}
    : {bg0: read('--sf-neutral-5', '#111318'), bg1: mixc(read('--sf-neutral-5', '#111318'), read('--sf-primary-10', '#001a41'), 0.6),
      ink: [read('--sf-primary-70', '#7eabff'), read('--sf-tertiary-80', '#f4b0f8'), read('--sf-secondary-60', '#8a92a7')], glow: read('--sf-primary-40', '#005bbe')},
  setup(env) {
    const {w, h, values, ctx} = env;
    const random = rng(SCENE.seed + env.salt);
    // The cell from the size setting, never so small that the grid passes about 2400 glyphs.
    const c = max(34 * values.size / 100, Math.sqrt(w * h / 2400)), off = values.grid === 'offset';
    const dy = off ? c * 0.866 : c, cols = ceil(w / c) + 1, rows = ceil(h / dy) + 1;
    const x0 = (w - (cols - 1) * c) / 2, y0 = (h - (rows - 1) * dy) / 2, n = cols * rows;
    const X = new Float32Array(n), Y = new Float32Array(n), A = new Float32Array(n), V = new Float32Array(n), S = new Float32Array(n), F = new Float32Array(n);
    let i = 0;
    for (let r = 0; r < rows; r += 1) for (let q = 0; q < cols; q += 1, i += 1) {
      X[i] = x0 + q * c + (off && r % 2 ? c / 2 : 0); Y[i] = y0 + r * dy;
      // The text side on the left stays quiet: glyphs there are faint.
      F[i] = mix(0.3, 1, smooth(clamp((X[i] / w - 0.12) / 0.42, 0, 1)));
    }
    const state = {X, Y, A, V, S, F, n, c, waves: [], last: null, ax: 0, ay: 0, pw: 0, cost: 0,
      ox: random() * 100, oy: random() * 100, p1: random() * TAU, p2: random() * TAU, sprites: sprites(env, c)};
    // The first frame (and the still one) already points where the field points.
    ghost(env, state, 0);
    target(env, state, 0, (j, a) => { A[j] = a; });
    return state;
  },
  press(env, x, y) { env.state.waves.push({x, y, r: 0}); },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme} = env;
    const perf = ctx.canvas.ownerDocument.defaultView.performance;
    const t0 = perf.now();
    const dt = state.last === null ? 0 : max(0, min(0.05, t - state.last));
    state.last = t;
    const {X, Y, A, V, S, F, n, c} = state;
    // The attractor glides to the pointer, and back to the wanderer when the pointer leaves.
    const on = env.pointer.on && !env.still;
    state.pw += ((on ? 1 : 0) - state.pw) * min(1, dt * 3);
    if (on) { state.ax += (env.pointer.x * w - state.ax) * min(1, dt * 8); state.ay += (env.pointer.y * h - state.ay) * min(1, dt * 8); } else ghost(env, state, t, dt);
    const hyp = hypot(w, h), reach = hyp * (values.mode === 'magnet' ? 0.42 : 0.3);
    // Waves: every glyph a ring passes makes a full turn.
    for (const wv of state.waves) {
      const r0 = wv.r;
      wv.r += dt * hyp * 0.5;
      for (let j = 0; j < n; j += 1) { const d = hypot(X[j] - wv.x, Y[j] - wv.y); if (d > r0 && d <= wv.r) S[j] = 1; }
    }
    state.waves = state.waves.filter((wv) => wv.r < hyp * 1.2);
    if (dt > 0) target(env, state, t, (j, a, near) => {
      const k = 34 * (0.3 + 0.7 * near), damp = 2 * 0.3 * Math.sqrt(k);
      V[j] += (k * wrap(a - A[j]) - damp * V[j]) * dt;
      A[j] += V[j] * dt;
      if (S[j] > 0) S[j] = max(0, S[j] - dt / 0.95);
    }, reach);
    // The ground, then a faint glow under the pointer.
    const g = ctx.createLinearGradient(0, 0, w, h * 0.4);
    g.addColorStop(0, rgba(tones.bg0)); g.addColorStop(1, rgba(tones.bg1));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const k = values.intensity / 100, light = scheme === 'light';
    if (state.pw > 0.01) {
      const r = c * 6, rg = ctx.createRadialGradient(state.ax, state.ay, 0, state.ax, state.ay, r);
      rg.addColorStop(0, rgba(tones.glow, (light ? 0.5 : 0.22) * state.pw * k)); rg.addColorStop(1, rgba(tones.glow, 0));
      ctx.fillStyle = rg; ctx.fillRect(state.ax - r, state.ay - r, r * 2, r * 2);
    }
    // Each glyph: its own transform over the scheme's base (the pixel ratio, mirrored in RTL).
    const {sp, D} = state.sprites, ratio = env.ratio, bx = env.rtl ? -ratio : ratio, ex = env.rtl ? ctx.canvas.width : 0;
    const lens = c * 4.2, a0 = (light ? 0.5 : 0.42) + (light ? 0.45 : 0.5) * k, hues = values.hues !== false;
    for (let j = 0; j < n; j += 1) {
      const dx = X[j] - state.ax, dy = Y[j] - state.ay, wn = state.pw * exp(-(dx * dx + dy * dy) / (lens * lens));
      const s = 1 + 0.45 * wn, ang = A[j] + TAU * smooth(S[j]), co = cos(ang) * s, si = sin(ang) * s;
      const b = hues ? (((ang / TAU) % 1 + 1) % 1 * NB) | 0 : 0;
      ctx.globalAlpha = min(1, a0 * F[j] * (0.78 + 0.22 * noise2(X[j] / c * 0.3 + t * 0.2, Y[j] / c * 0.3)) * (1 + 0.8 * wn));
      ctx.setTransform(bx * co, ratio * si, -bx * si, ratio * co, bx * X[j] + ex, ratio * Y[j]);
      ctx.drawImage(sp[b], -D / 2, -D / 2, D, D);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(bx, 0, 0, ratio, ex, 0);
    if (dt > 0) state.cost = mix(state.cost, perf.now() - t0, 0.05);
  },
};

// The unseen wanderer: a slow Lissajous path over the centre-right and right.
function ghost(env, state, t, dt) {
  const {w, h} = env, gx = w * (0.7 + 0.18 * sin(t * 0.11 + state.p1)), gy = h * (0.5 + 0.32 * sin(t * 0.083 + state.p2) * cos(t * 0.047));
  const u = dt === undefined ? 1 : min(1, dt * 1.5);
  state.ax += (gx - state.ax) * u; state.ay += (gy - state.ay) * u;
}

// The angle each glyph turns to: the wind, blended with the attractor by nearness.
function target(env, state, t, apply, reach = hypot(env.w, env.h) * 0.3) {
  const {X, Y, n, c, ox, oy, ax, ay, pw} = state, mode = env.values.mode;
  const wA = mix(0.7, 1, pw), f = 0.085 / c, m = t * 0.15 + state.p1;
  const mx = cos(m), my = sin(m), R2 = reach * reach;
  for (let j = 0; j < n; j += 1) {
    const u = X[j] * f + ox + t * 0.035, v = Y[j] * f + oy - t * 0.022;
    const wind = TAU * 1.1 * (0.7 * noise2(u, v) + 0.3 * noise2(u * 2.3 + 7, v * 2.3 + 3));
    let dx = ax - X[j], dy = ay - Y[j];
    const d2 = dx * dx + dy * dy, near = exp(-d2 / R2), wi = wA * (0.14 + 0.86 * near), d = Math.sqrt(d2) || 1;
    dx /= d; dy /= d;
    let px = dx, py = dy;
    if (mode === 'away') { px = -dx; py = -dy; } else if (mode === 'orbit') { px = -dy; py = dx; } else if (mode === 'magnet') {
      // A dipole at the attractor, its axis slowly turning: glyphs lie along its field lines.
      const dot = -(mx * dx + my * dy);
      px = -3 * dot * dx - mx; py = -3 * dot * dy - my;
      const l = hypot(px, py) || 1; px /= l; py /= l;
    }
    apply(j, atan2((1 - wi) * sin(wind) + wi * py, (1 - wi) * cos(wind) + wi * px), near);
  }
}

// One sprite per colour step, drawn at the lens's largest scale for crisp edges.
function sprites(env, c) {
  const doc = env.ctx.canvas.ownerDocument, {tones, values} = env, ratio = env.ratio;
  const g = c * 0.62, px = Math.ceil(g * ratio * LENS * 1.12), unit = px / 1.12, lw = max(1.3 / g, 0.085);
  const shape = GLYPHS[values.glyph] ?? GLYPHS.arrow, sp = [];
  for (let b = 0; b < NB; b += 1) {
    const u = (b / NB) * 3, i = Math.floor(u), col = values.hues === false ? tones.ink[0] : mixc(tones.ink[i % 3], tones.ink[(i + 1) % 3], smooth(u - i));
    const cv = doc.createElement('canvas');
    cv.width = cv.height = px;
    const x = cv.getContext('2d');
    x.setTransform(unit, 0, 0, unit, px / 2, px / 2);
    x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
    x.strokeStyle = x.fillStyle = rgba(col);
    for (const [kind, ...lines] of shape) {
      x.beginPath();
      for (const line of lines) line.forEach(([p, q], k) => (k ? x.lineTo(p, q) : x.moveTo(p, q)));
      if (kind === 's') x.stroke(); else { x.globalAlpha = kind === 'h' ? 1 : 0.9; x.closePath(); x.fill(); x.globalAlpha = 1; }
    }
    sp.push(cv);
  }
  return {sp, D: px / ratio / LENS};
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
  const env = {ctx, w: 1, h: 1, ratio: 1, values: {...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, pointer: {x: 0.5, y: 0.5, on: false}, still: false, rtl: false};
  env.tones = readTones(host, env.scheme);
  env.still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  // Fresh: a new layout on every moving mount; the still frame keeps the seeded one.
  env.salt = SCENE.fresh && !env.still ? Math.floor(Math.random() * 1e6) : 0;
  let paused = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let t = 0;

  const setup = () => { env.state = SCENE.setup(env); };
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
    const ratio = min(2, win.devicePixelRatio || 1);
    env.w = max(1, box.width);
    env.h = max(1, box.height);
    env.ratio = ratio;
    canvas.width = Math.round(env.w * ratio);
    canvas.height = Math.round(env.h * ratio);
    env.rtl = win.getComputedStyle(host).direction === 'rtl';
    ctx.setTransform(env.rtl ? -ratio : ratio, 0, 0, ratio, env.rtl ? canvas.width : 0, 0);
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
    env.pointer.x = (event.clientX - box.left) / max(1, box.width);
    if (env.rtl) env.pointer.x = 1 - env.pointer.x;
    env.pointer.y = (event.clientY - box.top) / max(1, box.height);
    env.pointer.on = env.values.interactive !== false && event.pointerType !== 'touch' && env.pointer.x >= 0 && env.pointer.x <= 1 && env.pointer.y >= 0 && env.pointer.y <= 1;
  };
  const onLeave = (event) => { if (!event.relatedTarget) env.pointer.on = false; };
  win.addEventListener('pointermove', onPointer, {passive: true});
  win.addEventListener('pointerout', onLeave, {passive: true});
  // A press inside the host's box, never from a link, a button or a field over it.
  const inside = (event) => {
    if (env.values.interactive === false || env.still || paused) return null;
    if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return null;
    const box = host.getBoundingClientRect();
    const x = env.rtl ? box.right - event.clientX : event.clientX - box.left, y = event.clientY - box.top;
    return x >= 0 && y >= 0 && x <= box.width && y <= box.height ? [x, y] : null;
  };
  const onDown = (event) => {
    if (event.button !== 0) return;
    const at = inside(event);
    if (!at) return;
    SCENE.press(env, at[0], at[1]);
    schedule();
  };
  win.addEventListener('pointerdown', onDown, {passive: true});

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
    refreshTheme() { env.tones = readTones(host, env.scheme); setup(); draw(); },
    pause() { paused = true; stop(); },
    resume() { paused = false; schedule(); },
    destroy() {
      stop();
      sizes.disconnect();
      screen.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      motion?.removeEventListener?.('change', onMotion);
      win.removeEventListener('pointermove', onPointer);
      win.removeEventListener('pointerout', onLeave);
      win.removeEventListener('pointerdown', onDown);
      canvas.remove();
    },
  };
}

// The fixed palettes stand in for the theme's colour scales on the effect's own layer: a dark
// ground, the mass, the bright colour, the light one. 'spectrum' gives each family its own hue
// (blue, violet, teal), so 'colour by direction' runs through all three; 'theme' leaves the theme alone.
const PALETTES = {
  spectrum: {primary: [[4, 8, 20], [14, 56, 120], [90, 170, 255], [226, 242, 255]], secondary: [[4, 14, 14], [10, 86, 80], [70, 214, 190], [220, 255, 246]],
    tertiary: [[12, 6, 20], [80, 26, 120], [200, 120, 255], [246, 232, 255]]},
  turquoise: [[6, 11, 15], [12, 72, 90], [66, 178, 202], [216, 246, 255]],
  ocean: [[5, 9, 18], [16, 50, 118], [76, 148, 244], [214, 232, 255]],
  violet: [[10, 7, 20], [58, 28, 122], [162, 116, 252], [238, 226, 255]],
  rose: [[15, 6, 12], [104, 22, 74], [246, 104, 160], [255, 226, 238]],
  emerald: [[5, 13, 12], [8, 76, 62], [56, 190, 142], [216, 255, 238]],
  sunset: [[14, 7, 14], [84, 26, 74], [244, 146, 98], [255, 236, 214]],
  gold: [[12, 10, 6], [74, 54, 20], [226, 176, 82], [255, 242, 208]],
  silver: [[8, 10, 13], [42, 50, 60], [148, 166, 186], [242, 247, 255]],
};
// 'custom' builds the four from the colour setting.
const rgbOf = (hex) => (/^#[0-9a-f]{6}$/iu.test(hex ?? '') ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : [59, 130, 246]);
const customStops = (hex) => { const c = rgbOf(hex); return [c.map((v) => 4 + v * 0.05), c.map((v) => v * 0.42), c, c.map((v) => v + (255 - v) * 0.86)]; };
const SCALE_TONES = [0, 4, 5, 6, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
function paintLayer(host, name, colour) {
  const set = name === 'custom' ? customStops(colour) : PALETTES[name], at = [4, 30, 65, 95];
  for (const family of ['primary', 'secondary', 'tertiary']) for (const tone of SCALE_TONES) {
    const key = `--sf-${family}-${tone}`;
    if (!set) { host.style.removeProperty(key); continue; }
    const stops = set[family] ?? set;
    let i = 0;
    while (i < 2 && tone > at[i + 1]) i += 1;
    const u = max(0, min(1, (tone - at[i]) / (at[i + 1] - at[i])));
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
