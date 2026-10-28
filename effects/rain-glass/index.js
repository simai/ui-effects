// Rain on glass (simai.effect 1.1.0; dark scheme only): a fogged window at night: a street in bokeh behind it, oncoming headlights and receding tail lights; you can write on the glass.
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

// Looking out of a fogged window at a street in the rain. Out of focus behind the glass: street lamps
// in perspective, shop signs, and traffic: cars coming towards us on the left, their white headlights
// growing from the distance, and cars going away on the right, their red tail lights shrinking.
// The glass is fogged with fine beads; pressing and dragging writes on it like a finger, the track
// shows the street clearer, drips run down from it, and the fog slowly comes back.
const SCENE = {
  home: 'dark', seed: 61, reseed: ['density'],
  tones: (read) => ({ground: read('--sf-neutral-5', '#111318'), sky: read('--sf-primary-10', '#001a41'), lamp: read('--sf-warning-80', '#ffb95c'), head: read('--sf-neutral-95', '#f0f0f7'), tail: read('--sf-error-60', '#ff5449'), fog: read('--sf-neutral-30', '#45464f'), cool: read('--sf-primary-70', '#7fabff'), sign: read('--sf-tertiary-70', '#c798cd'), go: read('--sf-success-70', '#4cdb6b')}),
  setup(env, random) {
    const {w, h} = env;
    const f = Math.max(h * 1.1, w * 0.55), cx = w * 0.5, horizon = h * 0.48;
    const lamps = [];
    for (let z = 3; z < 45; z += 3 + random() * 2.5) for (const side of [-1, 1]) if (random() < 0.8) lamps.push({X: side * (4 + random() * 3.5), Y: 2.4 + random() * 2.4, z, colour: random() < 0.8 ? 'lamp' : 'cool'});
    const signs = Array.from({length: 46}, () => ({X: (random() < 0.5 ? -1 : 1) * (4.5 + random() * 5), Y: 0.5 + random() * 3.5, z: 2.5 + random() * 28, colour: ['sign', 'cool', 'lamp'][Math.floor(random() * 3)]}));
    const n = Math.round(2 + env.values.density / 18);
    const toward = Array.from({length: n}, (_, i) => ({z: 2 + (i + random()) * 50 / n, speed: 7 + random() * 5, lane: -1.9 - random() * 1.6}));
    const away = Array.from({length: n}, (_, i) => ({z: 2 + (i + random()) * 50 / n, speed: 6 + random() * 5, lane: 1.9 + random() * 1.6}));
    // The glass: fine beads of condensation, drawn once; the mask says where the glass is fogged.
    const beads = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const b = beads.getContext('2d');
    for (let i = 0, count = w * h / 26; i < count; i += 1) {
      const x = random() * w, y = random() * h, r = 0.4 + random() ** 3 * 2.6;
      b.fillStyle = `rgba(255,255,255,${0.04 + random() * 0.06})`;
      b.beginPath(); b.arc(x, y, r, 0, Math.PI * 2); b.fill();
      if (r > 1.4) { b.fillStyle = 'rgba(255,255,255,0.22)'; b.fillRect(x - r * 0.4, y - r * 0.4, 1, 1); }
    }
    const mask = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const mk = mask.getContext('2d');
    mk.fillStyle = '#000';
    mk.fillRect(0, 0, w, h);
    const frost = new OffscreenCanvas(Math.max(1, Math.ceil(w / 2)), Math.max(1, Math.ceil(h / 2)));
    const glass = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const runs = Array.from({length: 3}, () => ({x: random() * w, phase: random(), period: 12 + random() * 10}));
    return {f, cx, horizon, lamps, signs, toward, away, beads, mask, mk, frost, fr: frost.getContext('2d'), glass, gl: glass.getContext('2d'), drips: [], runs, last: null, t: null, random};
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
    // Many soft lights add up where they overlap, so each one is kept faint.
    const k = values.intensity / 100 * 0.6, fogLevel = values.fog / 100;
    const dt = state.t === null ? 0 : Math.max(0, Math.min(0.05, t - state.t));
    state.t = t;
    // The traffic moves: towards us on the left, away on the right.
    for (const car of state.toward) { car.z -= car.speed * dt; if (car.z < 1.2) { car.z = 48 + state.random() * 10; car.speed = 7 + state.random() * 5; } }
    for (const car of state.away) { car.z += car.speed * dt; if (car.z > 60) { car.z = 1.6 + state.random(); car.speed = 6 + state.random() * 5; } }
    const lights = [];
    const at = (X, Y, z) => [state.cx + X * state.f / z, state.horizon + (1.6 - Y) * state.f / z];
    for (const lamp of state.lamps) lights.push({p: at(lamp.X, lamp.Y, lamp.z), z: lamp.z, colour: tones[lamp.colour], a: 0.75, size: 0.5});
    for (const sign of state.signs) lights.push({p: at(sign.X, sign.Y, sign.z), z: sign.z, colour: tones[sign.colour], a: 0.5, size: 0.8});
    lights.push({p: at(-4, 4.2, 38), z: 38, colour: tones.go, a: 0.8, size: 0.3});
    for (const car of state.toward) {
      const fade = Math.min(1, (car.z - 1.2) / 1.5);
      for (const side of [-0.75, 0.75]) lights.push({p: at(car.lane + side, 0.7, car.z), z: car.z, colour: tones.head, a: fade, size: 0.32, road: true});
    }
    for (const car of state.away) {
      const fade = Math.min(1, (car.z - 1.6) / 1.5);
      for (const side of [-0.7, 0.7]) lights.push({p: at(car.lane + side, 0.9, car.z), z: car.z, colour: tones.tail, a: 0.8 * fade, size: 0.26, road: true});
    }
    // A disc of light out of focus: the same light spread wider, so a bigger disc is a dimmer one.
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
    const street = (c, scale) => {
      const g = c.createLinearGradient(0, 0, 0, h * scale);
      g.addColorStop(0, rgba(tones.ground));
      g.addColorStop(0.46, rgba(tones.sky));
      g.addColorStop(1, rgba(mixc(tones.ground, tones.sky, 0.4)));
      c.fillStyle = g;
      c.fillRect(0, 0, w * scale, h * scale);
    };
    // Far lights are fainter, so the many of them at the end of the street do not pile up into a glare.
    const near = (z) => Math.min(1, 6 / z);
    // The street seen through cleared glass: soft but smaller lights, and their reflections on the wet road.
    street(ctx, 1);
    ctx.globalCompositeOperation = 'lighter';
    for (const light of lights) {
      const r = 2 + light.size * state.f / light.z;
      bokeh(ctx, 1, light.p[0], light.p[1], r, light.colour, 0.85 * k * light.a * near(light.z));
      if (light.road) bokeh(ctx, 1, light.p[0], light.p[1] + r * 2.5, r * 1.3, light.colour, 0.12 * k * light.a);
    }
    // The street through fog: a half-size picture, so it comes out soft, with big bokeh.
    const fr = state.fr, q = 0.5;
    fr.globalCompositeOperation = 'source-over';
    street(fr, q);
    fr.globalCompositeOperation = 'lighter';
    for (const light of lights) {
      const r = 6 + (2 + light.size * state.f / light.z) * 2.8;
      bokeh(fr, q, light.p[0], light.p[1], r, light.colour, 0.55 * k * light.a * near(light.z));
      if (light.road) bokeh(fr, q, light.p[0], light.p[1] + r * 1.4, r * 1.2, light.colour, 0.1 * k * light.a);
    }
    fr.globalCompositeOperation = 'source-over';
    fr.fillStyle = rgba(tones.fog, 0.2);
    fr.fillRect(0, 0, w * q, h * q);
    // Writing: only while the button is held. Drips run from the track now and then.
    const mk = state.mk;
    mk.globalCompositeOperation = 'source-over';
    mk.fillStyle = 'rgba(0,0,0,0.0018)';
    mk.fillRect(0, 0, w, h);
    mk.globalCompositeOperation = 'destination-out';
    mk.lineCap = 'round';
    mk.lineJoin = 'round';
    if (pointer.down && state.last) {
      const x = pointer.x * w, y = pointer.y * h, [lx, ly] = state.last;
      mk.strokeStyle = 'rgba(0,0,0,0.95)';
      mk.lineWidth = 16;
      mk.beginPath(); mk.moveTo(lx, ly); mk.lineTo(x, y); mk.stroke();
      const moved = Math.hypot(x - lx, y - ly);
      if (moved > 0 && state.random() < Math.min(0.5, moved / 60)) state.drips.push({x: x + (state.random() - 0.5) * 10, y: y + 6, v: 0, left: 30 + state.random() * 140});
      state.last = [x, y];
    }
    for (const run of state.runs) {
      const p = (t / run.period + run.phase) % 1;
      if (p > 0.6) continue;
      const y = p / 0.6 * h;
      mk.strokeStyle = 'rgba(0,0,0,0.6)';
      mk.lineWidth = 3;
      mk.beginPath(); mk.moveTo(run.x + Math.sin(y * 0.03) * 3, Math.max(0, y - 8)); mk.lineTo(run.x + Math.sin(y * 0.03) * 3, y); mk.stroke();
    }
    for (const drip of state.drips) {
      drip.v = Math.min(60, drip.v + (state.random() < 0.04 ? -drip.v : 40 * dt));
      const step = drip.v * dt;
      mk.strokeStyle = 'rgba(0,0,0,0.85)';
      mk.lineWidth = 2.6;
      mk.beginPath(); mk.moveTo(drip.x, drip.y); mk.lineTo(drip.x, drip.y + step + 0.5); mk.stroke();
      drip.y += step;
      drip.left -= step;
    }
    // The fogged glass: blurred street, beads over it, cut by the mask, laid over the clear view.
    const gl = state.gl;
    gl.globalCompositeOperation = 'source-over';
    gl.clearRect(0, 0, w, h);
    gl.imageSmoothingQuality = 'high';
    gl.drawImage(state.frost, 0, 0, w, h);
    gl.drawImage(state.beads, 0, 0, w, h);
    gl.globalCompositeOperation = 'destination-in';
    gl.drawImage(state.mask, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = Math.min(1, 0.15 + fogLevel);
    ctx.drawImage(state.glass, 0, 0, w, h);
    ctx.globalAlpha = 1;
    // Drip heads catch the light.
    for (const drip of state.drips) {
      ctx.fillStyle = rgba(tones.head, 0.35 * k);
      ctx.beginPath(); ctx.arc(drip.x, drip.y, 2, 0, Math.PI * 2); ctx.fill();
    }
    state.drips = state.drips.filter((drip) => drip.left > 0 && drip.y < h);
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
