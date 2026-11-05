// Chart recorder (simai.effect 1.1.0; schemes light and dark): over a faint coordinate grid, pens
// trace a few smooth series from left to right and the old trace fades, as on an oscilloscope.
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

// One series: a smooth value along the paper's own coordinate u (pixels written so far), so a new
// pass of the pen draws a new stretch of the same endless curve.
const seriesValue = (series, u) => series.base
  + series.amp * (0.5 * Math.sin(u * series.k1 + series.p1) + 0.3 * Math.sin(u * series.k2 + series.p2)
  + 0.7 * (noise2(u * series.k3 + series.p3, series.row) - 0.5) + 0.35 * (noise2(u * series.k4, series.row + 40) - 0.5));

const SCENE = {
  home: 'light', seed: 271, reseed: ['lines'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), grid: read('--sf-neutral-60', '#8f9099'),
      pens: [read('--sf-primary-40', '#005bbe'), read('--sf-secondary-40', '#565e71'), read('--sf-tertiary-40', '#705575'), read('--sf-primary-60', '#4a8cf0')]}
    : {ground: read('--sf-neutral-5', '#111318'), low: read('--sf-neutral-10', '#1a1b20'), grid: read('--sf-neutral-50', '#76777f'),
      pens: [read('--sf-primary-80', '#acc7ff'), read('--sf-secondary-80', '#bec6dc'), read('--sf-tertiary-80', '#ddbce0'), read('--sf-primary-70', '#7eabff')]},
  setup(env, random) {
    const n = clamp(Math.round(env.values.lines ?? 3), 1, 4);
    const series = Array.from({length: n}, (_, i) => ({
      row: i * 7.3 + random() * 3,
      base: 0.3 + (n === 1 ? 0.25 : (i / (n - 1)) * 0.45) + (random() - 0.5) * 0.06,
      amp: 0.1 + random() * 0.05,
      k1: (2 * Math.PI) / (520 + random() * 380), p1: random() * 6.28,
      k2: (2 * Math.PI) / (190 + random() * 140), p2: random() * 6.28,
      k3: 1 / (70 + random() * 50), p3: random() * 50, k4: 1 / (16 + random() * 10),
    }));
    return {series};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    const k = values.intensity / 100;
    const light = scheme === 'light';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.8)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // The grid: minor lines, every fifth one a little firmer, both from one step.
    const step = mix(84, 26, (values.density - 10) / 90);
    const ox = (w % step) / 2, oy = (h % step) / 2;
    ctx.lineWidth = 1;
    for (const major of [false, true]) {
      ctx.strokeStyle = rgba(tones.grid, (major ? 0.2 : 0.09) * (light ? 1 : 0.9) * (0.5 + k * 0.5));
      ctx.beginPath();
      for (let i = 0, x = ox; x <= w; i += 1, x += step) if ((i % 5 === 0) === major) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
      for (let i = 0, y = oy; y <= h; i += 1, y += step) if ((i % 5 === 0) === major) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
      ctx.stroke();
    }
    // The pen sweeps the width in about fourteen seconds; what it wrote fades over most of a sweep,
    // so a gap runs ahead of it.
    const velocity = Math.max(60, w / 14);
    const travelled = t * velocity;
    const head = ((travelled % w) + w) % w;
    const sweep = w / velocity;
    const keep = 0.86;
    const fade = (x) => {
      const age = (((head - x) % w) + w) % w / velocity;
      const life = 1 - age / (sweep * keep);
      return life <= 0 ? 0 : life * life;
    };
    const uOf = (x) => travelled - ((((head - x) % w) + w) % w);
    const chunk = 18;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    state.series.forEach((series, i) => {
      const pen = tones.pens[i % tones.pens.length];
      // Short pieces, each in the alpha of its age; split at the pen so the new stroke never joins the old.
      for (let x0 = 0; x0 < w; x0 += chunk) {
        const x1 = Math.min(w, x0 + chunk);
        const cut = head > x0 && head < x1 ? head : null;
        for (const [a, b] of cut === null ? [[x0, x1]] : [[x0, cut], [cut, x1]]) {
          const life = fade((a + b) / 2 + (cut !== null && a === cut ? 0.01 : 0));
          if (life <= 0.01) continue;
          ctx.beginPath();
          // The right end sits a hair inside the piece, so at the pen it is still the new pass.
          const end = b === head ? b - 0.001 : b;
          for (let x = a; ; x = Math.min(x + 3, end)) {
            const y = seriesValue(series, uOf(x === a && a === head ? a + 0.001 : x)) * h;
            if (x === a) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            if (x >= end) break;
          }
          ctx.strokeStyle = rgba(pen, life * (light ? 0.62 : 0.6) * k);
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }
      // The pen itself: a small dot with a soft ring.
      const py = seriesValue(series, travelled) * h;
      ctx.fillStyle = rgba(pen, (light ? 0.16 : 0.2) * k);
      ctx.beginPath();
      ctx.arc(head, py, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = rgba(pen, (light ? 0.7 : 0.75) * k);
      ctx.beginPath();
      ctx.arc(head, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
    });
    // The scan line under the pens.
    ctx.strokeStyle = rgba(tones.grid, 0.18 * k);
    ctx.beginPath();
    ctx.moveTo(Math.round(head) + 0.5, 0);
    ctx.lineTo(Math.round(head) + 0.5, h);
    ctx.stroke();
    // The crosshair: a dashed guide at the pointer and a ring where each visible line crosses it.
    if (pointer.on) {
      const x = pointer.x * w;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = rgba(tones.grid, 0.42 * k);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
      ctx.stroke();
      ctx.restore();
      const life = fade(x);
      if (life > 0.05) state.series.forEach((series, i) => {
        const pen = tones.pens[i % tones.pens.length];
        const y = seriesValue(series, uOf(x)) * h;
        ctx.fillStyle = rgba(tones.ground, 0.9);
        ctx.strokeStyle = rgba(pen, (0.35 + 0.5 * life) * k);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    }
  },
  start: 9,
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
