// Text search (simai.effect 1.1.0; schemes light and dark): calm columns of grey word bars drift
// slowly upward while soft search markers sweep onto words one after another, like the results of
// a query being found; now and then every word of one length lights up together.
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

// The page: columns like pages, filled with paragraphs of word bars. A line is a pure function of
// its column and its number, so the text scrolls up without end and stays the same at the defaults.
function lineOf(state, c, n) {
  const key = n * 8 + c;
  const hit = state.cache.get(key);
  if (hit) return hit;
  if (state.cache.size > 6000) state.cache.clear();
  const s = c * 131 + 17;
  const brk = (m) => hash2(s, m) < 0.12 && hash2(s, m - 1) >= 0.12;
  let line;
  if (brk(n)) line = {words: [], tall: 1};
  else {
    const head = brk(n - 1) && hash2(s + 50, n) < 0.3;
    const last = brk(n + 1);
    const first = brk(n - 1) && !head;
    const random = rng(Math.floor(hash2(c + 977, n) * 4294967295));
    const {colW, cw} = state;
    const tall = head ? 1.3 : 1;
    const indent = first ? cw * 4 : 0;
    const avail = colW - indent;
    const target = last ? avail * (0.25 + 0.5 * random()) : head ? avail * (0.3 + 0.3 * random()) : avail;
    const gap = cw * 1.7 * tall;
    const words = [];
    let x = indent;
    for (;;) {
      const len = 2 + Math.floor(random() ** 1.5 * 10);
      const ww = len * cw * tall;
      if (x + ww > indent + target) { if (!words.length) words.push([x, Math.min(ww, target), len]); break; }
      words.push([x, ww, len]);
      x += ww + gap;
    }
    // Justified body lines: the slack is spread over the gaps, as a typeset page does.
    if (!last && !head && words.length > 1) {
      const end = words[words.length - 1];
      const extra = (indent + avail - end[0] - end[1]) / (words.length - 1);
      words.forEach((wd, i) => { wd[0] += extra * i; });
    }
    line = {words, tall};
  }
  state.cache.set(key, line);
  return line;
}

// The rounded bar of one word.
const bar = (ctx, x, y, w, h) => (ctx.roundRect ? ctx.roundRect(x, y - h / 2, w, h, h / 2) : ctx.rect(x, y - h / 2, w, h));

// A highlight's life: the marker sweeps on, glows, holds and fades.
function envelope(age, life) {
  if (age < 0 || age > life) return null;
  return {sweep: smooth(clamp(age / 0.45, 0, 1)), a: clamp(age / 0.12, 0, 1) * (1 - smooth(clamp((age - life + 1.8) / 1.8, 0, 1))), glow: Math.exp(-((age - 0.65) ** 2) / 0.12)};
}

const HIT_LIFE = 4.4;
const GROUP_EVERY = 14;

const SCENE = {
  home: 'light', seed: 523, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), ink: read('--sf-neutral-50', '#76777f'), lens: read('--sf-neutral-30', '#45464f'), ring: read('--sf-neutral-60', '#8f9099'),
      mark: read('--sf-primary-80', '#acc7ff'), glow: read('--sf-primary-90', '#d7e3ff'), word: read('--sf-primary-40', '#005bbe'),
      mark2: read('--sf-tertiary-80', '#ddbce0'), word2: read('--sf-tertiary-40', '#705575')}
    : {ground: read('--sf-neutral-5', '#111318'), low: read('--sf-neutral-10', '#1a1b20'), ink: read('--sf-neutral-60', '#8f9099'), lens: read('--sf-neutral-90', '#e2e2e9'), ring: read('--sf-neutral-50', '#76777f'),
      mark: read('--sf-primary-40', '#005bbe'), glow: read('--sf-primary-30', '#00458f'), word: read('--sf-primary-80', '#acc7ff'),
      mark2: read('--sf-tertiary-40', '#705575'), word2: read('--sf-tertiary-80', '#ddbce0')},
  setup(env) {
    const {w} = env;
    const d = (clamp(Math.round(env.values.density ?? 50), 10, 100) - 10) / 90;
    const lh = mix(32, 15, d);
    const cols = clamp(Math.round(w / 360), 1, 5);
    const margin = Math.min(48, w * 0.06), gap = Math.min(52, w * 0.05);
    const colW = (w - margin * 2 - gap * (cols - 1)) / cols;
    return {lh, wh: lh * 0.36, cw: lh * 0.27, cols, margin, gap, colW, top: lh, cache: new Map(), flash: null, now: 0, offset: 0};
  },
  // Where a word stands on screen now, or null if its line is off the page.
  place(env, c, n, i) {
    const {state} = env;
    const line = lineOf(state, c, n);
    const wd = line.words[i];
    if (!wd) return null;
    return {x: state.margin + c * (state.colW + state.gap) + wd[0], y: state.top + n * state.lh - state.offset, w: wd[1], h: state.wh * line.tall, len: wd[2]};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    const k = values.intensity / 100;
    const light = scheme === 'light';
    const {lh, cols, margin, gap, colW, top} = state;
    state.now = t;
    state.offset = t * lh * 0.25;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.7)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Faint sheets behind the columns.
    ctx.fillStyle = rgba(tones.low, light ? 0.55 : 0.5);
    ctx.beginPath();
    for (let c = 0; c < cols; c += 1) ctx.rect(margin + c * (colW + gap) - 14, 10, colW + 28, h - 20);
    ctx.fill();

    // Softer where the page's own heading and lead usually sit (centre-left), and at the edges.
    const veil = (x, y) => {
      const dx = (x / w - 0.27) / 0.3, dy = (y / h - 0.5) / 0.42;
      return (1 - 0.55 * Math.exp(-(dx * dx + dy * dy))) * clamp(y / 48, 0, 1) * clamp((h - y) / 48, 0, 1);
    };

    // Highlights: a sequence of single hits reading down the columns, and "find all" groups.
    const marks = [];
    const hits = clamp(Math.round(values.hits ?? 4), 1, 10);
    const every = HIT_LIFE / hits;
    const vis = Math.max(4, Math.floor((h - top) / lh));
    for (let i = Math.max(0, Math.ceil((t - HIT_LIFE) / every)); i <= Math.floor(t / every); i += 1) {
      const e = envelope(t - i * every, HIT_LIFE);
      if (!e) continue;
      const nTop = Math.ceil((i * every * lh * 0.25 - top) / lh);
      const c = Math.floor(i / 3) % cols;
      let n = nTop + 1 + Math.floor((((i % 3) + hash2(i, 7)) / 3) * (vis - 3));
      while (!lineOf(state, c, n).words.length) n += 1;
      const p = this.place(env, c, n, Math.floor(hash2(i, 11) * lineOf(state, c, n).words.length));
      if (p) marks.push([p, e, 0]);
    }
    const group = (len, born, strong, alt) => {
      const n0 = Math.floor((state.offset - top) / lh), n1 = n0 + Math.ceil(h / lh) + 2;
      for (let c = 0; c < cols; c += 1) for (let n = n0; n <= n1; n += 1) {
        const line = lineOf(state, c, n);
        for (let i = 0; i < line.words.length; i += 1) {
          if (line.words[i][2] !== len) continue;
          const p = this.place(env, c, n, i);
          const e = envelope(t - born - (p.y / h) * 0.7 - c * 0.18, 3.2);
          if (e) marks.push([p, {...e, a: e.a * strong}, alt]);
        }
      }
    };
    const gk = Math.floor((t - 5) / GROUP_EVERY);
    if (gk >= 0) group(3 + Math.floor(hash2(gk, 3) * 6), gk * GROUP_EVERY + 5, 0.75, 1);
    if (state.flash) {
      if (t - state.flash.born > 6) state.flash = null;
      else group(state.flash.len, state.flash.born, 1, 0);
    }

    // The markers lie under the words: a soft halo while it glows, the marker itself as it sweeps.
    for (const [p, e, alt] of marks) {
      const a = e.a * veil(p.x + p.w / 2, p.y) * k;
      const pad = p.h * 0.6;
      if (e.glow > 0.02) {
        ctx.fillStyle = rgba(alt ? tones.mark2 : tones.glow, (light ? 0.5 : 0.45) * a * e.glow);
        ctx.beginPath();
        bar(ctx, p.x - pad * 3, p.y, p.w + pad * 6, p.h + pad * 5);
        ctx.fill();
      }
      ctx.fillStyle = rgba(alt ? tones.mark2 : tones.mark, (light ? 0.75 : 0.7) * a);
      ctx.beginPath();
      bar(ctx, p.x - pad, p.y, (p.w + pad * 2) * e.sweep, p.h + pad * 2);
      ctx.fill();
    }

    // The words, batched by how faint the veil keeps them; the lens takes its own out.
    const lensR = Math.max(70, Math.min(130, w * 0.08));
    const px = pointer.x * w, py = pointer.y * h;
    const buckets = [[], [], [], [], [], []];
    const lensed = [];
    const n0 = Math.floor((state.offset - top) / lh), n1 = n0 + Math.ceil(h / lh) + 2;
    for (let c = 0; c < cols; c += 1) {
      const cx = margin + c * (colW + gap);
      for (let n = n0; n <= n1; n += 1) {
        const line = lineOf(state, c, n);
        const y = top + n * lh - state.offset;
        if (y < -lh || y > h + lh) continue;
        const wh = state.wh * line.tall;
        for (const [x0, ww] of line.words) {
          const x = cx + x0;
          const v = veil(x + ww / 2, y);
          if (pointer.on) {
            const f = 1 - Math.hypot(Math.max(x - px, 0, px - x - ww), y - py) / lensR;
            if (f > 0) { lensed.push([x, y, ww, wh, v, smooth(f)]); continue; }
          }
          const b = Math.round(v * 5);
          if (b > 0) buckets[b].push(x, y, ww, wh);
        }
      }
    }
    const inkA = (light ? 0.3 : 0.26) * k;
    buckets.forEach((list, b) => {
      if (!list.length) return;
      ctx.fillStyle = rgba(tones.ink, (inkA * b) / 5);
      ctx.beginPath();
      for (let i = 0; i < list.length; i += 4) bar(ctx, list[i], list[i + 1], list[i + 2], list[i + 3]);
      ctx.fill();
    });
    // The marked words take the accent ink.
    for (const [p, e, alt] of marks) {
      ctx.fillStyle = rgba(alt ? tones.word2 : tones.word, (light ? 0.6 : 0.75) * e.a * veil(p.x + p.w / 2, p.y) * k);
      ctx.beginPath();
      bar(ctx, p.x, p.y, p.w, p.h);
      ctx.fill();
    }
    // The lens: words under it come forward, darker and a little larger, inside a thin ring.
    if (pointer.on) {
      for (const [x, y, ww, wh, v, f] of lensed) {
        const s = 1 + 0.14 * f;
        ctx.fillStyle = rgba(mixc(tones.ink, tones.lens, f), mix(inkA * v, (light ? 0.55 : 0.6) * k, f));
        ctx.beginPath();
        bar(ctx, x + ww / 2 - (ww * s) / 2, y, ww * s, wh * s);
        ctx.fill();
      }
      ctx.strokeStyle = rgba(tones.ring, (light ? 0.35 : 0.4) * k);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, lensR, 0, Math.PI * 2);
      ctx.stroke();
    }
  },
  // A click finds every word of the same length as the one under it.
  click(env, x, y) {
    const {state} = env;
    const n = Math.round((y - state.top + state.offset) / state.lh);
    const c = clamp(Math.floor((x - state.margin + state.gap / 2) / (state.colW + state.gap)), 0, state.cols - 1);
    const words = lineOf(state, c, n).words;
    const lx = x - state.margin - c * (state.colW + state.gap);
    let best = null;
    for (const wd of words) if (!best || Math.abs(wd[0] + wd[1] / 2 - lx) < Math.abs(best[0] + best[1] / 2 - lx)) best = wd;
    state.flash = {len: best ? best[2] : 3 + Math.floor(hash2(x | 0, y | 0) * 6), born: state.now};
  },
  start: 3.5,
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
