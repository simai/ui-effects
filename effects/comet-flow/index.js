// Comet flow (simai.effect 1.1.0, dark set): glowing particles follow a slowly changing noise flow field
// and keep a short history of where they were, drawn as tails that fade towards the end.

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
  seed: 41,
  t0: 20,
  settings: {speed: [100, 10, 300], density: [55, 10, 100], trail: [70, 20, 95], turbulence: [50, 0, 100], interactive: true},
  init(env, rand) {
    const st = {rand, n: 0, len: 0, head: 0, acc: 0, x: null, y: null, life: null, tone: null, hist: null};
    this.populate(env, st);
    return st;
  },
  populate(env, st) {
    const n = Math.min(700, Math.round(env.w * env.h / 3600 * env.S.density / 55));
    const len = Math.round(4 + (env.S.trail - 20) / 75 * 22);
    Object.assign(st, {n, len, head: 0, x: new Float32Array(n), y: new Float32Array(n), life: new Float32Array(n),
      tone: new Uint8Array(n), hist: new Float32Array(n * len * 2)});
    for (let i = 0; i < n; i += 1) { this.spawn(env, st, i); st.life[i] = st.rand() * 6; }
    for (let k = 0; k < len * 3; k += 1) this.step(env, st, 1 / 20, FX.t0 - 2 + k / 20);
  },
  spawn(env, st, i) {
    const r = st.rand;
    st.x[i] = r() * env.w; st.y[i] = r() * env.h;
    st.life[i] = 3 + r() * 6;
    st.tone[i] = r() < 0.6 ? 0 : r() < 0.6 ? 1 : 2;
    for (let k = 0; k < st.len; k += 1) { st.hist[(i * st.len + k) * 2] = st.x[i]; st.hist[(i * st.len + k) * 2 + 1] = st.y[i]; }
  },
  resize(env, st) { this.populate(env, st); },
  update(env, st, before) { if (before.density !== env.S.density || before.trail !== env.S.trail) this.populate(env, st); },
  step(env, st, dt, time) {
    const {w, h, S} = env;
    const f = 0.0012 + 0.0042 * S.turbulence / 100;
    const on = S.interactive && env.pointer.on;
    const mx = env.pointer.x * w, my = env.pointer.y * h;
    const tz = time * 0.025;
    for (let i = 0; i < st.n; i += 1) {
      let x = st.x[i], y = st.y[i];
      // Curl of the noise: a flow without sinks, so particles never pile up.
      const u = x * f + tz, v = y * f - tz * 0.7;
      const cx = noise2(u, v + 0.35) - noise2(u, v - 0.35), cy = noise2(u - 0.35, v) - noise2(u + 0.35, v);
      const m = Math.hypot(cx, cy) + 1e-6, sp = 58 * clamp(m * 2.2, 0.35, 1.4);
      let vx = (cx / m) * sp, vy = (cy / m) * sp;
      if (on) {
        const dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
        if (d2 < 40000) { const k = (1 - d2 / 40000) * 2.2; vx += -dy * k; vy += dx * k; }
      }
      x += vx * dt; y += vy * dt;
      st.life[i] -= dt;
      st.x[i] = x; st.y[i] = y;
      if (st.life[i] <= 0 || x < -20 || y < -20 || x > w + 20 || y > h + 20) this.spawn(env, st, i);
    }
    st.acc += dt;
    if (st.acc >= 1 / 20) {
      st.acc = 0;
      st.head = (st.head + 1) % st.len;
      for (let i = 0; i < st.n; i += 1) { const o = (i * st.len + st.head) * 2; st.hist[o] = st.x[i]; st.hist[o + 1] = st.y[i]; }
    }
  },
  draw(env, st, time, dt) {
    const {ctx, w, h, C} = env;
    if (dt > 0) this.step(env, st, dt, time);
    const g = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.9);
    g.addColorStop(0, rgba(mixc(C.bg, C.pDeep, 0.5)));
    g.addColorStop(1, rgba(C.bg));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const tones = [vivid(mixc(C.p, C.light, 0.2)), vivid(mixc(C.s, C.light, 0.2)), vivid(mixc(C.t, C.light, 0.2))];
    const {len, n, hist, head} = st;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.3;
    // Segment k joins history k and k+1 counted back from the head; older segments are fainter.
    for (let k = 0; k < len - 1; k += 1) {
      const fade = 1 - k / (len - 1);
      const s0 = (head - k + len) % len, s1 = (head - k - 1 + len) % len;
      for (let tone = 0; tone < 3; tone += 1) {
        ctx.strokeStyle = rgba(tones[tone], 0.62 * fade * fade);
        ctx.beginPath();
        for (let i = 0; i < n; i += 1) {
          if (st.tone[i] !== tone) continue;
          const a = (i * len + s0) * 2, b = (i * len + s1) * 2;
          const dx = hist[a] - hist[b], dy = hist[a + 1] - hist[b + 1];
          if (dx * dx + dy * dy > 900) continue;
          ctx.moveTo(hist[a], hist[a + 1]);
          ctx.lineTo(hist[b], hist[b + 1]);
        }
        ctx.stroke();
      }
    }
    ctx.fillStyle = rgba(mixc(C.light, [255, 255, 255], 0.5), 0.85);
    ctx.beginPath();
    for (let i = 0; i < n; i += 1) { ctx.moveTo(st.x[i] + 1.3, st.y[i]); ctx.arc(st.x[i], st.y[i], 1.3, 0, 6.2832); }
    ctx.fill();
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
