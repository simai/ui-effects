// Signals (simai.effect 1.1.0; dark scheme only): a dotted world map; pulses fly along arcs between cities.
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

// A dotted world map (Natural Earth land, public domain, 180x72 cells, -180..180 by 80..-58 degrees),
// with cities as nodes and pulses flying along arcs between them.
// Pointer: the nearest city lights up and sends to its links; a click opens a new node that pings its
// three nearest; a press-drag draws a link of your own.
const MASK_W = 180, MASK_H = 72;
const MASK = 'AAAAAAYd8P///wAA+AAAAAA8AAAAAAAAAAAwADwf///4AAYAAAAAAEAAAAAAAAAAAfivwAf//wAAAAADgAP/4AHYAAAAAADwW2sAP//AAAAAAEAD//+MDAAAgAAADftYA/n//gAAAAAMDf///+/8AAAP/z/P7ZjwF//AAAH+AA3f//////3ePwAAABACbD4Af///gANAAgAAAAAAAAhAAAAAAB+J8B/B//BhwAAAAAAAAAAAAD/////5Q8D4AIAB9////////////+Af/////gHAB4AAAH5///////////74AH8f///gHkAAAAAH5P/////////+GAABgB///wH+AAAAEAw/////////8AYAACAA///8D+AAAAECh/////////4A4AAAAAf///v/gAAAbCv/////////8AwAAAAAP///n/wAAAbv///////////AgAAAAAP////7QAAAEf//////////9AAAAAAAB////sYAAAD///////////8AAAAAAAD////9AAAAB//7fn//////4AAAAAAAD////0AAAAB/Pwef//////xAAAAAAAD////gAAAAfznwHP//////DAAAAAAAD////AAAAAPCbf/v/////+CAAAAAAAD///8AAAAAfADf/H////+ECAAAAAAAB///8AAAAAGHQP/n/////mMAAAAAAAA///8AAAAAH+Ai///////E8AAAAAAAAf//wAAAAAP/AA///////BgAAAAAAAAP//gAAAAAf/z1///////gAAAAAAAAAD/AwAAAAAf////f/////gAAAAAAAAAF+AQAAAAB///+/v/////AAAAAAAAAAA+AQAAAAB///+fw/////AAAAAAAAAAAeAAAAAAD////f+D///+gAAAAAAAAAAeAEAAAAH////v/B/z/QAAAAAAAgAAAfEBgAAAD////v+A/h+gAAAAAAAAAAAH8AAAAAD////n8AfB+AgAAAAAAAAAAAdAAAAAD////3wAcBfAgAAAAAAAAAAAHAAAAAD////7AAcAfgwAAAAAAAAAAABAAAAAD////8QAMAXgIAAAAAAAAAAABD+AAAB/////gAMASBQAAAAAAAAAAAAX/AAAB/////gACAQAYAAAAAAAAAAAAH/gAAAfv///gACAICIAAAAAAAAAAAAH/8AAAAD///AAAAsGAAAAAAAAAAAAAH/+AAAAB//+AAAAUOAAAAAAAAAAAAAP/+AAAAB//8AAAAM+wAAAAAAAAAAAAP//gAAAB//4AAAAMcggAAAAAAAAAAAP//8AAAB//wAAAAGEm/AAAAAAAAAAAf///AAAA//gAAAACAQHkAAAAAAAAAAP///gAAA//wAAAABwAHwgAAAAAAAAAH///AAAA//wAAAAAAIBYIAAAAAAAAAH//+AAAAf/wAAAAAAAAAAAAAAAAAAAD//+AAAA//wgAAAAABxAAAAAAAAAAAD//+AAAA//wgAAAAAFxgBAAAAAAAAAA//8AAAA//zgAAAAAf5gB+AAAAAAAAAf/8AAAA//DgAAAAAf/gAAAAAAAAAAAf/8AAAAf+DAAAAAB//wCAAAAAAAAAAf/4AAAAf/DAAAAAH//4AAAAAAAAAAAf/AAAAAf/DAAAAAH//8AAAAAAAAAAAf/AAAAAP8AAAAAAH//+AAAAAAAAAAA//AAAAAP8AAAAAAH//+AAAAAAAAAAA/+AAAAAH4AAAAAAD//+AAAAAAAAAAA/8AAAAAHwAAAAAAD8f8AAAAAAAAAAA/4AAAAAGAAAAAAADAH8AAAAAAAAAAA/gAAAAAAAAAAAAAAAD4AAAAAAAAAAB/gAAAAAAAAAAAAAAADwAEAAAAAAAAB+AAAAAAAAAAAAAAAAAAAGAAAAAAAAB4AAAAAAAAAAAAAAAAAQAIAAAAAAAAB4AAAAAAAAAAAAAAAAAAAQAAAAAAAABwAAAAAAAAAAAAAAAAAABgAAAAAAAAB4AAAAAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAACAAAAAAAAAAAAAAAAADwAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
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
    const count = Math.max(8, Math.round(8 + env.values.density / 6));
    const nodes = Array.from({length: count}, () => ({at: dots[Math.floor(random() * dots.length)] ?? [random() * w, random() * h], glow: 0}));
    const arcs = [];
    nodes.forEach((node, i) => {
      const near = nodes.map((other, j) => [j, Math.hypot(other.at[0] - node.at[0], other.at[1] - node.at[1])]).filter(([j]) => j !== i).sort((a, b) => a[1] - b[1]);
      for (const [j] of near.slice(0, 2)) arcs.push({a: i, b: j, phase: random(), speed: 0.1 + random() * 0.12, lift: 0.18 + random() * 0.2, life: Infinity});
    });
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
    for (const arc of state.arcs) {
      const A = state.nodes[arc.a], B = state.nodes[arc.b];
      if (!A || !B) continue;
      const [ax, ay] = A.at, [bx, by] = B.at;
      const mx = (ax + bx) / 2, my = (ay + by) / 2 - Math.hypot(bx - ax, by - ay) * arc.lift;
      const lit = arc.a === state.hover || arc.b === state.hover || arc.life !== Infinity;
      ctx.strokeStyle = rgba(tones.node, (lit ? 0.35 : 0.12) * k);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, bx, by);
      ctx.stroke();
      const speed = lit ? arc.speed * 2.2 : arc.speed;
      const q = (arc.phase + t * speed) % 1;
      const qx = (1 - q) * (1 - q) * ax + 2 * (1 - q) * q * mx + q * q * bx;
      const qy = (1 - q) * (1 - q) * ay + 2 * (1 - q) * q * my + q * q * by;
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
