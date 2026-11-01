// Spacetime fabric (simai.effect 1.1.0; schemes dark and light): gravitational waves run through the grid of spacetime,
// bodies pass and bend it; a click sends a wave, and a star set down by a press collapses into a black hole.
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

// The fabric of spacetime seen from above at an angle: a grid in perspective, edge to edge, with
// waves in clean rings and bodies passing on curved paths, each in a well as deep as its mass. A
// click sends a wave; a press sets down a star that, let go, grows, flares, collapses into a black
// hole in a deep well and evaporates.
const LIFE = [3.5, 1.4, 0.8, 7, 3.5]; // grow, swell, collapse, black hole, evaporate (seconds)
const EVERY = {rare: [16, 10], normal: [6, 5], often: [3.5, 3]};
const SCENE = {
  home: 'dark', seed: 141, reseed: ['density', 'bodies'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), line: read('--sf-primary-40', '#005bbe'), deep: read('--sf-tertiary-40', '#7c4c86'), hot: read('--sf-primary-80', '#adc6ff'), core: read('--sf-primary-10', '#001a41'), body: read('--sf-secondary-50', '#6f7891')}
    : {ground: read('--sf-neutral-5', '#111318'), line: read('--sf-primary-70', '#7fabff'), deep: read('--sf-tertiary-70', '#c798cd'), hot: read('--sf-primary-95', '#ecf0ff'), core: read('--sf-neutral-0', '#000000'), body: read('--sf-secondary-70', '#a9b3cf')},
  setup(env, random) {
    const {w, h} = env;
    // The camera looks down steeply enough that the horizon is above the area: grid everywhere.
    const f = h * 0.9, pitch = 0.62, lift = 4.2;
    const state = {f, pitch, lift, sin: Math.sin(pitch), cos: Math.cos(pitch), waves: [], hole: null, stars: [], bodies: [], random, pass: rng(977), count: 0, next: 0.6, quiet: 0};
    // The plane under the four corners, with a margin, is all the grid has to cover.
    const corners = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => toPlane(env, x, y, state));
    state.cell = 0.95 - env.values.density / 200;
    const xs = corners.map((c) => c[0]), zs = corners.map((c) => c[1]), m = state.cell * 3;
    state.box = [Math.min(...xs) - m, Math.min(...zs) - m, Math.max(...xs) + m, Math.max(...zs) + m];
    // With passing bodies on, a ringed giant is already on its way: the first frame and the still
    // frame show it, at the same place on every mount.
    if (env.values.bodies !== false) spawn(env, state, 0, 0.4);
    state.later = 7 + state.pass() * 4;
    return state;
  },
  click(env, x, y) { const at = toPlane(env, x, y); env.state.waves.push({x: at[0], z: at[1], born: env.time ?? 0, strength: 1}); env.state.quiet = (env.time ?? 0) + 4; },
  press(env, x, y) { const at = toPlane(env, x, y); env.state.hole = {x: at[0], z: at[1], mass: 0}; },
  release(env) {
    const {state} = env, t = env.time ?? 0, hole = state.hole;
    if (hole) {
      state.waves.push({x: hole.x, z: hole.z, born: t, strength: 1 + hole.mass * 1.5});
      state.stars.push({x: hole.x, z: hole.z, m0: hole.mass, M: clamp(hole.mass + 0.35, 0.45, 1), rel: t});
      if (state.stars.length > 3) state.stars.shift();
    }
    state.hole = null;
    state.quiet = t + 4;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    env.time = t;
    const k = values.intensity / 100, light = scheme === 'light', TAU = Math.PI * 2;
    const [x0, z0, x1, z1] = state.box;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    // Waves of their own, every few seconds somewhere in view, while nobody is making them.
    if (t >= state.next) {
      const r = state.random;
      if (t >= state.quiet) state.waves.push({x: mix(x0, x1, 0.15 + r() * 0.7), z: mix(z0, z1, 0.15 + r() * 0.7), born: t, strength: 0.55 + r() * 0.5});
      state.next = t + 2.2 + r() * 2.6;
    }
    // Passing bodies: one or two at a time, at the pace the settings ask for.
    if (values.bodies !== false && t >= state.later) {
      if (state.bodies.length < 2) spawn(env, state, t);
      const [a, b] = EVERY[values.frequency] ?? EVERY.normal;
      state.later = t + a + state.pass() * b;
    }
    if (state.hole) {
      state.hole.mass = Math.min(1, state.hole.mass + 0.007);
      if (pointer.on) { const at = toPlane(env, pointer.x * w, pointer.y * h); state.hole.x = mix(state.hole.x, at[0], 0.1); state.hole.z = mix(state.hole.z, at[1], 0.1); }
    }
    state.waves = state.waves.filter((wave) => t - wave.born < 9);
    // Every mass of the frame as a well: where it is, how deep, how wide, and how it is drawn.
    const wells = [];
    const well = (x, z, depth, s, look) => wells.push({x, z, depth, is: 1 / (s * s), ...look});
    if (state.hole) { const m = state.hole.mass; well(state.hole.x, state.hole.z, 0.25 + m * 1.9, 0.7 + m * 1.3, {size: 0.12 + m * 0.32, kind: 9, a: m > 0.02 ? 1 : 0}); }
    state.stars = state.stars.filter((star) => {
      const look = life(star, t);
      if (!look) return false;
      if (look.wave && !star.waved) { star.waved = 1; state.waves.push({x: star.x, z: star.z, born: t, strength: 1 + star.M * 2.2}); state.quiet = t + 4; }
      well(star.x, star.z, look.depth, look.s, {...look, kind: 9, a: 1});
      return true;
    });
    state.bodies = state.bodies.filter((body) => {
      const p = (t - body.born) / body.dur;
      if (p > 1) return false;
      const [[ax, az], [cx, cz], [bx, bz]] = body.P, q = 1 - p, ramp = smooth(clamp(Math.min(p, q) / 0.08, 0, 1));
      well(q * q * ax + 2 * p * q * cx + p * p * bx, q * q * az + 2 * p * q * cz + p * p * bz, (0.2 + body.mass * 1.5) * ramp, 0.5 + body.mass * 1.1 + body.size, {...body, a: ramp});
      return true;
    });
    // Height of the fabric: a slow swell, the smooth wells under the masses, and passing rings.
    const height = (x, z) => {
      let y = (noise2(x * 0.18 + t * 0.05, z * 0.18) - 0.5) * 0.16;
      for (const g of wells) y -= g.depth / (1 + ((x - g.x) ** 2 + (z - g.z) ** 2) * g.is);
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
    const alpha = (light ? 0.5 : 0.48) * k;
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
    // The masses themselves, far ones first, each resting at the bottom of its well.
    const shine = light ? tones.ground : [255, 255, 255];
    const sphere = (sx, sy, r, c0, c1, a) => {
      const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r);
      g.addColorStop(0, rgba(c0, a)); g.addColorStop(1, rgba(c1, a));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    };
    const glow = (sx, sy, r0, r1, c, a) => {
      const g = ctx.createRadialGradient(sx, sy, r0, sx, sy, r1);
      g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r1, 0, TAU); ctx.fill();
    };
    // A ring in the plane of the fabric, seen at the camera's angle: its back half or its front half.
    const ring = (sx, sy, rx, tilt, c, a, width, front) => {
      ctx.strokeStyle = rgba(c, a); ctx.lineWidth = width;
      ctx.beginPath(); ctx.ellipse(sx, sy, rx, rx * 0.3, tilt, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
    };
    const placed = wells.filter((g) => g.a > 0).map((g) => [g, ...project(g.x, height(g.x, g.z) + g.size, g.z)]).sort((p, q) => q[3] - p[3]);
    for (const [g, sx, sy, zc] of placed) {
      const r = g.size * state.f / zc, a = (0.95 * k + 0.05) * g.a * Math.max(0.4, Math.min(1, 9 / zc));
      const disc = mixc(tones.line, tones.hot, 0.5), bright = mixc(tones.line, shine, 0.35), dim = mixc(tones.line, tones.ground, 0.55);
      if (g.kind === 9) {
        const lit = a * (1 - (g.dark ?? 0)), dark = a * (g.dark ?? 0), f = g.flare ?? 0;
        if (lit > 0.01) {
          glow(sx, sy, r * 0.8, r * (2.2 + f * 2.6), tones.hot, lit * (0.12 + f * 0.4));
          sphere(sx, sy, r, mixc(bright, tones.hot, f), mixc(dim, tones.line, f), lit);
        }
        if (dark > 0.01) {
          // The black hole: a faint glow, the accretion ring behind the core, the core, the thin
          // photon ring at its edge and the near half of the accretion ring over it.
          glow(sx, sy, r, r * 3.2, tones.hot, dark * 0.16);
          for (const [s, o] of [[1.7, 0.85], [2.3, 0.45], [3, 0.2]]) ring(sx, sy, r * s, -0.12, disc, dark * o, 1, false);
          ctx.fillStyle = rgba(tones.core, dark); ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
          ctx.strokeStyle = rgba(tones.hot, dark * 0.9); ctx.lineWidth = Math.max(1, r * 0.07);
          ctx.beginPath(); ctx.arc(sx, sy, r * 1.04, 0, TAU); ctx.stroke();
          for (const [s, o] of [[1.7, 0.85], [2.3, 0.45], [3, 0.2]]) ring(sx, sy, r * s, -0.12, disc, dark * o, 1, true);
        }
      } else if (g.kind === 2) {
        glow(sx, sy, r * 0.8, r * 3, tones.hot, a * 0.22);
        sphere(sx, sy, r, mixc(tones.hot, shine, 0.4), mixc(tones.line, tones.hot, 0.4), a);
      } else {
        const c = g.kind === 3 ? tones.deep : mixc(tones.body, g.hue < 0.5 ? tones.deep : tones.line, (g.hue % 0.5) * 1.6);
        if (g.kind === 1) ring(sx, sy, r * 2, g.tilt, tones.body, a * 0.5, 1.2, false);
        if (g.kind === 3) glow(sx, sy, r * 0.9, r * 1.8, c, a * 0.18);
        sphere(sx, sy, r, mixc(c, shine, 0.3), mixc(c, tones.ground, 0.5), a);
        if (g.kind === 1) ring(sx, sy, r * 2, g.tilt, tones.body, a * 0.5, 1.2, true);
      }
    }
  },
};
// A star let go: its size, well and look at the time t, or null once it has evaporated.
function life(star, t) {
  const [G, S, C, H, E] = LIFE, M = star.M, r = t - star.rel;
  const size = 0.12 + M * 0.32, core = 0.1 + M * 0.08, sd = 0.25 + M * 1.9, ss = 0.7 + M * 1.3, hd = 0.8 + M * 2.6, hs = 0.4 + M * 0.8;
  if (r < G) { const m = mix(star.m0, M, smooth(r / G)); return {size: 0.12 + m * 0.32, depth: 0.25 + m * 1.9, s: 0.7 + m * 1.3}; }
  if (r < G + S) { const u = smooth((r - G) / S); return {size: size * (1 + 0.3 * u), depth: sd, s: ss * (1 + 0.2 * u), flare: u}; }
  if (r < G + S + C) { const u = (r - G - S) / C, v = smooth(u); return {size: mix(size * 1.3, core, u * u), depth: mix(sd, hd, v), s: mix(ss * 1.2, hs, v), flare: 1 - v, dark: v, wave: 1}; }
  if (r < G + S + C + H) return {size: core, depth: hd, s: hs, dark: 1, wave: 1};
  if (r < G + S + C + H + E) { const u = smooth((r - G - S - C - H) / E); return {size: core * (1 - u * 0.7), depth: hd * (1 - u), s: hs * (1 + u), dark: 1 - u, wave: 1}; }
  return null;
}
// A passing body (planet, ringed giant, star, every fifth a big heavy one) on a curved path across
// the area. `at` places it part way.
function spawn(env, state, t, at) {
  const r = state.pass, n = state.count++;
  const kind = at != null ? 1 : n % 5 === 3 ? 3 : [0, 1, 2][(r() * 3) | 0];
  const [s0, s1, m0, m1, v] = [[0.12, 0.06, 0.25, 0.15, 1], [0.28, 0.1, 0.55, 0.2, 0.85], [0.15, 0.06, 0.45, 0.15, 1.1], [0.45, 0.1, 1.3, 0.3, 0.6]][kind];
  const ya = 0.45 + r() * 0.5, yb = 0.4 + r() * 0.55;
  let path = [[-0.15, ya], [0.5, clamp((ya + yb) / 2 + (r() < 0.5 ? -1 : 1) * (0.2 + r() * 0.25), 0.1, 1.05)], [1.15, yb]];
  if (r() < 0.3) path = [[0.2 + r() * 0.5, 1.25], [0.8, 0.95], [1.15, 0.2 + r() * 0.3]];
  if (r() < 0.5) path = path.map(([x, y]) => [1 - x, y]);
  const P = path.map(([x, y]) => toPlane(env, x * env.w, y * env.h, state));
  const len = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) + Math.hypot(P[2][0] - P[1][0], P[2][1] - P[1][1]);
  const dur = clamp(len / (v * (0.8 + r() * 0.4)), 12, 36);
  state.bodies.push({P, kind, size: s0 + r() * s1, mass: m0 + r() * m1, dur, born: t - (at ?? 0) * dur, tilt: (r() - 0.5) * 0.5, hue: r()});
}
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
// 'custom' builds the four from one colour, the colour setting (a hex): a dark ground of its hue,
// its mass, the colour itself and its light.
const rgbOf = (hex) => (/^#[0-9a-f]{6}$/iu.test(hex ?? '') ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) : [59, 130, 246]);
const customStops = (hex) => { const c = rgbOf(hex); return [c.map((v) => 4 + v * 0.05), c.map((v) => v * 0.42), c, c.map((v) => v + (255 - v) * 0.86)]; };
const SCALE_TONES = [0, 4, 5, 6, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
function paintLayer(host, name, colour) {
  const stops = name === 'custom' ? customStops(colour) : PALETTES[name], at = [4, 30, 65, 95];
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
  let palette = settings.palette, colour = settings.colour;
  paintLayer(host, palette, colour);
  const scene = mountScene(host, settings, context);
  return {
    ...scene,
    update(next = {}, nextContext = {}) {
      scene.update(next, nextContext);
      if (next.palette !== palette || (next.palette === 'custom' && next.colour !== colour)) { palette = next.palette; colour = next.colour; paintLayer(host, palette, colour); scene.refreshTheme?.(); }
    },
    destroy() { scene.destroy(); paintLayer(host); },
  };
}
