// Rain on glass (simai.effect 1.0.0, dark set): a night city out of focus behind a wet window.
// Each droplet is a lens holding the lights above it; larger drops slide down and wipe a track.

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


const layer = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };
const TAU = Math.PI * 2;

const FX = {
  seed: 53,
  t0: 4,
  settings: {speed: [100, 10, 300], density: [55, 10, 100], lights: [60, 10, 100], interactive: true},
  init(env, rand) {
    const st = {rand, wait: 1, spawn: 0, px: -1e3, py: -1e3};
    this.build(env, st);
    return st;
  },
  build(env, st) {
    const {w, h, S} = env, r = st.rand, area = w * h;
    // City lights out of focus, a little denser and larger low in the frame.
    st.lights = [];
    const nl = Math.round(clamp(area / 7000, 45, 170) * S.lights / 60), u = Math.sqrt(Math.min(w, 1600) / 1440 + 0.15);
    for (let i = 0; i < nl; i += 1) {
      const y = h * (1.05 - r() ** 1.3 * 1.1), k = r() ** 2.2, low = clamp(y / h, 0, 1);
      st.lights.push({x: r() * w, y, rad: (5 + k * 60) * (0.55 + low * 0.6) * u, tone: r(),
        a: (0.8 - k ** 0.5 * 0.6) * (0.6 + low * 0.5), g: r() < 0.5 ? 0 : 1});
    }
    st.drops = [];
    const nd = Math.round(area / 700 * S.density / 55);
    for (let i = 0, k; i < nd; i += 1) k = r(), st.drops.push({x: r() * w, y: r() * h, r: k < 0.65 ? 0.6 + k * 2.2 : 2 + (k - 0.65) ** 1.4 * 18});
    st.sliders = [];
    this.theme(env, st);
  },
  resize(env, st) { this.build(env, st); },
  update(env, st, before) { if (before.density !== env.S.density || before.lights !== env.S.lights) this.build(env, st); },
  theme(env, st) {
    const {w, h, dpr, C} = env, W = Math.round(w * dpr), H = Math.round(h * dpr);
    const bg = layer(W, H), g = bg.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const grd = g.createLinearGradient(0, 0, 0, h);
    [[0, C.bg], [0.55, mixc(C.bg, C.pDeep, 0.2)], [1, mixc(C.bg, mixc(C.pDeep, C.t, 0.3), 0.4)]].forEach(([o, c]) => grd.addColorStop(o, rgba(c)));
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
    const tones = [C.p, C.s, C.t, mixc(C.p, C.t, 0.5)].map((c) => vivid(c, 2.1));
    // Two groups of lights breathe in turn; soft anyway, so they are kept at half resolution.
    st.groups = [0, 1].map((gi) => {
      const c = layer(Math.ceil(w / 2), Math.ceil(h / 2)), x = c.getContext('2d');
      x.scale(0.5, 0.5);
      x.globalCompositeOperation = 'lighter';
      for (const l of st.lights) {
        if (l.g !== gi) continue;
        const col = tones[l.tone < 0.45 ? 0 : l.tone < 0.62 ? 1 : l.tone < 0.82 ? 2 : 3];
        const rg = x.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.rad);
        [[0, 0.75], [0.82, 1], [0.9, 0.9], [1, 0]].forEach(([o, a]) => rg.addColorStop(o, rgba(col, l.a * a)));
        x.fillStyle = rg;
        x.beginPath(); x.arc(l.x, l.y, l.rad, 0, TAU); x.fill();
      }
      return c;
    });
    // A small colour map of the lights: each drop shows the lights it refracts.
    const mx = layer(48, 30).getContext('2d', {willReadFrequently: true});
    mx.drawImage(bg, 0, 0, 48, 30);
    for (const c of st.groups) mx.drawImage(c, 0, 0, 48, 30);
    st.map = mx.getImageData(0, 0, 48, 30).data;
    st.bg = bg;
    st.glass = layer(W, H);
    const gl = st.glass.getContext('2d');
    gl.scale(dpr, dpr);
    for (const d of st.drops) this.paint(env, st, gl, d.x, d.y, d.r);
  },
  // A drop is a small lens: it gathers the light from above it (the image flips), with a dark rim and a glint.
  paint(env, st, g, x, y, r) {
    const i = (clamp(((y - r * 6 - 30) / env.h) * 30 | 0, 0, 29) * 48 + clamp((x / env.w) * 48 | 0, 0, 47)) * 4;
    const inside = mixc(vivid([st.map[i], st.map[i + 1], st.map[i + 2]], 1.8).map((v) => Math.min(255, v * 2.6 + 6)), env.C.light, 0.2);
    const lens = g.createLinearGradient(x, y - r, x, y + r);
    [[0, mixc(inside, [0, 0, 0], 0.55), 0.55], [0.7, inside, 0.55], [1, mixc(inside, [255, 255, 255], 0.3), 0.75]].forEach(([o, c, a]) => lens.addColorStop(o, rgba(c, a)));
    g.fillStyle = lens;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    if (r > 1.4) {
      g.strokeStyle = 'rgba(0,0,0,.28)';
      g.lineWidth = Math.min(1.2, r * 0.25);
      g.beginPath(); g.arc(x, y, r, 3.6, 5.8); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath(); g.arc(x - r * 0.35, y - r * 0.4, Math.max(0.5, r * 0.18), 0, TAU); g.fill();
    }
  },
  launch(st, x, y) { if (st.sliders.length < 10) st.sliders.push({x, y, r: 3 + st.rand() * 2.6, v: 0, stick: 0, wob: st.rand() * 9}); },
  step(env, st, dt) {
    const {w, h, S, pointer: p} = env, r = st.rand;
    const gl = st.glass.getContext('2d');
    gl.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
    st.wait -= dt;
    if (st.wait <= 0) { st.wait = (1.2 + r() * 2.6) * 1400 / Math.max(500, w); this.launch(st, r() * w, r() * h * 0.7); }
    // A moving pointer shakes drops loose.
    if (S.interactive && p.on && Math.hypot(p.x * w - st.px, p.y * h - st.py) > 40) this.launch(st, st.px = p.x * w, st.py = p.y * h);
    // As many new drops settle on the glass as the tracks wiped away.
    for (; st.spawn >= 1; st.spawn -= 1) this.paint(env, st, gl, r() * w, r() * h, 0.6 + r() * 1.6);
    gl.lineCap = 'round';
    for (let i = st.sliders.length - 1; i >= 0; i -= 1) {
      const d = st.sliders[i];
      // Stick and slip: a drop waits, runs, then catches again.
      if (d.stick > 0) d.stick -= dt;
      else if (r() < dt * 0.6) { d.stick = 0.2 + r() * 0.9; d.v = 8; }
      else d.v = Math.min(140, d.v + dt * 160);
      const dy = d.v * dt;
      if (dy > 0) {
        d.wob += dy * 0.015;
        const nx = d.x + Math.sin(d.wob) * dy * 0.1;
        gl.globalCompositeOperation = 'destination-out';
        gl.lineWidth = d.r * 2.1;
        st.spawn += d.r * 2.1 * dy * st.drops.length / (w * h);
        gl.beginPath(); gl.moveTo(d.x, d.y); gl.lineTo(nx, d.y + dy); gl.stroke();
        gl.globalCompositeOperation = 'source-over';
        // The wet track keeps a faint sheen.
        gl.strokeStyle = rgba(env.C.light, 0.035);
        gl.lineWidth = d.r;
        gl.stroke();
        if (r() < dy * 0.05) this.paint(env, st, gl, d.x + (r() - 0.5) * d.r, d.y - d.r * 1.5, 0.6 + r() * 0.9);
        d.x = nx; d.y += dy;
      }
      if (d.y - d.r > h) st.sliders.splice(i, 1);
    }
  },
  draw(env, st, time, dt) {
    const {ctx, w, h} = env;
    if (dt > 0) this.step(env, st, dt);
    const k = 0.5 + 0.5 * Math.sin(time * 0.55);
    ctx.drawImage(st.bg, 0, 0, w, h);
    st.groups.forEach((c, i) => { ctx.globalAlpha = i ? 1 - 0.4 * k : 0.6 + 0.4 * k; ctx.drawImage(c, 0, 0, w, h); });
    ctx.globalAlpha = 1;
    ctx.drawImage(st.glass, 0, 0, w, h);
    for (const d of st.sliders) this.paint(env, st, ctx, d.x, d.y, d.r);
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
    pointer: {x: 0.5, y: 0.5, on: false}};
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
    paint(dt);
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
