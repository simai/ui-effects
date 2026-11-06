// Page stack (simai.effect 1.1.0; schemes light and dark): translucent document sheets with a header
// strip and lines of text float down through the air in layers of depth, far ones small and pale,
// near ones larger and slanted; the pointer lifts the nearest sheet and a click turns it over.
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

// One sheet's printed side, laid out once per size: a header strip and a title in the accent, then
// paragraphs of line bars and, on some sheets, a picture block. Paths sit around the sheet centre.
function sheetPaths(W, H, random) {
  const head = new Path2D(), ink = new Path2D(), m = W * 0.13, x0 = -W / 2 + m, top = -H / 2, span = W - 2 * m;
  const bar = (p, x, y, bw, bh) => p.roundRect(x, y, Math.max(bh, bw), bh, bh / 2);
  bar(head, -W / 2, top, W, H * 0.06);
  bar(head, x0, top + H * 0.11, span * (0.4 + random() * 0.25), H * 0.032);
  const lh = H * 0.016, gap = H * 0.046, picture = random() < 0.4;
  let y = top + H * 0.2, left = 3 + Math.floor(random() * 3);
  while (y < H / 2 - m) {
    if (picture && y > top + H * 0.35 && y < top + H * 0.45) {
      head.roundRect(x0, y, span, H * 0.17, W * 0.02);
      y += H * 0.17 + gap;
      continue;
    }
    left -= 1;
    bar(ink, x0, y, span * (left === 0 ? 0.3 + random() * 0.3 : 0.82 + random() * 0.18), lh);
    y += gap;
    if (left === 0) { y += gap * 0.6; left = 3 + Math.floor(random() * 3); }
  }
  return {head, ink};
}

// Where the text block of a page sits: the centre-left of a wide area. Near sheets passing over it
// thin out there, so a heading and a paragraph keep their contrast.
const textMask = (x, y, w, h) => (w < 700 ? 0.6 : clamp((0.52 * w - x) / (0.14 * w), 0, 1) * clamp(Math.min(y / (0.12 * h), (h - y) / (0.12 * h)), 0, 1));

const SCENE = {
  home: 'light', seed: 523, reseed: ['pages'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), paper: read('--sf-neutral-100', '#ffffff'),
      edge: read('--sf-neutral-80', '#c6c6d0'), ink: read('--sf-neutral-60', '#8f9099'), shade: read('--sf-neutral-30', '#45464f'),
      accents: [read('--sf-primary-70', '#7eabff'), read('--sf-secondary-70', '#a3abc0'), read('--sf-tertiary-70', '#c0a1c4')]}
    : {ground: read('--sf-neutral-5', '#111318'), low: read('--sf-neutral-10', '#1a1b20'), paper: read('--sf-neutral-20', '#2f3036'),
      edge: read('--sf-neutral-40', '#5d5e67'), ink: read('--sf-neutral-70', '#aaabb4'), shade: read('--sf-neutral-0', '#000000'),
      accents: [read('--sf-primary-60', '#4a8cf0'), read('--sf-secondary-60', '#8990a5'), read('--sf-tertiary-60', '#a487a9')]},
  setup(env, random) {
    const n = clamp(Math.round(env.values.pages ?? 10), 4, 20);
    const unit = clamp(Math.min(env.h * 0.3, env.w * 0.16), 46, 170);
    const sheets = Array.from({length: n}, (_, i) => {
      const z = clamp((i + 0.2 + random() * 0.6) / n, 0, 1);
      const W = unit * (0.42 + 0.75 * z), H = W * 1.36;
      const paper = new Path2D();
      paper.roundRect(-W / 2, -H / 2, W, H, Math.max(2, W * 0.035));
      return {i, z, W, H, paper, ...sheetPaths(W, H, random), accent: Math.floor(random() * 3),
        vy: (4 + 9 * z) * (0.7 + random() * 0.6), y0: random(), lane: (i * 0.381966 + random() * 0.12) % 1, sway: 0.08 + random() * 0.08, ps: random() * 6.28,
        tilt: (random() - 0.5) * (0.06 + 0.3 * z), lift: 0, flip: -1, facing: 1, x: 0, y: 0};
    });
    sheets.sort((a, b) => a.z - b.z);
    return {sheets, px: 0.5, py: 0.5, last: null, hot: null};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    const k = values.intensity / 100, light = scheme === 'light', depth = clamp(values.depth ?? 60, 10, 100) / 100;
    const pace = Math.max(0.1, (values.speed ?? 100) / 100);
    const dt = state.last === null ? 0 : clamp((t - state.last) / pace, 0, 0.1);
    state.last = t;
    const ease = 1 - Math.exp(-dt * 4);
    state.px += ((pointer.on ? pointer.x : 0.5) - state.px) * ease;
    state.py += ((pointer.on ? pointer.y : 0.5) - state.py) * ease;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.9)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // The camera drifts a little on its own, and towards the pointer; near sheets move the most.
    const camX = (Math.sin(t * 0.045) * 0.5 + (state.px - 0.5)) * depth * 70;
    const camY = (Math.cos(t * 0.037) * 0.4 + (state.py - 0.5)) * depth * 36;
    // Positions first, so the sheet under the pointer is known before any is drawn.
    let hot = null, best = Infinity;
    for (const s of state.sheets) {
      const span = h + s.H * 1.3, Y = s.y0 * span + s.vy * t, cycle = Math.floor(Y / span);
      const near = s.z > 0.45 && w >= 700;
      const lane = mix(near ? 0.56 : 0.02, near ? 0.98 : 0.7, (s.lane + cycle * 0.618034 + 0.1 * hash2(s.i, cycle)) % 1);
      const swing = Math.sin(t * s.sway * 2.2 + s.ps);
      s.x = lane * w + swing * s.W * 0.35 + camX * s.z;
      s.y = Y - cycle * span - s.H * 0.65 + camY * s.z;
      s.swing = swing;
      if (pointer.on) {
        const d = Math.hypot(pointer.x * w - s.x, pointer.y * h - s.y) / (0.6 + s.z);
        if (d < s.H * 0.9 && d < best) { best = d; hot = s; }
      }
    }
    state.hot = hot;
    for (const s of state.sheets) {
      s.lift += ((s === hot ? 1 : 0) - s.lift) * (1 - Math.exp(-dt * 6));
      let turn = 1, bump = 0;
      if (s.flip >= 0) {
        const p = clamp((t - s.flip) / (0.75 * pace), 0, 1), q = smooth(p);
        turn = Math.cos(Math.PI * q);
        bump = Math.sin(Math.PI * q);
        if (p >= 1) { s.facing = -s.facing; s.flip = -1; turn = 1; bump = 0; }
      }
      // A falling sheet rocks like a pendulum and turns a little about its long axis.
      const rock = 1 - 0.14 * s.z * (0.5 + 0.5 * Math.sin(t * s.sway * 1.6 + s.ps * 2));
      const sx = s.facing * turn * rock * (1 - 0.05 * s.lift), sy = 1 + 0.07 * s.lift + 0.06 * bump;
      const fade = 1 - 0.72 * textMask(s.x, s.y, w, h) * (0.35 + 0.65 * s.z);
      const a = mix(0.2, 0.62, s.z) * k * fade * (light ? 1 : 0.9);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.tilt + s.swing * (0.03 + 0.07 * s.z) + 0.1 * s.lift + 0.12 * bump);
      ctx.scale(Math.abs(sx) < 0.02 ? 0.02 : sx, sy);
      ctx.shadowColor = rgba(tones.shade, (light ? 0.1 : 0.4) * (0.3 + 0.7 * s.z) * k * fade * (1 + 1.2 * s.lift + bump));
      ctx.shadowBlur = (3 + 14 * s.z) * (1 + 0.8 * s.lift + bump);
      ctx.shadowOffsetY = (1 + 6 * s.z) * (1 + s.lift + bump);
      ctx.fillStyle = rgba(tones.paper, light ? Math.min(0.92, a * 1.35) : a * 0.85);
      ctx.fill(s.paper);
      ctx.shadowColor = 'rgba(0,0,0,0)';
      ctx.lineWidth = 1 / Math.max(0.3, Math.abs(sx));
      ctx.strokeStyle = rgba(tones.edge, a * (light ? 0.55 : 0.6));
      ctx.stroke(s.paper);
      // Mid-turn the sheet shows its edge, so the print fades out towards it.
      const face = Math.min(1, Math.abs(turn) * 1.6);
      ctx.fillStyle = rgba(tones.accents[s.accent], a * (light ? 0.5 : 0.55) * face);
      ctx.fill(s.head);
      ctx.fillStyle = rgba(tones.ink, a * (light ? 0.55 : 0.5) * face);
      ctx.fill(s.ink);
      ctx.restore();
    }
  },
  // A click turns the sheet nearest to it over, like a page, and it settles on its other side.
  click(env, x, y) {
    let pick = null, best = Infinity;
    for (const s of env.state.sheets) {
      const d = Math.hypot(x - s.x, y - s.y) / (0.6 + s.z);
      if (d < best) { best = d; pick = s; }
    }
    if (pick && pick.flip < 0) pick.flip = env.state.last ?? 0;
  },
  start: 30,
};

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
