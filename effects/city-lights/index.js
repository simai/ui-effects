// City lights (simai.effect 1.1.0; dark scheme only): a city at night from above: orange streets, dark buildings with lit roofs, parks and trees, car lights.
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

// A night city from straight above, generated over the whole area: streets split the ground into
// irregular blocks, avenues wider and brighter than lanes, all in sodium orange with a haze of light.
// Blocks hold dark buildings with lit roofs here and there and edges catching the street light; some
// blocks are parks of dark trees with a few path lamps, and trees line the quieter streets. Car
// lights, white in front and red behind, run along the avenues.
const SCENE = {
  home: 'dark', seed: 33, reseed: ['density'],
  tones: (read) => ({ground: read('--sf-neutral-5', '#111318'), building: read('--sf-neutral-10', '#1a1b21'), roof: read('--sf-neutral-20', '#2f3036'), lit: read('--sf-neutral-60', '#90909a'), sodium: read('--sf-warning-70', '#e08f2c'), lamp: read('--sf-warning-80', '#ffb95c'), white: read('--sf-neutral-95', '#f0f0f7'), red: read('--sf-error-60', '#ff5449'), tree: read('--sf-success-10', '#002106'), cool: read('--sf-primary-80', '#adc6ff')}),
  setup(env, random) {
    const {w, h, tones} = env;
    const angle = -0.16;
    const span = Math.hypot(w, h) * 1.05;
    const busy = (x, y) => noise2(x / 220 + 7, y / 220 + 2) * 0.75 + noise2(x / 60, y / 60 + 5) * 0.25;
    // Streets by splitting: wide avenues at the first cuts, lanes deeper down, blocks where it stops.
    const blocks = [], streets = [];
    const least = 26 + (100 - env.values.density) * 0.3;
    const split = (x, y, bw, bh, depth) => {
      const limit = least * (0.8 + random() * 0.6);
      if ((bw < limit * 1.7 && bh < limit * 1.7) || depth > 10) { blocks.push({x, y, w: bw, h: bh}); return; }
      const across = bw > bh ? random() < 0.85 : random() < 0.15;
      const width = depth < 2 ? 6 : depth < 4 ? 4 : 2.5;
      const cut = 0.38 + random() * 0.24;
      if (across) {
        const c = x + bw * cut;
        streets.push({x: c - width / 2, y, w: width, h: bh, width, upright: true});
        split(x, y, c - width / 2 - x, bh, depth + 1);
        split(c + width / 2, y, x + bw - c - width / 2, bh, depth + 1);
      } else {
        const c = y + bh * cut;
        streets.push({x, y: c - width / 2, w: bw, h: width, width, upright: false});
        split(x, y, bw, c - width / 2 - y, depth + 1);
        split(x, c + width / 2, bw, y + bh - c - width / 2, depth + 1);
      }
    };
    split(-span / 2, -span / 2, span, span, 0);
    const map = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const m = map.getContext('2d');
    const light = new OffscreenCanvas(Math.ceil(w), Math.ceil(h));
    const l = light.getContext('2d');
    m.fillStyle = rgba(tones.ground);
    m.fillRect(0, 0, w, h);
    for (const c of [m, l]) { c.translate(w / 2, h / 2); c.rotate(angle); }
    // Streets: the glow on the light layer, lamps as bright points along them.
    for (const s of streets) {
      const b = busy(s.x + s.w / 2, s.y + s.h / 2);
      const strength = (s.width > 5 ? 0.42 : s.width > 3 ? 0.32 : 0.22) * (0.5 + b * 0.8);
      l.fillStyle = rgba(tones.sodium, Math.min(1, strength));
      l.fillRect(s.x, s.y, s.w, s.h);
      const length = s.upright ? s.h : s.w, gap = s.width > 5 ? 7 : 11;
      for (let i = 0; i < length; i += gap) {
        if (random() > 0.35 + b) continue;
        const side = random() < 0.5 ? 0.2 : s.width - 1.2;
        l.fillStyle = rgba(tones.lamp, 0.6 + random() * 0.4);
        if (s.upright) l.fillRect(s.x + side, s.y + i, 1.1, 1.1); else l.fillRect(s.x + i, s.y + side, 1.1, 1.1);
      }
    }
    // Blocks: a park now and then, otherwise lots of buildings in one or two rows.
    const tree = (c, x, y, r) => {
      c.fillStyle = rgba(mixc(tones.tree, tones.ground, 0.2));
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.fillStyle = rgba(mixc(tones.tree, tones.sodium, 0.12), 0.7);
      c.beginPath(); c.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, Math.PI * 2); c.fill();
    };
    for (const b of blocks) {
      if (b.w < 6 || b.h < 6) continue;
      const quiet = busy(b.x + b.w / 2, b.y + b.h / 2);
      if (random() < 0.07 + (0.5 - quiet) * 0.12) {
        m.fillStyle = rgba(mixc(tones.tree, tones.ground, 0.55));
        m.fillRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
        const n = Math.round(b.w * b.h / 14);
        for (let i = 0; i < n; i += 1) tree(m, b.x + 2 + random() * (b.w - 4), b.y + 2 + random() * (b.h - 4), 1.2 + random() * 2);
        for (let i = 0; i < b.w * b.h / 900; i += 1) { l.fillStyle = rgba(tones.lamp, 0.5); l.fillRect(b.x + random() * b.w, b.y + random() * b.h, 1.2, 1.2); }
        continue;
      }
      const inset = 1.2, x0 = b.x + inset, y0 = b.y + inset, bw = b.w - inset * 2, bh = b.h - inset * 2;
      const long = bw >= bh, depth = long ? bh : bw, length = long ? bw : bh;
      const rows = depth > 24 ? 2 : 1;
      for (let row = 0; row < rows; row += 1) {
        const r0 = row * depth / rows, r1 = (row + 1) * depth / rows;
        for (let at = 0; at < length;) {
          const size = Math.min(length - at, 4 + random() * (random() < 0.15 ? 22 : 10));
          const gap = 0.6 + random() * 0.8, back = random() * (r1 - r0) * 0.25;
          const lot = long
            ? {x: x0 + at + gap / 2, y: y0 + r0 + (row ? 0 : 0) + gap / 2, w: size - gap, h: r1 - r0 - gap - back}
            : {x: x0 + r0 + gap / 2, y: y0 + at + gap / 2, w: r1 - r0 - gap - back, h: size - gap};
          at += size;
          if (lot.w < 2 || lot.h < 2) continue;
          const roll = random();
          const tone = roll < 0.06 * (0.4 + quiet) ? mixc(tones.roof, tones.lit, 0.2 + random() * 0.35) : roll < 0.3 ? mixc(tones.building, tones.roof, 0.4 + random() * 0.6) : mixc(tones.ground, tones.building, 0.3 + random() * 0.7);
          m.fillStyle = rgba(tone);
          m.fillRect(lot.x, lot.y, lot.w, lot.h);
          // Edges catch the street light; lit roofs carry a few fittings and lamps.
          m.strokeStyle = rgba(tones.sodium, 0.08 + quiet * 0.14);
          m.lineWidth = 0.6;
          m.strokeRect(lot.x + 0.4, lot.y + 0.4, lot.w - 0.8, lot.h - 0.8);
          if (lot.w * lot.h > 60 && random() < 0.4) {
            m.fillStyle = rgba(mixc(tone, tones.ground, 0.5));
            m.fillRect(lot.x + lot.w * 0.25, lot.y + lot.h * 0.3, lot.w * 0.3, lot.h * 0.25);
          }
          const dots = random() < 0.4 * (0.5 + quiet) ? 1 + Math.floor(random() * 4) : 0;
          for (let i = 0; i < dots; i += 1) {
            l.fillStyle = rgba(random() < 0.6 ? tones.lamp : tones.cool, 0.5 + random() * 0.4);
            l.fillRect(lot.x + random() * lot.w, lot.y + random() * lot.h, 1, 1);
          }
        }
      }
    }
    // Trees along the quieter streets, over the street glow.
    for (const s of streets) {
      if (s.width > 5) continue;
      const length = s.upright ? s.h : s.w;
      for (let i = 0; i < length; i += 3 + random() * 4) {
        if (random() > 0.35) continue;
        const r = 1 + random() * 1.3, side = random() < 0.5 ? 0 : s.width;
        if (s.upright) tree(m, s.x + side, s.y + i, r); else tree(m, s.x + i, s.y + side, r);
      }
    }
    for (const c of [m, l]) c.setTransform(1, 0, 0, 1, 0, 0);
    // The light goes on the map twice: sharp, and blurred into a haze that spills over the edges.
    const haze = new OffscreenCanvas(map.width, map.height);
    const hz = haze.getContext('2d');
    hz.filter = 'blur(4px)';
    hz.drawImage(light, 0, 0);
    m.globalCompositeOperation = 'lighter';
    m.globalAlpha = 0.6;
    m.drawImage(haze, 0, 0);
    m.globalAlpha = 1;
    m.drawImage(light, 0, 0);
    m.globalCompositeOperation = 'source-over';
    // Cars on the avenues and wider streets, each lane one way.
    const cars = [];
    for (const s of streets) {
      if (s.width < 4) continue;
      const n = Math.round((s.upright ? s.h : s.w) / 70 * (0.5 + env.values.density / 100));
      for (let i = 0; i < n; i += 1) cars.push({s, pos: random(), speed: 18 + random() * 22, dir: random() < 0.5 ? 1 : -1});
    }
    // The overlay dims the whole picture by the intensity setting.
    return {map, angle, cars};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values} = env;
    const k = values.intensity / 100;
    ctx.globalAlpha = 1;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.2 + k * 0.6;
    ctx.drawImage(state.map, 0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(state.angle);
    for (const car of state.cars) {
      const {s} = car, length = s.upright ? s.h : s.w;
      const at = (((car.pos * length + t * car.speed * car.dir) % length) + length) % length;
      const lane = car.dir > 0 ? s.width * 0.68 : s.width * 0.32;
      const [x, y] = s.upright ? [s.x + lane, s.y + at] : [s.x + at, s.y + lane];
      const [dx, dy] = s.upright ? [0, car.dir * 1.5] : [car.dir * 1.5, 0];
      ctx.fillStyle = rgba(tones.white, 0.85 * k);
      ctx.fillRect(x + dx - 0.6, y + dy - 0.6, 1.2, 1.2);
      ctx.fillStyle = rgba(tones.red, 0.8 * k);
      ctx.fillRect(x - dx - 0.5, y - dy - 0.5, 1, 1);
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
