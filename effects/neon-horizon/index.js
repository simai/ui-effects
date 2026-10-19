// Neon horizon (simai.effect 1.0.0, dark set): a perspective grid floor glides towards the viewer under
// a glowing horizon and a sparse star sky; lines fade into the distance like fog.

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


const FX = {
  seed: 61,
  t0: 0,
  settings: {speed: [100, 10, 300], intensity: [60, 10, 100], horizon: [42, 20, 70], interactive: true},
  init(env, rand) {
    const st = {rand, vx: 0.5, stars: null};
    this.resize(env, st);
    return st;
  },
  resize(env, st) {
    const c = document.createElement('canvas');
    c.width = env.canvas.width; c.height = env.canvas.height;
    const g = c.getContext('2d');
    const r = rng(3);
    for (let i = 0, n = Math.round(env.w * env.h / 2200); i < n; i += 1) {
      const y = r() * c.height;
      g.fillStyle = rgba([226, 230, 250], (0.1 + r() * r() * 0.6) * (1 - y / c.height * 0.6));
      const s = (r() > 0.95 ? 1.6 : 1) * env.dpr;
      g.fillRect(r() * c.width, y, s, s);
    }
    st.stars = c;
  },
  draw(env, st, time, dt) {
    const {ctx, w, h, S, C} = env;
    const gain = S.intensity / 100;
    const hy = Math.round(h * S.horizon / 100);
    const target = S.interactive && env.pointer.on ? 0.5 + (env.pointer.x - 0.5) * 0.35 : 0.5;
    st.vx += (target - st.vx) * Math.min(1, dt * 1.2);
    const vx = st.vx * w;
    const glowC = vivid(mixc(C.t, C.p, 0.35), 1.5);
    const lineC = vivid(mixc(C.p, C.s, 0.4), 1.5);
    // Sky, with stars only above the horizon.
    const sky = ctx.createLinearGradient(0, 0, 0, hy);
    sky.addColorStop(0, rgba(C.bg));
    sky.addColorStop(1, rgba(mixc(C.bg, C.pDeep, 0.7)));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, hy);
    const sh = hy * env.dpr;
    if (sh > 1) ctx.drawImage(st.stars, 0, 0, st.stars.width, Math.min(sh, st.stars.height), 0, 0, w, Math.min(hy, h));
    // Floor.
    const floor = ctx.createLinearGradient(0, hy, 0, h);
    floor.addColorStop(0, rgba(mixc(C.bg, C.pDeep, 0.8)));
    floor.addColorStop(1, rgba(C.bg));
    ctx.fillStyle = floor;
    ctx.fillRect(0, hy, w, h - hy);
    // Horizon glow: a flattened radial light sitting on the horizon line.
    ctx.globalCompositeOperation = 'lighter';
    ctx.save();
    ctx.translate(vx, hy);
    ctx.scale(1, 0.22);
    const R = w * 0.75;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    glow.addColorStop(0, rgba(glowC, 0.42 * gain));
    glow.addColorStop(0.4, rgba(glowC, 0.12 * gain));
    glow.addColorStop(1, rgba(glowC, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(-R, -R, R * 2, R * 2);
    ctx.restore();
    // Grid lines: one stroke style that fades out towards the horizon.
    const fade = ctx.createLinearGradient(0, hy, 0, h);
    fade.addColorStop(0, rgba(lineC, 0));
    fade.addColorStop(0.25, rgba(lineC, 0.22 * gain));
    fade.addColorStop(1, rgba(lineC, 0.6 * gain));
    ctx.beginPath();
    const depth = h - hy;
    const off = (time * 0.32) % 1;
    for (let n = 0; n < 80; n += 1) {
      const z = 0.25 + (n + 1 - off) * 0.3;
      const y = hy + depth * 0.55 / z;
      if (y > h + 2) continue;
      if (y - hy < 1.2) break;
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    const sp = Math.max(w, 700) * 0.09;
    for (let k = -24; k <= 24; k += 1) { ctx.moveTo(vx, hy); ctx.lineTo(vx + k * sp * 3, hy + depth * 3); }
    ctx.strokeStyle = fade;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    // The horizon itself: a thin bright line.
    const edge = ctx.createLinearGradient(0, 0, w, 0);
    edge.addColorStop(0, rgba(glowC, 0));
    edge.addColorStop(clamp(st.vx, 0.2, 0.8), rgba(mixc(glowC, [255, 255, 255], 0.3), 0.7 * gain));
    edge.addColorStop(1, rgba(glowC, 0));
    ctx.fillStyle = edge;
    ctx.fillRect(0, hy - 0.75, w, 1.5);
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
