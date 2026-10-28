// Spacetime fabric (simai.effect 1.1.0; schemes dark and light): a grid in perspective sinks into funnels under spherical masses; the pointer is a heavy body, a click a gravitational wave.
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

// The fabric of spacetime, seen at an angle: a grid in perspective that sinks into round wells under
// masses, like the textbook picture. Two planets orbit and dimple it. The pointer is a glowing sphere
// that presses a funnel into the grid; a click sends a gravitational wave out in clean rings; holding
// the button grows a black hole whose funnel deepens, and letting go rings out a strong wave.
const SCENE = {
  home: 'dark', seed: 141, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), line: read('--sf-primary-40', '#005bbe'), deep: read('--sf-tertiary-40', '#7c4c86'), sun: read('--sf-warning-80', '#ffb95c'), core: read('--sf-warning-95', '#ffeee1'), planet: read('--sf-primary-60', '#4a8eff'), moon: read('--sf-tertiary-60', '#ac7eb2'), star: read('--sf-neutral-60', '#90909a')}
    : {ground: read('--sf-neutral-5', '#111318'), line: read('--sf-primary-70', '#7fabff'), deep: read('--sf-tertiary-70', '#c798cd'), sun: read('--sf-warning-70', '#e08f2c'), core: read('--sf-warning-95', '#ffeee1'), planet: read('--sf-primary-60', '#4a8eff'), moon: read('--sf-tertiary-60', '#ac7eb2'), star: read('--sf-neutral-80', '#c6c6cf')},
  setup(env, random) {
    const {w, h} = env;
    // The camera stands above the fabric and looks down at it, so the wells open towards us.
    const f = h * 0.9, pitch = 0.45, lift = 4;
    const horizon = h / 2 - f * Math.tan(pitch);
    const state = {f, pitch, lift, horizon, sin: Math.sin(pitch), cos: Math.cos(pitch), waves: [], hole: null, ball: null};
    state.near = toPlane({w, h, state}, w / 2, h)[1];
    state.far = state.near + 16;
    state.cell = 0.95 - env.values.density / 200;
    state.span = Math.min(30, Math.abs(toPlane({w, h, state}, 0, horizon + h * 0.05)?.[0] ?? 20));
    state.centre = state.near + 4.2;
    state.stars = Array.from({length: 40}, () => [random() * w, random() * Math.max(0, horizon) * 0.9]);
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
    // The masses on the plane: two planets on orbits, the pointer's sphere, a black hole while held.
    const masses = [
      {x: Math.cos(t * 0.13) * 3.2, z: state.centre + Math.sin(t * 0.13) * 2, m: 0.42, r: 0.42, kind: 'planet'},
      {x: Math.cos(-t * 0.2 + 2) * 1.8, z: state.centre - 0.4 + Math.sin(-t * 0.2 + 2) * 1.2, m: 0.24, r: 0.26, kind: 'moon'},
    ];
    const at = pointer.on ? toPlane(env, pointer.x * w, pointer.y * h) : null;
    if (at && !state.hole) {
      state.ball = state.ball ? [mix(state.ball[0], at[0], 0.15), mix(state.ball[1], at[1], 0.15)] : at;
    } else if (!at) state.ball = null;
    if (state.ball) masses.push({x: state.ball[0], z: state.ball[1], m: 0.55, r: 0.42, kind: 'sun'});
    if (state.hole) {
      state.hole.mass = Math.min(1, state.hole.mass + 0.005);
      if (at) { state.hole.x = mix(state.hole.x, at[0], 0.1); state.hole.z = mix(state.hole.z, at[1], 0.1); }
      masses.push({x: state.hole.x, z: state.hole.z, m: 0.5 + state.hole.mass * 1.2, r: 0.1 + state.hole.mass * 0.2, kind: 'hole'});
    }
    state.waves = state.waves.filter((wave) => t - wave.born < 7);
    // Height of the fabric: a round well under each mass, and rings of passing waves.
    const height = (x, z) => {
      let y = 0;
      // A funnel: deep and narrow at the mass, flat again a few cells away, like the textbook picture.
      for (const m of masses) { const d = Math.hypot(x - m.x, z - m.z); if (d < 3.2) y -= m.m * (1 / (d + 0.28) - 1 / 3.48); }
      for (const wave of state.waves) {
        const age = t - wave.born, d = Math.hypot(x - wave.x, z - wave.z), front = age * 2.2, band = d - front;
        if (Math.abs(band) < 1.4) y += Math.sin(band / 1.4 * Math.PI * 2) * Math.exp(-(band * band) / 0.5) * 0.28 * wave.strength * (1 - age / 7);
      }
      return y * 0.85;
    };
    const project = (x, y, z) => {
      const dy = y - state.lift, zc = z * state.cos - dy * state.sin, yc = dy * state.cos + z * state.sin;
      return [w / 2 + x * state.f / zc, h / 2 - yc * state.f / zc, zc];
    };
    const alpha = (scheme === 'light' ? 0.5 : 0.48) * k;
    const span = state.span;
    const segment = (points) => {
      for (let i = 1; i < points.length; i += 1) {
        const [x0, y0, z0, d0] = points[i - 1], [x1, y1] = points[i];
        const fade = Math.min(1, 7 / z0);
        ctx.strokeStyle = rgba(mixc(tones.line, tones.deep, Math.min(1, d0 * 1.4)), alpha * fade * (1 + Math.min(1, d0) * 0.8));
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    };
    const line = (fromX, fromZ, toX, toZ, steps) => {
      const points = [];
      for (let i = 0; i <= steps; i += 1) {
        const x = mix(fromX, toX, i / steps), z = mix(fromZ, toZ, i / steps), y = height(x, z);
        const [sx, sy, zc] = project(x, y, z);
        points.push([sx, sy, zc, -y]);
      }
      segment(points);
    };
    ctx.lineWidth = 1;
    const cell = state.cell;
    for (let z = state.near; z <= state.far + 1e-6; z += cell) line(-span, z, span, z, Math.round(40 + span * 6));
    const across = Math.round(span * 2 / cell);
    for (let i = 0; i <= across; i += 1) { const x = -span + i * (span * 2 / across); line(x, state.near, x, state.far, 90); }
    // The bodies, drawn over the fabric, far ones first.
    for (const m of masses.sort((a, b) => b.z - a.z)) {
      const y = height(m.x, m.z) + m.r * 0.9;
      const [sx, sy, zc] = project(m.x, y, m.z);
      const r = m.r * state.f / zc;
      if (m.kind === 'hole') {
        ctx.fillStyle = rgba([0, 0, 0]);
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = rgba(tones.deep, 0.7 * k);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(sx, sy, r * 1.8, r * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
        continue;
      }
      const colour = m.kind === 'sun' ? tones.sun : m.kind === 'planet' ? tones.planet : tones.moon;
      if (m.kind === 'sun') {
        const glow = ctx.createRadialGradient(sx, sy, r * 0.8, sx, sy, r * 2.2);
        glow.addColorStop(0, rgba(colour, 0.3 * k)); glow.addColorStop(1, rgba(colour, 0));
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sx, sy, r * 2.2, 0, Math.PI * 2); ctx.fill();
      }
      const body = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.35, r * 0.1, sx, sy, r);
      body.addColorStop(0, rgba(m.kind === 'sun' ? tones.core : mixc(colour, [255, 255, 255], 0.35)));
      body.addColorStop(1, rgba(mixc(colour, tones.ground, 0.35)));
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
  },
};
// A point of the screen to the flat plane (before it sinks), or null above the horizon.
function toPlane(env, x, y) {
  const {state} = env;
  // The ray through the pixel, from the camera, down to the plane y = 0.
  const u = (x - env.w / 2) / state.f, v = -(y - env.h / 2) / state.f;
  const dy = -state.sin + v * state.cos, dz = state.cos + v * state.sin;
  if (dy >= -1e-3) return null;
  const t = state.lift / -dy, z = t * dz;
  if (state.near !== undefined && (z < state.near - 0.5 || z > state.far)) return null;
  return [t * u, z];
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
