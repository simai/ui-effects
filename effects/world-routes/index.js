// World routes (simai.effect 1.1.0; dark scheme only): a dotted world map; signals or planes travel between the capitals.
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

// A dotted world map (Natural Earth land, public domain, 180x72 cells, -180..180 by 80..-58 degrees)
// with world capitals as nodes, and on the routes between them either data pulses flying along arcs
// or planes on their flights, each trailing a fading contrail.
// Pointer: the nearest city lights up and sends to its links; a click opens a new node that pings its
// three nearest; a press-drag draws a link of your own.
const MASK_W = 180, MASK_H = 72;
// A plane seen from above, nose along +x: fuselage, wings and tail, mirrored about the axis.
const PLANE = [[1, 0], [0.75, 0.09], [0.2, 0.11], [-0.15, 0.95], [-0.32, 0.95], [-0.18, 0.12], [-0.72, 0.1], [-0.92, 0.42], [-1.02, 0.42], [-0.95, 0]];
function plane(ctx, x, y, angle, size, colour) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size, size);
  ctx.beginPath();
  PLANE.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  for (let i = PLANE.length - 2; i > 0; i -= 1) ctx.lineTo(PLANE[i][0], -PLANE[i][1]);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.restore();
}
// World capitals by weight, as [longitude, latitude]: the first ones are always shown.
const CAPITALS = [[-0.13, 51.51], [-77.04, 38.91], [37.62, 55.76], [116.4, 39.9], [139.69, 35.69], [2.35, 48.86], [13.4, 52.52], [77.21, 28.61],
  [-47.93, -15.78], [31.24, 30.04], [151.21, -33.87], [-99.13, 19.43], [-75.7, 45.42], [54.37, 24.45], [103.82, 1.35], [126.98, 37.57],
  [-3.7, 40.42], [12.5, 41.9], [28.98, 41.01], [36.82, -1.29], [28.19, -25.75], [-58.38, -34.6], [100.5, 13.75], [106.85, -6.21],
  [46.68, 24.71], [7.49, 9.06], [-74.07, 4.71], [-77.04, -12.05], [18.07, 59.33], [121.47, 31.23], [44.36, 33.31], [69.24, 41.3]];
// Long routes that join the regions.
const ROUTES = [[0, 1], [2, 3], [3, 4], [0, 7], [1, 8], [5, 9], [7, 14], [14, 10], [0, 2], [1, 11]];
const MASK = 'AAAAAAYd8P///wAA+AAAAAA8AAAAAAAAAAAwADwf///4AAYAAAAAAEAAAAAAAAAAAfivwAf//wAAAAADgAP/4AHYAAAAAADwW2sAP//AAAAAAEAD//+MDAAAgAAADfyn/AH//gAAAAAMDf///+/8AAAP/z/P7ZjwF//AAAH+AA3f//////3ewP///+/9k8H/gAAAf/y//f////////e//////+B2D+A+AA+eP///////////AD/////5Q8D4AIAB9////////////+Af/////gHAB4AAAH5///////////74AH8f///gHkAAAAAH5P/////////+GAABgB///wH+AAAAEAw/////////8AYAACAA///8D+AAAAECh/////////4A4AAAAAf///v/gAAAbCv/////////8AwAAAAAP///n/wAAAbv///////////AgAAAAAP////7QAAAEf//////////9AAAAAAAB////sYAAAD///////////8AAAAAAAD////9AAAAB//7f///////4AAAAAAAD////0AAAAB/Pwf///////xAAAAAAAD////gAAAAfznwH///////DAAAAAAAD////AAAAAPCbf///////+CAAAAAAAD///8AAAAAfADf//////+ECAAAAAAAB///8AAAAAGHQP///////mMAAAAAAAA///8AAAAAH+Ai///////E8AAAAAAAAf//wAAAAAP/AA///////BgAAAAAAAAP//gAAAAAf/z1///////gAAAAAAAAAD/AwAAAAAf////f/////gAAAAAAAAAF+AQAAAAB///+/v/////AAAAAAAAAAA+AQAAAAB///+fw/////AAAAAAAAAAAeAAAAAAD////f+D///+gAAAAAAAAAAeAEAAAAH////v/B/z/QAAAAAAAgAAAfEBgAAAD////v+A/h+gAAAAAAAAAAAH8AAAAAD////n8AfB+AgAAAAAAAAAAAdAAAAAD////3wAcBfAgAAAAAAAAAAAHAAAAAD////7AAcAfgwAAAAAAAAAAABAAAAAD////8QAMAXgIAAAAAAAAAAABD+AAAB/////gAMASBQAAAAAAAAAAAAX/AAAB/////gACAQAYAAAAAAAAAAAAH/gAAAfv///gACAICIAAAAAAAAAAAAH/8AAAAD///AAAAsGAAAAAAAAAAAAAH/+AAAAB//+AAAAUOAAAAAAAAAAAAAP/+AAAAB//8AAAAM+wAAAAAAAAAAAAP//gAAAB//4AAAAMcggAAAAAAAAAAAP//8AAAB//wAAAAGEm/AAAAAAAAAAAf///AAAA//gAAAACAQHkAAAAAAAAAAP///gAAA//wAAAABwAHwgAAAAAAAAAH///AAAA//wAAAAAAIBYIAAAAAAAAAH//+AAAAf/wAAAAAAAAAAAAAAAAAAAD//+AAAA//wgAAAAABxAAAAAAAAAAAD//+AAAA//wgAAAAAFxgBAAAAAAAAAA//8AAAA//zgAAAAAf5gABAAAAAAAAAf/8AAAA//DgAAAAAf/gAAAAAAAAAAAf/8AAAAf+DAAAAAB//wCAAAAAAAAAAf/4AAAAf/DAAAAAH//4AAAAAAAAAAAf/AAAAAf/DAAAAAH//8AAAAAAAAAAAf/AAAAAP8AAAAAAH//+AAAAAAAAAAA//AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAD//+AAAAAAAAAAA/8AAAAAHwAAAAAAD8f8AAAAAAAAAAA/4AAAAAGAAAAAAADAH8AAAAAAAAAAA/gAAAAAAAAAAAAAAAD4AAAAAAAAAAB/gAAAAAAAAAAAAAAADwAEAAAAAAAAB+AAAAAAAAAAAAAAAAAAAGAAAAAAAAB4AAAAAAAAAAAAAAAAAQAIAAAAAAAAB4AAAAAAAAAAAAAAAAAAAQAAAAAAAABwAAAAAAAAAAAAAAAAAABgAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAACAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const SCENE = {
  home: 'dark', seed: 57, reseed: ['density'],
  tones: (read) => ({ground: read('--sf-neutral-5', '#111318'), land: read('--sf-neutral-30', '#45464f'), node: read('--sf-primary-80', '#acc7ff'), pulse: read('--sf-tertiary-80', '#e9b4f2'), hot: read('--sf-primary-90', '#d7e2ff')}),
  setup(env, random) {
    const {w, h} = env;
    const raw = atob(MASK);
    const bit = (i) => (raw.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;
    // The map covers the area, centred, keeping its proportions.
    const scale = Math.max(w / MASK_W, h / MASK_H);
    const ox = (w - MASK_W * scale) / 2, oy = (h - MASK_H * scale) / 2;
    const dots = [];
    for (let y = 0; y < MASK_H; y += 1) for (let x = 0; x < MASK_W; x += 1) {
      if (!bit(y * MASK_W + x)) continue;
      const px = ox + (x + 0.5) * scale, py = oy + (y + 0.5) * scale;
      if (px > -scale && py > -scale && px < w + scale && py < h + scale) dots.push([px, py]);
    }
    const place = ([lon, lat]) => [ox + (lon + 180) / 360 * MASK_W * scale, oy + (80 - lat) / 138 * MASK_H * scale];
    const count = Math.min(CAPITALS.length, Math.round(12 + env.values.density / 5));
    const nodes = CAPITALS.slice(0, count).map((capital) => ({at: place(capital), glow: 0}));
    const arcs = [];
    const joined = new Set();
    const join = (i, j) => {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (i === j || joined.has(key)) return;
      joined.add(key);
      arcs.push({a: i, b: j, phase: random(), speed: 0.08 + random() * 0.1, lift: 0.18 + random() * 0.14, life: Infinity});
    };
    nodes.forEach((node, i) => {
      const near = nodes.map((other, j) => [j, Math.hypot(other.at[0] - node.at[0], other.at[1] - node.at[1])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
      for (const [j] of near.slice(0, 2)) join(i, j);
    });
    for (const [i, j] of ROUTES) if (i < count && j < count) join(i, j);
    return {dots, size: Math.max(1.2, scale * 0.42), nodes, arcs, drag: null, hover: -1, random};
  },
  click(env, x, y) {
    const {state} = env;
    if (state.nodes.length > 80) return;
    const node = {at: [x, y], glow: 1};
    state.nodes.push(node);
    const i = state.nodes.length - 1;
    const near = state.nodes.map((other, j) => [j, Math.hypot(other.at[0] - x, other.at[1] - y)]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]).slice(0, 3);
    for (const [j] of near) state.arcs.push({a: i, b: j, phase: 0, speed: 0.35, lift: 0.25, life: 8, born: env.time ?? 0});
  },
  press(env, x, y) { env.state.drag = {from: [x, y]}; },
  release(env, x, y) {
    const {state} = env;
    if (!state.drag) return;
    const [fx, fy] = state.drag.from;
    state.drag = null;
    if (Math.hypot(x - fx, y - fy) < 20 || state.nodes.length > 80) return;
    state.nodes.push({at: [fx, fy], glow: 1}, {at: [x, y], glow: 1});
    const n = state.nodes.length;
    state.arcs.push({a: n - 2, b: n - 1, phase: 0, speed: 0.3, lift: 0.3, life: 14, born: env.time ?? 0});
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env;
    env.time = t;
    const k = values.intensity / 100;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgba(tones.land, 0.9);
    const s = state.size;
    for (const [x, y] of state.dots) ctx.fillRect(x - s / 2, y - s / 2, s, s);
    // The pointer: the nearest city lights up.
    state.hover = -1;
    if (pointer.on) {
      const px = pointer.x * w, py = pointer.y * h;
      let best = 90;
      state.nodes.forEach((node, i) => { const d = Math.hypot(node.at[0] - px, node.at[1] - py); if (d < best) { best = d; state.hover = i; } });
      if (state.hover >= 0) state.nodes[state.hover].glow = 1;
    }
    state.arcs = state.arcs.filter((arc) => arc.life === Infinity || t - arc.born < arc.life);
    const flights = values.show === 'flights';
    for (const arc of state.arcs) {
      const A = state.nodes[arc.a], B = state.nodes[arc.b];
      if (!A || !B) continue;
      // Half the planes fly each route the other way.
      const [ax, ay] = flights && arc.phase > 0.5 ? B.at : A.at, [bx, by] = flights && arc.phase > 0.5 ? A.at : B.at;
      const mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * arc.lift;
      const lit = arc.a === state.hover || arc.b === state.hover || arc.life !== Infinity;
      ctx.strokeStyle = rgba(tones.node, (lit ? 0.35 : flights ? 0.08 : 0.12) * k);
      ctx.lineWidth = 1;
      if (flights) ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.stroke();
      ctx.setLineDash([]);
      const point = (q) => [(1 - q) * (1 - q) * ax + 2 * (1 - q) * q * mx + q * q * bx, (1 - q) * (1 - q) * ay + 2 * (1 - q) * q * my + q * q * by];
      // The same pace on every route, long or short: so many pixels a second along the curve.
      if (!arc.length) { arc.length = 0; for (let i = 1, p = point(0); i <= 16; i += 1) { const n = point(i / 16); arc.length += Math.hypot(n[0] - p[0], n[1] - p[1]); p = n; } }
      const pace = (flights ? 26 : 70) * (lit ? 2 : 1) * (0.85 + arc.speed);
      const q = (arc.phase + t * pace / Math.max(20, arc.length)) % 1;
      const [qx, qy] = point(q);
      if (flights) {
        // A contrail fading behind the plane, then the plane turned along its course.
        for (let i = 1; i <= 8; i += 1) {
          const [x0, y0] = point(Math.max(0, q - (i - 1) * 0.012)), [x1, y1] = point(Math.max(0, q - i * 0.012));
          ctx.strokeStyle = rgba(tones.hot, 0.4 * (1 - i / 9) * k);
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        const [nx, ny] = point(Math.min(1, q + 0.005));
        plane(ctx, qx, qy, Math.atan2(ny - qy, nx - qx), lit ? 6.5 : 5, rgba(lit ? tones.hot : tones.node, 0.95 * k));
        continue;
      }
      ctx.fillStyle = rgba(lit ? tones.hot : tones.pulse, 0.9 * k);
      ctx.beginPath();
      ctx.arc(qx, qy, lit ? 2.6 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const node of state.nodes) {
      node.glow = Math.max(0, node.glow - 0.01);
      if (node.glow > 0) { ctx.fillStyle = rgba(tones.node, 0.15 * node.glow * k); ctx.beginPath(); ctx.arc(node.at[0], node.at[1], 10, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = rgba(tones.node, 0.85 * k);
      ctx.beginPath();
      ctx.arc(node.at[0], node.at[1], 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // A link being drawn.
    if (state.drag && pointer.down) {
      ctx.strokeStyle = rgba(tones.hot, 0.6 * k);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(state.drag.from[0], state.drag.from[1]);
      ctx.lineTo(pointer.x * w, pointer.y * h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  },
};

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
