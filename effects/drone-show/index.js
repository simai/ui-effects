// Drone show (simai.effect 1.4.0; dark, light): drones form 3D figures in the sky.

const {sin, cos, sqrt, min, max, abs, PI, floor, ceil, hypot, round, sign, log, exp, asin} = Math;
const TAU = PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const rng = seed => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const smooth = t => t * t * (3 - 2 * t);
const fr = x => x - floor(x);
const side = i => (i & 1) * 2 - 1;

function readTones(host, day) {
  const doc = host.ownerDocument, probe = host.appendChild(doc.createElement('i')), pixel = doc.createElement('canvas').getContext('2d', {willReadFrequently: true});
  probe.style.cssText = 'position:absolute;visibility:hidden';
  const tones = SCENE.tones((name, fallback) => {
    probe.style.color = `var(--sf-${name}, ${fallback})`;
    pixel.fillStyle = fallback; pixel.fillStyle = getComputedStyle(probe).color; pixel.fillRect(0, 0, 1, 1);
    return [...pixel.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, day);
  probe.remove();
  return tones;
}

// Figures: point i of n at t (y up, z to the viewer); ramp place, brightness.
const P = [0, 0, 0, 0, 1];
const put = (x, y, z, c, b = 1) => { P[0] = x; P[1] = y; P[2] = z; P[3] = c; P[4] = b; };
// Land, 72 x 29 cells of 5° from 80 N (Natural Earth, public domain); below 65 S all land.
const LAND = 'AAAz/wEAAYAAABq4fgAAD/yAH//mOAHj////H/+EMAf////+CH/GAAJ///8AAD//ADf///8QAB/+AB////8AAB/8AD3P//wAAB/4ADR///UAAA/wAD4f//AAAAMQAH////AAAAEAAP//P+AAAADAAH/+GYAAAAAgAH/8EMAAAAAPAH/8AAgAAAAPwAP4ALAAAAAP8APwAKcAAAAP+APwAADAAAAH8APwAAIAAAAD8AP0AA+AAAAD8AHkAB/AAAADwAHAAB/gAAADwADAAB3AAAAHAAAAAADAAAAGAAAAAAAAAAAEAAAAAAAAAAAE';
let land = null;
const onLand = (lat, lon) => {
  land ??= atob(LAND);
  const row = floor((80 - lat) / 5), k = row * 72 + clamp(floor((lon + 180) / 5), 0, 71);
  return row < 0 ? 0 : row > 28 ? 1 : (land.charCodeAt(k >> 3) >> (7 - (k & 7))) & 1;
};
const FIG = {
  bird: {
    pose: t => [-.95 + .5 * sin(t * .32), .55, .18 * sin(t * .32 + 1)],
    at(i, n, t, s, c) {
      const flap = smooth(clamp(.5 + sin(t * .6) * 1.6, 0, 1)), f = sin(t * 3.3), a = .12 + .62 * flap * f, bob = -.08 * flap * f, u = i / n;
      if (u < .66) {
        const ang = a * (1 + .9 * s), r = .1 + 1.08 * s;
        return put(side(i) * r * cos(ang), r * sin(ang) + bob + .03, .2 - .36 * s * s - c * (.5 * (1 - s) ** .75 + .04), .36 * (1 - s), 1 - .25 * c);
      }
      if (u < .71) { const th = s * TAU, ph = c * PI; return put(.065 * sin(ph) * cos(th), .08 + .065 * cos(ph) + bob, .55 + .065 * sin(ph) * sin(th), .36); }
      if (u < .725) return put(.02 * (c - .5), .07 + bob, .61 + .12 * s, .7);
      if (u < .9) { const z = .5 - s, r = .13 * sqrt(max(0, 1 - z * z * 4)), th = c * TAU; return put(r * cos(th), r * sin(th) * .85 + bob, z * .95 + .02, .33); }
      return put((c - .5) * (.08 + .4 * s), bob + .02 * s, -.45 - .36 * s, .25, .9);
    },
  },
  whale: {
    pose: t => [-.35 + .45 * sin(t * .26), .22 + .08 * sin(t * .4), .06 * sin(t * .5)],
    at(i, n, t, s, c) {
      const u = i / n, wave = q => .13 * q * q * sin(t * 1.7 - q * 2.6);
      if (u < .74) {
        const r = s < .3 ? .3 * sin(s / .3 * PI / 2) ** .55 + .02 : .32 * ((1 - s) / .7) ** 1.25 + .03, y = r * sin(c * TAU), belly = max(0, -sin(c * TAU));
        return put(-.95 + 1.8 * s, y * (y < 0 ? .75 : .9) + wave(s), r * cos(c * TAU), .04 + .28 * belly, .9 + .1 * belly);
      }
      if (u < .88) return put(.85 + .06 * s + c * (.2 * (1 - s) + .04), wave(1) - .025 * s + .03 * sin(t * 1.7), side(i) * s * .5, .12);
      const w = .09 * sin(PI * min(1, s * 1.3)) + .01;
      return put(-.45 + .3 * s + (c - .5) * w, -.15 - .38 * s + wave(.3), side(i) * (.24 + .32 * s), .3, .95);
    },
  },
  jellyfish: {
    pose: t => [t * .3, .42, .14 * sin(t * .45)],
    at(i, n, t, s, c) {
      const u = i / n, pp = (.5 + .5 * sin(t * 1.5)) ** 2, R = .58 * (1 - .14 * pp), rim = .18 + .12 * pp;
      if (u < .5) {
        const a = s * 1.45, ph = c * TAU, r = R * sin(a) * (1 + .04 * sin(ph * 8) * s) * (1 + .12 * max(0, s - .7));
        return put(r * cos(ph), rim + .46 * (1 + .2 * pp) * cos(a) - .06 * max(0, a - 1.2), r * sin(ph), .12 + .3 * (1 - s));
      }
      if (u < .86) {
        const k = floor(c * 14), ph = k / 14 * TAU, sw = .09 * s * sin(s * 6 - t * 2 + k), r = R * .92 * (1 - .3 * s);
        return put(r * cos(ph) - sw * sin(ph), rim - .08 - s * 1.15, r * sin(ph) + sw * cos(ph), .62 + .36 * s, .85 - .3 * s);
      }
      const ph = floor(c * 4) / 4 * TAU + s * 3 + t * .3, r = .06 + .1 * sin(s * 9 - t * 1.5) ** 2;
      return put(r * cos(ph), rim - s * .75, r * sin(ph), .42 + .3 * s, .95);
    },
  },
  flower: {
    pose: t => [t * .22, .42, 0],
    at(i, n, t, s, c) {
      const u = i / n, b = smooth(clamp((t - .5) / 4.5, 0, 1)) * (.94 + .06 * sin(t * .8));
      if (u < .8) {
        const all = s * 11, p = floor(all), L = +(p > 5), ph = (p - 6 * L) / (6 - L) * TAU + L * .6, len = L ? .56 : .95, e = fr(all) * 2 - 1;
        const v = sign(e) * (1 - (1 - abs(e)) ** 3), w = .5 * len * sin(PI * c ** .8), tilt = mix(.1, L ? .5 : 1.08, b) + .32 * c * c * b * (L ? .5 : 1);
        const r = len * c * sin(tilt), y = len * c * cos(tilt) + .2 * v * v * w + .25, d = v * w;
        return put(r * cos(ph) - d * sin(ph), y, r * sin(ph) + d * cos(ph), L ? .7 : 1 - .14 * c, .75 + .25 * abs(v));
      }
      if (u < .88) { const th = c * TAU, ph = s * PI * .5; return put(.11 * sin(ph) * cos(th), .26 + .08 * cos(ph), .11 * sin(ph) * sin(th), .66); }
      if (u < .95) return put(.06 * sin(s * 3), .2 - s * 1.12, 0, 0, .6);
      const w = .1 * sin(PI * s) * (c - .5);
      return put(.04 + .4 * s, -.5 + .18 * s - .2 * s * s + w, w * .6, .05, .6);
    },
  },
  earth: {
    pose: t => [t * .32 - .6, .18, .41],
    back: .1, R: .86,
    at(i, n) {
      const e = FIG.earth, nl = round(n * .6);
      if (e.n !== n) {
        const m = round(n * 2.4), sets = [[], []], pick = (set, k) => Array.from({length: k}, (_, j) => set[floor(j * set.length / k)]);
        for (let k = 0; k < m; k++) {
          const y = 1 - 2 * (k + .5) / m, r = .86 * sqrt(1 - y * y), lon = fr(k * .381966) * TAU - PI;
          sets[onLand(asin(y) * 57.3, lon * 57.3)].push([r * sin(lon), .86 * y, r * cos(lon)]);
        }
        e.pts = [...pick(sets[1], nl), ...pick(sets[0], n - nl)]; e.n = n;
      }
      return put(...e.pts[i], i < nl ? .56 : .02, i < nl ? 1 : .3);
    },
  },
  planet: {
    pose: t => [t * .25, .32 + .12 * sin(t * .3), .42],
    back: 0, R: .5,
    at(i, n, t, s, c) {
      if (i / n < .42) { const y = 1 - 2 * s, r = .5 * sqrt(1 - y * y); return put(r * cos(c * TAU), .5 * y, r * sin(c * TAU), .68 + .1 * sin(y * 11), .9 + .1 * sin(y * 7)); }
      let q = sqrt(mix(.47, 1.35, s));
      if (q > .93 && q < .99) q += .06;
      const th = c * TAU + t * .5 / q ** 1.5;
      return put(q * cos(th), 0, q * sin(th), .3 - .12 * (q > .99), .9);
    },
  },
  galaxy: {
    pose: t => [t * .12, 1.02, .35],
    at(i, n, t, s, c) {
      if (i / n < .14) { const y = 1 - 2 * s, r = .2 * sqrt(s) * sqrt(1 - y * y); return put(r * cos(c * TAU), y * .08, r * sin(c * TAU), .62); }
      const q = .14 + .92 * s, spread = (c - .5) * (.5 + .5 * q) * (i % 5 ? 1 : 4), th = (i & 1) * PI + log(q / .14) * 3.2 + spread + t * .3 * (1.3 - q), r = q * (1 + .1 * (fr(i * .618) - .5));
      return put(r * cos(th), .05 * (fr(i * .37) - .5) * (1 - q), r * sin(th), clamp(.56 - .62 * q + (fr(i * .13) < .03) * .6, 0, 1), .6 + .4 * max(0, 1 - abs(spread) * 2));
    },
  },
  heart: {
    pose: t => [.65 * sin(t * .35), .12, 0],
    at(i, n, t, s, c) {
      const m = fr(t / 1.15), a = s * TAU, v = c * 2 - 1, k = (1 - v * v) ** .4 * (1 + .09 * exp(-(((m - .06) / .06) ** 2)) + .05 * exp(-(((m - .26) / .07) ** 2)));
      return put(16 * sin(a) ** 3 / 17 * k, (13 * cos(a) - 5 * cos(2 * a) - 2 * cos(3 * a) - cos(4 * a) + 2) / 17 * k, v * .42, .97 - .2 * (1 - k), 1);
    },
  },
};
const SETS = {all: Object.keys(FIG), nature: ['bird', 'whale', 'jellyfish', 'flower', 'heart'], space: ['earth', 'planet', 'galaxy']};

// Take-off, then drones fly to rank-matched targets, top first.
const OPEN = 5, HOLD = 7.5, MOVE = 3.8, CYCLE = HOLD + MOVE, CAM = 3.6, BINS = 32, A1 = .7548776662, A2 = .569840291;
const SCENE = {
  seed: 2207, reseed: ['drones', 'size', 'figures'],
  tones(read, day) {
    const deep = read('primary-10', '#001a41'), pale = read('neutral-98', '#faf9fe'), ramp = [read('primary-70', '#7eabff'), read('primary-95', '#ecf0ff'), read('secondary-80', '#c1c6d7'), read('tertiary-70', '#cd9ad6')];
    return day ? {day, sky: [mixc(ramp[0], pale, .5), mixc(ramp[1], pale, .6)], ramp: ramp.map(c => c.map(v => v * v / 390))}
      : {sky: [mixc(read('neutral-4', '#0c0e13'), deep, .35), mixc(read('neutral-10', '#1a1b20'), read('primary-20', '#002e69'), .32)], ramp};
  },
  setup(env) {
    const {w, h, values} = env, random = rng(SCENE.seed + env.salt), wide = w > h * 1.15, n = clamp(round(10 * values.drones), 300, 1500);
    const zone = wide ? {x: w * .72, y: h * .5, s: min(w * .2, h * .36), wide} : {x: w * .68, y: h * .22, s: min(w * .26, h * .15)};
    zone.s *= values.size / 100;
    const deck = [], names = SETS[values.figures] ?? SETS.all, f = () => new Float32Array(n), ids = () => new Int32Array(n).map((_, i) => i);
    while (deck.length < 48) {
      const round = names.map(name => [random(), name]).sort().map(e => e[1]);
      if (round[0] === deck.at(-1)) round.push(round.shift());
      deck.push(...round);
    }
    if (env.still) deck[0] = values.figures === 'nature' ? 'whale' : 'planet';
    const st = {n, zone, deck, A: ids(), B: ids(), order: ids(), bj: -1, delay: f(), side: f(), ph: f(), gx: f(), gz: f(), X: f(), Y: f(), Z: f(), R: f(), L: f(), C: new Uint8Array(n),
      ox: f(), oy: f(), vx: f(), vy: f(), yaw: 0, pitch: 0, drag: 0, last: null, ground: -(h - zone.y) / zone.s - .15};
    for (let i = 0; i < n; i++) { st.side[i] = random() * 2 - 1; st.ph[i] = random() * TAU; st.gx[i] = (fr(i * .618034) * 2 - 1) * 1.7; st.gz[i] = random() - .5; }
    return st;
  },
  paint(env) {
    const {tones, tones: {day}, state: st, w, h} = env, doc = env.ctx.canvas.ownerDocument, k = env.values.intensity / 100, canvas = (cw, ch) => Object.assign(doc.createElement('canvas'), {width: cw, height: ch});
    st.tones = tones;
    st.sprites = Array.from({length: BINS}, (_, b) => {
      const q = b / (BINS - 1) * 3, i = min(2, floor(q)), col = mixc(tones.ramp[i], tones.ramp[i + 1], q - i), sprite = canvas(48, 48), g = sprite.getContext('2d'), glow = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      [[0, day ? col : mixc(col, [255, 255, 255], .65), 1], [day ? .22 : .11, col, day ? 1 : .95], [day ? .3 : .2, col, day ? .3 : .32], [.45, col, .08], [1, col, 0]].forEach(([at, c, a]) => glow.addColorStop(at, rgba(c, a)));
      g.fillStyle = glow;
      g.fillRect(0, 0, 48, 48);
      return sprite;
    });
    const ratio = env.ctx.getTransform().d || 1, sky = canvas(round(w * ratio), round(h * ratio)), g = sky.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, h), random = rng(91);
    g.scale(ratio, ratio);
    tones.sky.forEach((c, i) => grad.addColorStop(i, rgba(c)));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    if (day) for (let i = 0; i < 9; i++) {
      const x = random() * w, y = h * (.7 + 2.6 * random()), r = (.08 + .18 * random()) * w, cl = g.createRadialGradient(x, y, 0, x, y, r);
      cl.addColorStop(0, rgba([255, 255, 255], .55 * k)); cl.addColorStop(1, '#fff0');
      g.setTransform(ratio, 0, 0, ratio * .3, 0, 0); g.fillStyle = cl; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    else for (let i = 0; i < w * h / 9000; i++) { g.fillStyle = rgba(tones.ramp[1], (.04 + .16 * random() ** 3) * k); g.fillRect(random() * w, random() * h * .85, 1, 1); }
    st.sky = sky;
  },
  place(name, i, n, t, M, out) {
    const fig = FIG[name];
    fig.at(i, n, t, fr(.5 + i * A1), fr(.5 + i * A2));
    const [x, y, z, c, b] = P, wave = sin((x * .8 + y * .6 - z * .3) * 3.4 - t * 1.7);
    const wx = M[0] * x + M[3] * y + M[6] * z, wy = M[1] * x + M[4] * y + M[7] * z, wz = M[2] * x + M[5] * y + M[8] * z;
    const d2 = fig.R ? (wx * wx + wy * wy) / fig.R / fig.R : 2;
    out[0] = wx; out[1] = wy; out[2] = wz; out[3] = clamp(c + .07 * wave, 0, 1);
    out[4] = b * (.8 + .2 * wave) * (d2 > .98 ? 1 : wz < 0 ? fig.back : .4 + .6 * sqrt(1 - d2));
  },
  matrix(env, name, t) {
    const st = env.state, [yaw, pitch, roll] = FIG[name].pose(t), ya = yaw + st.yaw + st.drag, pa = pitch + st.pitch;
    const cy = cos(ya), sy = sin(ya), cr = cos(roll), sr = sin(roll), cp = cos(pa), sp = sin(pa), M = [];
    for (const [x, y, z] of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const z1 = z * cy - x * sy, x2 = (x * cy + z * sy) * cr - y * sr, y2 = (x * cy + z * sy) * sr + y * cr;
      M.push(x2, y2 * cp - z1 * sp, y2 * sp + z1 * cp);
    }
    return M;
  },
  ranks(set) {
    const band = ceil(sqrt(set.length)), out = [];
    set.sort((a, b) => b[2] - a[2]);
    for (let i = 0; i < set.length; i += band) out.push(...set.slice(i, i + band).sort((a, b) => a[1] + a[3] * .3 - b[1] - b[3] * .3).map(e => e[0]));
    return out;
  },
  assign(env, to, opening) {
    const st = env.state, {n} = st, random = rng(st.bj * 31 + 7), M = SCENE.matrix(env, to, 0), o = [], band = ceil(sqrt(n));
    const goal = Array.from({length: n}, (_, i) => { SCENE.place(to, i, n, 0, M, o); return [i, o[0], o[1], o[2]]; });
    const order = opening ? goal.sort((a, b) => a[1] - b[1]).map(e => e[0]) : SCENE.ranks(goal);
    const drones = opening ? [...order.keys()].sort((a, b) => st.gx[a] - st.gx[b]) : SCENE.ranks(Array.from({length: n}, (_, d) => [d, st.X[d], -st.Y[d], st.Z[d]]));
    drones.forEach((d, k) => { st.B[d] = order[k]; st.delay[d] = opening ? .3 * random() + .2 * k / n : .36 * floor(k / band) / (n / band) + .1 * random(); });
  },
  click(env, x, y) {
    const st = env.state, reach = st.zone.s * .8;
    for (let i = 0; i < st.n; i++) {
      const dx = st.X[i] - x, dy = st.Y[i] - y, d = hypot(dx, dy) + 1, f = (1 - d / reach) * 14;
      if (f > 0) { st.vx[i] += dx / d * f; st.vy[i] += dy / d * f; }
    }
  },
  draw(env, time) {
    const {ctx, w, h, state: st, values, pointer} = env, {zone, n, X, Y, Z, R, L, C, vx, vy, ox, oy, B} = st;
    if (st.tones !== env.tones) SCENE.paint(env);
    ctx.drawImage(st.sky, 0, 0, w, h);
    const dt = st.last === null ? 0 : clamp(time - st.last, 0, .05), springs = .9 ** (dt * 60), ease = min(1, dt * 3);
    st.last = time;
    const t = env.still ? OPEN + 4 : time, opening = t < OPEN, j = opening ? 0 : floor((t - OPEN) / CYCLE), r = t - OPEN - j * CYCLE, moving = !opening && r > HOLD;
    const start = k => (k ? OPEN + (k - 1) * CYCLE + HOLD : 0), nameA = st.deck[j % 48], nameB = st.deck[(j + 1) % 48];
    st.yaw += ((pointer.on ? (pointer.x - zone.x / w) * .7 : 0) - st.yaw) * ease;
    st.pitch += ((pointer.on ? (pointer.y - zone.y / h) * .4 : 0) - st.pitch) * ease;
    const key = opening ? 'open' : `${j}${moving}`;
    if (key !== st.key) {
      if (opening) { st.bj = 0; SCENE.assign(env, nameA, true); } else {
        if (st.bj !== j) { B.forEach((_, i) => { B[i] = i; }); st.bj = j; }
        if (moving) { st.A.set(B); st.bj = j + 1; SCENE.assign(env, nameB); }
      }
      st.key = key;
    }
    const tA = t - start(j), tB = t - start(j + 1), MA = SCENE.matrix(env, nameA, tA), MB = moving && SCENE.matrix(env, nameB, tB);
    const p = opening ? t / OPEN * 1.15 : moving ? (r - HOLD) / MOVE : 1, k = values.intensity / 80, unit = zone.s * .03 * sqrt(1000 / n) ** .6, b = [];
    let a = [];
    for (let d = 0; d < n; d++) {
      const q = smooth(clamp((p - st.delay[d]) / (opening ? .62 : .52), 0, 1)), arc = moving * sin(PI * q);
      SCENE.place(moving ? nameB : nameA, B[d], n, moving ? tB : tA, MB || MA, b);
      if (moving) SCENE.place(nameA, st.A[d], n, tA, MA, a);
      else if (opening) a = [st.gx[d], st.ground, st.gz[d], b[3], 0];
      else a = b;
      const x = mix(a[0], b[0], q), y = mix(a[1], b[1], opening ? 1 - (1 - q) ** 3 : q) + arc * .12, z = mix(a[2], b[2], q) + arc * st.side[d] * .35, c = mix(a[3], b[3], q), l = mix(a[4], b[4], q) * (1 - .15 * arc);
      const per = CAM / (CAM - z), sp = dt * 60;
      vx[d] = (vx[d] - ox[d] * .06 * sp) * springs; vy[d] = (vy[d] - oy[d] * .06 * sp) * springs;
      ox[d] += vx[d] * sp; oy[d] += vy[d] * sp;
      const sx = zone.x + (x + .005 * sin(time * 1.7 + st.ph[d])) * zone.s * per + ox[d], sy = zone.y - (y + .005 * sin(time * 1.3 + st.ph[d] * 1.7)) * zone.s * per + oy[d];
      X[d] = sx; Y[d] = sy; Z[d] = z; R[d] = unit * per ** 1.6; C[d] = round(c * (BINS - 1));
      L[d] = l * k * (zone.wide ? .14 + .86 * smooth(clamp((sx / w - .34) / .18, 0, 1)) : 1) * clamp(.35 + .65 * (per - .78) / .55, .2, 1);
    }
    st.order.sort((u, v) => Z[u] - Z[v]);
    for (const d of st.order) {
      if (L[d] < .01) continue;
      ctx.globalAlpha = min(1, L[d]);
      ctx.drawImage(st.sprites[C[d]], X[d] - R[d], Y[d] - R[d], R[d] * 2, R[d] * 2);
    }
    ctx.globalAlpha = 1;
  },
};

function mountScene(host, settings, context = {}) {
  const doc = host.ownerDocument, win = doc.defaultView, canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false}), motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const env = {ctx, w: 1, h: 1, values: {...settings}, scheme: context.scheme, pointer: {x: .5, y: .5, on: false}}, retone = () => { env.tones = readTones(host, env.scheme === 'light'); };
  retone();
  env.still = !!(context.reducedMotion || motion?.matches);
  env.salt = env.still ? 0 : floor(Math.random() * 1e6);
  let paused = false, visible = true, frame = 0, last = 0, t = 0, pressed = null;
  const setup = () => { env.state = SCENE.setup(env); };
  const draw = () => SCENE.draw(env, t);
  const loop = now => {
    frame = 0; t += clamp((now - (last || now)) / 1000, 0, .05) * (env.values.speed / 100); last = now;
    draw(); schedule();
  };
  const schedule = () => { if (!frame && !env.still && !paused && visible && !doc.hidden) frame = win.requestAnimationFrame(loop); };
  const stop = () => { if (frame) win.cancelAnimationFrame(frame); frame = last = 0; };
  const resize = () => {
    const box = host.getBoundingClientRect(), ratio = min(2, win.devicePixelRatio || 1);
    env.w = max(1, box.width); env.h = max(1, box.height);
    canvas.width = round(env.w * ratio); canvas.height = round(env.h * ratio);
    env.rtl = win.getComputedStyle(host).direction === 'rtl';
    ctx.setTransform(env.rtl ? -ratio : ratio, 0, 0, ratio, env.rtl ? canvas.width : 0, 0);
    setup(); draw();
  };
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  const screen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else stop(); });
  screen.observe(host);
  const onVisibility = () => (doc.hidden ? stop() : schedule());
  doc.addEventListener('visibilitychange', onVisibility);
  const onMotion = () => { env.still = !!(context.reducedMotion || motion.matches); if (env.still) { stop(); draw(); } else schedule(); };
  motion?.addEventListener?.('change', onMotion);
  // Passive window listeners, x mirrored in RTL; no press on a control.
  const at = event => {
    const box = host.getBoundingClientRect();
    return [env.rtl ? box.right - event.clientX : event.clientX - box.left, event.clientY - box.top, box];
  };
  const onPointer = event => {
    const [x, y, box] = at(event), p = env.pointer, st = env.state;
    p.x = x / max(1, box.width);
    p.y = y / max(1, box.height);
    p.on = env.values.interactive !== false && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
    if (!pressed) return;
    if (hypot(x - pressed.x, y - pressed.y) > 6) pressed.drag = true;
    if (pressed.drag) st.drag += (x - pressed.lx) * .008;
    pressed.lx = x;
  };
  const onDown = event => {
    if (event.button !== 0 || env.values.interactive === false || env.still || paused) return;
    if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return;
    const [x, y, box] = at(event);
    if (x >= 0 && y >= 0 && x <= box.width && y <= box.height) pressed = {x, y, lx: x, time: event.timeStamp};
  };
  const onUp = event => {
    if (pressed && !pressed.drag && event.timeStamp - pressed.time < 500) SCENE.click(env, ...at(event)); pressed = null;
  };
  const listen = [['pointermove', onPointer], ['pointerdown', onDown], ['pointerup', onUp], ['pointercancel', () => { pressed = null; }]];
  for (const [type, fn] of listen) win.addEventListener(type, fn, {passive: true});
  resize(); schedule();
  return {
    update(next, scheme = env.scheme) {
      const before = env.values;
      env.values = {...next};
      if (scheme !== env.scheme) { env.scheme = scheme; retone(); }
      if (SCENE.reseed.some(key => before[key] !== env.values[key])) setup();
      if (before.intensity !== env.values.intensity) env.state.tones = null;
      if (!env.values.interactive) env.pointer.on = false;
      draw();
    },
    refreshTheme() { retone(); draw(); },
    pause() { paused = true; stop(); },
    resume() { paused = false; schedule(); },
    destroy() {
      stop(); sizes.disconnect(); screen.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      motion?.removeEventListener?.('change', onMotion);
      for (const [type, fn] of listen) win.removeEventListener(type, fn);
      canvas.remove();
    },
  };
}

// Palettes replace the theme scales on the effect layer; 'theme' keeps them.
const PALETTES = {
  show: {primary: [[4, 8, 22], [18, 64, 112], [96, 204, 255], [236, 250, 255]], secondary: [[14, 9, 4], [100, 60, 12], [255, 186, 84], [255, 242, 220]],
    tertiary: [[14, 5, 12], [104, 22, 72], [255, 112, 172], [255, 228, 240]]},
  turquoise: [[6, 11, 15], [12, 72, 90], [66, 178, 202], [216, 246, 255]],
  ocean: [[5, 9, 18], [16, 50, 118], [76, 148, 244], [214, 232, 255]],
  violet: [[10, 7, 20], [58, 28, 122], [162, 116, 252], [238, 226, 255]],
  rose: [[15, 6, 12], [104, 22, 74], [246, 104, 160], [255, 226, 238]],
  emerald: [[5, 13, 12], [8, 76, 62], [56, 190, 142], [216, 255, 238]],
  sunset: [[14, 7, 14], [84, 26, 74], [244, 146, 98], [255, 236, 214]],
  gold: [[12, 10, 6], [74, 54, 20], [226, 176, 82], [255, 242, 208]],
  silver: [[8, 10, 13], [42, 50, 60], [148, 166, 186], [242, 247, 255]],
};
const rgbOf = hex => (/^#[0-9a-f]{6}$/iu.test(hex ?? '') ? [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) : [59, 130, 246]);
const customStops = hex => { const c = rgbOf(hex); return [c.map(v => 4 + v * .05), c.map(v => v * .42), c, c.map(v => v + (255 - v) * .86)]; };
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
  let palette = settings.palette, colour = settings.colour;
  paintLayer(host, palette, colour);
  const scene = mountScene(host, settings, context);
  return {
    ...scene,
    update(next = {}, nextContext = {}) {
      scene.update(next, nextContext.scheme);
      if (next.palette !== palette || (next.palette === 'custom' && next.colour !== colour)) { palette = next.palette; colour = next.colour; paintLayer(host, palette, colour); scene.refreshTheme(); }
    },
    destroy() { scene.destroy(); paintLayer(host); },
  };
}
