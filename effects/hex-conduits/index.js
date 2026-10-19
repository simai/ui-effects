// Light conduits (simai.effect 1.0.0; schemes dark and light): a dim honeycomb lattice; pulses of light run along its
// edges, turn at every node and leave a fading trace behind them.

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
  seed: 31,
  t0: 0,
  settings: {speed: [100, 10, 300], density: [50, 10, 100], cell: [44, 24, 96], interactive: true, scheme: 'dark'},
  init(env, rand) {
    const st = {rand, verts: [], edges: [], pulses: [], base: null, glow: null};
    this.build(env, st);
    return st;
  },
  build(env, st) {
    const R = env.S.cell;
    const dx = Math.sqrt(3) * R, dy = 1.5 * R;
    const verts = [], edges = [], index = new Map(), seen = new Set();
    const vert = (x, y) => {
      const key = `${Math.round(x * 2)}:${Math.round(y * 2)}`;
      let i = index.get(key);
      if (i === undefined) { i = verts.length; verts.push({x, y, adj: []}); index.set(key, i); }
      return i;
    };
    for (let row = -1; row * dy < env.h + R * 2; row += 1) {
      for (let col = -1; col * dx < env.w + R * 2; col += 1) {
        const cx = col * dx + (row & 1 ? dx / 2 : 0), cy = row * dy;
        const ids = [];
        for (let k = 0; k < 6; k += 1) { const a = Math.PI / 6 + (k * Math.PI) / 3; ids.push(vert(cx + R * Math.cos(a), cy + R * Math.sin(a))); }
        for (let k = 0; k < 6; k += 1) {
          const a = ids[k], b = ids[(k + 1) % 6], key = a < b ? `${a}-${b}` : `${b}-${a}`;
          if (seen.has(key)) continue;
          seen.add(key);
          verts[a].adj.push(edges.length); verts[b].adj.push(edges.length);
          edges.push({a, b, life: 0});
        }
      }
    }
    st.verts = verts; st.edges = edges;
    st.pulses = [];
    this.count(env, st);
    this.theme(env, st);
    for (let i = 0; i < 90; i += 1) this.step(env, st, 1 / 30);
  },
  count(env, st) {
    const want = Math.max(3, Math.round(st.verts.length * env.S.density / 100 * 0.14));
    while (st.pulses.length > want) st.pulses.pop();
    while (st.pulses.length < want) {
      const e = (st.rand() * st.edges.length) | 0;
      st.pulses.push({e, from: st.edges[e].a, prog: st.rand(), v: 0.75 + st.rand() * 0.5, tone: st.rand() < 0.7 ? 0 : 1});
    }
  },
  resize(env, st) { this.build(env, st); },
  update(env, st, before) {
    if (before.cell !== env.S.cell) this.build(env, st);
    else this.count(env, st);
  },
  theme(env, st) {
    const {canvas, w, h, dpr, C} = env;
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = g.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.5, h * 0.5, Math.max(w, h));
    bg.addColorStop(0, rgba(mixc(C.bg, C.pDeep, 0.45)));
    bg.addColorStop(1, rgba(C.bg));
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = rgba(vivid(C.p), C.paper ? 0.12 : 0.09);
    g.lineWidth = 1;
    g.beginPath();
    for (const e of st.edges) { const a = st.verts[e.a], b = st.verts[e.b]; g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); }
    g.stroke();
    g.fillStyle = rgba(C.light, 0.16);
    for (const v of st.verts) g.fillRect(v.x - 1, v.y - 1, 2, 2);
    st.base = c;
    const s = document.createElement('canvas');
    s.width = s.height = 48;
    const sg = s.getContext('2d');
    const gr = sg.createRadialGradient(24, 24, 0, 24, 24, 24);
    if (C.paper) {
      // Light: a blueprint. Pulses are ink-dark heads with a pale tinted halo, not added light.
      gr.addColorStop(0, rgba(C.light, 0.55));
      gr.addColorStop(0.2, rgba(C.pDeep, 0.7));
      gr.addColorStop(1, rgba(C.pDeep, 0));
    } else {
      gr.addColorStop(0, rgba([255, 255, 255], 0.9));
      gr.addColorStop(0.15, rgba(vivid(mixc(C.s, C.light, 0.3)), 0.5));
      gr.addColorStop(1, rgba(C.s, 0));
    }
    sg.fillStyle = gr;
    sg.fillRect(0, 0, 48, 48);
    st.glow = s;
  },
  step(env, st, dt) {
    const R = env.S.cell;
    const on = env.S.interactive && env.pointer.on;
    const mx = env.pointer.x * env.w, my = env.pointer.y * env.h;
    for (const e of st.edges) if (e.life > 0) e.life = Math.max(0, e.life - dt * 0.55);
    for (const p of st.pulses) {
      p.prog += (dt * 70 * p.v) / R;
      while (p.prog >= 1) {
        const edge = st.edges[p.e];
        edge.life = 1;
        const at = edge.a === p.from ? edge.b : edge.a;
        const options = st.verts[at].adj.filter((i) => i !== p.e);
        let next = options[(st.rand() * options.length) | 0];
        if (on && st.rand() < 0.7) {
          let best = Infinity;
          for (const i of options) {
            const o = st.edges[i], far = st.verts[o.a === at ? o.b : o.a];
            const d = (far.x - mx) ** 2 + (far.y - my) ** 2;
            if (d < best) { best = d; next = i; }
          }
        }
        p.e = next; p.from = at; p.prog -= 1;
      }
    }
  },
  draw(env, st, time, dt) {
    const {ctx, w, h, C} = env;
    if (dt > 0) this.step(env, st, dt);
    ctx.drawImage(st.base, 0, 0, w, h);
    const trace = vivid(mixc(C.s, C.p, 0.3));
    ctx.lineWidth = 1.4;
    for (let b = 1; b <= 3; b += 1) {
      ctx.strokeStyle = rgba(trace, b * 0.13);
      ctx.beginPath();
      for (const e of st.edges) {
        if (e.life <= 0 || Math.min(3, Math.ceil(e.life * 3)) !== b) continue;
        const a = st.verts[e.a], c = st.verts[e.b];
        ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();
    }
    const heads = [vivid(mixc(C.s, C.light, 0.4)), vivid(mixc(C.t, C.light, 0.4))];
    ctx.lineWidth = 2;
    for (let k = 0; k < 2; k += 1) {
      ctx.strokeStyle = rgba(heads[k], 0.85);
      ctx.beginPath();
      for (const p of st.pulses) {
        if (p.tone !== k) continue;
        const e = st.edges[p.e], a = st.verts[p.from], b = st.verts[e.a === p.from ? e.b : e.a];
        const from = Math.max(0, p.prog - 0.45);
        ctx.moveTo(a.x + (b.x - a.x) * from, a.y + (b.y - a.y) * from);
        ctx.lineTo(a.x + (b.x - a.x) * p.prog, a.y + (b.y - a.y) * p.prog);
      }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = C.paper ? 'multiply' : 'lighter';
    for (const p of st.pulses) {
      const e = st.edges[p.e], a = st.verts[p.from], b = st.verts[e.a === p.from ? e.b : e.a];
      const x = a.x + (b.x - a.x) * p.prog, y = a.y + (b.y - a.y) * p.prog;
      ctx.drawImage(st.glow, x - 16, y - 16, 32, 32);
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
