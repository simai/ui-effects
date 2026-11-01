// Assembly (simai.effect 1.1.0; schemes dark and light): atoms fall, join with lines into an
// interface part or a picture that comes alive for a moment, then flow into the next shape.
//
// The lifecycle is the catalogue template's (one canvas, ratio capped at 2, a seeded scene, a still
// frame for reduced motion, no frames off screen); colours are theme tones read through a probe.

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
// Atoms in a box from -1 to 1 (y down) with a size and a part, and the lines between them.
function builder() {
  const b = {nodes: [], edges: [], part: ''};
  b.add = (x, y, r = 1) => b.nodes.push({x, y, r, part: b.part}) - 1;
  b.path = (points, closed, r) => {
    const ids = points.map(([x, y]) => b.add(x, y, r));
    ids.forEach((id, i) => { if (i) b.edges.push([ids[i - 1], id]); });
    if (closed) b.edges.push([ids[ids.length - 1], ids[0]]);
    return ids;
  };
  b.rect = (x0, y0, x1, y1, r) => b.path([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, r);
  b.ring = (cx, cy, radius, n, r) => b.path(Array.from({length: n}, (_, i) => [cx + radius * Math.sin(i / n * 6.2832), cy - radius * Math.cos(i / n * 6.2832)]), true, r);
  return b;
}
const SHAPES = {
  button(b) { b.rect(-0.9, -0.3, 0.9, 0.3); b.ring(-0.55, 0, 0.13, 5, 0.7); b.path([[-0.25, 0], [0.15, 0], [0.6, 0]], 0, 0.6); },
  toggle(b) { b.path([[-0.5, -0.32], [0.5, -0.32], [0.82, 0], [0.5, 0.32], [-0.5, 0.32], [-0.82, 0]], 1); b.part = 'knob'; b.ring(0.48, 0, 0.2, 6, 1.3); },
  field(b) { b.path([[-1, -0.5], [-0.45, -0.5]], 0, 0.6); b.rect(-1, -0.25, 1, 0.25); b.path([[0.62, -0.05], [0.72, 0.06], [0.82, -0.05]], 0, 0.6); b.part = 'cursor'; b.path([[-0.82, -0.12], [-0.82, 0.12]], 0, 0.6); },
  card(b) {
    b.rect(-0.7, -0.92, 0.7, 0.92); b.rect(-0.55, -0.77, 0.55, 0.05, 0.8);
    b.path([[-0.55, -0.05], [-0.2, -0.45], [0.05, -0.2], [0.25, -0.38], [0.55, -0.02]], 0, 0.6);
    b.path([[-0.55, 0.32], [0.4, 0.32]], 0, 0.7); b.path([[-0.55, 0.55], [0.1, 0.55]], 0, 0.6); b.rect(-0.55, 0.68, -0.05, 0.82, 0.7);
    b.part = 'sun'; b.add(0.3, -0.6, 1.3);
  },
  chart(b) {
    b.path([[-0.95, -0.85], [-0.95, 0.8], [0.95, 0.8]], 0, 0.7);
    b.part = 'bar';
    const peaks = [0.3, -0.1, 0.1, -0.45, -0.7].map((top, i) => b.path([[-0.65 + i * 0.35, 0.8], [-0.65 + i * 0.35, top]])[1]);
    peaks.forEach((id, i) => { if (i) b.edges.push([peaks[i - 1], id]); });
  },
  form(b) {
    b.path([[-0.8, -0.95], [-0.3, -0.95]], 0, 0.6); b.rect(-0.8, -0.78, 0.8, -0.42);
    b.path([[-0.8, -0.2], [-0.4, -0.2]], 0, 0.6); b.rect(-0.8, -0.03, 0.8, 0.33);
    b.part = 'submit'; b.rect(-0.8, 0.55, 0.05, 0.88, 1.2);
  },
  page(b) {
    b.rect(-1, -0.78, 1, 0.78); b.add(-0.84, -0.6, 1.5); b.path([[0.3, -0.6], [0.5, -0.6], [0.7, -0.6], [0.88, -0.6]], 0, 0.55);
    b.part = 'rows'; b.path([[-0.85, -0.3], [0.2, -0.3]], 0, 0.8);
    for (const x of [-0.85, -0.25, 0.35]) b.rect(x, -0.08, x + 0.5, 0.62, 0.8);
  },
  profile(b) { b.path([[-0.72, 0.8], [-0.52, 0.28], [0, 0.12], [0.52, 0.28], [0.72, 0.8]]); b.add(0.62, -0.62, 1.3); b.part = 'head'; b.ring(0, -0.38, 0.34, 8); },
  house(b) { b.path([[-0.7, 0.8], [-0.7, -0.1], [0, -0.78], [0.7, -0.1], [0.7, 0.8]], 1); b.rect(-0.16, 0.32, 0.16, 0.8, 0.8); b.rect(0.24, 0.02, 0.5, 0.26, 0.7); b.path([[0.32, -0.42], [0.32, -0.72], [0.5, -0.72], [0.5, -0.25]], 0, 0.6); },
  tree(b) { for (const [y, w, base] of [[-0.95, 0.42, -0.4], [-0.6, 0.62, 0.15], [-0.2, 0.8, 0.6]]) b.path([[0, y], [-w, base], [w, base]], 1); b.rect(-0.12, 0.6, 0.12, 0.92, 0.8); },
  rocket(b) {
    b.path([[0, -0.95], [0.28, -0.5], [0.28, 0.45], [-0.28, 0.45], [-0.28, -0.5]], 1);
    for (const s of [-1, 1]) b.path([[0.28 * s, 0.1], [0.58 * s, 0.65], [0.28 * s, 0.45]], 0, 0.8);
    b.ring(0, -0.2, 0.13, 6, 0.6); b.part = 'flame'; b.path([[-0.14, 0.6], [0, 0.95], [0.14, 0.6]], 0, 0.7);
  },
  bulb(b) { b.ring(0, -0.3, 0.52, 11); b.rect(-0.24, 0.32, 0.24, 0.72, 0.8); b.path([[-0.16, 0.86], [0.16, 0.86]], 0, 0.6); b.path([[-0.16, 0.25], [-0.08, -0.25], [0.08, -0.25], [0.16, 0.25]], 0, 0.6); },
  boat(b) { b.path([[-0.9, 0.3], [0.9, 0.3], [0.6, 0.72], [-0.6, 0.72]], 1); b.path([[0, 0.3], [0, -0.92]], 0, 0.8); b.path([[0, -0.85], [0.66, 0.16], [0, 0.16]], 1, 0.8); b.path([[-0.08, -0.75], [-0.6, 0.16], [-0.08, 0.16]], 1, 0.7); },
  heart(b) { const side = [[0.3, -0.8], [0.66, -0.74], [0.88, -0.42], [0.8, -0.02], [0.44, 0.42]]; b.path([[0, -0.5], ...side, [0, 0.86], ...side.map(([x, y]) => [-x, y]).reverse()], 1); },
  cat(b) {
    b.ring(0, 0.12, 0.62, 10);
    for (const s of [-1, 1]) { b.part = `ear${s}`; b.path([[0.5 * s, -0.24], [0.5 * s, -0.85], [0.12 * s, -0.5]], 0, 0.8); }
    b.part = 'eye'; b.add(-0.24, 0.02, 1.4); b.add(0.24, 0.02, 1.4);
    b.part = ''; b.path([[-0.1, 0.3], [0, 0.38], [0.1, 0.3]], 0, 0.5);
  },
  star(b) { b.path(Array.from({length: 10}, (_, i) => { const a = i / 10 * 6.2832, r = i % 2 ? 0.4 : 0.95; return [r * Math.sin(a), 0.08 - r * Math.cos(a)]; }), 1); },
  // The SIMAI mark: the logo's two chevrons in a rounded square.
  mark(b) {
    const at = ([x, y]) => [(x - 93) / 72, (y - 93) / 72];
    b.part = 'left'; b.path([[27, 93], [76.81, 43], [93, 59.25], [59.37, 93], [93, 126.75], [76.81, 143]].map(at), 1, 1.1);
    b.part = 'right'; b.path([[159, 93], [109.19, 43], [93, 59.25], [126.63, 93], [93, 126.75], [109.19, 143]].map(at), 1, 1.1);
    b.part = ''; b.rect(-1.22, -1.22, 1.22, 1.22, 0.6);
  },
};

// --- Coming alive ----------------------------------------------------------------------------------
// Once whole, a shape does one short thing that shows it works: g runs 0 to 1, ending where it
// began, and an atom maps to [x, y, size, opacity] in the box.
const beats = (g, n) => Math.sin(Math.PI * ((g * n) % 1)) ** 4;
const away = (g) => smooth(clamp(g / 0.25, 0, 1)) * (1 - smooth(clamp((g - 0.7) / 0.25, 0, 1)));
const once = (g, from, length) => Math.sin(Math.PI * clamp((g - from) / length, 0, 1));
const sway = (g, n) => Math.sin(g * Math.PI * n) * Math.sin(Math.PI * g);
const turn = (n, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return [cx + (n.x - cx) * c - (n.y - cy) * s, cy + (n.x - cx) * s + (n.y - cy) * c, 1, 1]; };
const rest = (n) => [n.x, n.y, 1, 1];
const grow = (n, cx, cy, k) => [cx + (n.x - cx) * k, cy + (n.y - cy) * k, 1, 1];
const LIVE = {
  button: (n, g) => grow(n, 0, 0, 1 - 0.07 * beats(g, 2)),
  toggle: (n, g) => [n.x - (n.part === 'knob') * 0.96 * away(g), n.y, 1, 1],
  field: (n, g) => (n.part === 'cursor' ? [n.x + 1.4 * smooth(clamp(g / 0.75, 0, 1)) * (1 - smooth(clamp((g - 0.8) / 0.2, 0, 1))), n.y, 1, (g * 6) % 1 < 0.6 ? 1 : 0.2] : rest(n)),
  card: (n, g) => (n.part === 'sun' ? [n.x, n.y - 0.2 * away(g), 1 + 0.25 * away(g), 1] : rest(n)),
  chart: (n, g) => [n.x, n.part === 'bar' && n.y < 0.79 ? 0.8 + (n.y - 0.8) * (1 - 0.8 * once(g * 1.5, (n.x + 0.65) / 3.5, 1)) : n.y, 1, 1],
  form: (n, g) => (n.part === 'submit' ? grow(n, -0.375, 0.715, 1 - 0.1 * beats(g, 2)) : rest(n)),
  page: (n, g) => [n.x, n.y - (n.part === 'rows') * 0.12 * away(g), 1, 1],
  profile: (n, g) => [n.x, n.y + (n.part === 'head') * 0.08 * sway(g, 4), 1, 1],
  tree: (n, g) => [n.x + 0.08 * sway(g, 3) * clamp((0.7 - n.y) / 1.6, 0, 1), n.y, 1, 1],
  rocket: (n, g) => [n.x, n.y - 0.14 * away(g) + (n.part === 'flame' && n.y > 0.9) * 0.14 * Math.abs(Math.sin(g * 41)) * away(g), 1, 1],
  boat: (n, g) => turn(n, 0, 0.6, 0.12 * sway(g, 3)),
  heart: (n, g) => grow(n, 0, 0, 1 + 0.13 * beats(g, 2)),
  cat: (n, g) => (n.part === 'ear-1' ? turn(n, -0.5, -0.24, -0.25 * once(g, 0.05, 0.25))
    : n.part === 'ear1' ? turn(n, 0.5, -0.24, 0.25 * once(g, 0.3, 0.25))
      : [n.x, n.y, n.part === 'eye' ? 1 - 0.75 * once(g, 0.72, 0.16) : 1, 1]),
  star: (n, g) => turn({x: n.x * (1 + 0.14 * away(g)), y: 0.08 + (n.y - 0.08) * (1 + 0.14 * away(g))}, 0, 0.08, 0.5 * smooth(g)),
  mark: (n, g) => [n.x + ((n.part === 'right') - (n.part === 'left')) * 0.1 * beats(g, 2), n.y, 1, 1],
};
// Besides moving atoms: the house lights its window and smokes, the bulb and the star glow.
function halo(ctx, [x, y], radius, tone, alpha) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, rgba(tone, alpha));
  glow.addColorStop(1, rgba(tone, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}
const EXTRA = {
  house(ctx, g, at, unit, tones, k) {
    const [x0, y0] = at(0.24, 0.02), [x1, y1] = at(0.5, 0.26);
    ctx.fillStyle = rgba(tones.atoms[1], 0.3 * k * away(g));
    ctx.fillRect(Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0);
    for (let j = 0; j < 3; j += 1) {
      const q = clamp(g * 1.4 - j * 0.22, 0, 1), [x, y] = at(0.41 + 0.08 * Math.sin(q * 6), -0.8 - q * 0.6);
      ctx.fillStyle = rgba(tones.line, 0.45 * k * Math.sin(Math.PI * q));
      ctx.beginPath(); ctx.arc(x, y, unit * (0.6 + q * 1.2), 0, 6.2832); ctx.fill();
    }
  },
  bulb: (ctx, g, at, unit, tones, k, s) => halo(ctx, at(0, -0.3), s * 0.95, tones.atoms[0], 0.22 * k * away(g)),
  star: (ctx, g, at, unit, tones, k, s) => halo(ctx, at(0, 0.08), s * 0.8, tones.atoms[1], 0.18 * k * away(g)),
};

// A seeded order: a picture after every two interface parts, the mark every seventh, and a card
// (a house for pictures alone) first, as the still frame.
const INTERFACE = ['card', 'button', 'chart', 'toggle', 'form', 'field', 'page', 'profile'];
const OBJECTS = ['house', 'tree', 'rocket', 'bulb', 'boat', 'heart', 'cat', 'star'];
const shuffle = (list, random) => { const out = [...list]; for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
function deckFor(set, random) {
  const deck = [];
  for (let round = 0; round < 6; round += 1) {
    const ui = shuffle(INTERFACE, random), live = shuffle(OBJECTS, random);
    if (set === 'interface') deck.push(...ui);
    else if (set === 'objects') deck.push(...live);
    else ui.forEach((name, i) => deck.push(name, ...(i % 2 ? [live[i >> 1]] : [])));
  }
  const first = set === 'objects' ? 'house' : 'card';
  deck.splice(deck.indexOf(first), 1);
  deck.unshift(first);
  return deck.map((name, i) => (i % 7 === 6 && set !== 'objects' ? 'mark' : name));
}

// --- The scene -----------------------------------------------------------------------------------
// One shape at a time, right of a wide area's heading or small in a tall area's top corner (on the
// left, mirrored, right to left). Atoms fall in and click into place, lines draw, the shape comes
// alive and breathes; then the same atoms glide into the next shape, spare ones dropping away.
const CYCLE = 9;
const TRAVEL = 1.3;
const SCENE = {
  home: 'light', seed: 41, reseed: ['shapes', 'size'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), atoms: [read('--sf-primary-40', '#005bbe'), read('--sf-tertiary-50', '#9a64a3'), read('--sf-secondary-50', '#717786')], line: read('--sf-neutral-variant-50', '#76777c')}
    : {ground: read('--sf-neutral-5', '#111318'), atoms: [read('--sf-primary-80', '#acc7ff'), read('--sf-tertiary-80', '#e9b4f2'), read('--sf-secondary-80', '#c1c6d7')], line: read('--sf-neutral-variant-60', '#8f9099')},
  setup(env, random) {
    const {w, h} = env, wide = w > h * 1.15, view = env.ctx.canvas;
    const zone = wide ? {x: w * 0.72, y: h * 0.52, s: Math.min(w * 0.2, h * 0.34), soft: 1} : {x: w * 0.76, y: h * 0.17, s: Math.min(w * 0.18, h * 0.13), soft: 0.7};
    zone.flip = view.ownerDocument.defaultView.getComputedStyle(view).direction === 'rtl' ? -1 : 1;
    if (zone.flip < 0) zone.x = w - zone.x;
    zone.s *= env.values.size / 100;
    return {zone, deck: deckFor(env.values.shapes, random), cycle: -1, atoms: [], leaving: [], reach: zone.s * 0.9, lean: 0, last: null};
  },
  shape(env, k) {
    const {zone, deck} = env.state, b = builder(), name = deck[k % deck.length];
    SHAPES[name](b);
    const flip = name === 'mark' ? 1 : zone.flip, random = rng(1000 + k * 7919 + ({objects: 3, interface: 5}[env.values.shapes] ?? 0));
    const colour = () => (random() < 0.62 ? 0 : random() < 0.6 ? 1 : 2);
    return {name, flip, random, edges: b.edges, nodes: b.nodes.map((n) => ({...n, tx: zone.x + n.x * flip * zone.s, ty: zone.y + n.y * zone.s, colour: colour(), ox: 0, oy: 0, vx: 0, vy: 0}))};
  },
  // Each atom takes the nearest one of shape k-1, with its colour and push; the rest fall in.
  gather(env, k) {
    const {state, h} = env, shape = SCENE.shape(env, k), {random} = shape;
    const before = k < 1 ? [] : state.cycle === k - 1 ? state.atoms : SCENE.shape(env, k - 1).nodes;
    const free = new Set(before.keys());
    state.atoms = shape.nodes.map((n) => ({...n, delay: random() * 0.3, fall: 0.5 + random() * 0.6, phase: random() * 6}));
    for (const i of shuffle([...state.atoms.keys()], random)) {
      const a = state.atoms[i];
      let best = -1, near = Infinity;
      for (const j of free) { const d = Math.hypot(before[j].tx - a.tx, before[j].ty - a.ty); if (d < near) { near = d; best = j; } }
      const from = before[best];
      if (from) { free.delete(best); Object.assign(a, {fx: from.tx, fy: from.ty, fr: from.r, colour: from.colour, ox: from.ox, oy: from.oy, vx: from.vx, vy: from.vy}); } else Object.assign(a, {fresh: true, fx: a.tx + (random() - 0.5) * state.zone.s * 1.4, fy: -16 - random() * h * 0.35, fr: a.r});
      a.delay += i / state.atoms.length;
    }
    state.leaving = [...free].map((j) => ({...before[j], delay: random() * 0.5, fall: 0.5 + random() * 0.6}));
    Object.assign(state, {edges: shape.edges, name: shape.name, flip: shape.flip, cycle: k});
  },
  click(env, x, y) {
    for (const a of env.state.atoms) {
      const dx = a.tx + a.ox - x, dy = a.ty + a.oy - y, d = Math.hypot(dx, dy) + 1;
      if (d < env.state.reach) { const f = (1 - d / env.state.reach) * 9; a.vx += dx / d * f; a.vy += dy / d * f; }
    }
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, pointer} = env, {zone} = state;
    const k = values.intensity / 100 * zone.soft, base = env.scheme === 'light' ? 0.82 : 0.86;
    const dt = state.last === null ? 0 : clamp(t - state.last, 0, 0.05);
    state.last = t;
    const dot = (tone, alpha, x, y, r, ring) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      if (ring) { ctx.strokeStyle = rgba(tone, alpha); ctx.stroke(); } else { ctx.fillStyle = rgba(tone, alpha); ctx.fill(); }
    };
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    // A still frame is the first shape, whole and at rest.
    const time = env.still ? 6 : t, cycle = Math.floor(time / CYCLE), c = time - cycle * CYCLE;
    if (cycle !== state.cycle) SCENE.gather(env, cycle);
    const unit = Math.max(2.4, zone.s * 0.042), springs = 0.86 ** (dt * 60);
    const g = clamp((c - 3.4) / 1.6, 0, 1), live = env.still ? null : LIVE[state.name];
    const breath = unit * 0.25 * smooth(clamp((c - 5) / 0.6, 0, 1)) * (1 - smooth(clamp((c - 7.6) / 0.8, 0, 1)));
    state.lean += ((pointer.on && !env.still) - state.lean) * Math.min(1, dt * 4);
    const at = (x, y) => [zone.x + x * state.flip * zone.s, zone.y + y * zone.s];
    for (const a of state.leaving) {
      const fall = clamp(c - a.delay, 0, 3);
      dot(tones.atoms[a.colour], base * k * (1 - smooth(clamp(fall / 1.2, 0, 1))), a.tx + a.ox, a.ty + a.oy + fall * fall * h * 0.12 * a.fall, unit * a.r);
    }
    ctx.lineWidth = Math.max(1, unit * 0.22);
    const places = state.atoms.map((a) => {
      a.vx = (a.vx - a.ox * 0.08 * dt * 60) * springs; a.vy = (a.vy - a.oy * 0.08 * dt * 60) * springs;
      a.ox += a.vx * dt * 60; a.oy += a.vy * dt * 60;
      const [lx, ly, size, shown] = live ? live(a, g) : [a.x, a.y, 1, 1], [tx, ty] = at(lx, ly);
      const p = clamp((c - a.delay) / TRAVEL, 0, 1), q = smooth(p);
      // Fresh atoms fall and overshoot a little; the others glide on a low arc.
      let x = a.ox + mix(a.fx, tx, a.fresh ? outCubic(p) : q);
      let y = a.oy + (a.fresh ? mix(a.fy, ty, outBack(p)) : mix(a.fy, ty, q) - Math.sin(Math.PI * p) * zone.s * 0.12) + Math.sin(time * 1.3 + a.phase) * breath;
      const f = state.lean * Math.max(0, 1 - Math.hypot(pointer.x * w - x, pointer.y * h - y) / (zone.s * 1.6)) * 0.08;
      x += (pointer.x * w - x) * f; y += (pointer.y * h - y) * f;
      // Landing: a small swell and a ring that opens and fades.
      const land = (c - a.delay - TRAVEL * 0.85) / 0.5, snap = land > 0 && land < 1 && !env.still;
      const r = unit * mix(a.fr, a.r, p) * size * (snap ? 1 + 0.35 * Math.sin(land * Math.PI) : 1);
      if (snap) dot(tones.atoms[a.colour], 0.5 * k * (1 - land), x, y, r * (1.4 + 2.2 * land), true);
      return {x, y, r, alpha: (a.fresh ? smooth(clamp(p * 3, 0, 1)) : 1) * shown};
    });
    // Lines draw one after another and fade before the atoms move on.
    ctx.lineWidth = Math.max(1, unit * 0.32);
    ctx.lineCap = 'round';
    const fade = 1 - smooth(clamp((c - 7.8) / 0.6, 0, 1));
    state.edges.forEach(([i, j], e) => {
      const a = places[i], b = places[j], u = clamp((c - 1.5 - e / state.edges.length * 1.2) / 0.45, 0, 1);
      if (u <= 0 || fade <= 0) return;
      ctx.strokeStyle = rgba(tones.line, 0.55 * k * fade * Math.min(a.alpha, b.alpha, 1));
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mix(a.x, b.x, u), mix(a.y, b.y, u)); ctx.stroke();
    });
    if (live && g > 0 && g < 1) EXTRA[state.name]?.(ctx, g, at, unit, tones, k, zone.s);
    state.atoms.forEach((a, i) => dot(tones.atoms[a.colour], base * k * places[i].alpha, places[i].x, places[i].y, places[i].r));
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
  const env = {ctx, w: 1, h: 1, values: {...settings}, scheme: context.scheme ?? SCENE.home, tones: null, state: null, pointer: {x: 0.5, y: 0.5, on: false}, still: false};
  env.tones = readTones(host, env.scheme);
  env.still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  let paused = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let t = 0;

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
  // A click inside the area, read from the window inside the host's box, never from a link, a
  // button or a field over it.
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
    schedule();
  };
  const onUp = (event) => {
    if (!pressed) return;
    const box = host.getBoundingClientRect();
    const x = event.clientX - box.left, y = event.clientY - box.top;
    if (Math.hypot(x - pressed.x, y - pressed.y) < 6 && event.timeStamp - pressed.time < 400) SCENE.click(env, x, y);
    pressed = null;
    schedule();
  };
  const onCancel = () => { pressed = null; };
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

export const mount = mountScene;
