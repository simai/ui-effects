// Cosmic web (simai.effect 1.1.0; dark scheme only): fine, sharp filaments fill the area round dark voids and slowly change their shape.
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

// The cosmic web: fine, sharp filaments on several scales fill the area, round dark voids. They are
// the edges between cells whose points slowly move, so the threads part, join and find a new shape.
// Drawn on the video card, sharp at any size; without one it stays a still picture.
// The pointer lights the web round it; a click sends a ring of light through it.
const FRAGMENT = `precision highp float;
uniform vec2 R; uniform float T, S, K, O, V; uniform vec3 G, W, L, H, M; uniform vec3 P[4];
const mat2 Q = mat2(.8, .6, -.6, .8);
float h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float n(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * f * (f * (f * 6. - 15.) + 10.);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y);
}
vec2 g2(vec2 p) { return vec2(h(p), h(p + 17.3)); }
// The edge between two cells: near zero on a thread. The points of the cells move, so the threads do.
float edge(vec2 p, float t) {
  vec2 i = floor(p), f = fract(p);
  float a = 9., b = 9.;
  for (float y = -1.; y < 2.; y += 1.) for (float x = -1.; x < 2.; x += 1.) {
    vec2 c = vec2(x, y), o = g2(i + c), r = c + .5 + .42 * sin(t + 6.283 * o) - f;
    float d = dot(r, r);
    if (d < a) { b = a; a = d; } else if (d < b) b = d;
  }
  return sqrt(b) - sqrt(a);
}
void main() {
  vec2 c = vec2(gl_FragCoord.x, R.y - gl_FragCoord.y), p = c / S;
  float a = .8, b = 1., line = 0., haze = 0., t = T * .16;
  vec2 q = p + 137.;
  for (float i = 0.; i < 6.; i += 1.) {
    if (i >= O) break;
    // Each layer's threads wander a little, so no thread runs straight.
    vec2 w = q + (vec2(n(q * 2.3), n(q * 2.3 + 9.)) - .5) * .5;
    float e = edge(w, t * (1. + i * .35) + i * 3.);
    line += a * (1. - smoothstep(.0, .022 * b, e));
    haze += a * (1. - smoothstep(.0, .35, e));
    q = Q * q * 2.13 + 11.;
    b *= 2.13;
    a *= .84;
  }
  float gap = smoothstep(V - .22, V + .22, n(p * .55 - T * .012) * .65 + n(p * 1.4 + 3. + T * .017) * .35);
  float glow = 0.;
  if (M.z > 0.) glow += M.z * exp(-dot(c - M.xy, c - M.xy) / (S * S * 1.2));
  for (int i = 0; i < 4; i += 1) if (P[i].z >= 0.) {
    float d = length(c - P[i].xy) - P[i].z * S * 2.2;
    glow += exp(-d * d / (S * S * .15)) * max(0., 1. - P[i].z / 3.);
  }
  vec3 col = G + (W * haze * .2 * gap + L * pow(min(line, 1.4), 1.7) * (.3 + .7 * gap) * .42 + H * pow(min(line, 1.), 5.) * gap * .25) * K * (1. + glow * 1.4);
  gl_FragColor = vec4(col, 1.);
}`;
// The palettes: the mass of the threads, the bright threads, their junctions and the dark between.
const PALETTES = {
  turquoise: {web: [12, 72, 90], lit: [66, 178, 202], hot: [216, 246, 255], ground: [6, 11, 15]},
  ocean: {web: [16, 50, 118], lit: [76, 148, 244], hot: [214, 232, 255], ground: [5, 9, 18]},
  violet: {web: [58, 28, 122], lit: [162, 116, 252], hot: [238, 226, 255], ground: [10, 7, 20]},
  rose: {web: [104, 22, 74], lit: [246, 104, 160], hot: [255, 226, 238], ground: [15, 6, 12]},
  emerald: {web: [8, 76, 62], lit: [56, 190, 142], hot: [216, 255, 238], ground: [5, 13, 12]},
  sunset: {web: [84, 26, 74], lit: [244, 146, 98], hot: [255, 236, 214], ground: [14, 7, 14]},
  gold: {web: [74, 54, 20], lit: [226, 176, 82], hot: [255, 242, 208], ground: [12, 10, 6]},
  silver: {web: [42, 50, 60], lit: [148, 166, 186], hot: [242, 247, 255], ground: [8, 10, 13]},
};
const SCENE = {
  home: 'dark', seed: 71, fresh: true, start: 30,
  tones: (read) => ({
    theme: {web: read('--sf-primary-30', '#00458f'), lit: read('--sf-primary-70', '#7aabff'), hot: read('--sf-primary-95', '#ecf0ff'), ground: read('--sf-neutral-4', '#0c0e13')},
  }),
  setup(env) {
    const ratio = env.ctx.canvas.width / env.w, st = {rings: [], pull: 0};
    env.gl ??= card();
    if (env.gl) { env.gl.gl.canvas.width = env.ctx.canvas.width; env.gl.gl.canvas.height = env.ctx.canvas.height; }
    st.ratio = ratio;
    st.cell = (40 + env.values.scale * 3) * ratio;
    st.octaves = 3 + Math.round(env.values.density / 100 * 3);
    return st;
  },
  click(env, x, y) { const st = env.state; st.rings.push({x: x * st.ratio, y: y * st.ratio, t: st.t ?? 0}); st.rings = st.rings.slice(-4); },
  draw(env, t) {
    const {ctx, w, h, tones, state: st, values, pointer} = env, k = values.intensity / 100, P = values.palette === 'theme' ? tones.theme : PALETTES[values.palette] ?? PALETTES.turquoise, g = env.gl;
    st.t = t;
    st.pull += ((pointer.on ? 0.9 : 0) - st.pull) * 0.08;
    if (!g) { flat(env, st, P, k); return; }
    const {gl, u} = g, unit = (c) => c.map((v) => v / 255);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.uniform2f(u.R, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(u.T, t + env.salt % 1000);
    gl.uniform1f(u.S, st.cell);
    // More threads, or finer ones, light more of the area: each is dimmer.
    gl.uniform1f(u.K, (0.13 + k * 0.35) * (5 / st.octaves) ** 1.5 * Math.min(1, st.cell / st.ratio / 160) ** 0.3);
    gl.uniform1f(u.O, st.octaves);
    gl.uniform1f(u.V, 0.42 - values.density / 100 * 0.08);
    gl.uniform3fv(u.G, unit(P.ground)); gl.uniform3fv(u.W, unit(P.web)); gl.uniform3fv(u.L, unit(P.lit)); gl.uniform3fv(u.H, unit(P.hot));
    gl.uniform3f(u.M, pointer.x * w * st.ratio, pointer.y * h * st.ratio, st.pull);
    const rings = new Float32Array(12).fill(-1);
    st.rings.forEach((one, i) => { rings[i * 3] = one.x; rings[i * 3 + 1] = one.y; rings[i * 3 + 2] = (t - one.t) * 0.9; });
    gl.uniform3fv(u.P, rings);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    ctx.globalCompositeOperation = 'copy';
    const frame = gl.canvas.transferToImageBitmap();
    ctx.drawImage(frame, 0, 0, w, h);
    frame.close();
    ctx.globalCompositeOperation = 'source-over';
  },
};
// The video card's side: one program on its own canvas, kept for the life of the area.
function card() {
  const canvas = new OffscreenCanvas(1, 1), gl = canvas.getContext('webgl', {antialias: false, alpha: false, powerPreference: 'low-power'});
  if (!gl) return null;
  const shader = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); return s; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }'));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  for (const name of ['R', 'T', 'S', 'K', 'O', 'V', 'G', 'W', 'L', 'H', 'M', 'P']) u[name] = gl.getUniformLocation(program, name);
  return {gl, u};
}
// Without a video card: the same kind of web as one still picture, drawn once in a small buffer.
function flat(env, st, P, k) {
  const {ctx, w, h} = env;
  if (!st.picture) {
    const cols = Math.ceil(w / 3), rows = Math.ceil(h / 3), image = new ImageData(cols, rows), cell = st.cell / st.ratio / 3;
    for (let y = 0; y < rows; y += 1) for (let x = 0; x < cols; x += 1) {
      let a = 0.5, s = 0, weight = 1, px = x / cell + noise2(x / cell, y / cell), py = y / cell + noise2(y / cell + 7, x / cell);
      for (let i = 0; i < st.octaves; i += 1) { const r = (1 - Math.abs(2 * noise2(px, py) - 1)) ** 2; s += a * r * weight; weight = clamp(r * 1.7, 0, 1); px = px * 1.62 - py * 1.22; py = px * 0.4 + py * 1.62; a *= 0.58; }
      const c = mixc(mixc(P.ground, P.web, smooth(clamp((s - 0.12) / 0.5, 0, 1)) * (0.25 + k * 0.6)), P.lit, smooth(clamp((s - 0.42) / 0.53, 0, 1)) ** 2.2 * (0.25 + k * 0.6)), o = (y * cols + x) * 4;
      image.data[o] = c[0]; image.data[o + 1] = c[1]; image.data[o + 2] = c[2]; image.data[o + 3] = 255;
    }
    st.picture = new OffscreenCanvas(cols, rows);
    st.picture.getContext('2d').putImageData(image, 0, 0);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(st.picture, 0, 0, w, h);
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
      env.gl?.gl.getExtension('WEBGL_lose_context')?.loseContext();
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
