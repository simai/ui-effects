// Aurora curtain (simai.effect 1.0.0, dark set): light curtains hanging from a slowly folding ribbon,
// drawn as thin vertical strokes from one gradient sprite per curtain, added onto a deep sky.

// ---- runtime shared by the dark set (simai.effect 1.0.0) ----
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
function readTheme(host) {
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
  return {p, s, t, pDeep, light, bg};
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

const FX = {
  seed: 11,
  t0: 40,
  settings: {speed: [100, 10, 300], intensity: [40, 10, 100], curtains: [3, 1, 4], interactive: true},
  init(env, rand) {
    const st = {rand, stars: null, sprites: [], sway: 0};
    this.resize(env, st);
    return st;
  },
  resize(env, st) {
    // A faint fixed star field behind the light, drawn once per size.
    const c = document.createElement('canvas');
    c.width = env.canvas.width; c.height = env.canvas.height;
    const g = c.getContext('2d');
    const r = rng(5);
    const n = Math.round(env.w * env.h / 2600);
    for (let i = 0; i < n; i += 1) {
      const a = 0.12 + r() * r() * 0.5;
      g.fillStyle = rgba(r() > 0.8 ? env.C.light : [225, 230, 245], a);
      const s = (r() > 0.94 ? 1.5 : 0.9) * env.dpr;
      g.fillRect(r() * c.width, r() * c.height, s, s);
    }
    st.stars = c;
    this.theme(env, st);
  },
  theme(env, st) {
    // One tall sprite per curtain: a bright lower hem, colour rising into the sky and fading out.
    const {p, s, t, light} = env.C;
    const sets = [[vivid(s), vivid(p), vivid(t)], [vivid(p), vivid(s), vivid(t)], [vivid(mixc(s, light, 0.3)), vivid(t), vivid(p)], [vivid(t), vivid(p), vivid(s)]];
    st.sprites = sets.map(([hem, mid, top]) => {
      const c = document.createElement('canvas');
      c.width = 1; c.height = 256;
      const g = c.getContext('2d');
      const grad = g.createLinearGradient(0, 256, 0, 0);
      grad.addColorStop(0, rgba(hem, 0));
      grad.addColorStop(0.16, rgba(mixc(hem, [255, 255, 255], 0.2), 0.95));
      grad.addColorStop(0.32, rgba(hem, 0.6));
      grad.addColorStop(0.55, rgba(mid, 0.32));
      grad.addColorStop(1, rgba(top, 0));
      g.fillStyle = grad;
      g.fillRect(0, 0, 1, 256);
      return c;
    });
  },
  draw(env, st, time) {
    const {ctx, w, h, S, C} = env;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, rgba(C.bg));
    sky.addColorStop(1, rgba(mixc(C.bg, C.pDeep, 0.35)));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(st.stars, 0, 0, w, h);
    const target = S.interactive && env.pointer.on ? (env.pointer.x - 0.5) * 2 : 0;
    st.sway += (target - st.sway) * 0.02;
    ctx.globalCompositeOperation = 'lighter';
    const n = Math.round(S.curtains);
    const step = w > 900 ? 3 : 2;
    const gain = S.intensity / 100;
    for (let i = 0; i < n; i += 1) {
      const sprite = st.sprites[i % st.sprites.length];
      const base = h * (n === 1 ? 0.55 : 0.3 + (0.52 * i) / (n - 1));
      const k = i * 17.3;
      const tt = time * 0.05;
      for (let x = -step; x < w + step; x += step) {
        const u = x / Math.max(w, 600);
        // The ribbon folds: a slow wave plus noise; the hem rises and falls with it.
        const fold = noise2(u * 2.2 + tt + k + st.sway * 0.4, tt * 0.7 + k);
        const y = base + (fold - 0.5) * h * 0.34 + Math.sin(u * 5 + tt * 3 + i) * h * 0.04;
        const len = h * (0.18 + 0.32 * noise2(u * 5 + k, tt * 1.4));
        const rays = noise2(u * 38 + k, tt * 2.2);
        const patch = noise2(u * 1.7 + k - tt * 0.5, k + tt * 0.3);
        const lit = patch < 0.3 ? 0 : patch > 0.75 ? 1 : (patch - 0.3) / 0.45;
        const a = gain * 0.62 * (0.06 + rays * rays * 1.7) * lit * lit;
        if (a < 0.01) continue;
        ctx.globalAlpha = Math.min(0.85, a);
        ctx.drawImage(sprite, x - step * 0.4, y - len, step * 1.8, len * 1.2);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
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
  const env = {ctx, canvas, w: 1, h: 1, dpr: 1, S: norm(settings), C: readTheme(host), still: false,
    pointer: {x: 0.5, y: 0.5, on: false}, q: 1, cost: 0};
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
    env.C = readTheme(host);
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
    update(next = {}) {
      if (dead) return;
      const before = env.S;
      env.S = norm(next);
      env.C = readTheme(host);
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
