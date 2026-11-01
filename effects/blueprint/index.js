// Blueprint (simai.effect 1.1.0; schemes dark and light): drawing lines are pencilled in and rubbed out; you can draw too.
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

// A drawing board: shapes are pencilled in, held and rubbed out on their own cycles. The pointer is
// the draughtsman's eye: guides through it and its coordinates on the grid. A click swings a compass
// circle with its radius written on it. A press-drag draws by hand; let go, the line is cleaned up
// into straight strokes with their lengths, and it fades out later.
const SCENE = {
  home: 'dark', seed: 165, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), grid: read('--sf-neutral-90', '#e2e2e9'), line: read('--sf-neutral-30', '#45464f'), mark: read('--sf-primary-40', '#005bbe')}
    : {ground: read('--sf-primary-10', '#001a41'), grid: read('--sf-primary-20', '#002f66'), line: read('--sf-primary-80', '#acc7ff'), mark: read('--sf-primary-90', '#d7e2ff')},
  setup(env, random) {
    const n = Math.round(5 + env.values.density / 10);
    const shapes = Array.from({length: n}, () => ({kind: Math.floor(random() * 3), x: random() * env.w, y: random() * env.h, a: 40 + random() * 160, b: 30 + random() * 120, phase: random(), period: 8 + random() * 8}));
    return {shapes, circles: [], stroke: null, drawings: []};
  },
  click(env, x, y) {
    const snap = (v) => Math.round(v / 24) * 24;
    env.state.circles.push({x: snap(x), y: snap(y), r: 48 + Math.round(hash2(x, y) * 4) * 24, born: env.time ?? 0});
  },
  press(env, x, y) { env.state.stroke = [[x, y]]; },
  release(env) {
    const {state} = env;
    if (state.stroke && state.stroke.length > 3) state.drawings.push({points: simplify(state.stroke, 10), born: env.time ?? 0});
    state.stroke = null;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    env.time = t;
    const k = values.intensity / 100;
    const a = (scheme === 'light' ? 0.5 : 0.45) * k;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(tones.grid, 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < w; x += 24) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
    for (let y = 0; y < h; y += 24) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgba(tones.line, a);
    for (const s of state.shapes) {
      const c = (t / s.period + s.phase) % 1;
      const drawn = c < 0.5 ? c / 0.5 : c < 0.8 ? 1 : 1 - (c - 0.8) / 0.2;
      if (drawn <= 0) continue;
      ctx.save();
      ctx.setLineDash([2000]);
      ctx.beginPath();
      if (s.kind === 0) { ctx.rect(s.x, s.y, s.a, s.b); ctx.lineDashOffset = 2000 - (s.a + s.b) * 2 * drawn; }
      else if (s.kind === 1) { ctx.arc(s.x, s.y, s.b / 2, 0, Math.PI * 2); ctx.lineDashOffset = 2000 - Math.PI * s.b * drawn; }
      else { ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + s.a, s.y); ctx.moveTo(s.x, s.y - 6); ctx.lineTo(s.x, s.y + 6); ctx.moveTo(s.x + s.a, s.y - 6); ctx.lineTo(s.x + s.a, s.y + 6); ctx.lineDashOffset = 2000 - (s.a + 12) * drawn; }
      ctx.stroke();
      ctx.restore();
    }
    ctx.font = '11px ui-monospace, monospace';
    // Compass circles: swung in, held, then rubbed out.
    state.circles = state.circles.filter((c) => t - c.born < 12);
    for (const c of state.circles) {
      const age = t - c.born, swing = Math.min(1, age / 1.2), fade = age > 9 ? 1 - (age - 9) / 3 : 1;
      ctx.strokeStyle = rgba(tones.mark, a * 1.3 * fade);
      ctx.beginPath(); ctx.arc(c.x, c.y, c.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * swing); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(c.x - 4, c.y); ctx.lineTo(c.x + 4, c.y); ctx.moveTo(c.x, c.y - 4); ctx.lineTo(c.x, c.y + 4); ctx.stroke();
      if (swing === 1) {
        ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.r * 0.707, c.y - c.r * 0.707); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = rgba(tones.mark, a * 1.4 * fade);
        ctx.fillText(`R ${c.r}`, c.x + c.r * 0.35 + 4, c.y - c.r * 0.35 - 4);
      }
    }
    // Hand drawings, cleaned up into straight strokes with their lengths.
    state.drawings = state.drawings.filter((d) => t - d.born < 20);
    for (const d of state.drawings) {
      const fade = t - d.born > 16 ? 1 - (t - d.born - 16) / 4 : 1;
      ctx.strokeStyle = rgba(tones.mark, a * 1.4 * fade);
      ctx.fillStyle = rgba(tones.mark, a * 1.4 * fade);
      ctx.beginPath();
      d.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      for (let i = 1; i < d.points.length; i += 1) {
        const [x0, y0] = d.points[i - 1], [x1, y1] = d.points[i];
        ctx.fillRect(x1 - 2, y1 - 2, 4, 4);
        const length = Math.round(Math.hypot(x1 - x0, y1 - y0));
        if (length > 40) ctx.fillText(String(length), (x0 + x1) / 2 + 4, (y0 + y1) / 2 - 4);
      }
    }
    if (state.stroke) {
      if (pointer.down) { const last = state.stroke[state.stroke.length - 1], x = pointer.x * w, y = pointer.y * h; if (Math.hypot(x - last[0], y - last[1]) > 3) state.stroke.push([x, y]); }
      ctx.strokeStyle = rgba(tones.line, a * 1.2);
      ctx.beginPath();
      state.stroke.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    // The draughtsman's eye: guides and the cell under the pointer.
    if (pointer.on && !pointer.down) {
      const x = Math.round(pointer.x * w / 24) * 24, y = Math.round(pointer.y * h / 24) * 24;
      ctx.strokeStyle = rgba(tones.mark, a * 0.8);
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = rgba(tones.mark, a * 1.3);
      ctx.fillText(`${x / 24} · ${y / 24}`, x + 6, y - 6);
    }
  },
};
// Ramer–Douglas–Peucker: a hand line reduced to its corners.
function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [ax, ay] = points[0], [bx, by] = points[points.length - 1];
  let far = 0, index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const [x, y] = points[i];
    const d = Math.abs((by - ay) * x - (bx - ax) * y + bx * ay - by * ax) / (Math.hypot(bx - ax, by - ay) || 1);
    if (d > far) { far = d; index = i; }
  }
  if (far <= tolerance) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)];
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
