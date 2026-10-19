// Glyph tide (simai.effect 1.1.0; schemes dark and light): a field of dim monospace characters; a slow tide of light
// crosses it, brightening glyphs and now and then turning one into another. Glyphs come from a small
// atlas drawn once in the system monospace font; nothing is loaded.

// ---- runtime shared by the dark set (simai.effect 1.1.0) ----
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a, 0, 1).toFixed(3)})`;
// Pushes a colour away from grey, so pale theme tones still glow on a dark ground.
const vivid = (c, k = 1.6) => { const m = (c[0] + c[1] + c[2]) / 3; return c.map((v) => clamp(m + (v - m) * k, 0, 255)); };
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};

// Palette tones of the theme, resolved through a short-lived probe so light-dark() and var() chains settle.
function readTheme(host, scheme) {
  const doc = host.ownerDocument;
  const probe = doc.createElement('i');
  probe.style.cssText = 'position:absolute;inline-size:0;block-size:0;overflow:hidden;visibility:hidden';
  const pix = doc.createElement('canvas').getContext('2d', {willReadFrequently: true});
  host.append(probe);
  const own = getComputedStyle(host);
  const read = (names, fallback) => {
    for (const name of names) {
      if (!own.getPropertyValue(name).trim()) continue;
      probe.style.color = '';
      probe.style.color = `var(${name})`;
      const value = getComputedStyle(probe).color;
      pix.fillStyle = '#010203';
      pix.fillStyle = value;
      if (pix.fillStyle === '#010203') continue;
      pix.clearRect(0, 0, 1, 1);
      pix.fillRect(0, 0, 1, 1);
      const d = pix.getImageData(0, 0, 1, 1).data;
      if (d[3]) return [d[0], d[1], d[2]];
    }
    return fallback;
  };
  if (scheme === 'light') {
    // The light scheme is its own design, not an inversion: a paper ground (neutral-98 tinted
    // with primary-90), 40 tones for lines and a 30 tone as the strongest accent (`light` is
    // the highlight colour of either scheme). The host gives the area .theme-light.
    const p = read(['--sf-primary-40'], [0, 91, 190]);
    const s = read(['--sf-secondary-40'], [83, 94, 119]);
    const t = read(['--sf-tertiary-40'], [124, 76, 134]);
    const pDeep = read(['--sf-primary-90', '--sf-primary-95'], [215, 226, 255]);
    const light = read(['--sf-primary-30', '--sf-primary-20'], [0, 68, 148]);
    const paper = read(['--sf-neutral-98'], [250, 249, 254]);
    probe.remove();
    return {p, s, t, pDeep, light, bg: mixc(paper, pDeep, 0.16), paper: true};
  }
  const p = read(['--sf-primary-70', '--sf-primary-80'], [118, 150, 255]);
  const s = read(['--sf-secondary-70', '--sf-secondary-80'], [72, 214, 226]);
  const t = read(['--sf-tertiary-70', '--sf-tertiary-80'], [222, 122, 255]);
  const pDeep = read(['--sf-primary-20', '--sf-primary-30'], mixc(p, [0, 0, 0], 0.8));
  const light = read(['--sf-primary-90', '--sf-primary-95'], mixc(p, [255, 255, 255], 0.6));
  probe.remove();
  // Palette tones only, never theme roles: a tone keeps its value in both themes,
  // so this dark effect draws the same deep ground on a light or a dark page.
  // The host forces its area into .theme-dark for the text over it.
  const bg = mixc([5, 6, 11], pDeep, 0.22);
  return {p, s, t, pDeep, light, bg, paper: false};
}


// Smooth value noise in 0..1, from a seeded lattice.
const NP = new Uint8Array(512);
const NV = new Float32Array(256);
{
  const r = rng(1337);
  const a = Array.from({length: 256}, (_, i) => i);
  for (let i = 255; i > 0; i -= 1) { const j = (r() * (i + 1)) | 0; const k = a[i]; a[i] = a[j]; a[j] = k; }
  for (let i = 0; i < 512; i += 1) NP[i] = a[i & 255];
  for (let i = 0; i < 256; i += 1) NV[i] = r();
}
const noise2 = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const X = xi & 255, Y = yi & 255;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = NV[NP[NP[X] + Y]], b = NV[NP[NP[X + 1] + Y]], c = NV[NP[NP[X] + Y + 1]], d = NV[NP[NP[X + 1] + Y + 1]];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

const SETS = {hex: '0123456789ABCDEF', binary: '01', digits: '0123456789', symbols: '+-×÷=<>/\\|*#%&~^:;·°§'};

const FX = {
  seed: 83,
  t0: 10,
  settings: {speed: [100, 10, 300], density: [55, 10, 100], charset: 'hex', size: [14, 10, 24], interactive: true, scheme: 'dark'},
  init(env, rand) {
    const st = {rand, glow: 0};
    this.build(env, st);
    return st;
  },
  build(env, st) {
    const {S, w, h} = env;
    const chars = SETS[S.charset] || SETS.hex;
    const size = S.size, cw = Math.ceil(size * 0.78), ch = Math.ceil(size * 1.45);
    st.chars = chars; st.cw = cw; st.ch = ch;
    st.cols = Math.ceil(w / cw) + 1; st.rows = Math.ceil(h / ch) + 1;
    const n = st.cols * st.rows;
    st.glyph = new Int16Array(n);
    for (let i = 0; i < n; i += 1) st.glyph[i] = st.rand() * 100 < S.density ? (st.rand() * chars.length) | 0 : -1;
    this.theme(env, st);
  },
  atlas(env, st, colour) {
    const {dpr} = env;
    const c = document.createElement('canvas');
    c.width = Math.ceil(st.cw * dpr * st.chars.length); c.height = Math.ceil(st.ch * dpr);
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.font = `500 ${env.S.size}px ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = rgba(colour);
    for (let i = 0; i < st.chars.length; i += 1) g.fillText(st.chars[i], st.cw * (i + 0.5), st.ch * 0.52);
    return c;
  },
  theme(env, st) {
    const {C, canvas, dpr} = env;
    st.dim = this.atlas(env, st, vivid(mixc(C.p, C.light, 0.2), 1.3));
    // Dark: the swell lights glyphs up. Light: it inks them in, like a fresh impression on paper.
    st.lit = this.atlas(env, st, C.paper ? mixc(vivid(mixc(C.s, C.light, 0.5), 1.3), [0, 0, 0], 0.1)
      : mixc(vivid(mixc(C.s, C.p, 0.5), 1.5), [255, 255, 255], 0.25));
    // The resting field, redrawn per cell only when a glyph changes.
    st.base = document.createElement('canvas');
    st.base.width = canvas.width; st.base.height = canvas.height;
    st.bctx = st.base.getContext('2d');
    st.bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    st.bctx.globalAlpha = C.paper ? 0.12 : 0.14;
    for (let i = 0; i < st.glyph.length; i += 1) this.cell(env, st, i, false);
  },
  cell(env, st, i, clear) {
    const x = (i % st.cols) * st.cw, y = ((i / st.cols) | 0) * st.ch, g = st.glyph[i];
    if (clear) st.bctx.clearRect(x, y, st.cw, st.ch);
    if (g < 0) return;
    const d = env.dpr;
    st.bctx.drawImage(st.dim, g * st.cw * d, 0, st.cw * d, st.ch * d, x, y, st.cw, st.ch);
  },
  resize(env, st) { this.build(env, st); },
  update(env, st, before) {
    if (before.charset !== env.S.charset || before.size !== env.S.size || before.density !== env.S.density) this.build(env, st);
  },
  draw(env, st, time, dt) {
    const {ctx, w, h, S, C, dpr} = env;
    ctx.fillStyle = rgba(C.bg);
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(st.base, 0, 0, w, h);
    const on = S.interactive && env.pointer.on;
    st.glow += ((on ? 1 : 0) - st.glow) * Math.min(1, dt * 3);
    const mx = env.pointer.x * w, my = env.pointer.y * h;
    const {cols, rows, cw, ch, glyph} = st;
    const tt = time * 0.09;
    const change = dt * 0.35;
    for (let r = 0; r < rows; r += 1) {
      const y = r * ch;
      for (let c = 0; c < cols; c += 1) {
        const i = r * cols + c, g = glyph[i];
        if (g < 0) continue;
        const x = c * cw;
        // The tide: a broad diagonal swell broken up by noise, so it never reads as a stripe.
        const swell = Math.sin((x * 0.0021 + y * 0.0034) * 3.1 - tt * 2.4) * 0.5 + 0.5;
        let b = swell * swell * swell * noise2(x * 0.006 + tt, y * 0.009 - tt * 0.5) * 1.6 - 0.18;
        if (st.glow > 0.01) {
          const dx = (x - mx) / 150, dy = (y - my) / 150, d2 = dx * dx + dy * dy;
          if (d2 < 1) b += (1 - d2) * 0.75 * st.glow;
        }
        if (b <= 0.02) continue;
        if (change > 0 && st.rand() < change * b) {
          glyph[i] = (st.rand() * st.chars.length) | 0;
          this.cell(env, st, i, true);
        }
        ctx.globalAlpha = Math.min(C.paper ? 0.4 : 0.46, b * 0.55);
        ctx.drawImage(st.lit, glyph[i] * cw * dpr, 0, cw * dpr, ch * dpr, x, y, cw, ch);
      }
    }
    ctx.globalAlpha = 1;
  },
};

export function mount(host, settings = {}, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView || globalThis;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;inline-size:100%;block-size:100%;display:block;pointer-events:none';
  const oldPosition = host.style.position;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const norm = (v) => {
    const out = {};
    for (const [k, d] of Object.entries(FX.settings)) {
      const x = v && v[k];
      if (Array.isArray(d)) out[k] = Number.isFinite(+x) && x !== '' && x !== null && x !== undefined ? clamp(+x, d[1], d[2]) : d[0];
      else if (typeof d === 'boolean') out[k] = x === undefined || x === null ? d : x === true || x === 'true' || x === 1 || x === '1';
      else out[k] = typeof x === 'string' && x ? x : d;
    }
    return out;
  };
  const mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const env = {ctx, canvas, w: 1, h: 1, dpr: 1, S: norm({...settings, scheme: context.scheme}), C: null, still: false,
    pointer: {x: 0.5, y: 0.5, on: false}, q: 1, cost: 0};
  env.C = readTheme(host, env.S.scheme);
  env.still = context.reducedMotion === true || Boolean(mq && mq.matches);
  let state = null;
  let raf = 0;
  let last = 0;
  let t = FX.t0 || 0;
  let paused = false;
  let inView = true;
  let dead = false;
  let themeTimer = 0;
  const canRun = () => !dead && !paused && inView && !doc.hidden && !env.still && state !== null;
  const paint = (dt = 0) => {
    if (dead || doc.hidden || state === null) return;
    ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    FX.draw(env, state, t, dt);
  };
  const tick = (now) => {
    raf = 0;
    if (!canRun()) return;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * env.S.speed / 100;
    last = now;
    t += dt;
    const began = performance.now();
    paint(dt);
    // Graceful degradation: a per-pixel effect that keeps costing over 3 ms drops its resolution.
    env.cost = env.cost * 0.94 + (performance.now() - began) * 0.06;
    if (FX.adapt && env.cost > 3 && env.q > 0.3) { env.q *= 0.8; env.cost = 2; FX.adapt(env, state); }
    raf = win.requestAnimationFrame(tick);
  };
  const schedule = () => {
    if (raf || !canRun()) return;
    last = performance.now();
    raf = win.requestAnimationFrame(tick);
  };
  const halt = () => { if (raf) win.cancelAnimationFrame(raf); raf = 0; };
  const resize = () => {
    if (dead) return;
    const box = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(box.width)), h = Math.max(1, Math.round(box.height));
    const dpr = Math.min(win.devicePixelRatio || 1, 2);
    if (state !== null && w === env.w && h === env.h && dpr === env.dpr) return;
    env.w = w; env.h = h; env.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    if (state === null) state = FX.init(env, rng(FX.seed || 7));
    else if (FX.resize) FX.resize(env, state);
    paint();
    schedule();
  };
  const refreshTheme = () => {
    if (dead) return;
    env.C = readTheme(host, env.S.scheme);
    if (FX.theme && state !== null) FX.theme(env, state);
    paint();
  };
  const onVisibility = () => { if (doc.hidden) halt(); else { paint(); schedule(); } };
  const onMotion = () => {
    env.still = context.reducedMotion === true || Boolean(mq && mq.matches);
    if (env.still) { halt(); paint(); } else schedule();
  };
  const onPointer = (event) => {
    if (!env.S.interactive) return;
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return;
    env.pointer.x = (event.clientX - box.left) / box.width;
    env.pointer.y = (event.clientY - box.top) / box.height;
    env.pointer.on = env.pointer.x > -0.2 && env.pointer.x < 1.2 && env.pointer.y > -0.2 && env.pointer.y < 1.2;
  };
  const onLeave = (event) => { if (!event.relatedTarget) env.pointer.on = false; };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
    inView = entries[entries.length - 1].isIntersecting;
    if (inView) schedule(); else halt();
  }) : null;
  if (io) io.observe(host);
  const mo = new MutationObserver(() => { clearTimeout(themeTimer); themeTimer = setTimeout(refreshTheme, 60); });
  mo.observe(doc.documentElement, {attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-sf-theme']});
  if (doc.body) mo.observe(doc.body, {attributes: true, attributeFilter: ['class', 'data-theme', 'data-sf-theme']});
  doc.addEventListener('visibilitychange', onVisibility);
  if (mq && mq.addEventListener) mq.addEventListener('change', onMotion);
  win.addEventListener('pointermove', onPointer, {passive: true});
  win.addEventListener('pointerout', onLeave, {passive: true});
  resize();
  return {
    update(next = {}, context = {}) {
      if (dead) return;
      const before = env.S;
      env.S = norm({...next, scheme: context.scheme ?? env.S.scheme});
      env.C = readTheme(host, env.S.scheme);
      if (FX.update && state !== null) FX.update(env, state, before);
      if (FX.theme && state !== null) FX.theme(env, state);
      if (!env.S.interactive) env.pointer.on = false;
      paint();
      schedule();
    },
    refreshTheme,
    pause() { paused = true; halt(); },
    resume() { paused = false; schedule(); },
    destroy() {
      if (dead) return;
      dead = true;
      halt();
      clearTimeout(themeTimer);
      ro.disconnect();
      if (io) io.disconnect();
      mo.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onMotion);
      win.removeEventListener('pointermove', onPointer);
      win.removeEventListener('pointerout', onLeave);
      canvas.width = canvas.height = 0;
      canvas.remove();
      host.style.position = oldPosition;
      state = null;
    },
  };
}
