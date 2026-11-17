// Data flow (simai.effect 1.1.0; dark and light): one set of records regroups table -> board -> calendar
// -> cards -> table. Lifecycle as the catalogue template's; colours are palette tones read via a probe.

const {min, max, sin, cos, PI, hypot, floor, ceil, sqrt, round} = Math;
const TAU = PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const ease = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2; };
const bump = (t) => sin(PI * clamp(t, 0, 1));

function readTones(host, scheme) {
  const doc = host.ownerDocument;
  const probe = doc.createElement('i');
  probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
  host.append(probe);
  const pixel = doc.createElement('canvas').getContext('2d', {willReadFrequently: true});
  const read = (name, fallback) => {
    probe.style.color = `var(${name}, ${fallback})`;
    pixel.fillStyle = fallback;
    pixel.fillStyle = getComputedStyle(probe).color;
    pixel.fillRect(0, 0, 1, 1);
    const d = pixel.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  };
  const tones = SCENE.tones(read, scheme);
  probe.remove();
  return tones;
}

// The stage: right of the text (left ~46 %), at most square, top right in a tall area; low in a portrait one.
function stage(w, h) {
  if (w / h > 0.95) {
    const sw = min(w * 0.42, 780), sh = min(h * 0.74, sw);
    return {x: w * 0.955 - sw, y: h < sw * 1.5 ? (h - sh) / 2 : max(h * 0.08, 24), w: sw, h: sh, wide: true, left: w * 0.5};
  }
  const sw = min(w * 0.92, 640), sh = min(h * 0.52, sw * 1.05);
  return {x: (w - sw) / 2, y: h - sh - h * 0.05, w: sw, h: sh, wide: false, left: 0};
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, max(0, w), max(0, h), max(0, min(r, w / 2, h / 2)));
}

// The records: one data set, each with a status (four), a day (five weeks) and an order.
function makeRecords(n, random) {
  const counts = [0, 0, 0, 0], perDay = new Array(35).fill(0), recs = [];
  for (let i = 0; i < n; i += 1) {
    let s = floor(random() * 4);
    if (counts[s] >= ceil(n / 4) + 1) s = counts.indexOf(min(...counts));
    counts[s] += 1;
    let d = floor(random() * 35);
    while (perDay[d] >= 2) d = (d + 3) % 35;
    perDay[d] += 1;
    recs.push({i, s, d, rank: 0, slot: perDay[d] - 1, px: 0, py: 0, vx: 0, vy: 0});
  }
  for (let s = 0; s < 4; s += 1) recs.filter((r) => r.s === s).forEach((r, k) => { r.rank = k; });
  return recs;
}
const HDR = (S) => clamp(S.h * 0.07, 12, 26);
const boardGeo = (S) => { const g = S.w * 0.035; return {g, cw: (S.w - g * 3) / 4}; };
const calGeo = (S) => { const g = max(2, S.w * 0.008), hdr = HDR(S); return {g, hdr, cw: (S.w - g * 6) / 7, chh: (S.h - hdr - 6 - g * 4) / 5}; };
// A table keeps its rows tall (a pitch of at least 30 px): what does not fit goes to a second pane.
const tableGeo = (S, n) => {
  const fit = max(4, floor((S.h - HDR(S) - 8) / 30)), panes = min(3, ceil(n / fit)), g = S.w * 0.04;
  const rows = ceil(n / panes), pitch = min((S.h - HDR(S) - 8) / rows, 48);
  return {panes, g, pw: (S.w - g * (panes - 1)) / panes, rows, pitch};
};
const LAYOUTS = {
  table(recs, S) {
    const hdr = HDR(S), {pw, g, rows, pitch} = tableGeo(S, recs.length), rh = max(4, pitch * 0.76);
    return recs.map((r) => { const p = floor(r.i / rows), k = r.i % rows; return {x: S.x + p * (pw + g), y: S.y + hdr + 8 + k * pitch + (pitch - rh) / 2, w: pw, h: rh, r: rh * 0.3}; });
  },
  board(recs, S) {
    const hdr = HDR(S), {g, cw} = boardGeo(S), most = max(1, ...[0, 1, 2, 3].map((s) => recs.filter((r) => r.s === s).length));
    const gap = max(3, S.h * 0.014), ch = min((S.h - hdr - 10) / most - gap, S.h * 0.12);
    return recs.map((r) => ({x: S.x + r.s * (cw + g) + cw * 0.06, y: S.y + hdr + 8 + r.rank * (ch + gap), w: cw * 0.88, h: ch, r: min(6, ch * 0.2)}));
  },
  calendar(recs, S) {
    const {g, hdr, cw, chh} = calGeo(S), pad = max(2, cw * 0.08), eh = min(cw * 0.3, (chh * 0.64 - pad * 1.6) / 2);
    return recs.map((r) => {
      const c = r.d % 7, row = floor(r.d / 7);
      return {x: S.x + c * (cw + g) + pad, y: S.y + hdr + 6 + row * (chh + g) + chh * 0.34 + r.slot * (eh + pad * 0.6), w: cw - pad * 2, h: eh, r: min(4, eh * 0.3)};
    });
  },
  cards(recs, S) {
    const n = recs.length, cols = clamp(round(sqrt(n * S.w / S.h * 0.8)), 2, 8), rows = ceil(n / cols), g = S.w * 0.024;
    const tw = (S.w - g * (cols - 1)) / cols, th = min((S.h - g * (rows - 1)) / rows, tw * 1.1), y0 = S.y + (S.h - rows * th - g * (rows - 1)) / 2;
    return recs.map((r) => ({x: S.x + (r.i % cols) * (tw + g), y: y0 + floor(r.i / cols) * (th + g), w: tw, h: th, r: min(10, tw * 0.1)}));
  },
};
const ALL = ['table', 'board', 'calendar', 'cards'];
const SETS = {all: ALL, 'no-calendar': ['table', 'board', 'cards'], 'table-board': ['table', 'board'], 'board-calendar': ['board', 'calendar']};
const HOLD = 5.6, MOVE = 3.6, SPAN = 1.4, STEP = HOLD + MOVE;
// A landed item: [fill alpha, how far its fill leans to the ink].
const REST = {table: [0.13, 0.85], board: [0.3, 0.25], calendar: [0.72, 0], cards: [0.13, 0.55]};

const SCENE = {
  home: 'dark', seed: 5021, start: 1.2, fresh: true, reseed: ['records', 'views'],
  tones: (read, scheme) => scheme === 'light'
    ? {bg0: mixc(read('--sf-primary-99', '#fbfbff'), [255, 255, 255], 0.4), bg1: mixc(read('--sf-secondary-95', '#e8faf8'), [255, 255, 255], 0.55), glow: read('--sf-primary-90', '#dfe3ff'), glowA: 0.6,
      ink: read('--sf-primary-20', '#262c66'), status: [mixc(read('--sf-primary-30', '#3a427a'), [120, 124, 140], 0.6), read('--sf-primary-50', '#5466d8'), read('--sf-secondary-40', '#1c8c8e'), read('--sf-tertiary-50', '#dc6a5c')],
      core: [255, 255, 255], dotA: 0.9, halo: 0.34, light: true}
    : {bg0: mixc(read('--sf-primary-5', '#0a0c1e'), [0, 0, 0], 0.15), bg1: mixc(read('--sf-tertiary-5', '#160a0e'), read('--sf-primary-6', '#0b0d22'), 0.5), glow: read('--sf-primary-40', '#3a46a8'), glowA: 0.3,
      ink: read('--sf-primary-90', '#d6dbff'), status: [mixc(read('--sf-primary-90', '#d6dbff'), [150, 156, 180], 0.4), read('--sf-primary-70', '#8b9cf8'), read('--sf-secondary-70', '#5fd2cb'), read('--sf-tertiary-70', '#fa947f')],
      core: [255, 255, 255], dotA: 1, halo: 0.5, light: false},
  setup(env) {
    const {values, ratio} = env, S = env.stage = stage(env.w, env.h);
    const random = rng(SCENE.seed + env.salt);
    const n = clamp(values.records | 0, 4, 60), views = SETS[values.views] ?? ALL;
    const recs = makeRecords(n, random);
    const boxes = views.map((v) => LAYOUTS[v](recs, S));
    const b = views.indexOf('board');
    return {recs, views, boxes, cycle: views.length * STEP, still: max(0, b) * STEP + 2.6, jitter: recs.map(() => random() * 2 - 1),
      ground: ground(env), glows: env.tones.status.map((c) => sprite(env, c, ratio))};
  },
  // A press makes the view switch now (only while the records rest).
  press(env) {
    const {state} = env, tc = (((env.t + env.shift) % state.cycle) + state.cycle) % state.cycle, local = tc % STEP;
    if (local < HOLD - 0.05) env.shift += HOLD - local;
  },
  draw(env, time, dt) {
    const {ctx, tones, stage: S, state, pointer: P} = env;
    const k = env.values.intensity / 100, t = time + env.shift, views = state.views, nv = views.length;
    ctx.drawImage(state.ground, 0, 0, env.w, env.h);
    const tc = ((t % state.cycle) + state.cycle) % state.cycle, v = floor(tc / STEP), m = tc - v * STEP - HOLD;
    const from = views[v], to = views[(v + 1) % nv], A = state.boxes[v], B = state.boxes[(v + 1) % nv];
    // The frames: the one we leave fades out, the next fades in as the records land.
    const gOut = m < 0 ? 1 : 1 - smooth(m / (MOVE * 0.35)), gIn = m < 0 ? 0 : smooth((m - MOVE * 0.55) / (MOVE * 0.45));
    if (gOut > 0) frame(env, from, gOut * k);
    if (gIn > 0) frame(env, to, gIn * k);
    const dotR = S.wide ? 4 : 3.4, rp = 60 + S.w * 0.1, light = tones.light;
    for (const r of state.recs) {
      const a = A[r.i], b = B[r.i];
      const delay = SPAN * clamp(((a.x + a.w / 2 - S.x) / S.w) * 0.7 + ((a.y + a.h / 2 - S.y) / S.h) * 0.3, 0, 1);
      const p = m < 0 ? 0 : ease((m - delay) / (MOVE - SPAN));
      const fly = smooth(clamp(bump(p) * 1.8, 0, 1));
      const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
      const dx = bx - ax, dy = by - ay, len = hypot(dx, dy) || 1;
      // A curved path: each record bends its own way and sways a little while it flies.
      const bend = bump(p) * len * 0.2 * state.jitter[r.i];
      let cx = mix(ax, bx, p) - (dy / len) * bend + sin(t * 1.3 + r.i) * 5 * fly;
      let cy = mix(ay, by, p) + (dx / len) * bend + cos(t * 1.1 + r.i * 1.7) * 5 * fly;
      if (P.k > 0.01) {
        const ex = cx - P.sx, ey = cy - P.sy, d = hypot(ex, ey);
        if (d < rp) { const f = (1 - d / rp) ** 2 * 18 * P.k; cx += (ex / (d || 1)) * f; cy += (ey / (d || 1)) * f; }
      }
      cx = max(cx, S.left + dotR);
      // The velocity, smoothed, for the short tail behind a flying record.
      if (dt > 0) { r.vx = mix(r.vx, (cx - r.px) / dt, min(1, dt * 8)); r.vy = mix(r.vy, (cy - r.py) / dt, min(1, dt * 8)); }
      r.px = cx; r.py = cy;
      const kind = p < 0.5 ? from : to, rest = REST[kind];
      const w = mix(mix(a.w, b.w, p), dotR * 2, fly), h = mix(mix(a.h, b.h, p), dotR * 2, fly), rr = mix(mix(a.r, b.r, p), dotR, fly);
      const col = tones.status[r.s];
      if (fly > 0.03) {
        const g = state.glows[r.s], gr = dotR * 7, ga = tones.halo * fly * k;
        const sp = min(1, hypot(r.vx, r.vy) / 400), tx = -r.vx * 0.045, ty = -r.vy * 0.045;
        ctx.globalAlpha = ga * 0.35 * sp; ctx.drawImage(g, cx + tx * 2 - gr * 0.6, cy + ty * 2 - gr * 0.6, gr * 1.2, gr * 1.2);
        ctx.globalAlpha = ga * 0.6 * sp; ctx.drawImage(g, cx + tx - gr * 0.8, cy + ty - gr * 0.8, gr * 1.6, gr * 1.6);
        ctx.globalAlpha = ga; ctx.drawImage(g, cx - gr, cy - gr, gr * 2, gr * 2);
        ctx.globalAlpha = 1;
      }
      const fill = mixc(mixc(col, tones.ink, rest[1] * (1 - fly)), light ? col : tones.core, fly ** 3 * 0.3);
      ctx.fillStyle = rgba(fill, mix(rest[0], tones.dotA, fly ** 3) * k);
      rrect(ctx, cx - w / 2, cy - h / 2, w, h, rr); ctx.fill();
      if (fly < 0.6) detail(env, kind, cx - w / 2, cy - h / 2, w, h, col, (1 - fly / 0.6) * k);
    }
  },
};
// A soft glow for a record in flight: a bright core that falls off smoothly, drawn once per colour.
function sprite(env, c, ratio) {
  const s = ceil(48 * ratio), cv = env.ctx.canvas.ownerDocument.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d'), rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  rg.addColorStop(0, rgba(mixc(c, [255, 255, 255], 0.25), 1)); rg.addColorStop(0.18, rgba(c, 0.7)); rg.addColorStop(0.45, rgba(c, 0.22)); rg.addColorStop(1, rgba(c, 0));
  g.fillStyle = rg; g.fillRect(0, 0, s, s);
  return cv;
}
// The ground, once per size: a calm gradient, a soft light behind the stage, a quiet text side.
function ground(env) {
  const {w, h, tones, ratio, stage: s} = env, k = env.values.intensity / 100;
  const cv = env.ctx.canvas.ownerDocument.createElement('canvas');
  cv.width = max(1, round(w * ratio)); cv.height = max(1, round(h * ratio));
  const ctx = cv.getContext('2d', {alpha: false});
  ctx.scale(ratio, ratio);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, rgba(tones.bg0)); g.addColorStop(1, rgba(tones.bg1));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const cx = s.x + s.w * 0.55, cy = s.y + s.h * 0.5, r = max(s.w, s.h) * 0.85;
  const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  rg.addColorStop(0, rgba(tones.glow, tones.glowA * k)); rg.addColorStop(1, rgba(tones.glow, 0));
  ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
  return cv;
}
// The insides of an item at rest: the status dot of a row, the accent of a card, the band of a tile.
function detail(env, kind, x, y, w, h, col, a) {
  const {ctx, tones} = env, ink = tones.ink;
  if (kind === 'table') {
    const d = min(h * 0.22, 3.5);
    ctx.fillStyle = rgba(col, 0.95 * a); ctx.beginPath(); ctx.arc(x + 6 + d, y + h / 2, d, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(ink, 0.2 * a);
    for (const [u0, u1] of [[0.08, 0.3], [0.38, 0.52], [0.62, 0.72], [0.82, 0.94]]) { rrect(ctx, x + w * u0, y + h * 0.4, w * (u1 - u0), max(1.5, h * 0.2), 2); ctx.fill(); }
  } else if (kind === 'board') {
    ctx.fillStyle = rgba(col, 0.95 * a); rrect(ctx, x, y, 3, h, 1.5); ctx.fill();
    ctx.fillStyle = rgba(ink, 0.3 * a); rrect(ctx, x + 9, y + h * 0.3, w * 0.55, max(1.5, h * 0.16), 2); ctx.fill();
    ctx.fillStyle = rgba(ink, 0.16 * a); rrect(ctx, x + 9, y + h * 0.6, w * 0.35, max(1.5, h * 0.14), 2); ctx.fill();
  } else if (kind === 'cards') {
    ctx.save(); rrect(ctx, x, y, w, h, min(10, w * 0.1)); ctx.clip();
    ctx.fillStyle = rgba(col, 0.7 * a); ctx.fillRect(x, y, w, h * 0.2); ctx.restore();
    ctx.fillStyle = rgba(ink, 0.3 * a); rrect(ctx, x + w * 0.1, y + h * 0.36, w * 0.62, max(2, h * 0.08), 2); ctx.fill();
    ctx.fillStyle = rgba(ink, 0.16 * a); rrect(ctx, x + w * 0.1, y + h * 0.54, w * 0.42, max(2, h * 0.07), 2); ctx.fill();
    ctx.fillStyle = rgba(col, 0.6 * a); ctx.beginPath(); ctx.arc(x + w * 0.82, y + h * 0.78, min(w, h) * 0.08, 0, TAU); ctx.fill();
  }
}
// The frame of a view: the table's header and column rules, the board's columns, the month's grid.
function frame(env, kind, a) {
  const {ctx, tones, stage: S, state} = env, ink = tones.ink, hdr = HDR(S);
  if (kind === 'table') {
    const {panes, g, pw, rows, pitch} = tableGeo(S, state.recs.length);
    for (let p = 0; p < panes; p += 1) {
      const x = S.x + p * (pw + g);
      ctx.fillStyle = rgba(ink, 0.07 * a); rrect(ctx, x, S.y, pw, hdr, 5); ctx.fill();
      ctx.fillStyle = rgba(ink, 0.28 * a);
      for (const [u0, u1] of [[0.08, 0.2], [0.38, 0.47], [0.62, 0.69], [0.82, 0.9]]) { rrect(ctx, x + pw * u0, S.y + hdr * 0.42, pw * (u1 - u0), max(2, hdr * 0.16), 2); ctx.fill(); }
      ctx.fillStyle = rgba(ink, 0.05 * a);
      for (const u of [0.35, 0.58, 0.79]) ctx.fillRect(x + pw * u, S.y + hdr + 6, 1, rows * pitch);
    }
  } else if (kind === 'board') {
    const {g, cw} = boardGeo(S);
    for (let s = 0; s < 4; s += 1) {
      const x = S.x + s * (cw + g);
      ctx.fillStyle = rgba(ink, 0.045 * a); rrect(ctx, x, S.y, cw, S.h, 8); ctx.fill();
      ctx.fillStyle = rgba(tones.status[s], 0.9 * a); ctx.beginPath(); ctx.arc(x + cw * 0.06 + 4, S.y + hdr * 0.5, 3.5, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(ink, 0.28 * a); rrect(ctx, x + cw * 0.06 + 12, S.y + hdr * 0.5 - 2, cw * 0.4, 4, 2); ctx.fill();
    }
  } else if (kind === 'calendar') {
    const {g, cw, chh} = calGeo(S);
    for (let c = 0; c < 7; c += 1) {
      const x = S.x + c * (cw + g);
      ctx.fillStyle = rgba(ink, 0.26 * a); rrect(ctx, x + cw * 0.08, S.y + hdr * 0.4, cw * 0.4, max(2, hdr * 0.18), 2); ctx.fill();
      for (let row = 0; row < 5; row += 1) {
        const y = S.y + hdr + 6 + row * (chh + g);
        ctx.fillStyle = rgba(ink, (c > 4 ? 0.06 : 0.035) * a); rrect(ctx, x, y, cw, chh, 4); ctx.fill();
        ctx.fillStyle = rgba(ink, 0.2 * a); rrect(ctx, x + cw * 0.08, y + chh * 0.1, min(10, cw * 0.18), max(2, chh * 0.09), 1.5); ctx.fill();
      }
    }
  }
}

const DEFAULTS = {speed: 100, intensity: 100, records: 20, views: 'all', interactive: true};
function mountScene(host, settings, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const env = {ctx, w: 1, h: 1, ratio: 1, values: {...DEFAULTS, ...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, stage: null,
    pointer: {x: 0.5, y: 0.5, on: false, sx: -1e4, sy: -1e4, k: 0}, still: false, rtl: false, t: 0, shift: 0};
  env.tones = readTones(host, env.scheme);
  env.still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  // Fresh: new records on every moving mount; the still frame keeps the seeded ones.
  env.salt = SCENE.fresh && !env.still ? floor(Math.random() * 1e6) : 0;
  let paused = false, visible = true, frame = 0, last = 0;
  env.t = context.start ?? SCENE.start;

  // The still frame: a complete board (or the first view taking part).
  const setup = () => { env.state = SCENE.setup(env); if (env.still) { env.t = env.state.still; env.shift = 0; } };
  const draw = (dt = 0) => {
    // The pointer eases in and out, so a reaction never jumps.
    const p = env.pointer, on = p.on && !env.still;
    p.k += ((on ? 1 : 0) - p.k) * min(1, dt * 4);
    if (on) { const px = p.x * env.w, py = p.y * env.h; if (p.sx < -1e3) { p.sx = px; p.sy = py; } p.sx += (px - p.sx) * min(1, dt * 6); p.sy += (py - p.sy) * min(1, dt * 6); }
    SCENE.draw(env, env.t, dt);
  };
  const loop = (now) => {
    frame = 0;
    const dt = clamp((now - (last || now)) / 1000, 0, 0.05) * (env.values.speed / 100);
    env.t += dt;
    last = now;
    draw(dt);
    schedule();
  };
  const schedule = () => {
    if (frame || env.still || paused || !visible || doc.hidden) return;
    frame = win.requestAnimationFrame(loop);
  };
  const stop = () => {
    if (frame) win.cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  };
  const resize = () => {
    // Layout size, not the transformed box.
    env.ratio = min(2, win.devicePixelRatio || 1);
    env.w = max(1, host.offsetWidth);
    env.h = max(1, host.offsetHeight);
    canvas.width = round(env.w * env.ratio);
    canvas.height = round(env.h * env.ratio);
    env.rtl = win.getComputedStyle(host).direction === 'rtl';
    ctx.setTransform(env.rtl ? -env.ratio : env.ratio, 0, 0, env.ratio, env.rtl ? canvas.width : 0, 0);
    setup();
    draw();
  };
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  const screen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else stop(); });
  screen.observe(host);
  const onVisibility = () => (doc.hidden ? stop() : schedule());
  doc.addEventListener('visibilitychange', onVisibility);
  const onMotion = () => { env.still = Boolean(context.reducedMotion) || motion.matches; if (env.still) { stop(); setup(); draw(); } else schedule(); };
  motion?.addEventListener?.('change', onMotion);
  // The pointer is read on the window, passively: the host takes no pointer events.
  const onPointer = (event) => {
    const box = host.getBoundingClientRect();
    env.pointer.x = (event.clientX - box.left) / max(1, box.width);
    if (env.rtl) env.pointer.x = 1 - env.pointer.x;
    env.pointer.y = (event.clientY - box.top) / max(1, box.height);
    env.pointer.on = env.values.interactive !== false && env.pointer.x >= 0 && env.pointer.x <= 1 && env.pointer.y >= 0 && env.pointer.y <= 1;
  };
  win.addEventListener('pointermove', onPointer, {passive: true});
  // A press inside the host's box, never from a link, a button or a field over it.
  const onDown = (event) => {
    if (event.button !== 0 || env.values.interactive === false || env.still || paused) return;
    if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return;
    const box = host.getBoundingClientRect(), x = event.clientX - box.left, y = event.clientY - box.top;
    if (x < 0 || y < 0 || x > box.width || y > box.height) return;
    SCENE.press(env);
    schedule();
  };
  win.addEventListener('pointerdown', onDown, {passive: true});

  resize();
  schedule();

  return {
    update(next, nextContext = {}) {
      const before = env.values;
      env.values = {...DEFAULTS, ...next};
      if (nextContext.scheme !== undefined && nextContext.scheme !== env.scheme) {
        env.scheme = nextContext.scheme;
        env.tones = readTones(host, env.scheme);
      }
      if (SCENE.reseed.some((key) => before[key] !== env.values[key]) || before.intensity !== env.values.intensity || nextContext.scheme !== undefined) setup();
      if (!env.values.interactive) env.pointer.on = false;
      draw();
    },
    refreshTheme() { env.tones = readTones(host, env.scheme); setup(); draw(); },
    pause() { paused = true; stop(); },
    resume() { paused = false; schedule(); },
    destroy() {
      stop();
      sizes.disconnect();
      screen.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      motion?.removeEventListener?.('change', onMotion);
      win.removeEventListener('pointermove', onPointer);
      win.removeEventListener('pointerdown', onDown);
      canvas.remove();
    },
  };
}

// Fixed palettes replace the theme's scales on the effect's own layer (ground, mass, bright, light);
// 'classic' gives each family its own hue, 'theme' leaves the theme alone.
const PALETTES = {
  classic: {primary: [[8, 10, 24], [40, 48, 128], [118, 134, 250], [236, 238, 255]], secondary: [[5, 14, 16], [12, 88, 96], [64, 196, 190], [220, 252, 248]],
    tertiary: [[20, 8, 12], [118, 40, 50], [248, 124, 108], [255, 234, 228]]},
  turquoise: [[6, 11, 15], [12, 72, 90], [66, 178, 202], [216, 246, 255]],
  ocean: [[5, 9, 18], [16, 50, 118], [76, 148, 244], [214, 232, 255]],
  violet: [[10, 7, 20], [58, 28, 122], [162, 116, 252], [238, 226, 255]],
  rose: [[15, 6, 12], [104, 22, 74], [246, 104, 160], [255, 226, 238]],
  emerald: [[5, 13, 12], [8, 76, 62], [56, 190, 142], [216, 255, 238]],
  sunset: [[14, 7, 14], [84, 26, 74], [244, 146, 98], [255, 236, 214]],
  gold: [[12, 10, 6], [74, 54, 20], [226, 176, 82], [255, 242, 208]],
  silver: [[8, 10, 13], [42, 50, 60], [148, 166, 186], [242, 247, 255]],
};
// 'custom' builds the four from the colour setting.
const rgbOf = (hex) => (/^#[0-9a-f]{6}$/iu.test(hex ?? '') ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : [59, 130, 246]);
const customStops = (hex) => { const c = rgbOf(hex); return [c.map((v) => 4 + v * 0.05), c.map((v) => v * 0.42), c, c.map((v) => v + (255 - v) * 0.86)]; };
const SCALE_TONES = [0, 4, 5, 6, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
function paintLayer(host, name, colour) {
  const set = name === 'custom' ? customStops(colour) : PALETTES[name], at = [4, 30, 65, 95];
  for (const family of ['primary', 'secondary', 'tertiary']) for (const tone of SCALE_TONES) {
    const key = `--sf-${family}-${tone}`;
    if (!set) { host.style.removeProperty(key); continue; }
    const stops = set[family] ?? set;
    let i = 0;
    while (i < 2 && tone > at[i + 1]) i += 1;
    const u = max(0, min(1, (tone - at[i]) / (at[i + 1] - at[i])));
    host.style.setProperty(key, `rgb(${stops[i].map((v, c) => round(v + (stops[i + 1][c] - v) * u)).join(' ')})`);
  }
}
export function mount(host, settings = {}, context = {}) {
  let palette = settings.palette ?? 'classic', colour = settings.colour;
  paintLayer(host, palette, colour);
  const scene = mountScene(host, settings, context);
  return {
    ...scene,
    update(next = {}, nextContext = {}) {
      scene.update(next, nextContext);
      const name = next.palette ?? 'classic';
      if (name !== palette || (name === 'custom' && next.colour !== colour)) { palette = name; colour = next.colour; paintLayer(host, palette, colour); scene.refreshTheme(); }
    },
    destroy() { scene.destroy(); paintLayer(host); },
  };
}
