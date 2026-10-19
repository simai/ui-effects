// Constellations (simai.effect 1.0.0; schemes dark and light): stars in three depth layers drift slowly and link to
// their near neighbours with faint lines; nearer layers move more, and follow the pointer in parallax.

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


const FX = {
  seed: 23,
  t0: 0,
  settings: {speed: [100, 10, 300], density: [55, 10, 100], linkDistance: [120, 60, 220], interactive: true, scheme: 'dark'},
  init(env, rand) {
    const st = {rand, stars: [], px: 0, py: 0, glow: null, cells: new Map()};
    this.populate(env, st);
    this.theme(env, st);
    return st;
  },
  populate(env, st) {
    const r = st.rand;
    // Fine dust far behind the network, drawn once per size.
    const dust = document.createElement('canvas');
    dust.width = env.canvas.width; dust.height = env.canvas.height;
    const g = dust.getContext('2d');
    // Dark: pale dust. Light: fine ink specks, fainter, as on a printed star atlas.
    const speck = env.C.paper ? env.C.light : [210, 220, 245];
    const weight = env.C.paper ? 0.5 : 1;
    for (let i = 0, m = Math.round(env.w * env.h / 1500); i < m; i += 1) {
      g.fillStyle = rgba(speck, (0.08 + r() * r() * 0.35) * weight);
      g.fillRect(r() * dust.width, r() * dust.height, env.dpr, env.dpr);
    }
    st.dust = dust;
    const n = Math.min(340, Math.max(40, Math.round(env.w * env.h / 4600 * env.S.density / 55)));
    st.stars = Array.from({length: n}, () => {
      const z = r() < 0.5 ? 0.25 : r() < 0.6 ? 0.6 : 1;
      const a = r() * Math.PI * 2;
      const v = (4 + r() * 6) * (0.4 + z);
      return {x: r() * env.w, y: r() * env.h, z, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        c: r(), ph: r() * 6.28, tw: 0.25 + r() * 0.35, big: r() > 0.93};
    });
  },
  resize(env, st) { this.populate(env, st); },
  update(env, st, before) {
    if (before.density !== env.S.density || before.scheme !== env.S.scheme) this.populate(env, st);
  },
  theme(env, st) {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    if (env.C.paper) {
      // Light: a printed halo, a thin tinted ring around the brightest stars.
      grad.addColorStop(0, rgba(env.C.pDeep, 0));
      grad.addColorStop(0.55, rgba(env.C.pDeep, 0.5));
      grad.addColorStop(0.7, rgba(env.C.p, 0.14));
      grad.addColorStop(1, rgba(env.C.pDeep, 0));
    } else {
      grad.addColorStop(0, rgba(env.C.light, 0.55));
      grad.addColorStop(0.35, rgba(vivid(env.C.p), 0.16));
      grad.addColorStop(1, rgba(env.C.p, 0));
    }
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    st.glow = c;
  },
  draw(env, st, time, dt) {
    const {ctx, w, h, S, C} = env;
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, rgba(mixc(C.bg, C.pDeep, 0.3)));
    bgGrad.addColorStop(1, rgba(C.bg));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(st.dust, 0, 0, w, h);
    const on = S.interactive && env.pointer.on;
    const tx = on ? (env.pointer.x - 0.5) * -40 : 0;
    const ty = on ? (env.pointer.y - 0.5) * -28 : 0;
    st.px += (tx - st.px) * Math.min(1, dt * 2);
    st.py += (ty - st.py) * Math.min(1, dt * 2);
    const L = S.linkDistance;
    const pad = 40;
    // Move, wrap, place on screen with parallax, bucket into a grid for neighbour search.
    const cells = st.cells;
    cells.clear();
    const pts = st.stars;
    for (const s of pts) {
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.x < -pad) s.x += w + pad * 2; else if (s.x > w + pad) s.x -= w + pad * 2;
      if (s.y < -pad) s.y += h + pad * 2; else if (s.y > h + pad) s.y -= h + pad * 2;
      s.sx = s.x + st.px * s.z; s.sy = s.y + st.py * s.z;
      const key = Math.floor(s.sx / L) * 4096 + Math.floor(s.sy / L);
      let cell = cells.get(key);
      if (!cell) cells.set(key, (cell = []));
      cell.push(s);
    }
    // Links in four alpha buckets, one path each; only stars of a similar depth are linked.
    const buckets = [[], [], [], []];
    const L2 = L * L;
    for (const s of pts) {
      const cx = Math.floor(s.sx / L), cy = Math.floor(s.sy / L);
      for (let ox = 0; ox <= 1; ox += 1) for (let oy = -1; oy <= 1; oy += 1) {
        if (ox === 0 && oy < 0) continue;
        const cell = cells.get((cx + ox) * 4096 + cy + oy);
        if (!cell) continue;
        for (const o of cell) {
          if (o === s || (ox === 0 && oy === 0 && o.x <= s.x) || Math.abs(o.z - s.z) > 0.2) continue;
          const dx = o.sx - s.sx, dy = o.sy - s.sy, d2 = dx * dx + dy * dy;
          if (d2 > L2) continue;
          const k = 1 - Math.sqrt(d2) / L;
          buckets[Math.min(3, (k * s.z * 4.6) | 0)].push(s.sx, s.sy, o.sx, o.sy);
        }
      }
    }
    if (on) {
      const mx = env.pointer.x * w, my = env.pointer.y * h;
      for (const s of pts) {
        const dx = s.sx - mx, dy = s.sy - my, d2 = dx * dx + dy * dy;
        if (s.z > 0.5 && d2 < L2 * 1.6) buckets[Math.min(3, ((1 - d2 / (L2 * 1.6)) * 4) | 0)].push(s.sx, s.sy, mx, my);
      }
    }
    ctx.lineWidth = 0.8;
    const link = vivid(mixc(C.p, C.light, 0.25), 1.3);
    for (let b = 0; b < 4; b += 1) {
      const seg = buckets[b];
      if (!seg.length) continue;
      ctx.strokeStyle = rgba(link, 0.08 + b * 0.09);
      ctx.beginPath();
      for (let i = 0; i < seg.length; i += 4) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
      ctx.stroke();
    }
    // Stars: slow twinkle (periods of several seconds), a few with a soft glow.
    const tones = [C.light, vivid(C.s), vivid(C.t)];
    for (let k = 0; k < 3; k += 1) {
      ctx.fillStyle = rgba(C.paper ? tones[k] : mixc(tones[k], [255, 255, 255], 0.35));
      ctx.beginPath();
      for (const s of pts) {
        if ((s.c < 0.7 ? 0 : s.c < 0.87 ? 1 : 2) !== k) continue;
        const r = (0.5 + s.z * 1.1) * (0.85 + 0.15 * Math.sin(time * s.tw + s.ph));
        ctx.moveTo(s.sx + r, s.sy);
        ctx.arc(s.sx, s.sy, r, 0, 6.2832);
      }
      ctx.globalAlpha = 0.75;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = C.paper ? 'source-over' : 'lighter';
    for (const s of pts) {
      if (!s.big) continue;
      const g = 14 + s.z * 12 + 3 * Math.sin(time * s.tw + s.ph);
      ctx.drawImage(st.glow, s.sx - g, s.sy - g, g * 2, g * 2);
    }
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
  const env = {ctx, canvas, w: 1, h: 1, dpr: 1, S: norm(settings), C: null, still: false,
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
    update(next = {}) {
      if (dead) return;
      const before = env.S;
      env.S = norm(next);
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
