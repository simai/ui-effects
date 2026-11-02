// Neon horizon (simai.effect 1.1.0, dark set): a perspective grid floor glides towards the viewer under
// a glowing horizon and a sparse star sky; lines fade into the distance like fog. Light riders ride the
// floor along its lines and leave light walls; a rider that runs into a wall bursts.

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

// ---- light riders: floor coordinates are column x and row m; the floor slides 0.32 rows a second ----
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]; // away, right, towards the viewer, left
const LIFE = 7, RSPD = 2.2, ZN = 1, ZF = 4.6;
const rowAt = (z, time) => time * 0.32 + (z - 0.25) / 0.3;
const zOf = (m, time) => 0.25 + (m - time * 0.32) * 0.3;
const key = (x, m) => x * 4096 + m;
const out = (st, x, m, time) => x < -st.xa || x > st.xa || m < rowAt(ZN, time) + 0.6 || m > rowAt(ZF, time);
function spawn(st, s, time, occ, x, m, d = 0) {
  if (x === undefined) {
    m = Math.floor(rowAt(ZF, time)); d = 2;
    for (let i = 0; i < 6; i += 1) { x = Math.round((st.rand() * 2 - 1) * (st.xa - 1)); if (!occ.has(key(x, m)) && !occ.has(key(x, m - 1))) break; }
  }
  s.r = {x, m, d, p: 0, nodes: [{x, m, t: time}], born: time};
}
function crash(st, s, time, warm) {
  const r = s.r;
  st.ghosts.push({nodes: r.nodes, t: time, c: s.c});
  const f = [];
  for (let i = 0; i < 8; i += 1) f.push([st.rand() * 6.283, 0.5 + st.rand()]);
  st.bursts.push({x: r.x, m: r.m, t: time, c: s.c, f});
  s.r = null;
  s.wait = warm ? 0 : 1.2 + st.rand() * 1.4;
}
// Looks ahead along each way and keeps the line, turns off it now and then, or turns away from a wall.
function steer(st, r, time, occ) {
  const run = (d) => { let x = r.x, m = r.m, n = 0; for (; n < 5; n += 1) { x += DIRS[d][0]; m += DIRS[d][1]; if (occ.has(key(x, m)) || out(st, x, m, time + (n + 1.2) / RSPD)) break; } return n; };
  const L = (r.d + 3) % 4, R = (r.d + 1) % 4, f = run(r.d), a = run(L), b = run(R), sf = Math.max(a, b);
  const side = a > b || (a === b && st.rand() < 0.5) ? L : R;
  return (f < 2 || st.rand() < 0.14) && sf > 0 && sf >= Math.min(f, 2) ? side : r.d;
}
function ride(st, time, dt, warm) {
  const occ = new Set();
  for (const s of st.slots) if (s.r) {
    s.r.nodes = s.r.nodes.filter((n) => time - n.t < LIFE);
    for (const n of s.r.nodes) occ.add(key(n.x, n.m));
  }
  for (const s of st.slots) {
    const r = s.r;
    if (!r) { if ((s.wait -= dt) <= 0) spawn(st, s, time, occ); continue; }
    r.p += dt * RSPD;
    if (r.p < 1) continue;
    r.p -= 1;
    r.x += DIRS[r.d][0]; r.m += DIRS[r.d][1];
    const k = key(r.x, r.m);
    if (occ.has(k) || out(st, r.x, r.m, time)) { crash(st, s, time, warm); continue; }
    occ.add(k);
    r.nodes.push({x: r.x, m: r.m, t: time});
    r.d = steer(st, r, time, occ);
  }
  st.bursts = st.bursts.filter((b) => time - b.t < 1.1);
  st.ghosts = st.ghosts.filter((g) => time - g.t < 1.2);
}
// Deterministic: seeded, and ridden six seconds ahead so a still frame shows riders mid-ride.
function riders(env, st) {
  const n = env.S.riders ? Math.round(env.S.riderCount) : 0;
  st.rand = rng(29 + n);
  st.slots = []; st.bursts = []; st.ghosts = [];
  for (let i = 0; i < n; i += 1) st.slots.push({r: null, wait: i * 0.4, c: i});
  for (let k = -180; k < 0; k += 1) ride(st, st.time + k / 30, 1 / 30, true);
  st.bursts = []; st.ghosts = [];
}
function drawRiders(env, st, time, hy, vx) {
  const {ctx, w, h, C} = env;
  const g = env.S.intensity / 100, depth = h - hy, sp = Math.max(w, 700) * 0.0495;
  const P = (x, m) => { const u = sp / zOf(m, time); return [vx + x * u, hy + depth * 0.55 / zOf(m, time), u]; };
  const cols = [C.p, C.s, C.t, mixc(C.p, C.t, 0.5)].map((c) => vivid(c, 1.6));
  // A light wall: a low ribbon standing on the floor, a soft body and a bright top edge.
  const wall = (pts, c, fade) => {
    const hot = mixc(c, [255, 255, 255], 0.35);
    for (let i = 1; i < pts.length; i += 1) {
      const k = fade * clamp((LIFE - (time - pts[i][2])) / 2.5, 0, 1);
      if (k <= 0) continue;
      const [ax, ay, au] = P(pts[i - 1][0], pts[i - 1][1]), [bx, by, bu] = P(pts[i][0], pts[i][1]);
      const at = ay - au * 0.24, bt = by - bu * 0.24;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, bt); ctx.lineTo(ax, at); ctx.closePath();
      ctx.fillStyle = rgba(c, 0.08 * g * k); ctx.fill();
      ctx.beginPath(); ctx.moveTo(ax, at); ctx.lineTo(bx, bt);
      ctx.strokeStyle = rgba(c, 0.2 * g * k); ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = rgba(hot, 0.95 * g * k); ctx.lineWidth = 1.1; ctx.stroke();
    }
  };
  for (const gh of st.ghosts) wall(gh.nodes.map((n) => [n.x, n.m, n.t]), cols[gh.c], 1 - (time - gh.t) / 1.2);
  for (const s of st.slots) if (s.r) {
    const r = s.r, c = cols[s.c], [dx, dm] = DIRS[r.d], hx = r.x + dx * r.p, hm = r.m + dm * r.p;
    wall([...r.nodes.map((n) => [n.x, n.m, n.t]), [hx, hm, time]], c, 1);
    // The rider: a bright elongated head with a soft glow.
    const [x1, y1, u] = P(hx, hm), [x0, y0] = P(hx - dx * 0.5, hm - dm * 0.5), lift = u * 0.12;
    const glow = ctx.createRadialGradient(x1, y1 - lift, 0, x1, y1 - lift, u * 0.6);
    glow.addColorStop(0, rgba(c, 0.5 * g)); glow.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = glow; ctx.fillRect(x1 - u, y1 - lift - u, u * 2, u * 2);
    ctx.beginPath(); ctx.moveTo(x0, y0 - lift); ctx.lineTo(x1, y1 - lift);
    ctx.strokeStyle = rgba(mixc(c, [255, 255, 255], 0.65), 1.8 * g); ctx.lineWidth = Math.max(1.6, u * 0.07); ctx.lineCap = "round"; ctx.stroke(); ctx.lineCap = "butt";
  }
  // A burst: a flash and fragments that scatter over the floor and fade.
  if (!env.still) for (const b of st.bursts) {
    const q = (time - b.t) / 1.1, c = cols[b.c], [x, y, u] = P(b.x, b.m), k = (1 - q) * (1 - q);
    const fl = ctx.createRadialGradient(x, y - u * 0.15, 0, x, y - u * 0.15, u * (0.5 + q * 1.4));
    fl.addColorStop(0, rgba(mixc(c, [255, 255, 255], 0.6), 1.4 * g * k)); fl.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = fl; ctx.fillRect(x - u * 2, y - u * 2, u * 4, u * 4);
    ctx.fillStyle = rgba(mixc(c, [255, 255, 255], 0.4), 1.6 * g * (1 - q));
    for (const [a, v] of b.f) ctx.fillRect(x + Math.cos(a) * v * q * u * 2 - 1.5, y - u * 0.15 + Math.sin(a) * v * q * u - u * q * (1 - q) - 1.5, 3, 3);
  }
}

const FX = {
  seed: 61,
  t0: 0,
  settings: {speed: [100, 10, 300], intensity: [50, 10, 100], horizon: [42, 20, 70], interactive: true, riders: true, riderCount: [3, 2, 4]},
  init(env, rand) {
    const st = {rand, vx: 0.5, stars: null, time: 0};
    this.resize(env, st);
    riders(env, st);
    return st;
  },
  update(env, st, before) {
    if (before.riders !== env.S.riders || Math.round(before.riderCount) !== Math.round(env.S.riderCount)) riders(env, st);
  },
  // A click lets a new rider out at the floor point under it, heading away; the oldest gives way at the cap.
  click(env, st, px, py) {
    const n = st.slots.length;
    if (!n) return;
    const hy = Math.round(env.h * env.S.horizon / 100), time = st.time;
    const z = clamp(py > hy + 1 ? (env.h - hy) * 0.55 / (py - hy) : ZF, ZN + 0.4, ZF - 0.5);
    const x = clamp(Math.round((px - st.vx * env.w) * z / (Math.max(env.w, 700) * 0.0495)), -st.xa, st.xa);
    let s = st.slots.find((q) => !q.r);
    if (!s) { s = st.slots.reduce((a, q) => (q.r.born < a.r.born ? q : a)); crash(st, s, time); }
    spawn(st, s, time, null, x, Math.round(rowAt(z, time)), 0);
  },
  resize(env, st) {
    st.xa = clamp(Math.floor(env.w * 0.54 / (Math.max(env.w, 700) * 0.0495)), 3, 7);
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
    st.time = time;
    if (dt > 0 && st.slots.length) ride(st, time, dt);
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
    if (st.slots.length) drawRiders(env, st, time, hy, vx);
    ctx.globalCompositeOperation = 'source-over';
  },
};

function mountScene(host, settings = {}, context = {}) {
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
  // A press released in place (no drag) over the area, not on a control, is a click for the effect.
  let down = null;
  const onDown = (event) => { down = [event.clientX, event.clientY]; };
  const onUp = (event) => {
    const from = down;
    down = null;
    if (!from || !env.S.interactive || !FX.click || state === null || Math.hypot(event.clientX - from[0], event.clientY - from[1]) > 6) return;
    if (event.target?.closest?.('a,button,input,select,textarea,label,[contenteditable]')) return;
    const box = host.getBoundingClientRect(), x = event.clientX - box.left, y = event.clientY - box.top;
    if (x < 0 || y < 0 || x > box.width || y > box.height) return;
    FX.click(env, state, x, y);
    paint();
  };
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
  win.addEventListener('pointerdown', onDown, {passive: true});
  win.addEventListener('pointerup', onUp, {passive: true});
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
      win.removeEventListener('pointerdown', onDown);
      win.removeEventListener('pointerup', onUp);
      canvas.width = canvas.height = 0;
      canvas.remove();
      host.style.position = oldPosition;
      state = null;
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
  // This scene spreads its light widely, so the bright end of a palette is held back.
  const stops = (name === 'custom' ? customStops(colour) : PALETTES[name])?.map((stop, i) => (i < 2 ? stop : stop.map((v) => v * 0.92))), at = [4, 30, 65, 95];
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
