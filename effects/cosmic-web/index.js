// Cosmic web (simai.effect 1.1.0; dark scheme only): a dark gas gathers into filaments and nodes, stars light up in the nodes, and bubbles of light grow until the web is lit.
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

// The cosmic web: a dark, nearly even gas gathers along the flows of a random field; where the flows
// cross, filaments and nodes form by themselves (the Zel'dovich approximation of how matter clumps).
// In the densest nodes the first stars light up, and round them bubbles of light grow and merge until
// the whole web is lit. Then it fades, and a new web begins. The pointer is a mass that draws matter
// to itself; a click lights a new star.
const PERIOD = 44;
const SCENE = {
  home: 'dark', seed: 71, fresh: true, start: PERIOD * 0.72, reseed: ['density', 'scale'],
  tones: (read) => {
    const r = (name, tone, hex) => read(`--sf-${name}-${tone}`, hex);
    return {
      ground: r('neutral', 4, '#0c0e13'), deep: r('neutral', 0, '#000000'),
      cyan: {web: mixc(r('primary', 50, '#0074ec'), r('success', 60, '#3ea05a'), 0.45), lit: mixc(r('primary', 70, '#7aabff'), r('success', 70, '#4cbb6f'), 0.45), hot: r('neutral', 98, '#faf9fe')},
      fire: {web: r('warning', 30, '#6f3800'), lit: r('warning', 70, '#f19d47'), hot: r('warning', 95, '#ffeee1')},
      theme: {web: r('primary', 40, '#005bbe'), lit: r('primary', 70, '#7aabff'), hot: r('primary', 95, '#ecf0ff')},
    };
  },
  setup(env) {
    const {w, h, values} = env;
    const cols = Math.max(1, Math.ceil(w / 2)), rows = Math.max(1, Math.ceil(h / 2));
    const sheet = () => new OffscreenCanvas(cols, rows);
    const st = {cols, rows, rho: new Float32Array(cols * rows), soft: new Float32Array(cols * rows), image: new ImageData(cols, rows), web: sheet(), dim: sheet(), lit: sheet(), mask: sheet(), glow: new OffscreenCanvas(Math.ceil(cols / 3), Math.ceil(rows / 3)), cycle: null, extra: [], pull: 0};
    st.px = new Uint32Array(st.image.data.buffer);
    // Density (in sixteenths of the even gas) to a white pixel's opacity, worked out once.
    st.light = Uint32Array.from({length: 512}, (_, i) => ((170 * (1 - Math.exp(-0.15 * (i / 16) ** 1.35))) << 24 | 0xffffff) >>> 0);
    // As fine as the density asks, but no more than about 90 000 grains on any area.
    st.gap = Math.max(2.8 - values.density / 100 * 1.4, Math.sqrt(w * h * 1.6 / 90000));
    st.L = Math.min(w, h * 1.7) * (0.1 + values.scale / 100 * 0.6);
    return st;
  },
  click(env, x, y) { const st = env.state; st.extra.push({x, y, t: st.t ?? 0}); },
  draw(env, t) {
    const {ctx, w, h, tones, state: st, values, pointer} = env;
    const k = values.intensity / 100, P = tones[values.palette] ?? tones.cyan;
    st.t = t;
    const cycle = Math.floor(t / PERIOD), u = t / PERIOD - cycle;
    if (cycle !== st.cycle) { st.cycle = cycle; st.extra = []; lay(env, st, 71 + env.salt + cycle * 13); }
    // Gravity's clock: first threads already showing, quick at first, then a slow thickening. The cycle fades in and out.
    const D = 0.3 + 0.7 * smooth(clamp(u / 0.6, 0, 1)) + Math.max(0, u - 0.6) * 0.15, fade = Math.min(1, u / 0.05, (1 - u) / 0.07);
    st.pull += ((pointer.on ? 1 : 0) - st.pull) * 0.06;
    const {rho, n, qx, qy, dx, dy, cols, rows, px} = st, mx = pointer.x * w, my = pointer.y * h, reach = st.L * 0.5, pull = st.pull * 0.45;
    rho.fill(0);
    for (let i = 0; i < n; i += 1) {
      let x = qx[i] + dx[i] * D, y = qy[i] + dy[i] * D;
      if (pull > 0.01) {
        const ax = mx - x, ay = my - y, d = Math.abs(ax) + Math.abs(ay);
        if (d < reach) { const g = pull * (1 - d / reach); x += ax * g; y += ay * g; }
      }
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      rho[(y >> 1) * cols + (x >> 1)] += 1;
    }
    // Each cell shares with its neighbours, so the gas has no grain.
    const soft = st.soft;
    for (let y = 1; y < rows - 1; y += 1) for (let x = 1, o = y * cols + 1; x < cols - 1; x += 1, o += 1) soft[o] = (rho[o] * 4 + (rho[o - 1] + rho[o + 1] + rho[o - cols] + rho[o + cols]) * 2 + rho[o - cols - 1] + rho[o - cols + 1] + rho[o + cols - 1] + rho[o + cols + 1]) / 16;
    // Density to light: a thin gas stays faint, a filament is bright.
    const scale = 16 / (4 / (st.gap * st.gap)), light = st.light;
    for (let i = 0; i < px.length; i += 1) { const v = soft[i] * scale | 0; px[i] = light[v > 511 ? 511 : v]; }
    st.web.getContext('2d').putImageData(st.image, 0, 0);
    const tint = (sheet, colour) => {
      const c = sheet.getContext('2d');
      c.globalCompositeOperation = 'copy'; c.drawImage(st.web, 0, 0);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = rgba(colour); c.fillRect(0, 0, cols, rows);
    };
    tint(st.dim, P.web); tint(st.lit, P.lit);
    // Bubbles of light round the stars: they grow from their birth and merge.
    const m = st.mask.getContext('2d'), stars = [];
    m.clearRect(0, 0, cols, rows);
    const bubble = (x, y, r, a) => {
      const g = m.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2);
      g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.75})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = g; m.fillRect(x / 2 - r / 2, y / 2 - r / 2, r, r);
    };
    for (const node of st.nodes) {
      const age = u - node.born;
      if (age <= 0) continue;
      const x = node.x, y = node.y;
      bubble(x, y, st.L * (0.12 + age * 2.6), 1);
      stars.push([x, y, Math.min(1, age * 30)]);
    }
    for (const one of st.extra) { const age = (t - one.t) / PERIOD; bubble(one.x, one.y, st.L * (0.12 + age * 2.6), 1); stars.push([one.x, one.y, Math.min(1, age * 30)]); }
    const l = st.lit.getContext('2d');
    l.globalCompositeOperation = 'destination-in'; l.drawImage(st.mask, 0, 0);
    // The picture: the dark web, the lit part over it, a soft bloom, the stars.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.deep)); g.addColorStop(1, rgba(tones.ground));
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * (0.2 + k * 0.3); ctx.drawImage(st.dim, 0, 0, w, h);
    ctx.globalAlpha = fade * (0.12 + k * 0.33); ctx.drawImage(st.lit, 0, 0, w, h);
    const b = st.glow.getContext('2d');
    b.globalCompositeOperation = 'copy'; b.imageSmoothingQuality = 'high'; b.drawImage(st.lit, 0, 0, st.glow.width, st.glow.height);
    ctx.globalAlpha = fade * k * 0.3; ctx.drawImage(st.glow, 0, 0, w, h);
    ctx.globalAlpha = 1;
    for (const [x, y, a] of stars) {
      const r = Math.max(5, st.L * 0.035), s = ctx.createRadialGradient(x, y, 0, x, y, r);
      s.addColorStop(0, rgba(P.hot, a * fade * 0.9 * k)); s.addColorStop(0.2, rgba(P.lit, a * fade * 0.4 * k)); s.addColorStop(1, rgba(P.lit, 0));
      ctx.fillStyle = s; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  },
};
// A new web: a field of three scales on a coarse lattice, each grain of gas moved along its slope;
// the densest places where they end up are where the stars will be.
function lay(env, st, seed) {
  const {w, h} = env, random = rng(seed), L = st.L, gap = st.gap, margin = L * 0.6, ox = random() * 1000, oy = random() * 1000;
  const cell = 6, lw = Math.ceil((w + margin * 2) / cell) + 3, lh = Math.ceil((h + margin * 2) / cell) + 3, phi = new Float32Array(lw * lh);
  for (let j = 0; j < lh; j += 1) for (let i = 0; i < lw; i += 1) {
    const x = i * cell / L + ox, y = j * cell / L + oy;
    phi[j * lw + i] = noise2(x, y) + 0.5 * noise2(x * 2.1 + 7, y * 2.1 + 3) + 0.25 * noise2(x * 4.3 + 1, y * 4.3 + 9);
  }
  const n = Math.ceil((w + margin * 2) / gap) * Math.ceil((h + margin * 2) / gap);
  if (st.n !== n) { st.n = n; st.qx = new Float32Array(n); st.qy = new Float32Array(n); st.dx = new Float32Array(n); st.dy = new Float32Array(n); }
  const per = Math.ceil((w + margin * 2) / gap), push = L * L / (2 * cell) * 0.24;
  for (let i = 0; i < n; i += 1) {
    const x = (i % per + random()) * gap, y = (Math.floor(i / per) + random()) * gap;
    const fx = x / cell, fy = y / cell, a = Math.min(lw - 3, Math.max(1, Math.floor(fx))), b = Math.min(lh - 3, Math.max(1, Math.floor(fy))), tx = fx - a, ty = fy - b;
    // The slope at a lattice point, blended between the four round the grain.
    const slope = (o, step) => phi[o + step] - phi[o - step];
    const at = (step) => mix(mix(slope(b * lw + a, step), slope(b * lw + a + 1, step), tx), mix(slope((b + 1) * lw + a, step), slope((b + 1) * lw + a + 1, step), tx), ty);
    st.qx[i] = x - margin; st.qy[i] = y - margin;
    st.dx[i] = -at(1) * push; st.dy[i] = -at(lw) * push;
  }
  // Where the matter ends up: the densest cells, kept apart from each other.
  const size = 16, gw = Math.ceil(w / size), gh = Math.ceil(h / size), count = new Float32Array(gw * gh);
  for (let i = 0; i < n; i += 1) {
    const x = st.qx[i] + st.dx[i], y = st.qy[i] + st.dy[i];
    if (x >= 0 && y >= 0 && x < w && y < h) count[Math.floor(y / size) * gw + Math.floor(x / size)] += 1;
  }
  const order = Array.from(count.keys()).sort((p, q) => count[q] - count[p]), nodes = [], apart = L * 0.32, most = 12 + Math.round(w * h / 60000);
  for (const c of order) {
    const x = (c % gw + 0.5) * size, y = (Math.floor(c / gw) + 0.5) * size;
    if (nodes.some((one) => Math.hypot(one.x - x, one.y - y) < apart)) continue;
    nodes.push({x, y, born: 0.5 + nodes.length / most * 0.32});
    if (nodes.length >= most) break;
  }
  st.nodes = nodes;
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
