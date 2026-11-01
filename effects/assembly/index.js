// Assembly (simai.effect 1.1.0; schemes dark and light): atoms fall, join with lines into an
// interface part or a picture, hold it, and let go; the next shape gathers from new atoms.
//
// The lifecycle is the catalogue template's: one canvas in the host, devicePixelRatio capped at 2,
// a seeded scene (the same picture on every mount at the defaults), one still frame for reduced
// motion, no frames while the tab is hidden or the area is off screen, and nothing left behind.
// Colours are palette tones of the theme, read through a probe so var() chains settle.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, t) => a + (b - a) * t;
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const smooth = (t) => t * t * (3 - 2 * t);
const outCubic = (t) => 1 - (1 - t) ** 3;
// A soft snap: past the place a little, then back.
const outBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

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

// --- Shapes ------------------------------------------------------------------------------------
// A shape is atoms (points in a box from -1 to 1, y down, with a relative size) and the lines
// between them. Interface parts come first: a button, a switch, a field, a card, a chart, a form,
// a page, a profile; then pictures made of the same atoms; and the SIMAI mark.
function builder() {
  const nodes = [], edges = [];
  const add = (x, y, r = 1) => { nodes.push({x, y, r}); return nodes.length - 1; };
  const path = (points, closed = false, r = 1) => {
    const ids = points.map(([x, y]) => add(x, y, r));
    for (let i = 0; i < ids.length - 1; i += 1) edges.push([ids[i], ids[i + 1]]);
    if (closed && ids.length > 2) edges.push([ids[ids.length - 1], ids[0]]);
    return ids;
  };
  const rect = (x0, y0, x1, y1, r) => path([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, r);
  const ring = (cx, cy, radius, n, r, turn = -Math.PI / 2) => path(Array.from({length: n}, (_, i) => [cx + radius * Math.cos(turn + i / n * Math.PI * 2), cy + radius * Math.sin(turn + i / n * Math.PI * 2)]), true, r);
  return {nodes, edges, add, path, rect, ring};
}
const SHAPES = {
  button(b) { b.rect(-0.9, -0.3, 0.9, 0.3); b.ring(-0.55, 0, 0.13, 5, 0.7); b.path([[-0.25, 0], [0.15, 0], [0.6, 0]], false, 0.6); },
  toggle(b) { b.path([[-0.5, -0.32], [0.5, -0.32], [0.82, 0], [0.5, 0.32], [-0.5, 0.32], [-0.82, 0]], true); b.ring(0.48, 0, 0.2, 6, 1.3); },
  field(b) { b.path([[-1, -0.5], [-0.45, -0.5]], false, 0.6); b.rect(-1, -0.25, 1, 0.25); b.path([[-0.82, -0.12], [-0.82, 0.12]], false, 0.6); b.path([[0.62, -0.05], [0.72, 0.06], [0.82, -0.05]], false, 0.6); },
  card(b) {
    b.rect(-0.7, -0.92, 0.7, 0.92);
    b.rect(-0.55, -0.77, 0.55, 0.05, 0.8);
    b.path([[-0.55, -0.05], [-0.2, -0.45], [0.05, -0.2], [0.25, -0.38], [0.55, -0.02]], false, 0.6);
    b.add(0.3, -0.6, 1.3);
    b.path([[-0.55, 0.32], [0.4, 0.32]], false, 0.7);
    b.path([[-0.55, 0.55], [0.1, 0.55]], false, 0.6);
    b.rect(-0.55, 0.68, -0.05, 0.82, 0.7);
  },
  chart(b) {
    b.path([[-0.95, -0.85], [-0.95, 0.8], [0.95, 0.8]], false, 0.7);
    const tops = [0.3, -0.1, 0.1, -0.45, -0.7];
    const peaks = tops.map((top, i) => { const x = -0.65 + i * 0.35; return b.path([[x, 0.8], [x, top]], false, 1)[1]; });
    for (let i = 0; i < peaks.length - 1; i += 1) b.edges.push([peaks[i], peaks[i + 1]]);
  },
  form(b) {
    b.path([[-0.8, -0.95], [-0.3, -0.95]], false, 0.6); b.rect(-0.8, -0.78, 0.8, -0.42);
    b.path([[-0.8, -0.2], [-0.4, -0.2]], false, 0.6); b.rect(-0.8, -0.03, 0.8, 0.33);
    b.rect(-0.8, 0.55, 0.05, 0.88, 1.2);
  },
  page(b) {
    b.rect(-1, -0.78, 1, 0.78);
    b.add(-0.84, -0.6, 1.5); b.path([[0.3, -0.6], [0.5, -0.6], [0.7, -0.6], [0.88, -0.6]], false, 0.55);
    b.path([[-0.85, -0.3], [0.2, -0.3]], false, 0.8);
    for (const x of [-0.85, -0.25, 0.35]) b.rect(x, -0.08, x + 0.5, 0.62, 0.8);
  },
  profile(b) { b.ring(0, -0.38, 0.34, 8); b.path([[-0.72, 0.8], [-0.52, 0.28], [0, 0.12], [0.52, 0.28], [0.72, 0.8]], false); b.add(0.62, -0.62, 1.3); },
  house(b) { b.path([[-0.7, 0.8], [-0.7, -0.1], [0, -0.78], [0.7, -0.1], [0.7, 0.8]], true); b.rect(-0.16, 0.32, 0.16, 0.8, 0.8); b.rect(0.24, 0.02, 0.5, 0.26, 0.7); b.path([[0.32, -0.42], [0.32, -0.72], [0.5, -0.72], [0.5, -0.25]], false, 0.6); },
  tree(b) {
    b.path([[0, -0.95], [-0.42, -0.4], [0.42, -0.4]], true);
    b.path([[0, -0.6], [-0.62, 0.15], [0.62, 0.15]], true);
    b.path([[0, -0.2], [-0.8, 0.6], [0.8, 0.6]], true);
    b.rect(-0.12, 0.6, 0.12, 0.92, 0.8);
  },
  rocket(b) {
    b.path([[0, -0.95], [0.28, -0.5], [0.28, 0.45], [-0.28, 0.45], [-0.28, -0.5]], true);
    b.path([[-0.28, 0.1], [-0.58, 0.65], [-0.28, 0.45]], false, 0.8); b.path([[0.28, 0.1], [0.58, 0.65], [0.28, 0.45]], false, 0.8);
    b.ring(0, -0.2, 0.13, 6, 0.6); b.path([[-0.14, 0.6], [0, 0.95], [0.14, 0.6]], false, 0.7);
  },
  bulb(b) { b.ring(0, -0.3, 0.52, 11); b.rect(-0.24, 0.32, 0.24, 0.72, 0.8); b.path([[-0.16, 0.86], [0.16, 0.86]], false, 0.6); b.path([[-0.16, 0.25], [-0.08, -0.25], [0.08, -0.25], [0.16, 0.25]], false, 0.6); },
  boat(b) { b.path([[-0.9, 0.3], [0.9, 0.3], [0.6, 0.72], [-0.6, 0.72]], true); b.path([[0, 0.3], [0, -0.92]], false, 0.8); b.path([[0, -0.85], [0.66, 0.16], [0, 0.16]], true, 0.8); b.path([[-0.08, -0.75], [-0.6, 0.16], [-0.08, 0.16]], true, 0.7); },
  heart(b) { b.path(Array.from({length: 14}, (_, i) => { const a = i / 14 * Math.PI * 2; return [0.055 * 16 * Math.sin(a) ** 3, -0.055 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) - 0.05]; }), true); },
  cat(b) {
    b.ring(0, 0.12, 0.62, 10);
    b.path([[-0.5, -0.24], [-0.5, -0.85], [-0.12, -0.5]], false, 0.8); b.path([[0.5, -0.24], [0.5, -0.85], [0.12, -0.5]], false, 0.8);
    b.add(-0.24, 0.02, 1.4); b.add(0.24, 0.02, 1.4); b.path([[-0.1, 0.3], [0, 0.38], [0.1, 0.3]], false, 0.5);
  },
  star(b) { b.path(Array.from({length: 10}, (_, i) => { const a = -Math.PI / 2 + i / 10 * Math.PI * 2, r = i % 2 ? 0.4 : 0.95; return [r * Math.cos(a), r * Math.sin(a) + 0.08]; }), true); },
  // The SIMAI mark: two chevrons in a rounded square (the logo's own outline, scaled to the box).
  mark(b) {
    const at = ([x, y]) => [(x - 93) / 72, (y - 93) / 72];
    b.path([[27, 93], [76.81, 43], [93, 59.25], [59.37, 93], [93, 126.75], [76.81, 143]].map(at), true, 1.1);
    b.path([[159, 93], [109.19, 43], [93, 59.25], [126.63, 93], [93, 126.75], [109.19, 143]].map(at), true, 1.1);
    b.path([[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [x * 1.22, y * 1.22]), true, 0.6);
  },
};
const INTERFACE = ['card', 'button', 'chart', 'toggle', 'form', 'field', 'page', 'profile'];
const OBJECTS = ['house', 'tree', 'rocket', 'bulb', 'boat', 'heart', 'cat', 'star'];
// The order of shapes, the same on every mount: the chosen set shuffled by a seed, pictures mixed
// in after every two interface parts, and the mark every seventh shape.
function deckFor(set, random) {
  const shuffle = (list) => { const out = [...list]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
  const deck = [];
  for (let round = 0; round < 6; round += 1) {
    const ui = shuffle(INTERFACE), live = shuffle(OBJECTS);
    if (set === 'interface') deck.push(...ui);
    else if (set === 'objects') deck.push(...live);
    else for (let i = 0; i < ui.length; i += 1) { deck.push(ui[i]); if (i % 2 === 1) deck.push(live[i >> 1]); }
  }
  // The first shape is the still frame and the preview: a card, or a house for pictures alone.
  const first = set === 'objects' ? 'house' : 'card';
  deck.splice(deck.indexOf(first), 1);
  deck.unshift(first);
  return deck.map((name, i) => (i % 7 === 6 && set !== 'objects' ? 'mark' : name));
}

// --- The scene -----------------------------------------------------------------------------------
// One shape at a time, in the right part of a wide area (the left stays calm for a heading) or,
// smaller and softer, in the upper right corner of a tall one, whose text fills the rest; in a
// right-to-left page, where the heading starts on the right, it moves to the left and reads the other way. Its
// atoms fall from above one after another and snap into place; the lines draw themselves between
// them; the shape holds, breathing a little; then the lines go and the atoms drop away. A few loose atoms drift down behind all of it. A click knocks the atoms
// near it away; they spring back.
const CYCLE = 11;
const SCENE = {
  home: 'light', seed: 41, reseed: ['shapes', 'size'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), atoms: [read('--sf-primary-40', '#005bbe'), read('--sf-tertiary-50', '#9a64a3'), read('--sf-secondary-50', '#717786')], line: read('--sf-neutral-variant-50', '#76777c')}
    : {ground: read('--sf-neutral-5', '#111318'), atoms: [read('--sf-primary-80', '#acc7ff'), read('--sf-tertiary-80', '#e9b4f2'), read('--sf-secondary-80', '#c1c6d7')], line: read('--sf-neutral-variant-60', '#8f9099')},
  setup(env, random) {
    const {w, h} = env;
    const wide = w > h * 1.15;
    const view = env.ctx.canvas;
    const rtl = view.ownerDocument.defaultView.getComputedStyle(view).direction === 'rtl';
    const zone = wide
      ? {x: w * 0.72, y: h * 0.52, s: Math.min(w * 0.2, h * 0.34)}
      : {x: w * 0.76, y: h * 0.17, s: Math.min(w * 0.18, h * 0.13)};
    if (rtl) zone.x = w - zone.x;
    zone.flip = rtl ? -1 : 1;
    zone.soft = wide ? 1 : 0.7;
    zone.s *= env.values.size / 100;
    const drift = Array.from({length: Math.round(10 + w * h / 60000)}, () => ({x: random() * w, y: random() * h, v: 6 + random() * 10, r: 1 + random() * 1.6, c: Math.floor(random() * 3), p: random() * 6}));
    return {zone, deck: deckFor(env.values.shapes, random), drift, cycle: -1, atoms: [], edges: [], reach: zone.s * 0.9, last: null};
  },
  // The atoms of the shape of cycle k: each with its place, a start above the area, a delay, a kind
  // (a dot, a rounded square or a diamond), a colour, and a push it springs back from.
  gather(env, k) {
    const {state, h} = env;
    const random = rng(1000 + k * 7919 + (env.values.shapes === 'objects' ? 3 : env.values.shapes === 'interface' ? 5 : 0));
    const b = builder();
    const name = state.deck[k % state.deck.length];
    SHAPES[name](b);
    const {zone} = state;
    // Right to left, the shapes read the other way too (a card's lines start on the right); the mark stays.
    const flip = name === 'mark' ? 1 : zone.flip;
    state.atoms = b.nodes.map((node, i) => {
      const tx = zone.x + node.x * flip * zone.s, ty = zone.y + node.y * zone.s;
      return {
        tx, ty, r: node.r,
        sx: tx + (random() - 0.5) * zone.s * 1.4, sy: -16 - random() * h * 0.35,
        delay: (i / b.nodes.length) * 1.3 + random() * 0.35,
        kind: random() < 0.6 ? 0 : random() < 0.5 ? 1 : 2,
        colour: random() < 0.62 ? 0 : random() < 0.6 ? 1 : 2,
        fall: 0.5 + random() * 0.6, phase: random() * 6,
        ox: 0, oy: 0, vx: 0, vy: 0,
      };
    });
    state.edges = b.edges;
    state.cycle = k;
  },
  click(env, x, y) {
    for (const a of env.state.atoms) {
      const dx = a.tx + a.ox - x, dy = a.ty + a.oy - y, d = Math.hypot(dx, dy) + 1;
      if (d < env.state.reach) { const f = (1 - d / env.state.reach) * 9; a.vx += dx / d * f; a.vy += dy / d * f; }
    }
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme} = env;
    const k = values.intensity / 100 * state.zone.soft;
    const dt = state.last === null ? 0 : Math.min(0.05, Math.max(0, t - state.last));
    state.last = t;
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    const base = scheme === 'light' ? 0.82 : 0.86;
    // Loose atoms behind, drifting down slowly.
    for (const d of state.drift) {
      const y = (d.y + t * d.v) % (h + 20) - 10, x = d.x + Math.sin(t * 0.3 + d.p) * 6;
      ctx.fillStyle = rgba(tones.atoms[d.c], 0.22 * k);
      ctx.beginPath(); ctx.arc(x, y, d.r, 0, Math.PI * 2); ctx.fill();
    }
    // Where the cycle is: a still frame is the first shape, whole.
    const time = env.still ? 6 : t;
    const cycle = Math.floor(time / CYCLE), c = time - cycle * CYCLE;
    if (cycle !== state.cycle) SCENE.gather(env, cycle);
    const unit = Math.max(2.4, state.zone.s * 0.042);
    const springs = Math.pow(0.86, dt * 60);
    const places = state.atoms.map((a) => {
      // The push from a click springs back.
      a.vx += -a.ox * 0.08 * dt * 60; a.vy += -a.oy * 0.08 * dt * 60;
      a.vx *= springs; a.vy *= springs;
      a.ox += a.vx * dt * 60; a.oy += a.vy * dt * 60;
      const p = clamp((c - a.delay) / 1.5, 0, 1);
      let x = mix(a.sx, a.tx, outCubic(p)), y = mix(a.sy, a.ty, outBack(p)), alpha = smooth(clamp(p * 3, 0, 1));
      // Holding: a slow breath; letting go: a drop with a fade.
      const breathe = Math.sin(time * 1.3 + a.phase) * unit * 0.25;
      y += breathe * smooth(clamp((c - 4) / 1, 0, 1));
      const g = clamp(c - 8.3 - a.delay * 0.4, 0, 3);
      y += g * g * h * 0.12 * a.fall;
      alpha *= 1 - smooth(clamp(g / 1.4, 0, 1));
      // The snap: an atom swells a little as it lands.
      const land = clamp((c - a.delay - 1.1) / 0.5, 0, 1);
      const swell = 1 + 0.35 * Math.sin(land * Math.PI);
      return {x: x + a.ox, y: y + a.oy, alpha, size: unit * a.r * swell};
    });
    // Lines draw themselves one after another, then fade before the atoms drop.
    const E = state.edges.length;
    ctx.lineWidth = Math.max(1, unit * 0.32);
    ctx.lineCap = 'round';
    state.edges.forEach(([i, j], e) => {
      const grow = clamp((c - 2.6 - (e / Math.max(1, E)) * 1.4) / 0.45, 0, 1);
      const fade = 1 - smooth(clamp((c - 7.9) / 0.6, 0, 1));
      if (grow <= 0 || fade <= 0) return;
      const a = places[i], b = places[j];
      ctx.strokeStyle = rgba(tones.line, 0.55 * k * fade);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mix(a.x, b.x, grow), mix(a.y, b.y, grow)); ctx.stroke();
    });
    state.atoms.forEach((a, i) => {
      const p = places[i];
      if (p.alpha <= 0.01) return;
      ctx.fillStyle = rgba(tones.atoms[a.colour], base * k * p.alpha);
      ctx.beginPath();
      if (a.kind === 0) ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      else if (a.kind === 1) ctx.roundRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2, p.size * 0.45);
      else { ctx.moveTo(p.x, p.y - p.size * 1.25); ctx.lineTo(p.x + p.size * 1.25, p.y); ctx.lineTo(p.x, p.y + p.size * 1.25); ctx.lineTo(p.x - p.size * 1.25, p.y); ctx.closePath(); }
      ctx.fill();
    });
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
