// Lava lamp (simai.effect 1.1.0; schemes dark and light): wax swells out of a warm pool, pinches off
// as teardrops, rises, cools under the top, sinks and merges back. Lit from below, translucent wax.
// The lifecycle is the catalogue template's (seeded still frame, fresh layout while moving, reduced
// motion, hidden tab, off screen, cleanup); colours are palette tones read through a probe.

const {min, max, exp, hypot, ceil} = Math;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// Saturates about the luma: lightness (and text contrast) stays.
const sat = (c, k) => { const m = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722; return c.map((v) => clamp(m + (v - m) * k, 0, 255)); };
const vivid = (c, k) => { const m = (c[0] + c[1] + c[2]) / 3; return c.map((v) => clamp(m + (v - m) * k, 0, 255)); };
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const hash2 = (x, y) => {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
};
const smooth = (t) => t * t * (3 - 2 * t);
const noise2 = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
  return mix(mix(hash2(ix, iy), hash2(ix + 1, iy), fx), mix(hash2(ix, iy + 1), hash2(ix + 1, iy + 1), fx), fy);
};

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

// The threshold of the wax surface in the summed field, and the kernel radius per visual radius.
const T0 = 0.3, KR = 1.73;
// Wax from primary, the liquid from tertiary (dark) or secondary (light).
const SCENE = {
  home: 'dark', seed: 4127, reseed: ['amount', 'heat'], fresh: true,
  tones: (read, scheme) => scheme === 'light'
    ? {top: mixc(read('--sf-neutral-98', '#faf9fe'), read('--sf-tertiary-95', '#ffebfc'), 0.5), low: mixc(read('--sf-neutral-100', '#ffffff'), read('--sf-secondary-95', '#ecf0ff'), 0.6),
      bulb: read('--sf-secondary-90', '#dae2f9'), deep: sat(mixc(read('--sf-primary-70', '#7eabff'), read('--sf-primary-80', '#acc7ff'), 0.6), 1.6), lit: sat(read('--sf-primary-80', '#acc7ff'), 1.4),
      rim: read('--sf-primary-90', '#d8e2ff'), halo: read('--sf-primary-80', '#acc7ff'), shine: [255, 255, 255]}
    : {top: mixc(read('--sf-neutral-5', '#111318'), read('--sf-tertiary-10', '#29132f'), 0.6).map((c) => c * 0.85), low: mixc(read('--sf-tertiary-20', '#402845'), read('--sf-primary-20', '#002e69'), 0.3).map((c) => c * 0.8),
      bulb: vivid(read('--sf-secondary-40', '#565e71'), 1.3), deep: vivid(read('--sf-primary-20', '#002e69'), 1.6), lit: vivid(read('--sf-primary-50', '#2a75e8'), 1.4),
      rim: mixc(read('--sf-primary-70', '#7eabff'), read('--sf-primary-80', '#acc7ff'), 0.4), halo: vivid(read('--sf-primary-40', '#005bbe'), 1.5), shine: read('--sf-tertiary-90', '#fbd7fc')},
  setup(env) {
    const {w, h, values} = env;
    const random = rng(SCENE.seed + env.salt);
    const n = max(3, Math.round((4 + values.amount / 100 * 13) * clamp(w / h / 1.6, 0.6, 1.4)));
    const blobs = [];
    for (let i = 0; i < n; i += 1) {
      const b = blob(random, h * (0.035 + 0.05 * random() ** 1.6), lane(env, random));
      b.y = random() < 0.5 ? h * (1 + 0.2 * b.r / h) : h * (0.1 + random() * 0.85); b.T = random() * 1.1;
      blobs.push(b);
    }
    const state = {blobs, n, random, last: null, pulses: [], q: 1, cost: 0, time: 0};
    buffer(env, state);
    // Prewarm: the first frame (and the still one) is already mid-cycle.
    for (let i = 0, m = 600 + Math.floor(random() * 400); i < m; i += 1) step(env, state, 0.05, false);
    return state;
  },
  press(env, x, y) {
    const {state, w, h} = env;
    state.pulses.push({x, y, a: 1});
    const reach = max(w, h) * 0.08;
    let hit = false;
    // The heat pulse: wax near the point swells at once and starts to rise.
    for (const b of state.blobs) {
      const d = hypot(b.x - x, b.y - y);
      if (d > reach + b.r) continue;
      const f = 1 - max(0, d - b.r) / reach;
      b.T = min(1.6, max(b.T, 0.6) + 0.6 * f); b.sw = min(1.4, b.sw + f); b.vy -= h * 0.06 * f; hit ||= f > 0.3;
    }
    if (hit || state.blobs.length > state.n + 3) return;
    // Nothing near: a blob buds from the pool below the point (it melts back later).
    const b = blob(state.random, h * (0.04 + 0.03 * state.random()), x);
    Object.assign(b, {y: h + b.r * 0.6, T: 1.35, g: 0.25, sw: 0.6, bud: true});
    state.blobs.push(b);
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme} = env;
    const perf = ctx.canvas.ownerDocument.defaultView.performance;
    const t0 = perf.now();
    const dt = state.last === null ? 0 : max(0, min(0.05, t - state.last));
    state.last = t;
    if (dt > 0) step(env, state, dt, true);
    const k = values.intensity / 100, light = scheme === 'light';
    shade(env, state, k, light);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // The liquid and the halo from the coarse buffer, the wax from the fine one: a crisp surface.
    const cw = state.fw / state.s, ch = state.fh / state.s;
    ctx.drawImage(state.buf, 0, 0, cw, ch);
    ctx.drawImage(state.fbuf, 0, 0, cw, ch);
    // The glass: one faint vertical highlight on the right.
    const gx = w * 0.9, gw = w * 0.035, g = ctx.createLinearGradient(gx - gw, 0, gx + gw, 0);
    g.addColorStop(0, rgba(tones.shine, 0)); g.addColorStop(0.5, rgba(tones.shine, (light ? 0.22 : 0.035) * k)); g.addColorStop(1, rgba(tones.shine, 0));
    ctx.fillStyle = g; ctx.fillRect(gx - gw, 0, gw * 2, h);
    // A heat pulse: a warm swell of light, fading over two seconds.
    for (const p of state.pulses) {
      p.a -= dt * 0.5;
      if (p.a <= 0) continue;
      const r = min(w, h) * (0.12 + 0.1 * (1 - p.a)), rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      rg.addColorStop(0, rgba(light ? tones.lit : tones.halo, 0.22 * k * smooth(p.a))); rg.addColorStop(1, rgba(tones.halo, 0));
      ctx.fillStyle = rg; ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    state.pulses = state.pulses.filter((p) => p.a > 0);
    // Degrade gracefully: if frames stay slow, the field buffer gets coarser.
    if (dt > 0) {
      state.cost = mix(state.cost, perf.now() - t0, 0.05);
      if (state.cost > 6 && state.q < 2.5) { state.q *= 1.25; state.cost = 3; buffer(env, state); }
    }
  },
};
// Most wax rises over the centre-right and right; a few lanes cross the text side, faint there.
function lane(env, random) { return env.w * (random() < 0.88 ? 0.5 + random() * 0.46 : 0.22 + random() * 0.3); }
function blob(random, r, x) {
  return {r, lane: x, x, y: 0, T: 0, ph: random() * 100, rate: 0.75 + random() * 0.5, sw: 0, sv: 0, g: 1, sq: 0, ux: 0, uy: -1, vx: 0, vy: 0};
}
// A coarse buffer (~38 000 cells) for the liquid and halo; a fine one (cells ≤ 1.7 CSS px) for the field and the crisp wax.
function buffer(env, state) {
  const {w, h} = env, doc = env.ctx.canvas.ownerDocument;
  const k = max(2, Math.sqrt(w * h / 38000) * state.q), m = max(1, ceil(k / (1.7 * state.q)));
  const bw = max(8, ceil(w / k)), fw = bw * m, s = fw / w, bh = max(8, ceil((h * s + 1) / m)), fh = bh * m;
  const buf = state.buf ?? doc.createElement('canvas'), fbuf = state.fbuf ?? doc.createElement('canvas');
  buf.width = bw; buf.height = bh; fbuf.width = fw; fbuf.height = fh;
  const bctx = buf.getContext('2d'), fctx = fbuf.getContext('2d'), fimg = fctx.createImageData(fw, fh);
  // Over the text zone on the left the wax is only a faint trace.
  const fx = new Float32Array(fw);
  for (let x = 0; x < fw; x += 1) fx[x] = 0.14 + 0.86 * smooth(clamp(((x + 0.5) / fw - 0.2) / 0.36, 0, 1));
  Object.assign(state, {buf, bctx, fbuf, fctx, fimg, px: new Uint32Array(fimg.data.buffer), img: bctx.createImageData(bw, bh), bw, bh, fw, fh, m, s, fx, F: new Float32Array(fw * fh), rx0: new Int32Array(fh), rx1: new Int32Array(fh)});
}
// One step of the lamp: temperature, buoyancy and a viscous lag; heat only in the bottom band.
function step(env, state, dt, live) {
  const {w, h, values, pointer} = env;
  const heat = 0.5 + values.heat / 100, vmax = h * 0.13, bulb = 0.72;
  state.time += dt;
  const T = state.time, blobs = state.blobs, random = state.random;
  const px = pointer.x * w, py = pointer.y * h, warm = live && pointer.on;
  for (const b of blobs) {
    const rr = b.r / h, up = b.y / h;
    const hot = smooth(clamp((up - 0.86) / 0.12, 0, 1)) * (0.6 + 0.4 * exp(-(((b.x / w - bulb) / 0.3) ** 2)));
    let amb = 0.12 - 0.45 * smooth(clamp((0.25 - up) / 0.22, 0, 1)) + hot * (0.95 + 0.6 * heat);
    if (warm) { const d = hypot(b.x - px, b.y - py), reach = max(w, h) * 0.18; if (d < reach) { const f = (1 - d / reach) ** 2; amb += f * 0.9; b.sw = min(1, b.sw + f * dt * 0.6); } }
    const tau = (amb > b.T ? 8 : 24) * (0.7 + rr * 6) / (b.rate * (amb > b.T ? heat : 1));
    b.T += (amb - b.T) * min(1, dt / tau);
    const buoy = b.T - 0.5;
    // Held by the pool, warm wax only swells as a dome until it is hot enough to tear off.
    const held = up > 0.9 && b.T < 1 && buoy > 0;
    const vt = -buoy * vmax * (0.55 + rr * 8) * (1 + 0.15 * b.sw) * (held ? 0.12 : 1);
    b.vy += (vt - b.vy) * min(1, dt * 0.7);
    // Under the top the wax slows and flattens a little.
    const cap = b.y - b.r * 0.8 - h * 0.03;
    if (cap < h * 0.08 && b.vy < 0) b.vy *= max(0, cap / (h * 0.08));
    b.sq += ((cap < h * 0.12 && Math.abs(b.vy) < h * 0.03 ? 1 : 0) - b.sq) * min(1, dt * 0.4);
    const drift = (noise2(b.ph, T * 0.05) - 0.5) * h * 0.05;
    b.vx += ((b.lane - b.x) * 0.06 + drift - b.vx) * min(1, dt * 0.5);
    b.x += b.vx * dt; b.y += b.vy * dt;
    // Resting in the pool the wax sits half sunk; there it drifts to a new lane now and then.
    const floor = h + b.r * 0.25;
    if (b.y > floor) { b.y = floor; if (b.vy > 0) b.vy = 0; if (random() < dt * 0.04) b.lane = lane(env, random); }
    if (b.y < b.r * 0.5) b.y = b.r * 0.5;
    b.sw *= exp(-dt * 0.25);
    b.sv += (b.sw - b.sv) * min(1, dt * 4);
    b.g += (1 - b.g) * min(1, dt * 1.2);
    if (b.bud && b.y >= floor && b.T < 0.45) b.gone = true;
    const sp = hypot(b.vx, b.vy) || 1;
    b.ux += (b.vx / sp * 0.5 - b.ux) * min(1, dt * 2); b.uy += (b.vy / sp - b.uy) * min(1, dt * 2);
  }
  if (blobs.some((b) => b.gone)) state.blobs = blobs.filter((b) => !b.gone);
  // Wax in the liquid keeps a little apart, so blobs pass each other instead of fusing for good.
  for (let i = 0; i < blobs.length; i += 1) for (let j = i + 1; j < blobs.length; j += 1) {
    const a = blobs[i], b = blobs[j], dx = b.x - a.x, dy = b.y - a.y, d = hypot(dx, dy) || 1, m = (a.r + b.r) * 0.9;
    if (d > m || a.y > h * 0.9 || b.y > h * 0.9) continue;
    const f = (1 - d / m) * h * 0.04 * dt;
    a.x -= dx / d * f; b.x += dx / d * f;
  }
}
// The field on the fine buffer (the pool and a stretched kernel per blob); the coarse pass draws the
// liquid and the halo, the fine pass the wax: a one-cell edge, thin = lit, thick = deep, a rim and
// the underside glowing toward the bulb.
function shade(env, state, k, light) {
  const {w, h, tones, values} = env;
  const {bw, bh, fw, fh, m, s, F, img, px, fx, rx0, rx1} = state, d = img.data, time = state.time;
  F.fill(0); px.fill(0); rx0.fill(fw); rx1.fill(-1);
  let pool = fh;
  const heat = 0.5 + values.heat / 100;
  // The pool: a warm layer along the bottom, deeper over the bulb, its surface slowly heaving.
  for (let x = 0; x < fw; x += 1) {
    const u = (x + 0.5) / fw, depth = h * (0.022 + 0.03 * exp(-(((u - 0.72) / 0.3) ** 2)) * heat) * (0.75 + 0.5 * noise2(u * 5 + 3, time * 0.05));
    const top = (h - depth) * s, soft = h * 0.018 * s, y0 = max(0, Math.floor(top - soft * 4)), grow = exp(1 / soft);
    pool = min(pool, y0);
    let p = T0 * exp((y0 + 0.5 - top) / soft);
    for (let y = y0, i = y0 * fw + x; y < fh; y += 1, i += fw) { F[i] += p < 3 ? p : 3; p *= grow; }
  }
  for (const b of state.blobs) {
    const r = b.r * b.g * (1 + 0.3 * b.sv) * s * KR, sp = hypot(b.vx, b.vy) / h;
    const e = clamp(sp / 0.06, 0, 1), st = 1 + e * 0.5, sq = b.sq * 0.15;
    const ul = hypot(b.ux, b.uy) || 1, ux = b.ux / ul, uy = b.uy / ul;
    const front = r * st * (1 - 0.15 * e) * (1 - sq), rear = r * st * (1 + 0.45 * e) * (1 - sq), side = r / Math.sqrt(st) * (1 + sq);
    const R = max(rear, side), cx = b.x * s, cy = b.y * s;
    const x0 = max(0, Math.floor(cx - R)), x1 = min(fw - 1, ceil(cx + R)), y0 = max(0, Math.floor(cy - R)), y1 = min(fh - 1, ceil(cy + R));
    const if2 = 1 / (front * front), ir2 = 1 / (rear * rear), is2 = 1 / (side * side);
    for (let y = y0; y <= y1; y += 1) {
      const dy = y + 0.5 - cy;
      if (x0 < rx0[y]) rx0[y] = x0;
      if (x1 > rx1[y]) rx1[y] = x1;
      for (let x = x0, i = y * fw + x0; x <= x1; x += 1, i += 1) {
        const dx = x + 0.5 - cx, a = dx * ux + dy * uy, c = dy * ux - dx * uy;
        const q = a * a * (a > 0 ? if2 : ir2) + c * c * is2;
        if (q < 1) { const n = 1 - q; F[i] += n * n * n; }
      }
    }
  }
  const {top, low, bulb, deep, lit, rim, halo} = tones, mid = m >> 1;
  for (let y = 0, o = 0; y < bh; y += 1) {
    const fy = min(fh - 1, y * m + mid), v = min(1, fy / s / h), l = smooth(v), row = fy * fw + mid;
    const lr = mix(top[0], low[0], l), lg = mix(top[1], low[1], l), lb = mix(top[2], low[2], l);
    const gy = exp(-(((1 - v) / 0.35) ** 2)) * (light ? 0.5 : 0.24) * k * heat;
    for (let x = 0; x < bw; x += 1, o += 4) {
      const fade = fx[x * m + mid], g = gy * exp(-((((x * m + mid) / fw - 0.72) / 0.4) ** 2)) * fade;
      let r0 = lr + (bulb[0] - lr) * g, g0 = lg + (bulb[1] - lg) * g, b0 = lb + (bulb[2] - lb) * g;
      const f = F[row + x * m];
      if (f > 0.02) {
        const hl = min(1, f / T0) ** 3 * (light ? 0.16 : 0.55) * fade * k;
        r0 += (halo[0] - r0) * hl; g0 += (halo[1] - g0) * hl; b0 += (halo[2] - b0) * hl;
      }
      d[o] = r0; d[o + 1] = g0; d[o + 2] = b0; d[o + 3] = 255;
    }
  }
  state.bctx.putImageData(img, 0, 0);
  const gain = light ? 1.45 : 1.3, rimW = clamp(h * 0.0028, 1.2, 3) * s, slope = h * 0.035 / 2 * s;
  for (let y = 0; y < fh; y += 1) {
    const v = min(1, y / s / h), back = light ? 1 : 0.7 + 0.3 * v, lift = 0.35 + 0.65 * v, upw = y > 0 ? fw : 0, dnw = y < fh - 1 ? fw : 0;
    // Only the spans the wax can reach; the rest stays clear.
    for (let x = y < pool ? rx0[y] : 0, x1 = y < pool ? rx1[y] : fw - 1, i = y * fw + x; x <= x1; x += 1, i += 1) {
      const f = F[i];
      if (f < T0 - 0.15) continue;
      const gx = F[x < fw - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i], gy = F[i + dnw] - F[i - upw];
      const dist = (f - T0) / (Math.sqrt(gx * gx + gy * gy) * 0.5 + 1e-4);
      const a = min(1, clamp(dist * 1.5 + 0.5, 0, 1) * fx[x] * k * gain);
      if (a <= 0.004) continue;
      const th = smooth(clamp(light ? (f - T0) / 0.9 : dist / (rimW * 5), 0, 1));
      const e1 = (light ? Math.abs(dist - rimW * 1.6) : dist - 0.6) / rimW, edge = e1 > 7 ? 0 : exp(-max(0, e1)) * (light ? 0.75 : 0.85) * (0.6 + 0.4 * v);
      const under = gy < 0 && dist < rimW * 30 ? min(1, -gy * slope) * exp(-max(0, dist) / (rimW * 5)) * lift * (light ? 0.6 : 0.85) : 0;
      const over = clamp(gy * slope, 0, 1) * (light ? 0.05 : 0.3), glow = min(1, edge + under), dim = back * (1 - over);
      const r0 = mix(mix(lit[0], deep[0], th) * dim, rim[0], glow), g0 = mix(mix(lit[1], deep[1], th) * dim, rim[1], glow), b0 = mix(mix(lit[2], deep[2], th) * dim, rim[2], glow);
      px[i] = ((a * 255) << 24) | (b0 << 16) | (g0 << 8) | r0;
    }
  }
  state.fctx.putImageData(state.fimg, 0, 0);
}
function mountScene(host, settings, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const env = {ctx, w: 1, h: 1, values: {...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, pointer: {x: 0.5, y: 0.5, on: false}, still: false, rtl: false};
  env.tones = readTones(host, env.scheme);
  env.still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  // Fresh: a new layout on every moving mount; the still frame keeps the seeded one.
  env.salt = SCENE.fresh && !env.still ? Math.floor(Math.random() * 1e6) : 0;
  let paused = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let t = 0;

  const setup = () => { env.state = SCENE.setup(env); };
  const draw = () => SCENE.draw(env, t);
  const loop = (now) => {
    frame = 0;
    t += clamp((now - (last || now)) / 1000, 0, 0.05) * (env.values.speed / 100);
    last = now;
    draw();
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
    const box = host.getBoundingClientRect();
    const ratio = min(2, win.devicePixelRatio || 1);
    env.w = max(1, box.width);
    env.h = max(1, box.height);
    canvas.width = Math.round(env.w * ratio);
    canvas.height = Math.round(env.h * ratio);
    env.rtl = win.getComputedStyle(host).direction === 'rtl';
    ctx.setTransform(env.rtl ? -ratio : ratio, 0, 0, ratio, env.rtl ? canvas.width : 0, 0);
    setup();
    draw();
  };
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  const screen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else stop(); });
  screen.observe(host);
  const onVisibility = () => (doc.hidden ? stop() : schedule());
  doc.addEventListener('visibilitychange', onVisibility);
  const onMotion = () => { env.still = Boolean(context.reducedMotion) || motion.matches; if (env.still) { stop(); draw(); } else schedule(); };
  motion?.addEventListener?.('change', onMotion);
  // Pointer reactions listen on the window, passively: the host takes no pointer events.
  const onPointer = (event) => {
    const box = host.getBoundingClientRect();
    env.pointer.x = (event.clientX - box.left) / max(1, box.width);
    if (env.rtl) env.pointer.x = 1 - env.pointer.x;
    env.pointer.y = (event.clientY - box.top) / max(1, box.height);
    env.pointer.on = env.values.interactive !== false && env.pointer.x >= 0 && env.pointer.x <= 1 && env.pointer.y >= 0 && env.pointer.y <= 1;
  };
  win.addEventListener('pointermove', onPointer, {passive: true});
  // A press inside the host's box, never from a link, a button or a field over it.
  const inside = (event) => {
    if (env.values.interactive === false || env.still || paused) return null;
    if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return null;
    const box = host.getBoundingClientRect();
    const x = env.rtl ? box.right - event.clientX : event.clientX - box.left, y = event.clientY - box.top;
    return x >= 0 && y >= 0 && x <= box.width && y <= box.height ? [x, y] : null;
  };
  const onDown = (event) => {
    if (event.button !== 0) return;
    const at = inside(event);
    if (!at) return;
    SCENE.press(env, at[0], at[1]);
    schedule();
  };
  win.addEventListener('pointerdown', onDown, {passive: true});

  resize();
  schedule();

  return {
    update(next, nextContext = {}) {
      const before = env.values;
      env.values = {...next};
      if (nextContext.scheme !== undefined && nextContext.scheme !== env.scheme) {
        env.scheme = nextContext.scheme;
        env.tones = readTones(host, env.scheme);
      }
      if ((SCENE.reseed ?? []).some((key) => before[key] !== env.values[key]) || nextContext.scheme !== undefined) setup();
      if (!env.values.interactive) env.pointer.on = false;
      draw();
    },
    refreshTheme() { env.tones = readTones(host, env.scheme); draw(); },
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

// The fixed palettes stand in for the theme's colour scales on the effect's own layer: a dark
// ground, the mass, the bright colour, the hot one. 'classic' gives each family its own (orange wax,
// amber light liquid, violet dark liquid); 'theme' leaves the theme's scales alone.
const PALETTES = {
  classic: {primary: [[16, 6, 4], [128, 38, 14], [255, 122, 48], [255, 232, 204]], secondary: [[14, 10, 4], [96, 62, 10], [246, 190, 70], [255, 244, 212]],
    tertiary: [[9, 5, 20], [62, 22, 104], [160, 100, 236], [240, 230, 255]]},
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
