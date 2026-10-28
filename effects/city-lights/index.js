// City lights (simai.effect 1.1.0; dark scheme only): a city at night from above: a glowing street grid, wide avenues, a park, rivers and streams of cars.
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

// A night city seen from above, after Manhattan: a street grid turned about 29 degrees, wide avenues
// every few blocks and dense cross streets, all glowing sodium orange; a dark park; rivers along two
// sides; lit windows in the blocks; and streams of car lights running the avenues.
const SCENE = {
  home: 'dark', seed: 33, reseed: ['density'],
  tones: (read) => ({ground: read('--sf-neutral-5', '#111318'), water: read('--sf-primary-10', '#001a41'), sodium: read('--sf-warning-70', '#e08f2c'), lamp: read('--sf-warning-80', '#ffb95c'), white: read('--sf-neutral-95', '#f0f0f7'), red: read('--sf-error-60', '#ff5449'), window: read('--sf-warning-90', '#ffddb6')}),
  setup(env, random) {
    const {w, h, tones} = env;
    const angle = -0.5;
    const span = Math.hypot(w, h) * 1.2;
    const street = 8, avenue = street * 4.5;
    const map = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    // The lights are drawn on a clear layer first, so their haze holds light only; the ground goes under them after.
    const m = map.getContext('2d');
    m.save();
    m.translate(w * 0.5, h * 0.5);
    m.rotate(angle);
    // The island's edges: water beyond them.
    const left = -span * 0.34, right = span * 0.38;
    const park = {x: left + avenue * 6, y: -span * 0.3, w: avenue * 1.6, h: span * 0.16};
    const lit = (x, y) => noise2(x / 160 + 4, y / 160) * 0.7 + noise2(x / 50, y / 50 + 3) * 0.3;
    // Streets are chains of lamps, brighter in busy districts, dimmer and broken in quiet ones.
    m.globalCompositeOperation = 'lighter';
    const lamps = (x0, y0, x1, y1, gap, bright, size) => {
      const length = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(length / gap);
      for (let i = 0; i <= n; i += 1) {
        const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
        const d = lit(x, y);
        if (random() > d * 1.6) continue;
        m.fillStyle = rgba(random() < 0.85 ? tones.sodium : tones.window, bright * (0.35 + d) * (0.6 + random() * 0.4));
        m.fillRect(x, y, size, size);
      }
    };
    for (let y = -span / 2; y < span / 2; y += street) lamps(left, y, right, y, 4, 0.5, 1);
    const avenues = [];
    for (let x = left; x < right; x += avenue) {
      avenues.push(x);
      lamps(x, -span / 2, x, span / 2, 3, 0.9, 1.5);
    }
    // A diagonal like Broadway.
    lamps(left + avenue, -span / 2, right - avenue, span / 2, 3, 0.8, 1.5);
    // Lit windows: tiny points in the blocks, denser where the district is busy.
    const count = Math.round(w * h / 40 * (0.3 + env.values.density / 100));
    for (let i = 0; i < count; i += 1) {
      const x = left + random() * (right - left), y = -span / 2 + random() * span;
      if (random() > lit(x, y) * 1.3) continue;
      m.fillStyle = rgba(random() < 0.7 ? tones.window : tones.white, 0.25 + random() * 0.35);
      m.fillRect(x, y, 1, 1);
    }
    // A haze of light over the city: the lamps blurred and laid over themselves.
    const haze = new OffscreenCanvas(map.width, map.height);
    const hz = haze.getContext('2d');
    hz.filter = 'blur(5px)';
    hz.drawImage(map, 0, 0);
    m.restore();
    m.save();
    m.globalCompositeOperation = 'lighter';
    m.globalAlpha = 0.9;
    m.drawImage(haze, 0, 0);
    m.restore();
    m.save();
    m.globalCompositeOperation = 'destination-over';
    m.fillStyle = rgba(tones.ground);
    m.fillRect(0, 0, w, h);
    m.restore();
    m.save();
    m.translate(w * 0.5, h * 0.5);
    m.rotate(angle);
    m.globalCompositeOperation = 'source-over';
    // The park: dark, a few path lamps.
    m.fillStyle = rgba(tones.ground);
    m.fillRect(park.x, park.y, park.w, park.h);
    for (let i = 0; i < 14; i += 1) { m.fillStyle = rgba(tones.lamp, 0.4); m.fillRect(park.x + random() * park.w, park.y + random() * park.h, 1, 1); }
    // The rivers.
    m.fillStyle = rgba(tones.water);
    m.fillRect(-span, -span, left + span, span * 2);
    m.fillRect(right, -span, span, span * 2);
    m.restore();
    const cars = [];
    for (const x of avenues) {
      const n = Math.round(4 + env.values.density / 12);
      for (let i = 0; i < n; i += 1) cars.push({x: x + (random() < 0.5 ? -1.5 : 1.5), pos: random(), speed: 0.012 + random() * 0.02, dir: random() < 0.5 ? 1 : -1});
    }
    return {map, angle, span, cars};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values} = env;
    const k = values.intensity / 100;
    ctx.globalAlpha = 1;
    ctx.drawImage(state.map, 0, 0, w, h);
    ctx.save();
    ctx.translate(w * 0.5, h * 0.5);
    ctx.rotate(state.angle);
    // Car lights: white heading one way, red the other, each a short streak.
    for (const car of state.cars) {
      const y = (((car.pos + t * car.speed * car.dir) % 1 + 1) % 1 - 0.5) * state.span;
      ctx.fillStyle = rgba(car.dir > 0 ? tones.white : tones.red, 0.75 * k);
      ctx.fillRect(car.x - 0.6, y, 1.2, 4);
    }
    ctx.restore();
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
