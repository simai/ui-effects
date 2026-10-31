// Digital rain (simai.effect 1.1.0; dark scheme only): columns of glyphs run down a dark screen: a bright head with a glow and a fading trail whose glyphs change. Three depths: far ones small and slow, near ones large and out of focus.
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

// Digital rain: columns of glyphs run down a dark screen, each run a bright head with a glow and a
// trail that fades behind it; glyphs in the trail change now and then. Three depths: far columns
// small, dim and slow; near ones large, fast and out of focus. The text comes from the list glyph
// tide and text flow share: in code or words a column reads from the top down. The pointer lights
// the glyphs round it; a click lets a sheaf of new runs fall from there.
// The fixed palettes the catalogue shares: a run's trail and its head.
const PALETTES = {turquoise: [[66, 178, 202], [216, 246, 255]], ocean: [[76, 148, 244], [214, 232, 255]], violet: [[162, 116, 252], [238, 226, 255]], rose: [[246, 104, 160], [255, 226, 238]], emerald: [[56, 190, 142], [216, 255, 238]], sunset: [[244, 146, 98], [255, 236, 214]], gold: [[226, 176, 82], [255, 242, 208]], silver: [[148, 166, 186], [242, 247, 255]]};
const SCENE = {
  home: 'dark', seed: 29, fresh: true, reseed: ['density', 'size', 'source', 'text', 'language', 'depth'],
  tones: (read) => {
    const r = (name, tone, hex) => read(`--sf-${name}-${tone}`, hex);
    return {
      ground: r('neutral', 4, '#0c0e13'), deep: r('neutral', 0, '#000000'),
      green: [r('success', 60, '#3ea05a'), r('success', 95, '#c8ffc9')], theme: [r('primary', 60, '#4d8eff'), r('primary', 95, '#ecf0ff')],
    };
  },
  setup(env, random) {
    const {w, h, values} = env, base = values.size;
    const source = textSource(values.source, values.text, pageLang(env.ctx.canvas, values.language));
    const stream = source.alphabet ? null : [...source.lines.join('   ') + '   '];
    const chars = source.alphabet ? [...source.alphabet] : [...new Set(stream)];
    const st = {random, chars, stream, layers: [], atlas: null};
    // Far, middle and near: size, speed, light, how many columns, and how much a layer is softened.
    const kinds = values.depth ? [[0.6, 0.55, 0.45, 0.8, 2], [1, 1, 1, 0.75, 1], [1.9, 1.7, 0.5, 0.18, 4]] : [[1, 1, 1, 0.9, 1]];
    for (const [scale, pace, light, share, soft] of kinds) {
      const size = base * scale, cw = size * 0.8, ch = size * 1.2, rows = Math.ceil(h / ch) + 1, cols = [];
      for (let x = cw / 2; x < w; x += cw) {
        if (random() > share * (0.4 + values.density / 100 * 0.6)) continue;
        const cells = new Int16Array(rows), skip = Math.floor(random() * 1e4);
        for (let r = 0; r < rows; r += 1) cells[r] = stream ? chars.indexOf(stream[(skip + r) % stream.length]) : Math.floor(random() * chars.length);
        cols.push({x, cells, runs: [run(random, rows, true)]});
      }
      const canvas = soft > 1 ? new OffscreenCanvas(Math.max(1, Math.ceil(w / soft)), Math.max(1, Math.ceil(h / soft))) : null;
      st.layers.push({size, cw, ch, rows, cols, pace, light, soft, canvas});
    }
    return st;
  },
  click(env, x, y) {
    const st = env.state, mid = st.layers[Math.min(1, st.layers.length - 1)];
    for (const col of mid.cols) if (Math.abs(col.x - x) < mid.cw * 3) col.runs.push({y: y / mid.ch, v: 14 + st.random() * 8, len: 8 + st.random() * 10});
  },
  draw(env, t) {
    const {ctx, w, h, tones, state: st, values, pointer} = env;
    const k = values.intensity / 100, ink = PALETTES[values.palette] ?? tones[values.palette] ?? tones.green;
    const dt = st.last === undefined ? 0 : Math.max(0, Math.min(0.05, t - st.last));
    st.last = t;
    if (st.inkOf !== ink || st.sizeOf !== w) { st.atlas = st.layers.map((l) => atlas(st.chars, l, ink)); st.inkOf = ink; st.sizeOf = w; }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.deep)); g.addColorStop(1, rgba(tones.ground));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const px = pointer.on ? pointer.x * w : -1e4, py = pointer.y * h;
    st.layers.forEach((layer, li) => {
      const {cw, ch, rows, soft} = layer, a = st.atlas[li];
      const c = soft > 1 ? layer.canvas.getContext('2d') : ctx;
      if (soft > 1) { c.setTransform(1 / soft, 0, 0, 1 / soft, 0, 0); c.clearRect(0, 0, w, h); }
      for (const col of layer.cols) {
        for (const r of col.runs) {
          const before = Math.floor(r.y);
          r.y += r.v * layer.pace * dt;
          // The head writes a new glyph in each cell it reaches, unless the column is text.
          if (!st.stream) for (let row = before + 1; row <= Math.floor(r.y) && row < rows; row += 1) if (row >= 0) col.cells[row] = Math.floor(st.random() * st.chars.length);
        }
        col.runs = col.runs.filter((r) => r.y - r.len < rows);
        if (!col.runs.length || (col.runs.length < 2 && col.runs[col.runs.length - 1].y > rows * (0.6 + st.random() * 0.8))) col.runs.push(run(st.random, rows, false));
        if (!st.stream && st.random() < dt * 2) col.cells[Math.floor(st.random() * rows)] = Math.floor(st.random() * st.chars.length);
        const near = Math.abs(col.x - px) < 90;
        for (const r of col.runs) {
          const head = Math.floor(r.y);
          for (let row = Math.max(0, head - Math.ceil(r.len)); row <= Math.min(rows - 1, head); row += 1) {
            const glyph = col.cells[row];
            if (glyph < 0) continue;
            let b = (1 - (head - row) / r.len) ** 1.6 * layer.light;
            if (near) b += Math.max(0, 1 - Math.hypot(col.x - px, row * ch - py) / 90) * 0.8 * layer.light;
            c.globalAlpha = Math.min(1, b * (0.35 + k * 0.75));
            c.drawImage(row === head ? a.head : a.trail, glyph * a.cw, 0, a.cw, a.ch, col.x - cw / 2, row * ch, cw, ch);
          }
          // The head's glow.
          if (head >= 0 && head < rows) { c.globalAlpha = 0.5 * layer.light * k; c.drawImage(a.glow, col.x - cw * 1.5, head * ch - ch, cw * 3, ch * 3); }
        }
      }
      c.globalAlpha = 1;
      if (soft > 1) { c.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(layer.canvas, 0, 0, w, h); }
    });
  },
};
function run(random, rows, start) { return {y: start ? random() * rows * 1.5 : -random() * rows * 0.4, v: 5 + random() * 7, len: 6 + random() * 16}; }
// Glyphs drawn once in the trail's colour and the head's, and a soft glow for the heads.
function atlas(chars, layer, [trail, head]) {
  const cw = Math.ceil(layer.cw * 2), ch = Math.ceil(layer.ch * 2), make = (tone, blur) => {
    const c = new OffscreenCanvas(cw * chars.length, ch), g = c.getContext('2d');
    g.font = `500 ${layer.size * 2}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = rgba(tone);
    if (blur) { g.shadowColor = rgba(tone); g.shadowBlur = layer.size * 0.6; }
    chars.forEach((char, i) => g.fillText(char, cw * (i + 0.5), ch * 0.55));
    return c;
  };
  const glow = new OffscreenCanvas(64, 64), gg = glow.getContext('2d'), gr = gg.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, rgba(head, 0.5)); gr.addColorStop(0.4, rgba(trail, 0.25)); gr.addColorStop(1, rgba(trail, 0));
  gg.fillStyle = gr; gg.fillRect(0, 0, 64, 64);
  return {trail: make(trail, false), head: make(mixc(head, trail, 0.15), true), glow, cw, ch};
}
// The texts glyph tide and text flow share: code, a terminal, lines with secrets, words that sound
// meaningful and say nothing (in the page's language), the reader's own text, and alphabets.
const TEXTS = {
  javascript: ['const light = await findSomethingBeautiful();', 'function breathe(time) { return Math.sin(time * 0.5); }', 'const leaves = points.map(point => wind.carry(point));', 'if (curiosity) { explore(); }', 'const wave = { shape: randomShape(), life: 4 };', 'for (const letter of story) { reveal(letter); }', 'requestAnimationFrame(() => makeRoomForWonder());', 'const answer = 42; // a small secret in the dark', 'export const quiet = () => new Promise(resolve => dawn(resolve));', '// sometimes the background has something to say'],
  html: ['<!doctype html> <html lang="ru">', '<main class="quiet"> <section> hello, human. </section> </main>', ':root { --light: #74b4d5; --curiosity: 1; }', '.leaf { transform: rotate(var(--wind)); }', '@keyframes breathe { 50% { opacity: 0.42; } }', '<canvas aria-hidden="true"></canvas>', '.wave { animation: grow 4s ease-out; }', '<!-- Ты нашёл маленькую пасхалку. -->', '@media (prefers-reduced-motion: reduce) { .leaf { animation: none; } }', 'body { margin: 0; background: #141414; }'],
  terminal: ['$ git status --short', '$ npm run build', '✓ build complete   ✓ no errors   ✓ ready for another idea', '$ echo "hello, human."', '$ git log --oneline --max-count=5', '42c0ffe add a little wonder', '$ node explore.js --curiosity=high', '[info] listening for the next small discovery', '$ printf "keep looking\\n"', '// not all secrets need a password'],
  easter: ['// hello, human. you found the quiet part.', '// Ты нашёл эту строку. Значит, свет был здесь.', 'const answer = 42;', '// SIMAI — маленькие детали тоже имеют значение.', 'while (curiosity) { explore(); }', '// Здесь могла быть ещё одна хорошая идея.'],
  prose: {
    ru: ['Всё начинается с тишины, в которой уже слышен ответ.', 'Форма следует за смыслом, а смысл — за светом.', 'Каждая деталь знает, зачем она здесь.', 'Мы строим не страницы, а места, куда хочется вернуться.', 'Простота — это сложность, которая нашла покой.', 'Время идёт быстрее там, где интересно.', 'Хороший интерфейс отвечает раньше, чем его спросят.', 'Свет ложится туда, где его ждут.', 'Важное редко бывает громким.', 'Путь становится ясным, когда по нему идут.'],
    en: ['Everything begins with a silence that already holds the answer.', 'Form follows meaning, and meaning follows the light.', 'Every detail knows why it is here.', 'We build not pages but places worth returning to.', 'Simplicity is complexity at rest.', 'Time runs faster where things are interesting.', 'A good interface answers before it is asked.', 'Light falls where it is awaited.', 'What matters is rarely loud.', 'The way grows clear as it is walked.'],
  },
};
const ALPHABETS = {letters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', hex: '0123456789ABCDEF', binary: '01', digits: '0123456789', signs: '+-×÷=<>/\\|*#%&~^:;·°§'};
// Lines for a kind of text, or an alphabet. The own text breaks into sentences; empty, it is the words.
function textSource(kind, own, lang) {
  if (ALPHABETS[kind]) return {alphabet: ALPHABETS[kind]};
  if (kind === 'custom') {
    const lines = String(own ?? '').split(/(?<=[.!?…])\s+|\n+/u).map((line) => line.trim()).filter(Boolean);
    if (lines.length) return {lines};
    kind = 'prose';
  }
  const lines = TEXTS[kind] ?? TEXTS.javascript;
  return {lines: Array.isArray(lines) ? lines : lines[lang] ?? lines.en};
}
// The words' language: the setting's, or the page's around the area.
function pageLang(node, choice) {
  if (choice === 'ru' || choice === 'en') return choice;
  return (node?.closest?.('[lang]')?.lang || node?.ownerDocument?.documentElement?.lang || 'en').slice(0, 2).toLowerCase() === 'ru' ? 'ru' : 'en';
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
