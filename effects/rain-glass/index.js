// Rain on glass (simai.effect 1.1.0; dark scheme only): a fogged window on a rainy night: the street behind it out of focus, only its lights. Lamps run off, neon shifts and flickers, a traffic light at the crossing stops and lets the cars go, every light trembles as a streak on the wet road. Drops run down the glass; wipe it with a finger, and it fogs again.
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

// A fogged window on a rainy night, the street behind it out of focus: only its lights, as soft
// discs. Lamps run off in rows, a cross street brings a row of its own, neon lights change colour and
// flicker, the city glows far off; each light trembles as a long streak on the wet road. At the
// crossing a traffic light turns: on red the cars on this street wait and the cross traffic goes.
// On the glass, drops gather and now and then one runs down; a finger wipes fog and drops away, and
// the fog comes back.
// The palettes the catalogue shares: a dark ground, a mass, the colour and its light. 'theme' takes the
// theme's own tones; 'custom' builds the four from the colour setting (a hex). The city glow, the lamps
// and the neon come from the four.
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
const rgbOf = (hex) => (/^#[0-9a-f]{6}$/iu.test(hex ?? '') ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : [59, 130, 246]);
const customStops = (hex) => { const c = rgbOf(hex); return [c.map((v) => 4 + v * 0.05), c.map((v) => v * 0.42), c, c.map((v) => v + (255 - v) * 0.86)]; };
const ownTones = ([, mass, c, light]) => ( {glow: mass.map((v) => v * 0.5), lamp: light, neon: [c, mixc(c, light, 0.5), light]});

const SCENE = {
  home: 'dark', seed: 61, reseed: ['density'],
  tones: (read) => {
    const r = (name, tone, hex) => read(`--sf-${name}-${tone}`, hex);
    return {
      sky: r('neutral', 6, '#16181d'), ground: r('neutral', 4, '#0c0e13'), fog: r('neutral', 30, '#45464f'), head: r('neutral', 98, '#faf9fe'),
      tail: r('error', 60, '#ff5449'), stop: r('error', 60, '#ff5449'), wait: r('warning', 70, '#f19d47'), go: r('success', 70, '#4cbb6f'),
      theme: {glow: r('primary', 20, '#002e69'), lamp: r('primary', 90, '#d8e2ff'), neon: [r('primary', 70, '#7aabff'), r('tertiary', 70, '#c798cd'), r('primary', 80, '#adc6ff')]},
    };
  },
  setup(env, random) {
    const {w, h, values} = env, W = Math.ceil(w), H = Math.ceil(h);
    const st = {random, f: Math.min(h, w * 0.7), cx: w * 0.6, hor: h * 0.5, camY: 1.7,
      blur: h * 0.011, cars: [], cross: [], drops: [], runs: [], last: null, t: null, sprites: new Map()};
    st.scene = new OffscreenCanvas(W, H); st.mask = new OffscreenCanvas(W, H); st.glass = new OffscreenCanvas(W, H);
    st.chain = [2, 4, 8, 16, 32].map((d) => new OffscreenCanvas(Math.max(1, Math.ceil(w / d)), Math.max(1, Math.ceil(h / d))));
    st.mk = st.mask.getContext('2d');
    st.mk.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h / 2600; i += 1) st.drops.push(drop(st, random() * w, random() * h));
    // The lights of the street: lamps both sides and across the crossing, neon on the facades,
    // and the far city as a scatter of small dim points.
    const L = st.lights = [], d = values.density / 100;
    for (let z = 5; z < 80; z += 4 + random() * 5) for (const s of [-1, 1]) if (random() < 0.8) L.push({X: s * (4.6 + random()), Y: 5 + random() * 2, z: z + random() * 3, c: 'lamp', s: 0.3 + random() * 0.5, ph: random() * 9});
    for (let X = -26; X <= 26; X += 5 + random() * 4) L.push({X, Y: 5.5 + random(), z: 23, c: 'lamp', s: 0.3 + random() * 0.4, ph: random() * 9});
    for (let i = 0; i < 8 + d * 14; i += 1) {
      const s = random() < 0.5 ? -1 : 1, z = 7 + random() * 45;
      if (z > 19 && z < 25) continue;
      L.push({X: s * (6.5 + random() * 2), Y: 2.5 + random() * 4, z, c: Math.floor(random() * 3), s: 0.7 + random() * 1.3, ph: random() * 40, kind: Math.floor(random() * 3)});
    }
    for (let i = 0; i < 20 + d * 40; i += 1) L.push({X: (random() - 0.5) * 60, Y: 1 + random() ** 2 * 12, z: 50 + random() * 60, c: random() < 0.6 ? 'lamp' : Math.floor(random() * 3), s: 0.4, ph: random() * 40, dim: 0.15 + random() * 0.3});
    return st;
  },
  press(env, x, y) { env.state.last = [x, y]; wipe(env.state, x, y, x, y); },
  release(env) { env.state.last = null; },
  draw(env, t) {
    const {ctx, w, h, tones, state: st, values, pointer} = env;
    const k = values.intensity / 100, dt = st.t === null ? 0 : Math.max(0, Math.min(0.05, t - st.t)), P = values.palette === 'theme' ? tones.theme : st.own?.key === values.palette + values.colour ? st.own : (st.own = {...ownTones(values.palette === 'custom' ? customStops(values.colour) : PALETTES[values.palette] ?? PALETTES.ocean), key: values.palette + values.colour});
    st.t = t;
    if (st.tones !== tones) { st.sprites.clear(); st.tones = tones; }
    const at = (X, Y, z) => [st.cx + X * st.f / z, st.hor + (st.camY - Y) * st.f / z];
    // The signal: green 7 s, amber 2 s, red 7 s; on red this street waits and the cross street goes.
    const phase = t % 16, go = phase < 7, red = phase >= 9;
    const rate = values.traffic / 100 * 0.35;
    if (go && st.random() < rate * dt) st.cars.push({X: 1.9, z: 2.5, v: 4 + st.random() * 2, way: 1});
    if (go && st.random() < rate * dt * 0.8) st.cars.push({X: -1.9, z: 80, v: 6 + st.random() * 2, way: -1});
    if (red && st.random() < rate * dt * 1.4) { const s = st.random() < 0.5 ? -1 : 1; st.cross.push({X: -32 * s, z: 23 + s * 0.8, v: 6 + st.random() * 3, way: s}); }
    for (const car of st.cars) {
      const next = car.z + car.way * car.v * dt, line = car.way > 0 ? 20 : 26;
      if (!go && (car.z - line) * (next - line) <= 0) continue;
      car.z = next;
    }
    for (const car of st.cross) car.X += car.way * car.v * dt;
    st.cars = st.cars.filter((car) => car.z > 2.4 && car.z < 82);
    st.cross = st.cross.filter((car) => Math.abs(car.X) < 34);
    // The picture behind the glass: a sky that glows over the city into a wet ground.
    const s = st.scene.getContext('2d');
    s.globalCompositeOperation = 'source-over';
    let g = s.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.sky)); g.addColorStop(st.hor / h, rgba(mixc(tones.sky, P.glow, 0.6))); g.addColorStop(Math.min(1, st.hor / h + 0.08), rgba(mixc(tones.ground, P.glow, 0.3))); g.addColorStop(1, rgba(tones.ground));
    s.fillStyle = g; s.fillRect(0, 0, w, h);
    s.globalCompositeOperation = 'lighter';
    const blob = (X, Y, z, colour, size, a) => {
      const [x, y] = at(X, Y, z), p = st.f / z, r = size * p * 0.5 + st.blur * 1.6;
      // Bigger discs are dimmer; the left, under a banner's text, is quieter.
      a *= k * Math.min(1, ((size * p + 2) / r) ** 0.5) * (0.35 + 0.65 * smooth(clamp((x / w - 0.15) / 0.4, 0, 1)));
      if (a < 0.01 || x < -r * 2 || x > w + r * 2) return;
      const sp = sprite(st, colour);
      s.globalAlpha = Math.min(1, a);
      s.drawImage(sp.disc, x - r, y - r, r * 2, r * 2);
      // Its reflection: from the mirror point down towards the eye; it stays put and only trembles.
      const gy = at(X, 0, z)[1], ry = 2 * gy - y;
      if (ry <= st.hor) return;
      const len = (ry - st.hor) * 2 + r * 2;
      s.globalAlpha = Math.min(1, a * (0.55 + 0.08 * Math.sin(t * 2 + X + z)));
      s.drawImage(sp.streak, x - r * 0.9 + Math.sin(t * 3 + z) * r * 0.06, ry - r, r * 1.8, len);
    };
    for (const l of st.lights) {
      let colour = l.c === 'lamp' ? P.lamp : P.neon[l.c], a = l.dim ?? 1;
      // Neon: one light drifts through the palette, one flickers now and then, one blinks.
      if (l.kind === 0) { const u = (t * 0.05 + l.ph) % 3, i = Math.floor(u); colour = mixc(P.neon[i], P.neon[(i + 1) % 3], Math.round(smooth(u - i) * 12) / 12); }
      if (l.kind === 1 && (t + l.ph) % 9 > 8.2 && (t * 20) % 2 < 1) a *= 0.15;
      if (l.kind === 2) a *= (t + l.ph) % 4 < 2.6 ? 1 : 0.08;
      if (l.c === 'lamp') a *= 0.85 + 0.15 * Math.sin(t * 0.7 + l.ph);
      blob(l.X, l.Y, l.z, colour, l.s, a * 0.78);
    }
    for (const X of [-5.5, 5.5]) for (let i = 0; i < 3; i += 1) {
      const on = i === (go ? 2 : red ? 0 : 1);
      blob(X, 4.8 - i * 0.45, 20.5, [tones.stop, tones.wait, tones.go][i], 0.3, on ? 1.3 : 0.06);
    }
    for (const car of st.cars) {
      const a = Math.min(1, (car.z - 2.4) / 1.5, (82 - car.z) / 10);
      for (const side of [-0.7, 0.7]) blob(car.X + side, 0.8, car.z, car.way > 0 ? tones.tail : tones.head, 0.3, a * (car.way > 0 ? 0.8 : 1.1));
    }
    for (const car of st.cross) {
      const a = Math.min(1, (34 - Math.abs(car.X)) / 6);
      blob(car.X + car.way * 2, 0.8, car.z, tones.head, 0.3, a);
      blob(car.X - car.way * 2, 0.8, car.z, tones.tail, 0.3, a * 0.8);
    }
    s.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(st.scene, 0, 0, w, h);
    // The glass: fog creeps back where it was wiped; new drops gather; a heavy one now and then
    // runs down, taking the drops in its way and leaving a clear track.
    const mk = st.mk;
    mk.globalCompositeOperation = 'source-over';
    mk.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 0.18)})`; mk.fillRect(0, 0, w, h);
    if (st.drops.length < w * h / 1800 && st.random() < dt * w * h / 60000) st.drops.push(drop(st, st.random() * w, st.random() * h));
    if (!st.runs.length && st.random() < dt * 0.25) { const d = st.drops.find((one) => one.r > 4.5); if (d) { d.v = 0; st.runs.push(d); } }
    mk.globalCompositeOperation = 'destination-out';
    for (const d of st.runs) {
      d.v = Math.min(90, d.v + 60 * dt) * (st.random() < 0.03 ? 0.2 : 1);
      const y = d.y + d.v * dt, x = d.x + (st.random() - 0.5) * 0.8;
      mk.lineWidth = d.r * 1.2; mk.lineCap = 'round'; mk.strokeStyle = 'rgba(0,0,0,0.7)';
      mk.beginPath(); mk.moveTo(d.x, d.y); mk.lineTo(x, y); mk.stroke();
      d.x = x; d.y = y;
      st.drops = st.drops.filter((o) => o === d || Math.hypot(o.x - d.x, o.y - d.y) > d.r + o.r);
    }
    st.runs = st.runs.filter((d) => d.y < h + 10);
    st.drops = st.drops.filter((d) => d.y < h + 10);
    if (pointer.down && st.last) { const x = pointer.x * w, y = pointer.y * h; wipe(st, st.last[0], st.last[1], x, y); st.last = [x, y]; }
    for (const d of st.drops) { mk.beginPath(); mk.ellipse(d.x, d.y, d.r, d.r * 1.1, 0, 0, 7); mk.fill(); }
    const gl = st.glass.getContext('2d');
    gl.globalCompositeOperation = 'copy';
    gl.drawImage(soften(st, ctx.canvas, 3), 0, 0, w, h);
    // Lights through fog spread into soft glowing spots.
    gl.globalCompositeOperation = 'lighter';
    gl.globalAlpha = 0.2; gl.drawImage(soften(st, st.scene, 2), 0, 0, w, h); gl.globalAlpha = 1;
    gl.globalCompositeOperation = 'source-over';
    gl.fillStyle = rgba(tones.fog, 0.14); gl.fillRect(0, 0, w, h);
    gl.globalCompositeOperation = 'destination-in';
    gl.drawImage(st.mask, 0, 0, w, h);
    ctx.globalAlpha = Math.min(1, 0.15 + values.fog / 100);
    ctx.drawImage(st.glass, 0, 0, w, h);
    ctx.globalAlpha = 1;
    // A shade on the left, where a banner's text sits.
    g = ctx.createLinearGradient(0, 0, w * 0.6, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Each drop: clear, a bright rim below, a highlight above.
    for (const d of st.drops) {
      g = ctx.createRadialGradient(d.x, d.y - d.r * 0.3, d.r * 0.4, d.x, d.y, d.r * 1.1);
      g.addColorStop(0, 'rgba(255,255,255,0.02)'); g.addColorStop(1, 'rgba(255,255,255,0.18)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r, d.r * 1.1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = rgba(tones.head, 0.4 * Math.min(1, k * 2));
      ctx.beginPath(); ctx.arc(d.x - d.r * 0.35, d.y - d.r * 0.45, Math.max(0.5, d.r * 0.16), 0, 7); ctx.fill();
    }
  },
};
function drop(st, x, y) { return {x, y, r: 1.2 + st.random() ** 3 * 6}; }
// A finger's stroke takes the fog and the drops under it.
function wipe(st, x0, y0, x1, y1) {
  const mk = st.mk;
  mk.globalCompositeOperation = 'destination-out';
  mk.lineWidth = 30; mk.lineCap = 'round'; mk.strokeStyle = '#000';
  mk.beginPath(); mk.moveTo(x0, y0); mk.lineTo(x1, y1 + 0.01); mk.stroke();
  const dx = x1 - x0, dy = y1 - y0, len = dx * dx + dy * dy || 1;
  st.drops = st.drops.filter((d) => {
    const u = Math.max(0, Math.min(1, ((d.x - x0) * dx + (d.y - y0) * dy) / len));
    return Math.hypot(d.x - x0 - u * dx, d.y - y0 - u * dy) > 15 + d.r;
  });
}
// A light: a round glow, opaque in the middle and clear at the edge, and its streak on the wet
// road; one pair per colour.
function sprite(st, colour) {
  const key = colour.map(Math.round).join();
  let sp = st.sprites.get(key);
  if (sp) return sp;
  const disc = new OffscreenCanvas(64, 64), d = disc.getContext('2d'), g = d.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(colour, 1)); g.addColorStop(1, rgba(colour, 0));
  d.fillStyle = g; d.fillRect(0, 0, 64, 64);
  const streak = new OffscreenCanvas(16, 128), c = streak.getContext('2d');
  for (let y = 0; y < 128; y += 2) {
    const s = c.createLinearGradient(0, 0, 16, 0);
    s.addColorStop(0, rgba(colour, 0)); s.addColorStop(0.5, rgba(colour, Math.min(1, y / 24) ** 1.5 * (1 - y / 128) ** 1.3)); s.addColorStop(1, rgba(colour, 0));
    c.fillStyle = s; c.fillRect(0, y, 16, 2);
  }
  sp = {disc, streak};
  st.sprites.set(key, sp);
  return sp;
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
