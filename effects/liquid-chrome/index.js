// Liquid metal (simai.effect 1.0.0, dark set): a slow molten surface that mirrors a dark studio
// lit by a few long strip lights in the theme's colours. A height field is sampled in a small
// buffer, its slope picks the reflected colour from a lookup table, and the buffer is stretched.

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


const N = 16384, SIN = new Float32Array(N);
for (let i = 0; i < N; i += 1) SIN[i] = Math.sin((i / N) * Math.PI * 2);
const K = N / (Math.PI * 2);
const S = (v) => SIN[(v * K) & (N - 1)];
const E = 256;

const FX = {
  seed: 17,
  t0: 30,
  settings: {speed: [100, 10, 300], intensity: [60, 10, 100], scale: [3, 1, 5], interactive: true},
  init(env, rand) {
    const st = {px: 0, py: 0, pk: 0};
    this.resize(env, st);
    return st;
  },
  resize(env, st) {
    const {w, h} = env;
    // About 60 000 samples at full quality, fewer as the adaptive quality drops.
    const cell = Math.max(2, Math.sqrt((w * h) / (60000 * env.q)));
    st.bw = Math.max(8, Math.round(w / cell)); st.bh = Math.max(8, Math.round(h / cell));
    st.buf = document.createElement('canvas');
    st.buf.width = st.bw; st.buf.height = st.bh;
    st.bctx = st.buf.getContext('2d');
    st.img = st.bctx.createImageData(st.bw, st.bh);
    st.hf = new Float32Array((st.bw + 2) * (st.bh + 2));
    st.cw = new Float32Array(st.bw + 2); st.rw = new Float32Array(st.bh + 2);
    this.theme(env, st);
  },
  adapt(env, st) { this.resize(env, st); },
  update(env, st) { this.theme(env, st); },
  // The metal's light, looked up by slope: a soft key light gives the folds their gradient, two
  // small hard lights put narrow highlights on their crests. Flat metal stays dark.
  theme(env, st) {
    const {C} = env, I = env.S.intensity / 60;
    const black = mixc(C.bg, [0, 0, 0], 0.5), metal = mixc(C.bg, vivid(mixc(C.p, C.s, 0.3), 1.5), 0.32);
    const hot = mixc(C.light, [255, 255, 255], 0.35), warm = vivid(C.t, 1.8), cool = vivid(C.p, 1.8);
    const lut = new Uint8ClampedArray(E * E * 3);
    const g = (dx, dy, wd) => Math.exp(-(dx * dx + dy * dy) / (wd * wd));
    for (let j = 0; j < E; j += 1) {
      for (let i = 0; i < E; i += 1) {
        const rx = (i / (E - 1)) * 2 - 1, ry = (j / (E - 1)) * 2 - 1;
        const dif = clamp(0.5 - 0.62 * (rx * 0.55 + ry * 0.83), 0, 1) ** 2.4;
        let c = mixc(black, metal, dif * (0.6 + 0.4 * I));
        const k1 = g(rx + 0.36, ry + 0.52, 0.075) * 0.5 * I, k2 = g(rx - 0.58, ry - 0.3, 0.11) * 0.32 * I;
        const k3 = g(rx + 0.62, ry - 0.42, 0.13) * 0.26 * I;
        c = [0, 1, 2].map((n) => c[n] + hot[n] * k1 + warm[n] * k2 + cool[n] * k3);
        const o = (j * E + i) * 3;
        lut[o] = c[0]; lut[o + 1] = c[1]; lut[o + 2] = c[2];
      }
    }
    st.lut = lut;
  },
  draw(env, st, t) {
    const {ctx, w, h, S: set} = env;
    const {bw, bh, hf, cw, rw, img, lut} = st;
    const W = bw + 2;
    const sc = (0.75 + set.scale * 0.45) / Math.min(bw, bh) * 2.4;
    for (let x = 0; x < W; x += 1) cw[x] = 0.6 * S((x - 1) * sc * 0.8 - t * 0.11) ;
    for (let y = 0; y < bh + 2; y += 1) rw[y] = 0.6 * S((y - 1) * sc * 0.9 + t * 0.13);
    // The pointer presses a soft dent into the surface.
    const on = set.interactive && env.pointer.on;
    st.pk += ((on ? 1 : 0) - st.pk) * 0.05;
    if (on) { st.px += (env.pointer.x * bw - st.px) * 0.08; st.py += (env.pointer.y * bh - st.py) * 0.08; }
    const R = Math.min(bw, bh) * 0.16, R2 = R * R;
    const t1 = t * 0.21, t2 = t * 0.17, t3 = t * 0.29, t4 = t * 0.23;
    let i = 0;
    for (let y = 0; y < bh + 2; y += 1) {
      const Y = (y - 1) * sc, ry = rw[y], dy2 = (y - 1 - st.py) ** 2;
      for (let x = 0; x < W; x += 1, i += 1) {
        const wx = (x - 1) * sc + ry, wy = Y + cw[x];
        const q = 0.7 * S(wx * 0.9 - wy * 1.2 + t2);
        let v = S(wx * 1.3 + q + t1) + S(wy * 1.6 - q - t2) + 0.55 * S((wx + wy) * 2.1 + t3) + 0.18 * S((wx - wy) * 3.3 - t4);
        if (st.pk > 0.01) {
          const d = ((x - 1 - st.px) ** 2 + dy2) / R2;
          if (d < 1) v -= 1.6 * st.pk * (1 - d) * (1 - d);
        }
        hf[i] = v;
      }
    }
    const G = 0.26 / sc;
    const data = img.data;
    let o = 0;
    for (let y = 1; y <= bh; y += 1) {
      const row = y * W;
      for (let x = 1; x <= bw; x += 1, o += 4) {
        const k = row + x;
        let nx = (hf[k + 1] - hf[k - 1]) * G, ny = (hf[k + W] - hf[k - W]) * G;
        nx /= 1 + (nx < 0 ? -nx : nx); ny /= 1 + (ny < 0 ? -ny : ny);
        const l = ((((ny + 1) * 0.5 * (E - 1) + 0.5) | 0) * E + (((nx + 1) * 0.5 * (E - 1) + 0.5) | 0)) * 3;
        data[o] = lut[l]; data[o + 1] = lut[l + 1]; data[o + 2] = lut[l + 2]; data[o + 3] = 255;
      }
    }
    st.bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(st.buf, 0, 0, w, h);
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
