// Rain on glass (simai.effect 1.1.0; dark scheme only): a fogged window at night: a lamp-lit street in bokeh behind it, a car going by now and then; drops on the glass, and you can write on it.
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

// A fogged window on a rainy night: a sky over a darker road, two rows of street lamps fading into
// the distance, signs as soft discs, cars now and then (white lights coming, red going), and, if
// asked, a traffic light that tints the road, a blinking neon sign and rare lightning. Drops on the
// glass are lenses. Press and drag to write; drips run, fog returns.
const SCENE = {
  home: 'dark', seed: 61, reseed: ['density', 'lamps'],
  tones: (read) => ({go: read('--sf-success-70', '#4cbb6f'), ground: read('--sf-neutral-5', '#111318'), sky: read('--sf-primary-10', '#001a41'), lamp: read('--sf-warning-80', '#ffb95c'), head: read('--sf-neutral-95', '#f0f0f7'), tail: read('--sf-error-60', '#ff5449'), fog: read('--sf-neutral-30', '#45464f'), cool: read('--sf-primary-70', '#7fabff'), sign: read('--sf-tertiary-70', '#c798cd')}),
  setup(env, random) {
    const {w, h} = env;
    const f = Math.max(h * 1.1, w * 0.55), cx = w * 0.5, horizon = h * 0.48;
    const lamps = [], kind = env.values.lamps;
    if (kind !== 'none') for (let z = 7; z < 60; z += 5) for (const side of [-1, 1]) lamps.push({X: side * 4.2, Y: 3.4, z: z + (side + 1) * 1.2, colour: kind === 'white' ? 'head' : kind === 'mixed' && random() < 0.5 ? 'cool' : 'lamp'});
    const signs = Array.from({length: Math.round(20 + env.values.density / 2)}, () => ({X: (random() < 0.5 ? -1 : 1) * (4.5 + random() * 5), Y: 0.5 + random() * 3.5, z: 2.5 + random() * 28, colour: ['sign', 'cool', 'lamp'][Math.floor(random() * 3)]}));
    const cars = [];
    const busy = env.values.traffic / 100;
    if (random() < busy + 0.2) cars.push({way: -1, z: 8 + random() * 30, speed: 7 + random() * 5, lane: -2 - random() * 1.4});
    if (random() < busy) cars.push({way: 1, z: 4 + random() * 20, speed: 6 + random() * 5, lane: 2 + random() * 1.4});
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
    const frost = new OffscreenCanvas(Math.max(1, Math.ceil(w / 2)), Math.max(1, Math.ceil(h / 2))), glows = new OffscreenCanvas(frost.width, frost.height);
    const glass = new OffscreenCanvas(Math.ceil(w), Math.ceil(h)), lit = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    return {f, cx, horizon, lamps, signs, cars, beads, drops, mask, mk, frost, fr: frost.getContext('2d'), glows, go: glows.getContext('2d'), glass, gl: glass.getContext('2d'), lt: lit.getContext('2d'), lit, trails: [], last: null, t: null, random};
  },
  press(env, x, y) {
    const {state} = env;
    state.mk.globalCompositeOperation = 'destination-out';
    state.mk.fillStyle = 'rgba(0,0,0,0.95)';
    state.mk.beginPath(); state.mk.arc(x, y, 8, 0, Math.PI * 2); state.mk.fill();
    state.last = [x, y];
  },
  release(env) { env.state.last = null; },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env;
    const k = values.intensity / 100 * 0.7, fogLevel = values.fog / 100;
    const dt = state.t === null ? 0 : Math.max(0, Math.min(0.05, t - state.t));
    state.t = t;
    // Cars come by at random; the traffic setting is how often.
    const rate = values.traffic / 100 * 0.3;
    if (state.random() < rate * dt) state.cars.push({way: -1, z: 52, speed: 7 + state.random() * 5, lane: -2 - state.random() * 1.4});
    if (state.random() < rate * dt * 0.8) state.cars.push({way: 1, z: 1.6, speed: 6 + state.random() * 5, lane: 2 + state.random() * 1.4});
    for (const car of state.cars) car.z += car.way * car.speed * dt;
    state.cars = state.cars.filter((car) => car.z > 1.2 && car.z < 60);
    const at = (X, Y, z) => [state.cx + X * state.f / z, state.horizon + (1.6 - Y) * state.f / z];
    const lights = [];
    // Lamps fade with distance; the extras the settings ask for join them.
    const fall = (z) => (7 / z) ** 0.9, cyc = t % 14;
    for (const l of state.lamps) lights.push({p: at(l.X, l.Y, l.z), z: l.z, colour: tones[l.colour], a: 0.6 * fall(l.z), size: 0.3});
    const signal = values.signal ? (cyc < 6 ? 'go' : cyc < 7.5 ? 'lamp' : 'tail') : null;
    const neon = values.neon && (t % 5 < 4.1) && !(t % 5 > 3.5 && t % 0.24 < 0.1);
    for (const sign of state.signs) lights.push({p: at(sign.X, sign.Y, sign.z), z: sign.z, colour: tones[sign.colour], a: 0.5, size: 0.8});
    const lamps = state.lamps.map((l) => ({p: at(l.X, l.Y, l.z), z: l.z, colour: tones[l.colour], a: 0.45 * fall(l.z)}));
    if (signal) lamps.push({p: at(3.2, 3, 13), z: 6, colour: tones[signal], a: 1.4});
    // The sign: a row of tubes, each a glow of its own.
    if (neon) for (let i = 0; i < 5; i += 1) lamps.push({p: at(-6.4 + i * 0.35, 2.6, 10), z: 6, colour: tones[i % 2 ? 'cool' : 'sign'], a: 1.1});
    for (const car of state.cars) {
      const toward = car.way < 0;
      const fade = Math.min(1, (car.z - 1.2) / 1.5) * Math.min(1, (60 - car.z) / 8);
      for (const side of [-0.75, 0.75]) lamps.push({p: at(car.lane + side, toward ? 0.7 : 0.9, car.z), z: car.z, colour: toward ? tones.head : tones.tail, a: fade * (toward ? 1 : 0.85)});
    }
    const near = (z) => Math.min(1, 6 / z);
    // An out-of-focus disc: the bigger, the dimmer.
    const bokeh = (c, scale, x, y, r, colour, a) => {
      a = Math.min(0.32, a * Math.min(1, 26 / r));
      if (a <= 0.01) return;
      const g = c.createRadialGradient(x * scale, y * scale, 0, x * scale, y * scale, r * scale);
      g.addColorStop(0, rgba(colour, a * 0.6));
      g.addColorStop(0.8, rgba(colour, a));
      g.addColorStop(0.9, rgba(colour, a * 0.85));
      g.addColorStop(1, rgba(colour, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(x * scale, y * scale, r * scale, 0, Math.PI * 2); c.fill();
    };
    // A car light: a core, a soft halo and a streak on the wet road.
    const glow = (c, scale, x, y, core, colour, a, spread) => {
      if (a <= 0.01) return;
      const r = (core * spread + 6) * scale;
      const g = c.createRadialGradient(x * scale, y * scale, 0, x * scale, y * scale, r);
      g.addColorStop(0, rgba(mixc(colour, [255, 255, 255], 0.5), Math.min(0.9, a)));
      g.addColorStop(Math.min(0.5, core * scale / r), rgba(colour, a * 0.45));
      g.addColorStop(0.45, rgba(colour, a * 0.12));
      g.addColorStop(1, rgba(colour, 0));
      c.fillStyle = g;
      c.beginPath(); c.arc(x * scale, y * scale, r, 0, Math.PI * 2); c.fill();
      const down = (h - y) * 0.7 * scale;
      if (down > 4) {
        const s = c.createLinearGradient(0, y * scale, 0, y * scale + down);
        s.addColorStop(0, rgba(colour, a * 0.16));
        s.addColorStop(1, rgba(colour, 0));
        c.fillStyle = s;
        c.beginPath(); c.ellipse(x * scale, y * scale + down / 2, Math.max(1.5, core * 1.4 * scale), down / 2, 0, 0, Math.PI * 2); c.fill();
      }
    };
    const street = (c, scale) => {
      const g = c.createLinearGradient(0, 0, 0, h * scale);
      g.addColorStop(0, rgba(tones.ground));
      g.addColorStop(0.46, rgba(tones.sky));
      g.addColorStop(0.5, rgba(mixc(tones.ground, tones.sky, 0.45)));
      g.addColorStop(1, rgba(mixc(tones.ground, [0, 0, 0], 0.35)));
      c.fillStyle = g;
      c.fillRect(0, 0, w * scale, h * scale);
    };
    street(ctx, 1);
    // Lightning: a flash and an echo every so often, mostly in the sky.
    if (values.storm) {
      if (!state.bolt || t > state.bolt + 18) state.bolt = t + 6 + state.random() * 14;
      const d = t - state.bolt, flash = d > 0 && d < 0.6 ? Math.exp(-d * 9) + (d > 0.18 ? 0.6 * Math.exp(-(d - 0.18) * 9) : 0) : 0;
      if (flash > 0.01) { const g = ctx.createLinearGradient(0, 0, 0, state.horizon); g.addColorStop(0, rgba(tones.head, 0.22 * flash)); g.addColorStop(1, rgba(tones.cool, 0.05 * flash)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const light of lights) bokeh(ctx, 1, light.p[0], light.p[1], 2 + light.size * state.f / light.z, light.colour, 0.85 * k * light.a * near(light.z));
    for (const lamp of lamps) glow(ctx, 1, lamp.p[0], lamp.p[1], Math.max(1.5, 0.14 * state.f / lamp.z), lamp.colour, 1.1 * k * lamp.a * Math.min(1, 9 / lamp.z), 5);
    // Through fog: a half-size picture with bigger discs and glows.
    // The lights alone go on their own layer: the beads light up from them, not from the dark sky.
    const fr = state.fr, go = state.go, q = 0.5;
    go.clearRect(0, 0, w, h);
    go.globalCompositeOperation = 'lighter';
    for (const light of lights) bokeh(go, q, light.p[0], light.p[1], 6 + (2 + light.size * state.f / light.z) * 2.8, light.colour, 0.55 * k * light.a * near(light.z));
    for (const lamp of lamps) glow(go, q, lamp.p[0], lamp.p[1], Math.max(2, 0.14 * state.f / lamp.z), lamp.colour, 0.75 * k * lamp.a * Math.min(1, 9 / lamp.z), 11);
    fr.globalCompositeOperation = 'source-over';
    street(fr, q);
    fr.globalCompositeOperation = 'lighter';
    fr.drawImage(state.glows, 0, 0);
    fr.globalCompositeOperation = 'source-over';
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
      mk.lineWidth = 16;
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
    const lt = state.lt;
    lt.globalCompositeOperation = 'source-over';
    lt.clearRect(0, 0, w, h);
    lt.drawImage(state.glows, 0, 0, w, h);
    lt.globalCompositeOperation = 'destination-in';
    lt.drawImage(state.beads, 0, 0, w, h);
    gl.globalCompositeOperation = 'lighter';
    gl.drawImage(state.lit, 0, 0, w, h);
    gl.globalCompositeOperation = 'destination-in';
    gl.drawImage(state.mask, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
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
