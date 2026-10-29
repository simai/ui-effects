// Rain on glass (simai.effect 1.1.0; dark scheme only): a fogged window on a rainy night: behind it a wet street runs off into a cold haze, its lamps, neon sign, traffic light and cars mirrored in the road. Wipe the glass with a finger, and the street comes sharp.
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

// A fogged window on a rainy night: a wet street runs off into a cold haze; lamps, a pink CAFE,
// a traffic light and cars streak the road and light the rain. Wiped with a finger, and through
// the drops, the street is sharp; the fog returns.
const SCENE = {
  home: 'dark', seed: 61, reseed: ['density', 'lamps', 'signal', 'neon', 'intensity'],
  tones: (read) => ({
    sky: read('--sf-neutral-6', '#16181d'), glow: read('--sf-primary-10', '#001a41'), haze: read('--sf-primary-20', '#002e69'), road: read('--sf-neutral-4', '#0c0e13'),
    facade: read('--sf-neutral-5', '#111318'), white: read('--sf-neutral-95', '#f0f0f7'), warm: read('--sf-warning-80', '#ffb95c'), cool: read('--sf-primary-80', '#adc6ff'),
    pane: read('--sf-warning-90', '#ffdcbe'), neon: read('--sf-tertiary-70', '#c798cd'), core: read('--sf-tertiary-95', '#ffebfc'),
    stop: read('--sf-error-60', '#ff5449'), amber: read('--sf-warning-70', '#f19d47'), go: read('--sf-success-70', '#4cbb6f'), head: read('--sf-neutral-98', '#faf9fe'),
    tail: read('--sf-error-60', '#ff5449'), fog: read('--sf-neutral-30', '#45464f'),
  }),
  setup(env, random) {
    const {w, h, values} = env, W = Math.ceil(w), H = Math.ceil(h), sheet = () => new OffscreenCanvas(W, H);
    // The vanishing point sits right of the middle: the left, under a banner's text, stays calm.
    const st = {f: Math.min(h * 1.05, w * 0.7), cx: w * 0.58, hor: h * 0.5, random, cars: [], last: null, t: null, city: null};
    st.beads = sheet(); st.mask = sheet(); st.rain = sheet(); st.glass = sheet(); st.lit = sheet(); st.wet = sheet(); st.shine = sheet();
    st.chain = [2, 4, 8, 16].map((d) => new OffscreenCanvas(Math.max(1, Math.ceil(w / d)), Math.max(1, Math.ceil(h / d))));
    const b = st.beads.getContext('2d');
    for (let i = 0; i < w * h / 14; i += 1) {
      b.fillStyle = `rgba(255,255,255,${0.35 + random() * 0.65})`;
      b.beginPath(); b.arc(random() * w, random() * h, 0.4 + random() ** 4 * 2.2, 0, 7); b.fill();
    }
    st.mk = st.mask.getContext('2d');
    st.mk.fillRect(0, 0, w, h);
    st.drops = Array.from({length: Math.round(w * h / 9000)}, () => ({x: random() * w, y: random() * h, r: 2.5 + random() ** 2 * 7, s: 1 + random() * 0.25}));
    st.mk.globalCompositeOperation = 'destination-out';
    for (const d of st.drops) { st.mk.beginPath(); st.mk.ellipse(d.x, d.y, d.r * 1.15, d.r * d.s * 1.15, 0, 0, 7); st.mk.fill(); }
    // Rain: one tile of slanted streaks, scrolled down every frame.
    const r = st.rain.getContext('2d');
    r.strokeStyle = '#fff';
    for (let i = 0; i < w * h / 260; i += 1) {
      const x = random() * w * 1.1, y = random() * h, len = 8 + random() ** 2 * h * 0.06;
      r.globalAlpha = 0.25 + random() * 0.6; r.lineWidth = 0.5 + random();
      r.beginPath(); r.moveTo(x, y); r.lineTo(x - len * 0.12, y + len); r.stroke();
    }
    // The street: facades with their lit windows, both sides, far to near.
    st.facades = [];
    for (const side of [-1, 1]) for (let z = 60; z > 3; z -= 3 + random() * 3) {
      const fc = {side, z, d: 3 + random() * 3, top: 8 + random() * 16, windows: []};
      for (let y = 1.2; y < fc.top - 0.8; y += 1.4) for (let dz = 0.3; dz < fc.d - 0.3; dz += 0.9) if (random() < 0.12 + values.density / 400) fc.windows.push([y, dz, random() < 0.7 ? 'cool' : 'pane', random()]);
      st.facades.push(fc);
    }
    st.facades.sort((a, c) => c.z - a.z);
    st.lamps = values.lamps === 'none' ? [] : Array.from({length: 22}, (_, i) => ({side: i % 2 ? 1 : -1, z: 5 + Math.floor(i / 2) * 6.5, tone: values.lamps === 'warm' || (values.lamps === 'mixed' && random() < 0.5) ? 'warm' : 'white'}));
    return st;
  },
  press(env, x, y) {
    const {state} = env;
    state.mk.globalCompositeOperation = 'destination-out';
    state.mk.beginPath(); state.mk.arc(x, y, 15, 0, 7); state.mk.fill();
    state.last = [x, y];
  },
  release(env) { env.state.last = null; },
  draw(env, t) {
    const {ctx, w, h, tones, state: st, values, pointer} = env;
    const k = values.intensity / 100, at = project(st);
    const dt = st.t === null ? 0 : Math.max(0, Math.min(0.05, t - st.t));
    st.t = t;
    if (!st.city || st.tonesOf !== tones) { st.city = city(env, st); st.tonesOf = tones; }
    // Cars come by as often as the traffic setting asks: white lights coming, red going.
    const rate = values.traffic / 100 * 0.3;
    if (st.random() < rate * dt) st.cars.push({way: -1, z: 60, v: 5 + st.random() * 3, X: -2 - st.random() * 0.4});
    if (st.random() < rate * dt * 0.8) st.cars.push({way: 1, z: 2.6, v: 3 + st.random() * 2, X: 1.8 + st.random() * 0.4});
    for (const car of st.cars) car.z += car.way * car.v * dt;
    st.cars = st.cars.filter((car) => car.z > 2.4 && car.z < 62).sort((a, c) => c.z - a.z);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(st.city.img, 0, 0, w, h);
    const lights = [];
    if (values.signal) {
      const [x, top] = at(-5.2, 4.6, 24), s = st.f / 24, phase = t % 14 < 6 ? 0 : t % 14 < 12 ? 2 : 1, y = top - s * (0.95 - phase * 0.375);
      const tone = [tones.stop, tones.amber, tones.go][phase];
      ctx.fillStyle = rgba(tone); ctx.beginPath(); ctx.arc(x, y, s * 0.13, 0, 7); ctx.fill();
      lights.push({x, y, gy: at(-5.2, 0, 24)[1], tone, r: s * 0.6, a: 0.7});
    }
    if (values.neon && t % 7 < 6.2 && !(t % 7 > 5.6 && t % 0.22 < 0.09)) {
      const sign = st.city.cafe;
      tubes(ctx, sign, tones.neon, tones.core, k);
      for (const l of sign.lights) lights.push({...l, tone: tones.neon, a: 0.5});
    }
    for (const car of st.cars) {
      const s = st.f / car.z, a = Math.min(1, (car.z - 2.4) / 1.5, (62 - car.z) / 8), [x0, y0] = at(car.X - 0.92, 0.28, car.z), [x1, y1] = at(car.X + 0.92, 1, car.z), [, y2] = at(0, 1.45, car.z);
      ctx.fillStyle = rgba(tones.road, a);
      ctx.beginPath(); ctx.roundRect(x0, y1, x1 - x0, y0 - y1, s * 0.18); ctx.roundRect(x0 + s * 0.3, y2, x1 - x0 - s * 0.6, y1 - y2 + 1, s * 0.2); ctx.fill();
      const tone = car.way < 0 ? tones.head : tones.tail;
      for (const side of [-0.7, 0.7]) {
        const [x, y] = at(car.X + side, 0.8, car.z);
        ctx.fillStyle = rgba(tone, a); ctx.beginPath(); ctx.ellipse(x, y, s * (car.way < 0 ? 0.14 : 0.2), s * 0.05, 0, 0, 7); ctx.fill();
        lights.push({x, y, gy: at(car.X, 0, car.z)[1], tone, r: s * 0.5, a: (car.way < 0 ? 0.9 : 0.6) * a});
      }
    }
    const wet = st.wet.getContext('2d');
    wet.clearRect(0, 0, w, h);
    wet.globalCompositeOperation = 'lighter';
    for (const l of lights) { halo(wet, l, k); streak(wet, st, l, k * 1.2); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(st.wet, 0, 0, w, h);
    // The street's glow and the moving lights light the rain and the beads on the glass.
    const shine = st.shine.getContext('2d');
    shine.globalCompositeOperation = 'source-over';
    shine.clearRect(0, 0, w, h);
    shine.drawImage(st.city.glow, 0, 0, w, h);
    shine.globalCompositeOperation = 'lighter';
    shine.drawImage(soften(st, st.wet, 3), 0, 0, w, h);
    const lt = st.lit.getContext('2d'), fall = (t * h * 1.6) % h;
    lt.globalCompositeOperation = 'source-over';
    lt.clearRect(0, 0, w, h);
    lt.drawImage(st.shine, 0, 0, w, h);
    lt.fillStyle = 'rgba(70,80,100,0.25)'; lt.fillRect(0, 0, w, h);
    lt.globalCompositeOperation = 'destination-in';
    lt.drawImage(st.rain, 0, fall - h, w, h); lt.drawImage(st.rain, 0, fall, w, h);
    ctx.globalAlpha = 0.2 + k * 0.55;
    ctx.drawImage(st.lit, 0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Writing while the button is held; the fog slowly returns.
    const mk = st.mk;
    mk.globalCompositeOperation = 'source-over';
    mk.fillStyle = 'rgba(0,0,0,0.0018)';
    mk.fillRect(0, 0, w, h);
    mk.globalCompositeOperation = 'destination-out';
    mk.lineCap = 'round';
    mk.fillStyle = 'rgba(0,0,0,0.05)';
    for (const d of st.drops) { mk.beginPath(); mk.ellipse(d.x, d.y, d.r * 1.15, d.r * d.s * 1.15, 0, 0, 7); mk.fill(); }
    if (pointer.down && st.last) {
      const x = pointer.x * w, y = pointer.y * h, [lx, ly] = st.last;
      mk.strokeStyle = 'rgba(0,0,0,0.95)'; mk.lineWidth = 30;
      mk.beginPath(); mk.moveTo(lx, ly); mk.lineTo(x, y); mk.stroke();
      st.last = [x, y];
    }
    // The fog: the street softened and greyed, the beads lit from behind.
    const gl = st.glass.getContext('2d');
    gl.globalCompositeOperation = 'source-over';
    gl.clearRect(0, 0, w, h);
    gl.drawImage(soften(st, ctx.canvas, 3), 0, 0, w, h);
    gl.fillStyle = rgba(tones.fog, 0.2); gl.fillRect(0, 0, w, h);
    lt.globalCompositeOperation = 'source-over';
    lt.clearRect(0, 0, w, h);
    lt.drawImage(st.shine, 0, 0, w, h);
    lt.globalCompositeOperation = 'destination-in';
    lt.drawImage(st.beads, 0, 0, w, h);
    gl.globalCompositeOperation = 'lighter';
    gl.globalAlpha = 0.8; gl.drawImage(st.lit, 0, 0, w, h); gl.globalAlpha = 1;
    gl.globalCompositeOperation = 'destination-in';
    gl.drawImage(st.mask, 0, 0, w, h);
    ctx.globalAlpha = Math.min(1, 0.15 + values.fog / 100);
    ctx.drawImage(st.glass, 0, 0, w, h);
    ctx.globalAlpha = 1;
    // Drops: clear of fog, a bright rim, a highlight.
    for (const d of st.drops) {
      const rx = d.r, ry = d.r * d.s, rim = ctx.createRadialGradient(d.x, d.y - ry * 0.2, ry * 0.5, d.x, d.y, ry * 1.05);
      rim.addColorStop(0, 'rgba(255,255,255,0.03)'); rim.addColorStop(1, 'rgba(255,255,255,.16)');
      ctx.fillStyle = rim; ctx.beginPath(); ctx.ellipse(d.x, d.y, rx, ry, 0, 0, 7); ctx.fill();
      ctx.fillStyle = rgba(tones.head, 0.35 * Math.min(1, k * 2));
      ctx.beginPath(); ctx.arc(d.x - rx * 0.35, d.y - ry * 0.45, Math.max(0.6, rx * 0.18), 0, 7); ctx.fill();
    }
  },
};
// From the street (X across, Y up, z away, in metres) to the picture.
function project(st) { return (X, Y, z) => [st.cx + X * st.f / z, st.hor + (1.7 - Y) * st.f / z]; }
// The still street, drawn once: one gradient from the sky to the road, facades, windows, lamps,
// the signal's pole, the sign's plate, then the lights' glows, blooms and streaks.
function city(env, st) {
  const {w, h, tones, values} = env, k = values.intensity / 100, at = project(st), hor = st.hor;
  const ratio = Math.max(1, Math.min(2, env.ctx.canvas.width / w)), img = new OffscreenCanvas(Math.ceil(w * ratio), Math.ceil(h * ratio)), c = img.getContext('2d');
  c.scale(ratio, ratio);
  let g = c.createLinearGradient(0, 0, 0, h);
  const haze = mixc(tones.haze, tones.fog, 0.55), dusk = mixc(tones.glow, tones.sky, 0.5);
  g.addColorStop(0, rgba(tones.sky)); g.addColorStop(0.38, rgba(dusk));
  g.addColorStop(0.5, rgba(mixc(dusk, haze, 0.6))); g.addColorStop(0.57, rgba(mixc(dusk, haze, 0.3))); g.addColorStop(1, rgba(tones.road));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const lights = [];
  for (const fc of st.facades) {
    const X = fc.side * 7.5, fog = Math.min(1, fc.z / 55), [x0, y0] = at(X, 0, fc.z), [x1, y1] = at(X, 0, fc.z + fc.d), [, t0] = at(X, fc.top, fc.z), [, t1] = at(X, fc.top, fc.z + fc.d);
    c.fillStyle = rgba(mixc(tones.facade, haze, fog * 0.5));
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineTo(x1, t1); c.lineTo(x0, t0); c.fill();
    for (const [y, dz, tone, dim] of fc.windows) {
      const [a, b] = at(X, y + 1, fc.z + dz), [a2, b2] = at(X, y, fc.z + dz + 0.5);
      c.fillStyle = rgba(tones[tone], (0.14 + dim * 0.32) * (1 - fog * 0.8) * (0.5 + k * 0.6));
      c.fillRect(Math.min(a, a2), b, Math.abs(a2 - a) * 0.6 + 0.6, (b2 - b) * 0.7);
    }
  }
  for (const lamp of st.lamps) {
    const z = lamp.z, s = st.f / z, [px, py] = at(lamp.side * 5.6, 0, z), [hx, hy] = at(lamp.side * 5.6, 6, z), [ax] = at(lamp.side * 4.6, 6, z);
    c.strokeStyle = `rgba(0,0,0,${0.7 * (1 - Math.min(1, z / 60))})`; c.lineWidth = Math.max(0.5, s * 0.025);
    c.beginPath(); c.moveTo(px, py); c.lineTo(hx, hy); c.lineTo(ax, hy); c.stroke();
    c.fillStyle = rgba(tones[lamp.tone]); c.beginPath(); c.ellipse(ax, hy + s * 0.02, Math.max(1, s * 0.09), Math.max(0.6, s * 0.04), 0, 0, 7); c.fill();
    lights.push({x: ax, y: hy + s * 0.03, gy: at(lamp.side * 4.6, 0, z)[1], tone: tones[lamp.tone], r: s * 0.26 + 4, a: 1.1 - Math.min(1, z / 60) * 0.55});
  }
  if (values.signal) {
    const s = st.f / 24, [px, py] = at(-5.2, 0, 24), [x, y] = at(-5.2, 4.6, 24);
    c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = Math.max(1, s * 0.18);
    c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
    c.fillStyle = 'rgba(0,0,0,0.92)'; c.fillRect(x - s * 0.21, y - s * 1.25, s * 0.42, s * 1.25);
  }
  const cafe = sign(st, 'CAFE', Math.max(13, 9.6 * st.f / (w - st.cx)), 4.4, 1.05);
  if (values.neon) { c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(cafe.x - cafe.tw / 2 - cafe.s * 0.3, cafe.y - cafe.s * 0.75, cafe.tw + cafe.s * 0.6, cafe.s * 1.5); }
  // Glows, streaks, then wider, fainter blooms.
  const glow = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), gc = glow.getContext('2d');
  gc.globalCompositeOperation = 'lighter';
  for (const l of lights) halo(gc, l, k);
  for (const l of lights) streak(gc, st, l, k);
  c.globalCompositeOperation = 'lighter';
  c.drawImage(glow, 0, 0, w, h);
  for (const [level, a] of [[1, 0.45], [2, 0.3], [3, 0.22]]) { c.globalAlpha = a; c.drawImage(soften(st, glow, level), 0, 0, w, h); }
  c.globalAlpha = 1;
  // Haze at the horizon swallows the far street.
  g = c.createLinearGradient(0, hor - h * 0.16, 0, hor + h * 0.1);
  g.addColorStop(0, rgba(haze, 0)); g.addColorStop(0.55, rgba(haze, 0.3)); g.addColorStop(1, rgba(haze, 0));
  c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.globalCompositeOperation = 'source-over';
  const soft = new OffscreenCanvas(Math.max(1, Math.ceil(w / 16)), Math.max(1, Math.ceil(h / 16)));
  soft.getContext('2d').drawImage(soften(st, glow, 3), 0, 0);
  return {img, glow: soft, cafe};
}
// A sign on the right facade, with a light for each letter.
function sign(st, text, z, Y, size) {
  const at = project(st), [x, y] = at(7.3, Y, z), s = st.f / z * size, tw = s * 0.62 * text.length, gy = at(7.3, 0, z)[1];
  return {text, x, y, s, tw, lights: Array.from(text, (_, i) => ({x: x - tw / 2 + tw * (i + 0.5) / text.length, y, gy, r: s * 0.9}))};
}
// Neon tubes: two glows and a hot core.
function tubes(c, sign, tone, core, k) {
  c.font = `600 ${sign.s}px "Helvetica Neue", Arial, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const [wd, a, t] of [[0.22, 0.25, tone], [0.12, 0.6, tone], [0.05, 1, core]]) { c.strokeStyle = rgba(t, a * (0.5 + k * 0.6)); c.lineWidth = sign.s * wd; c.strokeText(sign.text, sign.x, sign.y); }
}
// A light's glow, white-hot in the middle.
function halo(c, l, k) {
  const a = l.a * k;
  if (a <= 0.01) return;
  const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
  g.addColorStop(0, rgba(mixc(l.tone, [255, 255, 255], 0.35), Math.min(1, a))); g.addColorStop(0.12, rgba(l.tone, 0.75 * Math.min(1, a))); g.addColorStop(1, rgba(l.tone, 0));
  c.fillStyle = g; c.beginPath(); c.arc(l.x, l.y, l.r, 0, 7); c.fill();
}
// A light's reflection on the wet road, broken by ripples.
function streak(c, st, l, k) {
  const ry = 2 * l.gy - l.y, a = l.a * k, seed = l.x * 0.017;
  if (a <= 0.01 || ry <= st.hor) return;
  const top = Math.max(st.hor + 1, ry - (ry - st.hor) * 0.5), len = Math.min(c.canvas.height - top, (ry - st.hor) * 2.2 + 30), wd = Math.max(1.2, Math.min(24, l.r * 0.28));
  for (let i = 0; i < 48; i += 1) {
    const x = l.x + (Math.sin(i * 0.9 + seed) * 0.6 + Math.sin(i * 3.1 + seed * 2.3) * 0.4) * wd * 0.2;
    const al = a * 0.5 * (1 - i / 48) ** 1.1 * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(i * 2.1 + seed * 5.7)) ** 2);
    const g = c.createLinearGradient(x - wd, 0, x + wd, 0);
    g.addColorStop(0, rgba(l.tone, 0)); g.addColorStop(0.5, rgba(l.tone, al)); g.addColorStop(1, rgba(l.tone, 0));
    c.fillStyle = g; c.fillRect(x - wd, top + len * i / 48, wd * 2, len / 48 + 1);
  }
}
// A soft copy, halved step by step so moving things glide.
function soften(st, source, level) {
  let from = source;
  for (let i = 0; i <= level; i += 1) {
    const to = st.chain[i], c = to.getContext('2d');
    c.globalCompositeOperation = 'copy'; c.imageSmoothingQuality = 'high';
    c.drawImage(from, 0, 0, to.width, to.height);
    from = to;
  }
  return from;
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
