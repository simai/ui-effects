// Rain on glass (simai.effect 1.1.0; dark scheme only): a fogged window on a rainy night: behind it a wet street goes off into the haze, its lamps, shop windows, neon signs, traffic light and cars mirrored in the road. Wipe the glass with a finger, and the street comes sharp.
//
// The lifecycle is the catalogue template's: one canvas in the host, devicePixelRatio capped at 2,
// a seeded scene (the same picture on every mount at the defaults), one still frame for reduced
// motion, no frames while the tab is hidden or the area is off screen, and nothing left behind.
// Colours are palette tones of the theme, read through a probe so var() chains settle.

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

// A fogged window on a rainy night. Behind it a street goes off into the haze: the sky glows warm
// over the city and the far road melts into it; sodium lamps fade in two rows, shop windows and
// neon signs (a red-orange CAFE on the right, a few smaller ones) burn on the facades, a traffic
// light changes red, amber, green from top to bottom, and cars pass, white lights coming, red going.
// Every light streaks straight down the wet road, broken by ripples, and lights the rain in front of
// it. On the glass the fog blurs it all into soft discs; where a finger wipes the fog, and through
// the drops, the street shows sharp. Press and drag to write; drips run, fog returns.
const SCENE = {
  home: 'dark', seed: 61, reseed: ['density', 'lamps', 'signal', 'neon', 'intensity'],
  tones: (read) => ({
    sky: read('--sf-neutral-6', '#16181d'), glowSky: read('--sf-warning-10', '#2f1500'), haze: read('--sf-warning-20', '#4f2500'), road: read('--sf-neutral-4', '#0c0e13'),
    facade: read('--sf-neutral-5', '#111318'), lamp: read('--sf-warning-80', '#ffb95c'), white: read('--sf-neutral-95', '#f0f0f7'), cool: read('--sf-primary-80', '#adc6ff'),
    pane: read('--sf-warning-90', '#ffdcbe'), neon: read('--sf-error-60', '#ff5449'), core: read('--sf-warning-95', '#ffeee1'), pink: read('--sf-tertiary-70', '#c798cd'),
    amber: read('--sf-warning-70', '#f19d47'), go: read('--sf-success-70', '#4cbb6f'), stop: read('--sf-error-50', '#de3730'), head: read('--sf-neutral-98', '#faf9fe'),
    tail: read('--sf-error-60', '#ff5449'), fog: read('--sf-neutral-30', '#45464f'),
  }),
  setup(env, random) {
    const {w, h} = env;
    const f = Math.min(h * 1.05, w * 0.75), cx = w * 0.47, horizon = h * 0.5;
    const cars = [];
    const busy = env.values.traffic / 100;
    if (random() < busy + 0.3) cars.push({way: 1, z: 9 + random() * 8, speed: 3 + random() * 2, lane: 1.8 + random() * 0.4});
    if (random() < busy + 0.1) cars.push({way: -1, z: 18 + random() * 20, speed: 5 + random() * 3, lane: -2 - random() * 0.4});
    const beads = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const b = beads.getContext('2d');
    for (let i = 0, count = w * h / 14; i < count; i += 1) {
      const x = random() * w, y = random() * h, r = 0.4 + random() ** 4 * 2.2;
      b.fillStyle = `rgba(255,255,255,${0.35 + random() * 0.65})`;
      b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill();
    }
    const mask = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const mk = mask.getContext('2d');
    mk.fillStyle = '#000';
    mk.fillRect(0, 0, w, h);
    const drops = Array.from({length: Math.round(w * h / 9000)}, () => {
      const r = 2.5 + random() ** 2 * 7;
      return {x: random() * w, y: random() * h, r, stretch: 1 + random() * 0.25};
    });
    mk.globalCompositeOperation = 'destination-out';
    for (const d of drops) { mk.beginPath(); mk.ellipse(d.x, d.y, d.r * 1.15, d.r * d.stretch * 1.15, 0, 0, Math.PI * 2); mk.fill(); }
    mk.globalCompositeOperation = 'source-over';
    // Rain: one tile of slanted streaks, scrolled down every frame.
    const rain = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), rc = rain.getContext('2d');
    rc.strokeStyle = '#fff'; rc.lineCap = 'round';
    for (let i = 0, count = w * h / 260; i < count; i += 1) {
      const x = random() * w * 1.1, y = random() * h, len = 8 + random() ** 2 * h * 0.06;
      rc.globalAlpha = 0.25 + random() * 0.6; rc.lineWidth = 0.5 + random();
      rc.beginPath(); rc.moveTo(x, y); rc.lineTo(x - len * 0.12, y + len); rc.stroke();
    }
    const frost = new OffscreenCanvas(Math.max(1, Math.ceil(w / 2)), Math.max(1, Math.ceil(h / 2)));
    const tiny = new OffscreenCanvas(Math.max(1, Math.ceil(w / 12)), Math.max(1, Math.ceil(h / 12)));
    const small = new OffscreenCanvas(Math.max(1, Math.ceil(w / 4)), Math.max(1, Math.ceil(h / 4)));
    const glass = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), lit = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), wet = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), beadLit = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const state = {f, cx, horizon, cars, beads, drops, mask, mk, rain, frost, fr: frost.getContext('2d'), tiny, ti: tiny.getContext('2d'), small, sm: small.getContext('2d'),
      glass, gl: glass.getContext('2d'), lt: lit.getContext('2d'), lit, wet, beadLit, bc: beadLit.getContext('2d'), wt: wet.getContext('2d'), trails: [], last: null, t: null, random, city: null, tonesOf: null};
    state.plan = plan(env, state, random);
    return state;
  },
  press(env, x, y) {
    const {state} = env;
    state.mk.globalCompositeOperation = 'destination-out';
    state.mk.fillStyle = 'rgba(0,0,0,0.95)';
    state.mk.beginPath(); state.mk.arc(x, y, 15, 0, Math.PI * 2); state.mk.fill();
    state.last = [x, y];
  },
  release(env) { env.state.last = null; },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env;
    const k = values.intensity / 100, fogLevel = values.fog / 100;
    const dt = state.t === null ? 0 : Math.max(0, Math.min(0.05, t - state.t));
    state.t = t;
    // The still street is drawn once, and again when the theme's tones change.
    if (!state.city || state.tonesOf !== tones) { state.city = city(env, state); state.tonesOf = tones; }
    // Cars come by at random; the traffic setting is how often.
    const rate = values.traffic / 100 * 0.3;
    if (state.random() < rate * dt) state.cars.push({way: -1, z: 60, speed: 5 + state.random() * 3, lane: -2 - state.random() * 0.4});
    if (state.random() < rate * dt * 0.8) state.cars.push({way: 1, z: 2.6, speed: 3 + state.random() * 2, lane: 1.8 + state.random() * 0.4});
    for (const car of state.cars) car.z += car.way * car.speed * dt;
    state.cars = state.cars.filter((car) => car.z > 2.4 && car.z < 62);
    state.cars.sort((a, b) => b.z - a.z);
    const at = project(state);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(state.city, 0, 0, w, h);
    // What moves: the signal, the blinking sign, the cars; each light also lies on the wet road.
    const lights = [];
    const cyc = t % 14, phase = cyc < 6 ? 0 : cyc < 12 ? 2 : 1;
    if (values.signal) for (const pole of state.plan.signals) {
      const s = state.f / pole.z, [tx, ty] = at(pole.X, 4.6, pole.z), [, gy] = at(pole.X, 0, pole.z), bh = 1.25 * s, bw = 0.42 * s;
      const colour = [tones.stop, tones.amber, tones.go][phase], ly = ty - bh + bh * (0.2 + phase * 0.3);
      ctx.fillStyle = rgba(colour, 1); ctx.beginPath(); ctx.arc(tx, ly, bw * 0.3, 0, Math.PI * 2); ctx.fill();
      lights.push({x: tx, y: ly, gy, colour, r: bw * 1.4, a: 0.7});
    }
    if (values.neon) {
      const sign = state.plan.cafe, blink = (t % 7 < 6.2) && !(t % 7 > 5.6 && t % 0.22 < 0.09);
      if (blink) { tubes(ctx, sign, tones.neon, tones.core, k); for (const l of sign.lights) lights.push({...l, colour: tones.neon, a: 0.5}); }
    }
    for (const car of state.cars) {
      const coming = car.way < 0, fade = Math.min(1, (car.z - 2.4) / 1.5) * Math.min(1, (62 - car.z) / 8);
      const s = state.f / car.z, X = car.lane, gy = at(X, 0, car.z)[1];
      const [x0, y0] = at(X - 0.92, 0.28, car.z), [x1, y1] = at(X + 0.92, 0.95, car.z), [c0, c1] = at(X - 0.65, 1.45, car.z), [c2] = at(X + 0.65, 1.45, car.z), [d0] = at(X - 0.8, 0.95, car.z), [d1] = at(X + 0.8, 0.95, car.z);
      ctx.fillStyle = rgba(mixc(tones.road, [0, 0, 0], 0.5), fade);
      ctx.beginPath(); ctx.roundRect(x0, y1, x1 - x0, y0 - y1, 0.18 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(d0, y1 + 1); ctx.lineTo(c0, c1); ctx.lineTo(c2, c1); ctx.lineTo(d1, y1 + 1); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(tones.lamp, 0.12 * fade); ctx.lineWidth = Math.max(0.5, 0.03 * s); ctx.beginPath(); ctx.moveTo(c0, c1 + 0.5); ctx.lineTo(c2, c1 + 0.5); ctx.stroke();
      const colour = coming ? tones.head : tones.tail;
      for (const side of [-0.7, 0.7]) {
        const [x, y] = at(X + side, 0.8, car.z);
        ctx.fillStyle = rgba(colour, fade); ctx.beginPath();
        if (coming) ctx.ellipse(x, y, 0.14 * s, 0.07 * s, 0, 0, Math.PI * 2); else ctx.roundRect(x - 0.2 * s, y - 0.035 * s, 0.4 * s, 0.07 * s, 0.03 * s);
        ctx.fill();
        lights.push({x, y, gy, colour, r: 0.5 * s, a: (coming ? 0.9 : 0.6) * fade});
      }
    }
    // Their glows and streaks go on a layer of their own, softened through a small copy.
    const wt = state.wt;
    wt.globalCompositeOperation = 'source-over';
    wt.clearRect(0, 0, w, h);
    wt.globalCompositeOperation = 'lighter';
    for (const l of lights) { halo(wt, l.x, l.y, l.r, l.colour, l.a * k); streak(wt, state, l.x, 2 * l.gy - l.y, l.r, l.colour, l.a * k * 1.2, l.x * 0.013); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(state.wet, 0, 0, w, h);
    soften(state, state.wet, w, h);
    ctx.globalAlpha = 0.5; ctx.drawImage(state.small, 0, 0, w, h); ctx.globalAlpha = 1;
    // Lightning: a flash and an echo every so often, mostly in the sky.
    if (values.storm) {
      if (!state.bolt || t > state.bolt + 18) state.bolt = t + 6 + state.random() * 14;
      const d = t - state.bolt, flash = d > 0 && d < 0.6 ? Math.exp(-d * 9) + (d > 0.18 ? 0.6 * Math.exp(-(d - 0.18) * 9) : 0) : 0;
      if (flash > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, state.horizon * 1.2); g.addColorStop(0, rgba(tones.head, 0.2 * flash)); g.addColorStop(1, rgba(tones.cool, 0.04 * flash)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    }
    // Rain in front of the street, seen only where a light catches it.
    const lt = state.lt, fall = (t * h * 1.6) % h;
    lt.globalCompositeOperation = 'source-over';
    lt.clearRect(0, 0, w, h);
    lt.drawImage(state.plan.glow, 0, 0, w, h);
    lt.globalCompositeOperation = 'lighter';
    lt.drawImage(state.small, 0, 0, w, h);
    lt.fillStyle = 'rgba(70,74,90,0.25)'; lt.fillRect(0, 0, w, h);
    lt.globalCompositeOperation = 'destination-in';
    lt.drawImage(state.rain, 0, fall - h, w, h); lt.drawImage(state.rain, 0, fall, w, h);
    ctx.globalAlpha = 0.55 * k + 0.2;
    ctx.drawImage(state.lit, 0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Beads on the glass catch the lights behind them, not the dark between.
    const bc = state.bc;
    bc.globalCompositeOperation = 'source-over';
    bc.clearRect(0, 0, w, h);
    bc.drawImage(state.plan.glow, 0, 0, w, h);
    bc.globalCompositeOperation = 'lighter';
    bc.drawImage(state.small, 0, 0, w, h);
    bc.globalCompositeOperation = 'destination-in';
    bc.drawImage(state.beads, 0, 0, w, h);
    // The fog: the street blurred into soft discs, a little greyed.
    const fr = state.fr, q = 0.5;
    soften(state, ctx.canvas, w, h);
    fr.globalCompositeOperation = 'source-over';
    fr.drawImage(state.small, 0, 0, w * q, h * q);
    fr.fillStyle = rgba(tones.fog, 0.2);
    fr.fillRect(0, 0, w * q, h * q);
    // Writing only while the button is held; drips run from the track.
    const mk = state.mk;
    mk.globalCompositeOperation = 'source-over';
    mk.fillStyle = 'rgba(0,0,0,0.0018)';
    mk.fillRect(0, 0, w, h);
    mk.globalCompositeOperation = 'destination-out';
    mk.lineCap = 'round';
    mk.lineJoin = 'round';
    for (const d of state.drops) { mk.fillStyle = 'rgba(0,0,0,0.05)'; mk.beginPath(); mk.ellipse(d.x, d.y, d.r * 1.15, d.r * d.stretch * 1.15, 0, 0, Math.PI * 2); mk.fill(); }
    if (pointer.down && state.last) {
      const x = pointer.x * w, y = pointer.y * h, [lx, ly] = state.last;
      mk.strokeStyle = 'rgba(0,0,0,0.95)';
      mk.lineWidth = 30;
      mk.beginPath(); mk.moveTo(lx, ly); mk.lineTo(x, y); mk.stroke();
      const moved = Math.hypot(x - lx, y - ly);
      if (moved > 0 && state.random() < Math.min(0.5, moved / 60)) state.trails.push({x: x + (state.random() - 0.5) * 10, y: y + 6, v: 0, left: 30 + state.random() * 140});
      state.last = [x, y];
    }
    for (const drip of state.trails) {
      drip.v = Math.min(60, drip.v + (state.random() < 0.04 ? -drip.v : 40 * dt));
      const step = drip.v * dt;
      mk.strokeStyle = 'rgba(0,0,0,0.85)';
      mk.lineWidth = 2.6;
      mk.beginPath(); mk.moveTo(drip.x, drip.y); mk.lineTo(drip.x, drip.y + step + 0.5); mk.stroke();
      drip.y += step;
      drip.left -= step;
    }
    const gl = state.gl;
    gl.globalCompositeOperation = 'source-over';
    gl.clearRect(0, 0, w, h);
    gl.imageSmoothingQuality = 'high';
    gl.drawImage(state.frost, 0, 0, w, h);
    gl.globalCompositeOperation = 'lighter';
    gl.globalAlpha = 0.8;
    gl.drawImage(state.beadLit, 0, 0, w, h);
    gl.globalAlpha = 1;
    gl.globalCompositeOperation = 'destination-in';
    gl.drawImage(state.mask, 0, 0, w, h);
    ctx.globalAlpha = Math.min(1, 0.15 + fogLevel);
    ctx.drawImage(state.glass, 0, 0, w, h);
    ctx.globalAlpha = 1;
    // Drops: a lens with the street upside down, a dark rim and a highlight.
    const ratio = ctx.canvas.width / w;
    for (const d of state.drops) {
      const rx = d.r, ry = d.r * d.stretch, span = d.r * 5;
      ctx.save();
      ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      ctx.translate(d.x, d.y);
      ctx.scale(1, -1);
      const sx = Math.max(0, (d.x - span) * ratio), sy = Math.max(0, (d.y - span) * ratio);
      ctx.globalAlpha = 0.85;
      ctx.drawImage(ctx.canvas, sx, sy, span * 2 * ratio, span * 2 * ratio, -rx, -ry, rx * 2, ry * 2);
      ctx.restore();
      const rim = ctx.createRadialGradient(d.x, d.y - ry * 0.2, ry * 0.5, d.x, d.y, ry * 1.05);
      rim.addColorStop(0, 'rgba(0,0,0,0)');
      rim.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = rim;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(tones.head, 0.35 * Math.min(1, k * 2));
      ctx.beginPath(); ctx.arc(d.x - rx * 0.35, d.y - ry * 0.45, Math.max(0.6, rx * 0.18), 0, Math.PI * 2); ctx.fill();
    }
    for (const drip of state.trails) {
      ctx.fillStyle = rgba(tones.head, 0.35 * k);
      ctx.beginPath(); ctx.arc(drip.x, drip.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    state.trails = state.trails.filter((drip) => drip.left > 0 && drip.y < h);
  },
};
// From street space (X across, Y up, z away, in metres) to the picture.
function project(state) { return (X, Y, z) => [state.cx + X * state.f / z, state.horizon + (1.7 - Y) * state.f / z]; }
// The street's layout, drawn the same way on every mount: facades, windows, lamps, signs, signal poles.
function plan(env, state, random) {
  const {values} = env;
  const at = project(state);
  const facades = [];
  for (const side of [-1, 1]) for (let z = 60; z > 3; z -= 3 + random() * 3) facades.push({side, z, d: 3 + random() * 3, top: 8 + random() * 16});
  facades.sort((a, b) => b.z - a.z);
  const lit = values.density / 100;
  const windows = [];
  for (const fc of facades) for (let fy = 1.2; fy < fc.top - 0.8; fy += 1.4) for (let fz = 0.3; fz < fc.d - 0.3; fz += 0.9) {
    const on = random() < 0.15 + lit * 0.3, pick = random(), dim = random();
    if (on) windows.push({X: fc.side * 7.5, Y: fy, z: fc.z + fz, kind: pick < 0.6 ? 'pane' : pick < 0.85 ? 'lamp' : 'cool', dim});
  }
  const shops = [];
  for (const side of [-1, 1]) for (let z = 4; z < 50; z += 2.2 + random() * 3) {
    const d = 1 + random() * 1.4, kind = random() < 0.7 ? 'pane' : 'cool', bright = random();
    if (random() < 0.55 - lit * 0.3) continue;
    shops.push({X: side * 7.5, z, d, kind, bright});
  }
  const lamps = [];
  if (values.lamps !== 'none') for (let z = 5; z < 70; z += 6.5) for (const side of [-1, 1]) lamps.push({side, z, kind: values.lamps === 'white' ? 'white' : values.lamps === 'mixed' && random() < 0.5 ? 'cool' : 'lamp'});
  const signs = [
    {text: 'OPEN 24', X: -7.3, Y: 3.4, z: 16, kind: 'cool', size: 0.7},
    {text: 'BAR', X: 7.3, Y: 3.2, z: 30, kind: 'pink', size: 0.9},
    {text: 'HOTEL', X: -7.3, Y: 7.5, z: 34, kind: 'amber', size: 0.9},
  ].slice(0, 1 + Math.round(lit * 2));
  const cafe = {text: 'CAFE', X: 7.3, Y: 4.6, z: 14, size: 1.05};
  const signals = [{X: 4.9, z: 12}, {X: -5.2, z: 22}];
  return {facades, windows, shops, lamps, signs, cafe, signals, glow: null};
}
// The still street: one gradient from the sky to the road, so the far road melts into the haze;
// facades, windows and shop windows; lamps; signs; their glows, blooms and streaks on the wet road.
function city(env, state) {
  const {w, h, tones, values} = env;
  const k = values.intensity / 100, ratio = Math.max(1, Math.min(2, env.ctx.canvas.width / w));
  const at = project(state), P = state.plan, hor = state.horizon;
  const out = new OffscreenCanvas(Math.ceil(w * ratio), Math.ceil(h * ratio)), c = out.getContext('2d');
  c.scale(ratio, ratio);
  const lights = [];
  let g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgba(tones.sky)); g.addColorStop(0.36, rgba(mixc(tones.sky, tones.glowSky, 0.8)));
  g.addColorStop(0.5, rgba(mixc(tones.glowSky, tones.haze, 0.45))); g.addColorStop(0.56, rgba(mixc(tones.glowSky, tones.haze, 0.25)));
  g.addColorStop(1, rgba(tones.road));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  for (const fc of P.facades) {
    const X = fc.side * 7.5, z0 = fc.z, z1 = fc.z + fc.d;
    const [x0, y0] = at(X, 0, z0), [x1, y1] = at(X, 0, z1), [, t0] = at(X, fc.top, z0), [, t1] = at(X, fc.top, z1);
    c.fillStyle = rgba(mixc(tones.facade, tones.haze, Math.min(1, z0 / 55) * 0.55));
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x1, t1); c.lineTo(x0, t0); c.closePath(); c.fill();
  }
  for (const win of P.windows) {
    const [wx, wy] = at(win.X, win.Y + 1, win.z), [wx2, wy2] = at(win.X, win.Y, win.z + 0.5);
    const fog = Math.min(1, win.z / 55), a = (0.14 + win.dim * 0.32) * (1 - fog * 0.8) * (0.5 + k * 0.6);
    c.fillStyle = rgba(tones[win.kind], a);
    c.fillRect(Math.min(wx, wx2), wy, Math.abs(wx2 - wx) * 0.6 + 0.6, (wy2 - wy) * 0.7);
  }
  for (const shop of P.shops) {
    const [x0, y0] = at(shop.X, 0.3, shop.z), [x1, y1] = at(shop.X, 0.3, shop.z + shop.d), [, t0] = at(shop.X, 2.3, shop.z), [, t1] = at(shop.X, 2.3, shop.z + shop.d);
    const a = (0.3 + shop.bright * 0.3) * (1 - Math.min(1, shop.z / 50) * 0.6) * (0.5 + k * 0.6), colour = tones[shop.kind];
    const sg = c.createLinearGradient(0, t0, 0, y0);
    sg.addColorStop(0, rgba(colour, a * 0.7)); sg.addColorStop(1, rgba(colour, a));
    c.fillStyle = sg; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x1, t1); c.lineTo(x0, t0); c.closePath(); c.fill();
    lights.push({x: (x0 + x1) / 2, y: (y0 + t0) / 2, gy: at(shop.X, 0, shop.z + shop.d / 2)[1], colour, r: Math.abs(x1 - x0) * 0.9 + 6, a: a * 0.5});
  }
  c.strokeStyle = rgba(tones.white, 0.05); c.lineWidth = 1;
  for (const side of [-1, 1]) { const [a1, a2] = at(side * 5, 0, 2.5), [b1, b2] = at(side * 5, 0, 70); c.beginPath(); c.moveTo(a1, a2); c.lineTo(b1, b2); c.stroke(); }
  for (let i = -4; i <= 4; i += 1) {
    const [a1, a2] = at(i * 1.1 - 0.3, 0, 9), [b1] = at(i * 1.1 + 0.3, 0, 9), [, c2] = at(0, 0, 11);
    c.fillStyle = rgba(tones.white, 0.05); c.fillRect(a1, c2, b1 - a1, a2 - c2);
  }
  for (const lamp of P.lamps) {
    const z = lamp.z, [px, py] = at(lamp.side * 5.6, 0, z), [hx, hy] = at(lamp.side * 5.6, 6, z), [ax] = at(lamp.side * 4.6, 6, z), fog = Math.min(1, z / 60);
    c.strokeStyle = `rgba(0,0,0,${0.7 * (1 - fog)})`; c.lineWidth = Math.max(0.5, 0.25 * state.f / z / 10);
    c.beginPath(); c.moveTo(px, py); c.lineTo(hx, hy); c.lineTo(ax, hy); c.stroke();
    const colour = tones[lamp.kind];
    c.fillStyle = rgba(colour, 1); c.beginPath(); c.ellipse(ax, hy + 0.2 * state.f / z / 10, Math.max(1, 0.09 * state.f / z), Math.max(0.6, 0.04 * state.f / z), 0, 0, Math.PI * 2); c.fill();
    lights.push({x: ax, y: hy + 0.3 * state.f / z / 10, gy: at(lamp.side * 4.6, 0, z)[1], colour, r: 2.6 * state.f / z / 10 + 4, a: (1 - fog * 0.5) * 1.1});
  }
  if (values.signal) for (const pole of P.signals) {
    const s = state.f / pole.z, [px, py] = at(pole.X, 0, pole.z), [tx, ty] = at(pole.X, 4.6, pole.z), bw = 0.42 * s, bh = 1.25 * s;
    c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = Math.max(1, 0.18 * s);
    c.beginPath(); c.moveTo(px, py); c.lineTo(tx, ty); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.92)'; c.fillRect(tx - bw / 2, ty - bh, bw, bh);
    [tones.stop, tones.amber, tones.go].forEach((colour, i) => { c.fillStyle = rgba(colour, 0.08); c.beginPath(); c.arc(tx, ty - bh + bh * (0.2 + i * 0.3), bw * 0.3, 0, Math.PI * 2); c.fill(); });
  }
  for (const sign of P.signs) {
    placeSign(state, sign);
    tubes(c, sign, tones[sign.kind], mixc(tones[sign.kind], tones.head, 0.7), k);
    for (const l of sign.lights) lights.push({...l, colour: tones[sign.kind], a: 0.35});
  }
  placeSign(state, P.cafe);
  if (values.neon) { c.fillStyle = 'rgba(0,0,0,0.55)'; const s = P.cafe; c.fillRect(s.x - s.tw / 2 - s.s * 0.3, s.y - s.s * 0.75, s.tw + s.s * 0.6, s.s * 1.5); }
  // The lights: streaks on the wet road, a hot point, a glow, then a wide bloom.
  const glow = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), gc = glow.getContext('2d');
  gc.globalCompositeOperation = 'lighter';
  for (const l of lights) halo(gc, l.x, l.y, l.r, l.colour, l.a * k);
  const wet = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), wc = wet.getContext('2d');
  wc.globalCompositeOperation = 'lighter';
  for (const l of lights) streak(wc, state, l.x, 2 * l.gy - l.y, l.r, l.colour, l.a * k, l.x * 0.017 + l.y * 0.03);
  c.save(); c.beginPath(); c.rect(0, hor, w, h - hor); c.clip();
  c.globalCompositeOperation = 'lighter';
  c.drawImage(wet, 0, 0, w, h);
  c.restore();
  c.globalCompositeOperation = 'lighter';
  c.drawImage(glow, 0, 0, w, h);
  // Blooms through ever smaller copies: the wider, the fainter.
  const bloom = [[8, 0.45], [24, 0.28], [64, 0.2]];
  for (const [by, a] of bloom) {
    const s = new OffscreenCanvas(Math.max(1, Math.ceil(w / by)), Math.max(1, Math.ceil(h / by))), sc = s.getContext('2d');
    sc.imageSmoothingQuality = 'high'; sc.drawImage(glow, 0, 0, s.width, s.height); sc.drawImage(wet, 0, 0, s.width, s.height);
    c.globalAlpha = a; c.imageSmoothingQuality = 'high'; c.drawImage(s, 0, 0, w, h);
  }
  c.globalAlpha = 1;
  // Haze at the horizon swallows the far street.
  g = c.createLinearGradient(0, hor - h * 0.16, 0, hor + h * 0.1);
  g.addColorStop(0, rgba(tones.haze, 0)); g.addColorStop(0.55, rgba(tones.haze, 0.25)); g.addColorStop(1, rgba(tones.haze, 0));
  c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  // Corners a little darker, as through a lens.
  g = c.createRadialGradient(w / 2, h * 0.48, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  // The glow that lights the rain: the lamps and signs, wide and soft.
  const soft = new OffscreenCanvas(Math.max(1, Math.ceil(w / 16)), Math.max(1, Math.ceil(h / 16)));
  soft.getContext('2d').drawImage(glow, 0, 0, soft.width, soft.height);
  P.glow = soft;
  return out;
}
// Where a sign sits in the picture, its size and the lights its letters give.
function placeSign(state, sign) {
  const [x, y] = project(state)(sign.X, sign.Y, sign.z), s = state.f / sign.z * sign.size;
  const tw = s * 0.62 * sign.text.length;
  const [, gy] = project(state)(sign.X, 0, sign.z);
  const letters = sign.text.replace(/ /g, '').length;
  Object.assign(sign, {x, y, s, tw, lights: Array.from({length: letters}, (_, i) => ({x: x - tw / 2 + tw * (i + 0.5) / letters, y, gy, r: s * 0.9}))});
}
// A neon sign: tubes of letters, a wide faint glow, a narrower one and a hot core.
function tubes(c, sign, colour, core, k) {
  c.save();
  c.font = `600 ${sign.s}px "Helvetica Neue", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const [wdt, a, tone] of [[0.22, 0.25, colour], [0.12, 0.6, colour], [0.05, 1, core]]) {
    c.strokeStyle = rgba(tone, a * (0.5 + k * 0.6)); c.lineWidth = sign.s * wdt; c.strokeText(sign.text, sign.x, sign.y);
  }
  c.restore();
}
// A light's own glow: white-hot at the centre, its colour around.
function halo(c, x, y, r, colour, a) {
  if (a <= 0.01 || r <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(mixc(colour, [255, 255, 255], 0.35), Math.min(1, a)));
  g.addColorStop(0.12, rgba(colour, 0.75 * Math.min(1, a))); g.addColorStop(1, rgba(colour, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
// A light's reflection on the wet road: from its mirror point, a little up and far down towards
// the eye, shifted and broken into dashes by the ripples.
function streak(c, state, x, ry, r, colour, a, seed) {
  const {horizon} = state, h = c.canvas.height;
  if (a <= 0.01 || ry <= horizon) return;
  const top = Math.max(horizon + 1, ry - (ry - horizon) * 0.5), len = Math.min(h - top, (ry - horizon) * 2.2 + 30), wdt = Math.max(1.2, Math.min(24, r * 0.28));
  const slices = 48;
  for (let i = 0; i < slices; i += 1) {
    const y0 = top + len * i / slices, jx = (Math.sin(i * 0.9 + seed) * 0.6 + Math.sin(i * 3.1 + seed * 2.3) * 0.4) * wdt * 0.2;
    const dash = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(i * 2.1 + seed * 5.7)) ** 2;
    const al = a * 0.5 * (1 - i / slices) ** 1.1 * dash;
    const g = c.createLinearGradient(x + jx - wdt, 0, x + jx + wdt, 0);
    g.addColorStop(0, rgba(colour, 0)); g.addColorStop(0.5, rgba(colour, al)); g.addColorStop(1, rgba(colour, 0));
    c.fillStyle = g; c.fillRect(x + jx - wdt, y0, wdt * 2, len / slices + 1);
  }
}
// A soft copy of a picture: down to a twelfth, back up to a quarter.
function soften(state, source, w, h) {
  state.ti.imageSmoothingQuality = 'high';
  state.ti.clearRect(0, 0, state.tiny.width, state.tiny.height);
  state.ti.drawImage(source, 0, 0, state.tiny.width, state.tiny.height);
  state.sm.imageSmoothingQuality = 'high';
  state.sm.clearRect(0, 0, state.small.width, state.small.height);
  state.sm.drawImage(state.tiny, 0, 0, state.small.width, state.small.height);
}

export function mount(host, settings, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  const env = {ctx, w: 1, h: 1, values: {...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, pointer: {x: 0.5, y: 0.5, on: false, down: false, px: 0, py: 0}, still: false};
  env.tones = readTones(host, env.scheme);
  env.still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  // A scene marked fresh lays a new pattern on every mount while it moves; a still frame keeps the
  // seeded one, so a reduced-motion page and the checks that sample it see the same picture.
  env.salt = SCENE.fresh && !env.still ? Math.floor(Math.random() * 1e6) : 0;
  let paused = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let t = SCENE.start ?? 0;

  const setup = () => { env.state = SCENE.setup(env, rng(SCENE.seed ?? 7)); };
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
    const ratio = Math.min(2, win.devicePixelRatio || 1);
    env.w = Math.max(1, box.width);
    env.h = Math.max(1, box.height);
    canvas.width = Math.round(env.w * ratio);
    canvas.height = Math.round(env.h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
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
    env.pointer.x = (event.clientX - box.left) / Math.max(1, box.width);
    env.pointer.y = (event.clientY - box.top) / Math.max(1, box.height);
    env.pointer.on = env.values.interactive !== false && env.pointer.x >= 0 && env.pointer.x <= 1 && env.pointer.y >= 0 && env.pointer.y <= 1;
  };
  win.addEventListener('pointermove', onPointer, {passive: true});
  // Press, drag and click inside the area: the host takes no pointer events, so they are read from
  // the window, inside the host's box, and never from a link, a button or a field over it.
  let pressed = null;
  const inside = (event) => {
    if (env.values.interactive === false || env.still || paused) return null;
    if (event.target instanceof Element && event.target.closest('a,button,input,textarea,select,label,[role="button"],[contenteditable]')) return null;
    const box = host.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    return x >= 0 && y >= 0 && x <= box.width && y <= box.height ? [x, y] : null;
  };
  const onDown = (event) => {
    if (event.button !== 0) return;
    const at = inside(event);
    if (!at) return;
    pressed = {x: at[0], y: at[1], time: event.timeStamp};
    env.pointer.down = true;
    env.pointer.px = at[0];
    env.pointer.py = at[1];
    SCENE.press?.(env, at[0], at[1]);
    schedule();
  };
  const onUp = (event) => {
    if (!pressed) return;
    const box = host.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    env.pointer.down = false;
    SCENE.release?.(env, x, y);
    if (Math.hypot(x - pressed.x, y - pressed.y) < 6 && event.timeStamp - pressed.time < 400) SCENE.click?.(env, x, y);
    pressed = null;
    schedule();
  };
  const onCancel = () => { pressed = null; env.pointer.down = false; };
  win.addEventListener('pointerdown', onDown, {passive: true});
  win.addEventListener('pointerup', onUp, {passive: true});
  win.addEventListener('pointercancel', onCancel, {passive: true});

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
      win.removeEventListener('pointerup', onUp);
      win.removeEventListener('pointercancel', onCancel);
      canvas.remove();
    },
  };
}
