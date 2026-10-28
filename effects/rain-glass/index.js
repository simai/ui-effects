// Rain on glass (simai.effect 1.1.0; dark scheme only): a fogged window at night: street lamps and passing cars behind the glass; a finger can wipe the fog.
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

// A fogged window at night. Behind the glass, out of focus: street lamps and the lights of passing
// cars. On the glass: fog, a few drops, and now and then a drop that runs down and clears a track.
// The pointer is a finger: where it moves the fog is wiped away, and the fog slowly comes back.
const SCENE = {
  home: 'dark', seed: 61, reseed: ['density'],
  tones: (read) => ({ground: read('--sf-neutral-5', '#111318'), street: read('--sf-primary-10', '#001a41'), lamp: read('--sf-warning-80', '#ffb95c'), head: read('--sf-neutral-95', '#f0f0f7'), tail: read('--sf-error-60', '#ff5449'), fog: read('--sf-neutral-30', '#45464f'), cool: read('--sf-primary-70', '#7fabff')}),
  setup(env, random) {
    const {w, h} = env;
    const lamps = Array.from({length: 7}, () => ({x: random(), y: 0.15 + random() * 0.35, r: 18 + random() * 40, warm: random() < 0.75}));
    const cars = Array.from({length: Math.round(2 + env.values.density / 20)}, () => ({lane: 0.62 + random() * 0.22, pos: random(), speed: 0.035 + random() * 0.04, dir: random() < 0.5 ? 1 : -1}));
    const drops = Array.from({length: Math.round(w * h / 9000)}, () => ({x: random() * w, y: random() * h, r: 1 + random() * 2.5}));
    const runs = Array.from({length: 4}, () => ({x: random() * w, phase: random(), period: 9 + random() * 9}));
    const fog = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const f = fog.getContext('2d');
    const state = {lamps, cars, drops, runs, fog, f, last: null, seeded: false};
    return state;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env;
    const k = values.intensity / 100;
    const fogLevel = values.fog / 100;
    // Behind the glass.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(tones.street));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const blob = (x, y, r, colour, a) => {
      const b = ctx.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, rgba(colour, a));
      b.addColorStop(1, rgba(colour, 0));
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    for (const lamp of state.lamps) blob(lamp.x * w, lamp.y * h, lamp.r, lamp.warm ? tones.lamp : tones.cool, 0.35 * k);
    for (const car of state.cars) {
      const x = ((car.pos + t * car.speed * car.dir) % 1 + 1) % 1 * (w + 200) - 100;
      const y = car.lane * h;
      const colour = car.dir > 0 ? tones.head : tones.tail;
      blob(x, y, 26, colour, 0.4 * k);
      blob(x + 22 * car.dir * -1, y, 26, colour, 0.4 * k);
    }
    ctx.globalCompositeOperation = 'source-over';
    // The fog: laid once, then it creeps back over what the finger and the drops wiped.
    const f = state.f;
    if (!state.seeded) {
      f.fillStyle = rgba(tones.fog, 0.62 * fogLevel);
      f.fillRect(0, 0, w, h);
      state.seeded = true;
    } else {
      f.globalCompositeOperation = 'source-over';
      f.fillStyle = rgba(tones.fog, 0.004 * fogLevel);
      f.fillRect(0, 0, w, h);
    }
    f.globalCompositeOperation = 'destination-out';
    f.lineCap = 'round';
    f.lineJoin = 'round';
    if (pointer.on) {
      const x = pointer.x * w, y = pointer.y * h;
      f.strokeStyle = 'rgba(0,0,0,0.9)';
      f.lineWidth = 26;
      f.beginPath();
      f.moveTo(state.last?.[0] ?? x, state.last?.[1] ?? y);
      f.lineTo(x, y);
      f.stroke();
      state.last = [x, y];
    } else {
      state.last = null;
    }
    // A drop now and then runs down and clears a thin track.
    for (const run of state.runs) {
      const p = (t / run.period + run.phase) % 1;
      if (p > 0.6) continue;
      const y = p / 0.6 * h;
      f.strokeStyle = 'rgba(0,0,0,0.5)';
      f.lineWidth = 3;
      f.beginPath();
      f.moveTo(run.x + Math.sin(y * 0.03) * 3, Math.max(0, y - 6));
      f.lineTo(run.x + Math.sin(y * 0.03) * 3, y);
      f.stroke();
    }
    f.globalCompositeOperation = 'source-over';
    ctx.drawImage(state.fog, 0, 0, w, h);
    // Drops on the glass catch a little light.
    for (const d of state.drops) {
      ctx.fillStyle = rgba(tones.head, 0.1 * k);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
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
  const env = {ctx, w: 1, h: 1, values: {...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, pointer: {x: 0.5, y: 0.5, on: false}, still: false};
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
      canvas.remove();
    },
  };
}
