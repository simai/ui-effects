// Chladni figures (simai.effect 1.1.0; schemes light and dark): sand on a singing plate gathers on the lines that stay still; the note changes, and the figure breaks up and forms a new one.
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

// Chladni figures: sand on a plate that sings. Where the plate shakes the grains jump, and they
// walk off to the lines that stay still, so the sand draws the plate's standing wave. Every few
// seconds the note changes: the old figure breaks up into a shimmer and the grains run to the
// new one. The grains may be sand, or text: the marks of a text file, the alphabets and words of the
// text flow, or the words of a manual (Install, Step 1, Note…) in the page's language.
// Real sand is never one colour: every grain takes one of three shades, so the lines have grain.
// The palettes follow how sand is shown for real: graphite is grey sand on a grey plate; brass a
// bronze plate with brown sand; lightbox is sand animation, dark sand on a warm backlit glass;
// ink takes the theme's primary colour.
const SCENE = {
  home: 'light', seed: 43, fresh: true, reseed: ['density', 'grains', 'language'],
  tones: (read, scheme) => scheme === 'light'
    ? {
      graphite: {plate: read('--sf-neutral-98', '#faf9fe'), edge: read('--sf-neutral-95', '#f1f0f5'), grains: [read('--sf-neutral-20', '#2f3036'), read('--sf-neutral-40', '#5d5e66'), read('--sf-neutral-60', '#909099')]},
      brass: {plate: read('--sf-warning-95', '#ffeee1'), edge: read('--sf-warning-90', '#ffdcc2'), grains: [read('--sf-warning-20', '#4f2500'), read('--sf-warning-40', '#8b5000'), read('--sf-neutral-40', '#5d5e66')]},
      lightbox: {plate: read('--sf-warning-98', '#fff8f5'), edge: read('--sf-warning-90', '#ffdcc2'), grains: [read('--sf-neutral-10', '#1a1b21'), read('--sf-neutral-20', '#2f3036'), read('--sf-warning-20', '#4f2500')]},
      ink: {plate: read('--sf-neutral-98', '#faf9fe'), edge: read('--sf-neutral-95', '#f1f0f5'), grains: [read('--sf-primary-40', '#005bbe'), read('--sf-primary-60', '#4d8eff'), read('--sf-neutral-50', '#76777f')]},
    }
    : {
      graphite: {plate: read('--sf-neutral-10', '#1a1b21'), edge: read('--sf-neutral-4', '#0c0e13'), grains: [read('--sf-neutral-90', '#e2e2eb'), read('--sf-neutral-70', '#aaabb4'), read('--sf-neutral-50', '#76777f')]},
      brass: {plate: read('--sf-warning-10', '#2f1500'), edge: read('--sf-neutral-4', '#0c0e13'), grains: [read('--sf-warning-80', '#ffb77a'), read('--sf-warning-60', '#d1872c'), read('--sf-neutral-70', '#aaabb4')]},
      lightbox: {plate: read('--sf-warning-20', '#4f2500'), edge: read('--sf-neutral-4', '#0c0e13'), grains: [read('--sf-neutral-4', '#0c0e13'), read('--sf-neutral-6', '#16181d'), read('--sf-neutral-10', '#1a1b21')]},
      ink: {plate: read('--sf-neutral-6', '#16181d'), edge: read('--sf-neutral-4', '#0c0e13'), grains: [read('--sf-primary-80', '#adc6ff'), read('--sf-primary-60', '#4d8eff'), read('--sf-neutral-60', '#909099')]},
    },
  setup(env, random) {
    const {w, h, values} = env;
    const tokens = tokensOf(env), glyphs = tokens !== null;
    // Words are wider than one mark: fewer of them draw the same lines.
    const words = glyphs && tokens.some((token) => token.length > 2);
    const area = clamp(w * h / 450000, 0.4, 1.6);
    const n = Math.round((words ? 110 + values.density * 2.2 : glyphs ? 1100 + values.density * 16 : 2400 + values.density * 50) * area);
    const own = rng(43 + env.salt);
    // The notes in a new order on every mount; the still frame keeps the first.
    const modes = MODES.map((m) => [m, own()]).sort((a, b) => a[1] - b[1]).map((m) => m[0]);
    const grains = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) { grains[i * 3] = random() * w; grains[i * 3 + 1] = random() * h; grains[i * 3 + 2] = glyphs ? Math.floor(random() * tokens.length) : 0; }
    const state = {n, grains, glyphs, words, tokens, modes, at: 0, since: 0, random, last: null, shake: 0, dust: null};
    // Words are few: a fine dust of sand under them draws the figure they are lettered on.
    if (words) {
      const m = Math.round((1400 + values.density * 24) * area), dust = new Float32Array(m * 3);
      for (let i = 0; i < m; i += 1) { dust[i * 3] = random() * w; dust[i * 3 + 1] = random() * h; }
      state.dust = {n: m, grains: dust, random, glyphs: false, words: false, get modes() { return state.modes; }, get at() { return state.at; }, get shake() { return state.shake; }};
    }
    // The plate has been singing its first note for a while: the figure is already drawn.
    for (let i = 0; i < (words ? 700 : glyphs ? 420 : 260); i += 1) { step(env, state, 1 / 60, 1); if (state.dust && i < 300) step(env, state.dust, 1 / 60, 1); }
    return state;
  },
  click(env) { const s = env.state; s.at = (s.at + 1) % s.modes.length; s.since = 0; s.shake = 0.5; },
  draw(env, t) {
    const {ctx, w, h, state, values, scheme} = env;
    const tones = env.tones[values.palette] ?? env.tones.graphite;
    const k = values.intensity / 100;
    const dt = state.last === null ? 0 : Math.max(0, Math.min(0.05, t - state.last));
    state.last = t;
    // A new note every nine seconds.
    state.since += dt;
    if (state.since > 9) { state.since = 0; state.at = (state.at + 1) % state.modes.length; state.shake = 0.6; }
    state.shake = Math.max(0, state.shake - dt);
    step(env, state, dt, dt * 60);
    if (state.dust) step(env, state.dust, dt, dt * 60);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
    g.addColorStop(0, rgba(tones.plate));
    g.addColorStop(1, rgba(tones.edge));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const {n, grains} = state;
    if (state.glyphs) {
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (state.dust) {
        ctx.fillStyle = rgba(tones.grains[1], (scheme === 'light' ? 0.4 : 0.42) * (0.45 + k * 0.6));
        ctx.beginPath();
        for (let i = 0; i < state.dust.n; i += 1) ctx.rect(state.dust.grains[i * 3], state.dust.grains[i * 3 + 1], 1.1, 1.1);
        ctx.fill();
      }
      // Words are written along the still line they lie on, as if the figure were lettered.
      const along = state.words ? lineAngle(env, state) : null;
      for (let s = 0; s < 3; s += 1) {
        ctx.fillStyle = rgba(tones.grains[s], (scheme === 'light' ? 0.42 : state.words ? 0.26 : 0.32) * (0.45 + k * 0.6));
        for (let i = s; i < n; i += 3) {
          const x = grains[i * 3], y = grains[i * 3 + 1], word = state.tokens[grains[i * 3 + 2]];
          if (!along) { ctx.fillText(word, x, y); continue; }
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(along(x, y));
          ctx.fillText(word, 0, 0);
          ctx.restore();
        }
      }
    } else {
      // Three shades and three sizes of grain: every third grain is the same kind.
      for (let s = 0; s < 3; s += 1) {
        const size = 1.1 + s * 0.3;
        ctx.fillStyle = rgba(tones.grains[s], (scheme === 'light' ? 0.6 : 0.65) * (0.45 + k * 0.6));
        ctx.beginPath();
        for (let i = s; i < n; i += 3) ctx.rect(grains[i * 3], grains[i * 3 + 1], size, size);
        ctx.fill();
      }
    }
  },
};
// Mode pairs of a square plate: (n, m) and the sign that joins the two standing waves.
const MODES = [[2, 5, 1], [3, 7, -1], [1, 4, 1], [4, 7, 1], [2, 7, -1], [3, 5, 1], [5, 8, -1], [1, 6, -1], [4, 9, 1], [3, 8, 1], [2, 9, -1], [6, 9, 1]];
// The text a plate can carry: single marks, the text flow's alphabets and words, a manual's words.
const TEXT = {
  marks: ['#', '{', '}', '[', ']', '<', '>', '/', '*', ':', '=', '-', '`', '|'],
  symbols: [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
  hex: [...'0123456789ABCDEF'],
  binary: ['0', '1'],
  digits: [...'0123456789'],
  signs: [...'+-×÷=<>/\\|*#%&~^:;·°§'],
  javascript: ['const', 'let', '=>', '()', '{}', 'return', 'await', 'import', 'export', 'if', 'for', '[]', '===', 'null', 'true', '//'],
  html: ['<div>', '</p>', '<a>', 'class', 'href', '<h1>', ':root', '--sf', '<main>', '/>', 'rem', '@media', '{}', '<li>'],
  terminal: ['$', 'npm', 'git', 'build', '✓', 'run', 'cd', 'ls', '--help', '>', '~/', 'push', 'ok', 'init'],
};
const MANUAL = {
  en: ['Install', 'Configure', 'Build', 'Publish', 'Step 1', 'Step 2', 'Step 3', 'Note', 'Example', '## Usage', '> Tip', '1.', '2.', '- [x]', 'See also', 'API', 'Guide', '→', 'README.md', 'docara build', 'npm i'],
  ru: ['Установка', 'Настройка', 'Сборка', 'Публикация', 'Шаг 1', 'Шаг 2', 'Шаг 3', 'Примечание', 'Пример', '## Начало', '> Совет', '1.', '2.', '- [x]', 'См. также', 'API', 'Руководство', '→', 'README.md', 'docara build', 'npm i'],
};
// The direction of the still line at a point: across the slope of the shaking, kept within a
// quarter turn either way so words never stand upside down.
function lineAngle(env, state) {
  const {w, h} = env;
  const [a, b, sign] = state.modes[state.at];
  const L = Math.min(h, w), ox = w / 2 - L / 2, oy = h / 2 - L / 2, P = Math.PI;
  return (x, y) => {
    const u = (x - ox) / L, v = (y - oy) / L;
    const fu = -a * P * Math.sin(a * P * u) * Math.cos(b * P * v) - sign * b * P * Math.sin(b * P * u) * Math.cos(a * P * v);
    const fv = -b * P * Math.cos(a * P * u) * Math.sin(b * P * v) - sign * a * P * Math.cos(b * P * u) * Math.sin(a * P * v);
    let angle = Math.atan2(fu, -fv);
    if (angle > P / 2) angle -= P; else if (angle < -P / 2) angle += P;
    return angle;
  };
}
// The grains' text, or null for sand. The manual speaks the page's language unless the setting names one.
function tokensOf(env) {
  const kind = env.values.grains;
  if (kind === 'manual') {
    let lang = env.values.language;
    if (lang !== 'en' && lang !== 'ru') lang = (env.ctx.canvas?.closest?.('[lang]')?.lang ?? globalThis.document?.documentElement?.lang ?? 'en').slice(0, 2).toLowerCase();
    return MANUAL[lang] ?? MANUAL.en;
  }
  return TEXT[kind] ?? null;
}
// One step of the sand: each grain jumps as hard as the plate shakes under it, and slides down
// the shaking towards the still lines.
function step(env, state, dt, frames) {
  if (!frames) return;
  const {w, h, pointer, values} = env;
  const {n, grains, random} = state;
  const [a, b, sign] = state.modes[state.at];
  // The plate is the square in the middle of the area, and the figure carries on beyond it.
  const L = Math.min(h, w), ox = w / 2 - L / 2, oy = h / 2 - L / 2, P = Math.PI;
  // Marks are bigger than grains: they jump less, so their lines stay readable.
  const jump = (state.words ? 1 : state.glyphs ? 1.4 : 2.4) * (1 + state.shake * 5), pull = 0.1 * L / 400;
  const px = pointer.on ? pointer.x * w : -1e4, py = pointer.on ? pointer.y * h : -1e4;
  for (let i = 0; i < n; i += 1) {
    const o = i * 3;
    let x = grains[o], y = grains[o + 1];
    const u = (x - ox) / L, v = (y - oy) / L;
    const cau = Math.cos(a * P * u), sau = Math.sin(a * P * u), cbu = Math.cos(b * P * u), sbu = Math.sin(b * P * u);
    const cav = Math.cos(a * P * v), sav = Math.sin(a * P * v), cbv = Math.cos(b * P * v), sbv = Math.sin(b * P * v);
    const f = cau * cbv + sign * cbu * cav;
    const fu = -a * P * sau * cbv - sign * b * P * sbu * cav;
    const fv = -b * P * cau * sbv - sign * a * P * cbu * sav;
    const shake = Math.abs(f) + 0.04;
    // A finger on the plate stirs the sand under it.
    const near = Math.max(0, 1 - Math.hypot(x - px, y - py) / 70);
    const j = jump * (shake + near * 1.5) * frames;
    x += (random() - 0.5) * j - f * fu * pull * frames;
    y += (random() - 0.5) * j - f * fv * pull * frames;
    if (x < -4 || x > w + 4 || y < -4 || y > h + 4) { x = random() * w; y = random() * h; }
    grains[o] = x; grains[o + 1] = y;
  }
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
