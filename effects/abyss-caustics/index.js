// Abyss caustics (simai.effect 1.1.0, dark set): a 2D-canvas "shader" computed at low resolution --
// warped interfering waves whose zero lines form a moving caustic net -- scaled up over deep water,
// with soft light shafts from above and slow rising motes.

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


const SIN = new Float32Array(4096);
for (let i = 0; i < 4096; i += 1) SIN[i] = Math.sin((i / 4096) * Math.PI * 2);
const fsin = (x) => SIN[(x * 651.8986) & 4095];

const FX = {
  seed: 71,
  t0: 25,
  settings: {speed: [100, 10, 300], intensity: [30, 10, 100], scale: [50, 20, 100], rays: true, interactive: true},
  init(env, rand) {
    const st = {rand, buf: null, img: null, lx: 0.5,
      motes: Array.from({length: 46}, () => ({x: rand(), y: rand(), s: 0.4 + rand() * 1.1, v: 0.004 + rand() * 0.01, ph: rand() * 6.28}))};
    this.resize(env, st);
    return st;
  },
  resize(env, st) {
    const k = Math.sqrt((env.w * env.h) / (28000 * env.q));
    const bw = Math.max(8, Math.ceil(env.w / k)), bh = Math.max(8, Math.ceil(env.h / k));
    st.buf = document.createElement('canvas');
    st.buf.width = bw; st.buf.height = bh;
    st.bctx = st.buf.getContext('2d');
    st.img = st.bctx.createImageData(bw, bh);
    st.k = k;
  },
  adapt(env, st) { this.resize(env, st); },
  draw(env, st, time, dt) {
    const {ctx, w, h, S, C} = env;
    const {img, buf} = st;
    const bw = buf.width, bh = buf.height, d = img.data;
    const gain = S.intensity / 100;
    const target = S.interactive && env.pointer.on ? env.pointer.x : 0.5;
    st.lx += (target - st.lx) * Math.min(1, dt * 0.8);
    // World units: the caustic pattern repeats every 660..1300 css px.
    const unit = (st.k * 6.2832) / (500 + S.scale * 8);
    const T = time * 0.35 + 23;
    const top = mixc(C.bg, vivid(C.s, 1.3), 0.2), low = mixc(C.bg, C.pDeep, 0.25);
    const lite = vivid(mixc(mixc(C.s, C.p, 0.5), C.light, 0.4), 1.5);
    const shift = (st.lx - 0.5) * 2;
    let o = 0;
    for (let y = 0; y < bh; y += 1) {
      const fy = y / bh;
      const depth = 1 - fy * 0.7;
      const br = top[0] + (low[0] - top[0]) * fy, bg = top[1] + (low[1] - top[1]) * fy, bb = top[2] + (low[2] - top[2]) * fy;
      const Y = y * unit;
      for (let x = 0; x < bw; x += 1) {
        const X = x * unit + shift * fy;
        // The classic iterated water caustic: four warps, each adding light where the warp folds.
        // A slow warp at frequencies that do not divide the period hides the pattern's tiling.
        const px = X + 0.7 * fsin(Y * 0.37 + T * 0.13) - 250, py = Y + 0.7 * fsin(X * 0.29 - T * 0.11) - 250;
        let ix = px, iy = py, c = 1;
        for (let n = 0; n < 4; n += 1) {
          const tn = T * (1 - 3.5 / (n + 1));
          const nx = px + fsin(tn - ix + 1.5708) + fsin(tn + iy);
          const ny = py + fsin(tn - iy) + fsin(tn + ix + 1.5708);
          ix = nx; iy = ny;
          const sx = fsin(ix + tn), sy = fsin(iy + tn + 1.5708);
          const ax = (px * 0.005) / sx, ay = (py * 0.005) / sy;
          c += 1 / Math.sqrt(ax * ax + ay * ay);
        }
        c = 1.17 - (c / 4) ** 1.4;
        let v = c < 0 ? -c : c;
        v *= v; v *= v; v *= v;
        const l = Math.min(0.8, v * gain * 1.5 * depth);
        d[o] = br + (lite[0] - br) * l; d[o + 1] = bg + (lite[1] - bg) * l; d[o + 2] = bb + (lite[2] - bb) * l; d[o + 3] = 255;
        o += 4;
      }
    }
    st.bctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(buf, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    if (S.rays) {
      // Light shafts from beyond the top edge, swaying slowly.
      for (let i = 0; i < 5; i += 1) {
        const cx = w * (0.1 + i * 0.2 + 0.05 * Math.sin(time * 0.07 + i * 1.7)) + shift * w * 0.08;
        const top0 = w * (0.025 + 0.015 * Math.sin(time * 0.05 + i));
        const lean = w * (0.12 + 0.03 * i) * (i % 2 ? 1 : -0.6);
        const g = ctx.createLinearGradient(0, 0, 0, h * 0.9);
        g.addColorStop(0, rgba(lite, 0.07 * gain * (0.6 + 0.4 * Math.sin(time * 0.11 + i * 2.1))));
        g.addColorStop(1, rgba(lite, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - top0, 0); ctx.lineTo(cx + top0, 0);
        ctx.lineTo(cx + lean + top0 * 4, h * 0.9); ctx.lineTo(cx + lean - top0 * 4, h * 0.9);
        ctx.fill();
      }
    }
    ctx.fillStyle = rgba(lite, 0.35);
    ctx.beginPath();
    for (const m of st.motes) {
      m.y -= m.v * dt;
      if (m.y < -0.02) m.y += 1.04;
      const x = (m.x + 0.01 * Math.sin(time * 0.3 + m.ph)) * w, y = m.y * h;
      ctx.moveTo(x + m.s, y); ctx.arc(x, y, m.s, 0, 6.2832);
    }
    ctx.fill();
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
