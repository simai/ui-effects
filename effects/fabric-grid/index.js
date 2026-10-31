// Spacetime fabric (simai.effect 1.1.0; schemes dark and light): gravitational waves run through the grid of spacetime; a click sends one of your own.
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

// The fabric of spacetime, seen from above at an angle: a grid in perspective that covers the whole
// area, edge to edge. Gravitational waves run through it in clean rings from places of their own
// choosing, now here, now there. A click sends a wave from the point. Holding the button sets a
// body down on the fabric: the longer it is held, the heavier the body, the deeper and wider the
// well it sinks, and the stronger the wave it rings out when let go, as it drops out of sight.
const SCENE = {
  home: 'dark', seed: 141, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), line: read('--sf-primary-40', '#005bbe'), deep: read('--sf-tertiary-40', '#7c4c86')}
    : {ground: read('--sf-neutral-5', '#111318'), line: read('--sf-primary-70', '#7fabff'), deep: read('--sf-tertiary-70', '#c798cd')},
  setup(env, random) {
    const {w, h} = env;
    // The camera looks down steeply enough that the horizon is above the area: grid everywhere.
    const f = h * 0.9, pitch = 0.62, lift = 4.2;
    const state = {f, pitch, lift, sin: Math.sin(pitch), cos: Math.cos(pitch), waves: [], hole: null, random, next: 0.6, quiet: 0};
    // The plane under the four corners, with a margin, is all the grid has to cover.
    const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => toPlane(env, x, y, state));
    state.cell = 0.95 - env.values.density / 200;
    const xs = corners.map((c) => c[0]), zs = corners.map((c) => c[1]), m = state.cell * 3;
    state.box = [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m];
    return state;
  },
  click(env, x, y) { const at = toPlane(env, x, y); env.state.waves.push({x: at[0], z: at[1], born: env.time ?? 0, strength: 1}); env.state.quiet = (env.time ?? 0) + 4; },
  press(env, x, y) { const at = toPlane(env, x, y); env.state.hole = {x: at[0], z: at[1], mass: 0}; },
  release(env) {
    const {state} = env;
    const hole = state.hole;
    if (hole) { state.waves.push({x: hole.x, z: hole.z, born: env.time ?? 0, strength: 1 + hole.mass * 3}); state.gone = {...hole, born: env.time ?? 0}; }
    state.hole = null;
    state.quiet = (env.time ?? 0) + 4;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    env.time = t;
    const k = values.intensity / 100;
    const [x0, z0, x1, z1] = state.box;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    // Waves of their own, every few seconds somewhere in view, while nobody is making them.
    if (t >= state.next) {
      const r = state.random;
      if (t >= state.quiet) state.waves.push({x: mix(x0, x1, 0.15 + r() * 0.7), z: mix(z0, z1, 0.15 + r() * 0.7), born: t, strength: 0.55 + r() * 0.5});
      state.next = t + 2.2 + r() * 2.6;
    }
    if (state.hole) {
      state.hole.mass = Math.min(1, state.hole.mass + 0.007);
      if (pointer.on) { const at = toPlane(env, pointer.x * w, pointer.y * h); state.hole.x = mix(state.hole.x, at[0], 0.1); state.hole.z = mix(state.hole.z, at[1], 0.1); }
    }
    state.waves = state.waves.filter((wave) => t - wave.born < 9);
    // The body as it is, or as it springs back out of sight after release.
    const gone = state.gone && t - state.gone.born < 0.5 ? state.gone : null;
    const hole = state.hole ?? (gone && {...gone, mass: gone.mass * (1 - (t - gone.born) / 0.5)});
    // Height of the fabric: a slow swell, the smooth well under the body, and passing rings.
    const height = (x, z) => {
      let y = (noise2(x * 0.18 + t * 0.05, z * 0.18) - 0.5) * 0.16;
      if (hole) { const d2 = (x - hole.x) ** 2 + (z - hole.z) ** 2, s = 0.7 + hole.mass * 1.3; y -= (0.25 + hole.mass * 1.9) / (1 + d2 / (s * s)); }
      for (const wave of state.waves) {
        const age = t - wave.born, d = Math.hypot(x - wave.x, z - wave.z), band = d - age * 2.2;
        if (Math.abs(band) < 2.4) y += Math.sin(band * 2.2) * Math.exp(-(band * band) / 0.9) * 0.24 * wave.strength * (1 - age / 9) / (1 + age * 0.3);
      }
      return y * 0.85;
    };
    const project = (x, y, z) => {
      const dy = y - state.lift, zc = z * state.cos - dy * state.sin, yc = dy * state.cos + z * state.sin;
      return [w / 2 + x * state.f / zc, h / 2 - yc * state.f / zc, zc];
    };
    const alpha = (scheme === 'light' ? 0.5 : 0.48) * k;
    // One path per run of segments of the same shade: the shade steps with distance and depth.
    const run = (points) => {
      let shade = -1;
      for (let i = 1; i < points.length; i += 1) {
        const [xa, ya, za, d0] = points[i - 1], [xb, yb] = points[i];
        const next = Math.round(Math.min(1, 9 / za) * 8) * 16 + Math.round(Math.min(1, Math.max(0, Math.abs(d0)) * 1.4) * 8);
        if (next !== shade) {
          if (shade >= 0) ctx.stroke();
          shade = next;
          const fade = Math.floor(next / 16) / 8, deep = (next % 16) / 8;
          ctx.strokeStyle = rgba(mixc(tones.line, tones.deep, deep), alpha * Math.max(0.35, fade) * (1 + deep * 0.6));
          ctx.beginPath();
          ctx.moveTo(xa, ya);
        }
        ctx.lineTo(xb, yb);
      }
      if (shade >= 0) ctx.stroke();
    };
    const line = (fromX, fromZ, toX, toZ, steps) => {
      const points = [];
      for (let i = 0; i <= steps; i += 1) {
        const x = mix(fromX, toX, i / steps), z = mix(fromZ, toZ, i / steps), y = height(x, z);
        const [sx, sy, zc] = project(x, y, z);
        points.push([sx, sy, zc, -y]);
      }
      run(points);
    };
    ctx.lineWidth = 1;
    const cell = state.cell;
    for (let z = Math.floor(z0 / cell) * cell; z <= z1; z += cell) line(x0, z, x1, z, 120);
    for (let x = Math.floor(x0 / cell) * cell; x <= x1; x += cell) line(x, z0, x, z1, 120);
    if (hole && hole.mass > 0.02) {
      const size = 0.12 + hole.mass * 0.32, [sx, sy, zc] = project(hole.x, height(hole.x, hole.z) + size, hole.z);
      const r = size * state.f / zc, ball = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r);
      ball.addColorStop(0, rgba(mixc(tones.line, scheme === 'light' ? tones.ground : [255, 255, 255], 0.35), 0.95 * k + 0.05));
      ball.addColorStop(1, rgba(mixc(tones.line, tones.ground, 0.55), 0.95 * k + 0.05));
      ctx.fillStyle = ball;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
};
// A point of the screen to the flat plane y = 0, along the ray from the camera through the pixel.
function toPlane(env, x, y, state = env.state) {
  const u = (x - env.w / 2) / state.f, v = -(y - env.h / 2) / state.f;
  const dy = -state.sin + v * state.cos, dz = state.cos + v * state.sin;
  const t = state.lift / -Math.min(dy, -1e-3);
  return [t * u, t * dz];
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

// The fixed palettes: on the effect's own layer they stand in for the theme's colour scales, so the
// effect reads them as it reads the theme. Each is a dark ground, the threads' mass, the bright
// colour and the hot one; the tones between are blended. 'theme' leaves the theme's scales alone.
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
const SCALE_TONES = [0, 4, 5, 6, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
function paintLayer(host, name) {
  const stops = PALETTES[name], at = [4, 30, 65, 95];
  for (const family of ['primary', 'secondary', 'tertiary']) for (const tone of SCALE_TONES) {
    const key = `--sf-${family}-${tone}`;
    if (!stops) { host.style.removeProperty(key); continue; }
    let i = 0;
    while (i < 2 && tone > at[i + 1]) i += 1;
    const u = Math.max(0, Math.min(1, (tone - at[i]) / (at[i + 1] - at[i])));
    host.style.setProperty(key, `rgb(${stops[i].map((v, c) => Math.round(v + (stops[i + 1][c] - v) * u)).join(' ')})`);
  }
}
export function mount(host, settings = {}, context = {}) {
  let palette = settings.palette;
  paintLayer(host, palette);
  const scene = mountScene(host, settings, context);
  return {
    ...scene,
    update(next = {}, nextContext = {}) {
      scene.update(next, nextContext);
      if (next.palette !== palette) { palette = next.palette; paintLayer(host, palette); scene.refreshTheme?.(); }
    },
    destroy() { scene.destroy(); paintLayer(host); },
  };
}
