// Particle text (simai.effect 1.1.0; schemes dark and light): particles in Brownian motion write a text and dissolve into gas again.
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

// Particles in Brownian motion that write a text and let it go again. They jitter and wander as a
// warm gas; then the text writes itself from left to right, each particle pulled to its place while
// still trembling a little; it holds, and dissolves again from left to right, and the gas wanders on
// from wherever it is, so no two gatherings look the same. A share of the particles never joins and
// stays gas. The text fits the area by itself. How the gas moves is a setting: Brownian jitter,
// a sand wind blowing across, a slow vortex round the middle, or a snowfall. A click heats the
// particles round it: they shake loose and settle back as they cool; holding keeps heating them.
const SCENE = {
  home: 'dark', seed: 177, reseed: ['density', 'text', 'size'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), dot: read('--sf-primary-40', '#005bbe'), alt: read('--sf-tertiary-40', '#7c4c86')}
    : {ground: read('--sf-neutral-5', '#111318'), dot: read('--sf-primary-80', '#acc7ff'), alt: read('--sf-tertiary-80', '#e9b4f2')},
  setup(env, random) {
    const {w, h} = env;
    const lines = String(env.values.text || 'SIMAI').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 4);
    if (!lines.length) lines.push('SIMAI');
    // Fit: the widest line takes about 70 % of the width and the block at most 55 % of the height,
    // then scaled by the size setting.
    const probe = new OffscreenCanvas(8, 8).getContext('2d');
    probe.font = '700 100px system-ui, sans-serif';
    const widest = Math.max(...lines.map((line) => probe.measureText(line).width), 1);
    const lineHeight = Math.max(12, Math.min(w * 0.7 / widest * 100, h * 0.55 / (lines.length * 1.12)) * (env.values.size / 100));
    const off = new OffscreenCanvas(Math.ceil(w), Math.ceil(lineHeight * lines.length * 1.15 + 8));
    const o = off.getContext('2d');
    o.fillStyle = '#fff';
    o.font = `700 ${lineHeight}px system-ui, sans-serif`;
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    lines.forEach((line, i) => o.fillText(line, off.width / 2, lineHeight * 0.6 + i * lineHeight * 1.12));
    const pixels = o.getImageData(0, 0, off.width, off.height).data;
    const step = Math.max(3, Math.round(lineHeight / 22 * (1.6 - env.values.density / 100)));
    const top = (h - off.height) / 2;
    const particles = [];
    // After a change of text the gas the particles were stays where it was and gathers at once.
    const old = env.state?.particles ?? [];
    let reuse = 0;
    const free = () => (old.length ? (({x, y}) => [x, y])(old[reuse++ % old.length]) : [random() * w, random() * h]);
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
      if (pixels[(y * off.width + x) * 4 + 3] < 128) continue;
      // A still frame shows the text; a moving one starts as gas.
      const [fx, fy] = env.still ? [x, y + top] : free();
      particles.push({target: [x, y + top], x: fx, y: fy, vx: 0, vy: 0, heat: 0, alt: random() < 0.2});
    }
    for (let i = 0, n = Math.round(particles.length * 0.25); i < n; i += 1) {
      const [fx, fy] = free();
      particles.push({target: null, x: fx, y: fy, vx: 0, vy: 0, heat: 0, alt: random() < 0.3});
    }
    return {particles, random, reach: Math.min(w, h) * 0.18, last: null, born: old.length ? null : 0};
  },
  click(env, x, y) { heat(env.state, x, y, 4); },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    const k = values.intensity / 100;
    const dt = state.last === null ? 0 : Math.min(0.05, Math.max(0, t - state.last));
    state.last = t;
    const frames = dt * 60;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    if (pointer.down && pointer.on) heat(state, pointer.x * w, pointer.y * h, 0.25 * frames);
    // The cycle: wander, gather (written left to right), hold, dissolve (left to right).
    if (state.born === null) state.born = t - 18 * 0.2;
    const c = ((t - state.born) / 18) % 1;
    const random = state.random, size = 2, style = values.style;
    for (const p of state.particles) {
      let pull = 0;
      if (p.target && !env.still) {
        const lag = p.target[0] / w * 0.18;
        pull = c < 0.62 ? smooth(clamp((c - 0.22 - lag) / 0.2, 0, 1)) : c < 0.8 ? 1 : 1 - smooth(clamp((c - 0.8 - lag) / 0.08, 0, 1));
      } else if (p.target) pull = 1;
      pull /= 1 + p.heat * 2;
      // Brownian kicks, weaker while held in the text, stronger while hot.
      const jolt = (1 - pull * 0.7) * 0.55 * (1 + p.heat * 3) * Math.sqrt(frames);
      p.vx += (random() + random() + random() - 1.5) * jolt;
      p.vy += (random() + random() + random() - 1.5) * jolt;
      if (p.target) { p.vx += (p.target[0] - p.x) * 0.006 * pull * frames; p.vy += (p.target[1] - p.y) * 0.006 * pull * frames; }
      // The gas's own motion, gone where the particle is held in the text.
      const free = (1 - pull) * frames;
      if (style === 'wind') { p.vx += (0.12 + (noise2(p.y * 0.012, t * 0.3) - 0.5) * 0.12) * free; p.vy += (noise2(p.x * 0.01, t * 0.4 + 9) - 0.5) * 0.1 * free; }
      else if (style === 'swirl') { const dx = p.x - w / 2, dy = p.y - h / 2, d = Math.hypot(dx, dy) + 1, out = 0.03 * (d / (Math.min(w, h) * 0.42) - 1); p.vx += (-dy / d * 0.1 - dx / d * out) * free; p.vy += (dx / d * 0.1 - dy / d * out) * free; }
      else if (style === 'snow') { p.vy += 0.07 * free; p.vx += (noise2(p.y * 0.01, t * 0.2) - 0.5) * 0.05 * free; }
      // Soft walls keep the gas in the area; the wind and the snow carry it round instead.
      if (style === 'wind') { if (p.x > w + 8) p.x -= w + 16; } else if (p.x < 0) p.vx += 0.05 * frames; else if (p.x > w) p.vx -= 0.05 * frames;
      if (style === 'snow') { if (p.y > h + 8) p.y -= h + 16; } else if (p.y < 0) p.vy += 0.05 * frames; else if (p.y > h) p.vy -= 0.05 * frames;
      const damp = Math.pow(0.9 - pull * 0.06, frames);
      p.vx *= damp; p.vy *= damp;
      p.x += p.vx * frames; p.y += p.vy * frames;
      p.heat *= Math.pow(0.975, frames);
      const bright = p.target ? 0.4 + 0.6 * pull : 0.35;
      ctx.fillStyle = rgba(p.alt ? tones.alt : tones.dot, (scheme === 'light' ? 0.75 : 0.8) * k * bright);
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    }
  },
};
// Heat the particles round a point: the closer, the hotter.
function heat(state, x, y, amount) {
  for (const p of state.particles) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < state.reach) p.heat = Math.min(6, p.heat + amount * (1 - d / state.reach));
  }
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
const SCALE_TONES = [0, 4, 5, 6, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
function paintLayer(host, name) {
  const stops = PALETTES[name], at = [4, 30, 65, 95];
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
  let palette = settings.palette;
  paintLayer(host, palette);
  const scene = mountScene(host, settings, context);
  return {
    ...scene,
    update(next = {}, nextContext = {}) {
      scene.update(next, nextContext);
      if (next.palette !== palette) { palette = next.palette; paintLayer(host, palette); scene.refreshTheme?.(); }
    },
    destroy() { scene.destroy(); paintLayer(host); },
  };
}
