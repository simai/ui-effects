// Spacetime fabric (simai.effect 1.1.0; schemes dark and light): a sun and its planets sink funnels into the grid of spacetime; a click sends a gravitational wave.
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

// The fabric of spacetime, seen from above at an angle: a grid in perspective that sinks into round
// funnels under masses. A sun sits in the deepest one; planets go round it on Kepler's orbits, the
// inner ones faster, each dimpling the grid as it passes, one with rings. Moving the pointer turns
// the view slowly round the sun; a click sends a gravitational wave out in clean rings; holding the
// button grows a black hole whose funnel deepens, and letting go rings out a strong wave.
const BODIES = [[0.12, 'moon', 0.08], [0.17, 'deep', 0.12], [0.19, 'planet', 0.14], [0.15, 'red', 0.1], [0.36, 'warm', 0.3], [0.3, 'sand', 0.24, true], [0.24, 'cool', 0.18], [0.23, 'planet', 0.17]];
const SCENE = {
  home: 'dark', seed: 141, reseed: ['density', 'planets'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), line: read('--sf-primary-40', '#005bbe'), deep: read('--sf-tertiary-40', '#7c4c86'), sun: read('--sf-warning-80', '#ffb95c'), core: read('--sf-warning-95', '#ffeee1'), planet: read('--sf-primary-60', '#4a8eff'), moon: read('--sf-neutral-60', '#90909a'), red: read('--sf-error-60', '#ff5449'), warm: read('--sf-warning-60', '#c0780a'), sand: read('--sf-warning-80', '#ffb95c'), cool: read('--sf-secondary-60', '#00a2b0'), star: read('--sf-neutral-60', '#90909a')}
    : {ground: read('--sf-neutral-5', '#111318'), line: read('--sf-primary-70', '#7fabff'), deep: read('--sf-tertiary-70', '#c798cd'), sun: read('--sf-warning-70', '#e08f2c'), core: read('--sf-warning-95', '#ffeee1'), planet: read('--sf-primary-60', '#4a8eff'), moon: read('--sf-neutral-70', '#abaab4'), red: read('--sf-error-60', '#ff5449'), warm: read('--sf-warning-60', '#c0780a'), sand: read('--sf-warning-80', '#ffb95c'), cool: read('--sf-secondary-60', '#00a2b0'), star: read('--sf-neutral-80', '#c6c6cf')},
  setup(env, random) {
    const {w, h} = env;
    // The camera stands above the fabric and looks down at it, so the funnels open towards us.
    const f = h * 0.9, pitch = 0.45, lift = 4.2;
    const horizon = h / 2 - f * Math.tan(pitch);
    const state = {f, pitch, lift, horizon, sin: Math.sin(pitch), cos: Math.cos(pitch), yaw: 0, waves: [], hole: null};
    state.centre = toPlane({w, h, state}, w * 0.62, h * 0.56)[1];
    state.cell = 0.95 - env.values.density / 200;
    const planets = Math.round(env.values.planets);
    state.planets = BODIES.slice(0, planets).map(([r, colour, m, rings], i) => {
      const orbit = 1.3 + i * 0.85;
      return {r, colour, m, rings, orbit, spin: 0.9 * (1.3 / orbit) ** 1.5, phase: random() * Math.PI * 2};
    });
    state.stars = Array.from({length: 50}, () => [random() * w, random() * Math.max(0, horizon) * 0.95]);
    return state;
  },
  click(env, x, y) { const at = toPlane(env, x, y); if (at) env.state.waves.push({x: at[0], z: at[1], born: env.time ?? 0, strength: 1}); },
  press(env, x, y) { const at = toPlane(env, x, y); if (at) env.state.hole = {x: at[0], z: at[1], mass: 0}; },
  release(env) {
    const {state} = env;
    if (state.hole) state.waves.push({x: state.hole.x, z: state.hole.z, born: env.time ?? 0, strength: 1 + state.hole.mass * 2.5});
    state.hole = null;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer, scheme} = env;
    env.time = t;
    const k = values.intensity / 100;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    for (const [x, y] of state.stars) { ctx.fillStyle = rgba(tones.star, 0.35 * k); ctx.fillRect(x, y, 1.2, 1.2); }
    // The pointer turns the view round the sun, a little and slowly.
    state.yaw = mix(state.yaw, pointer.on && !state.hole ? (pointer.x - 0.5) * 0.7 : 0, 0.03);
    const cy = Math.cos(state.yaw), sy = Math.sin(state.yaw), Z = state.centre;
    const masses = [{x: 0, z: Z, m: 1.7, r: 0.6, s: 0.5, reach: 7, kind: 'sun'}];
    for (const p of state.planets) {
      const a = p.phase + t * p.spin;
      masses.push({x: Math.cos(a) * p.orbit, z: Z + Math.sin(a) * p.orbit, m: p.m, r: p.r, s: 0.15, reach: 1.4, kind: p.colour, rings: p.rings});
    }
    if (state.hole) {
      state.hole.mass = Math.min(1, state.hole.mass + 0.005);
      const at = pointer.on ? toPlane(env, pointer.x * w, pointer.y * h) : null;
      if (at) { state.hole.x = mix(state.hole.x, at[0], 0.1); state.hole.z = mix(state.hole.z, at[1], 0.1); }
      masses.push({x: state.hole.x, z: state.hole.z, m: 0.45 + state.hole.mass * 0.6, r: 0.14 + state.hole.mass * 0.18, s: 0.25, reach: 4, kind: 'hole'});
    }
    state.waves = state.waves.filter((wave) => t - wave.born < 7);
    // Height of the fabric: a funnel under each mass, flat again past its reach, and passing rings.
    const height = (x, z) => {
      let y = 0;
      for (const m of masses) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.reach) y -= m.m * (1 / (d + m.s) - 1 / (m.reach + m.s)); }
      for (const wave of state.waves) {
        const age = t - wave.born, d = Math.hypot(x - wave.x, z - wave.z), band = d - age * 2.2;
        if (Math.abs(band) < 2.4) y += Math.sin(band * 2.2) * Math.exp(-(band * band) / 0.9) * 0.22 * wave.strength * (1 - age / 7) / (1 + age * 0.4);
      }
      return y * 0.85;
    };
    // World to screen: turned by the yaw about the sun, then through the pitched camera.
    const project = (x, y, z) => {
      const rx = x * cy - (z - Z) * sy, rz = x * sy + (z - Z) * cy + Z;
      const dy = y - state.lift, zc = rz * state.cos - dy * state.sin, yc = dy * state.cos + rz * state.sin;
      return [w / 2 + rx * state.f / zc, h / 2 - yc * state.f / zc, zc];
    };
    const alpha = (scheme === 'light' ? 0.5 : 0.48) * k;
    // One path per run of segments of the same shade: the shade steps with distance and depth.
    const run = (points) => {
      let shade = -1;
      for (let i = 1; i < points.length; i += 1) {
        const [x0, y0, z0, d0] = points[i - 1], [x1, y1, z1] = points[i];
        if (z0 < 0.5 || z1 < 0.5) { if (shade >= 0) ctx.stroke(); shade = -1; continue; }
        const next = Math.round(Math.min(1, 7 / z0) * 8) * 16 + Math.round(Math.min(1, Math.max(0, d0) * 1.4) * 8);
        if (next !== shade) {
          if (shade >= 0) ctx.stroke();
          shade = next;
          const fade = Math.floor(next / 16) / 8, deep = (next % 16) / 8;
          ctx.strokeStyle = rgba(mixc(tones.line, tones.deep, deep), alpha * fade * (1 + deep * 0.6));
          ctx.beginPath();
          ctx.moveTo(x0, y0);
        }
        ctx.lineTo(x1, y1);
      }
      if (shade >= 0) ctx.stroke();
    };
    const line = (fromX, fromZ, toX, toZ, steps) => {
      const points = [];
      for (let i = 0; i <= steps; i += 1) {
        const x = mix(fromX, toX, i / steps), z = mix(fromZ, toZ, i / steps), y = height(x, z);
        const [sx, sy2, zc] = project(x, y, z);
        points.push([sx, sy2, zc, -y]);
      }
      run(points);
    };
    // The grid reaches far past every edge, so no corner is left empty.
    ctx.lineWidth = 1;
    const R = 26, cell = state.cell, n = Math.ceil(R / cell);
    for (let i = -n; i <= n; i += 1) {
      line(-R, Z + i * cell, R, Z + i * cell, 170);
      line(i * cell, Z - R, i * cell, Z + R, 170);
    }
    // Faint orbits on the fabric.
    for (const p of state.planets) {
      const points = [];
      for (let i = 0; i <= 96; i += 1) {
        const a = i / 96 * Math.PI * 2, x = Math.cos(a) * p.orbit, z = Z + Math.sin(a) * p.orbit;
        const [sx, sy2, zc] = project(x, height(x, z) + 0.02, z);
        points.push([sx, sy2, zc]);
      }
      ctx.strokeStyle = rgba(tones[p.colour], 0.22 * k);
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    // The bodies, far ones first.
    const placed = masses.map((m) => { const [sx, sy2, zc] = project(m.x, height(m.x, m.z) + m.r * 0.9, m.z); return {m, sx, sy: sy2, zc}; }).sort((a, b) => b.zc - a.zc);
    for (const {m, sx, sy: by, zc} of placed) {
      if (zc < 0.5) continue;
      const r = m.r * state.f / zc;
      if (m.kind === 'hole') {
        ctx.fillStyle = rgba([0, 0, 0]);
        ctx.beginPath(); ctx.arc(sx, by, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(tones.deep, 0.7 * k);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, by, r * 1.8, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
        continue;
      }
      const colour = tones[m.kind];
      if (m.kind === 'sun') {
        const glow = ctx.createRadialGradient(sx, by, r * 0.7, sx, by, r * 3);
        glow.addColorStop(0, rgba(colour, 0.35 * k)); glow.addColorStop(1, rgba(colour, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, by, r * 3, 0, Math.PI * 2); ctx.fill();
      }
      const ring = (front) => {
        ctx.strokeStyle = rgba(mixc(colour, [255, 255, 255], 0.3), 0.7 * k);
        ctx.lineWidth = Math.max(1, r * 0.18);
        ctx.beginPath(); ctx.ellipse(sx, by, r * 2, r * 0.55, -0.25, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      };
      if (m.rings) ring(false);
      // Lit from the sun's side: the highlight leans towards it.
      const sun = placed.find((p) => p.m.kind === 'sun');
      const lx = m.kind === 'sun' ? -0.35 : Math.max(-0.5, Math.min(0.5, (sun.sx - sx) / (Math.abs(sun.sx - sx) + 40))), ly = -0.35;
      const body = ctx.createRadialGradient(sx + lx * r, by + ly * r, r * 0.1, sx, by, r);
      body.addColorStop(0, rgba(m.kind === 'sun' ? tones.core : mixc(colour, [255, 255, 255], 0.35)));
      body.addColorStop(1, rgba(mixc(colour, tones.ground, m.kind === 'sun' ? 0.1 : 0.45)));
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(sx, by, r, 0, Math.PI * 2); ctx.fill();
      if (m.rings) ring(true);
    }
  },
};
// A point of the screen to the flat plane (before it sinks and before the view turns), or null above the horizon.
function toPlane(env, x, y) {
  const {state} = env;
  // The ray through the pixel, from the camera, down to the plane y = 0.
  const u = (x - env.w / 2) / state.f, v = -(y - env.h / 2) / state.f;
  const dy = -state.sin + v * state.cos, dz = state.cos + v * state.sin;
  if (dy >= -1e-3) return null;
  const t = state.lift / -dy, rx = t * u, rz = t * dz;
  if (state.centre === undefined) return [rx, rz];
  const c = Math.cos(state.yaw), s = Math.sin(state.yaw), Z = state.centre;
  return [rx * c + (rz - Z) * s, -rx * s + (rz - Z) * c + Z];
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
