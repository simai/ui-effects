// Contents tree (simai.effect 1.1.0; schemes light and dark): a thin table-of-contents tree, as in
// documentation navigation, rests on the right of the area; its branches slowly open and close.
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

// The tree's geometry: row pitch, indent per level, the column's width and the slide of a branch.
const ROW = 26, INDENT = 18, COL = 232, GAP = 56, DUR = 1.1, PERIOD = 1.7;

// A node's openness at time t: a smooth slide from where it was to where it is going.
const openness = (node, t) => node.o0 + (node.o1 - node.o0) * smooth(clamp((t - node.t0) / DUR, 0, 1));
const setOpen = (node, open, t) => {
  if (!node.kids.length || (node.o1 === 1) === open) return;
  node.o0 = openness(node, t);
  node.o1 = open ? 1 : 0;
  node.t0 = t;
};

// One branch of the tree: a short bar for the section's title, children down to the depth asked.
function grow(random, level, depth, parent) {
  const node = {level, parent, len: (level ? 44 : 64) + random() * (level ? 92 - level * 10 : 84), kids: [], o0: 0, o1: 0, t0: -9};
  if (level < depth - 1 && random() < (level ? 0.62 : 0.9)) {
    const n = 2 + Math.floor(random() * (level ? 3 : 4));
    for (let i = 0; i < n; i += 1) node.kids.push(grow(random, level + 1, depth, node));
  }
  return node;
}

// Rows a column shows once every slide has settled.
const settledRows = (nodes) => nodes.reduce((sum, node) => sum + 1 + (node.o1 ? settledRows(node.kids) : 0), 0);
// Every branch whose own row is visible, open or closed as asked.
const branches = (nodes, open, out = []) => {
  for (const node of nodes) {
    if (!node.kids.length) continue;
    if ((node.o1 === 1) === open) out.push(node);
    if (node.o1) branches(node.kids, open, out);
  }
  return out;
};
const onPath = (node, leaf) => { for (let n = leaf; n; n = n.parent) if (n === node) return true; return false; };

// The tree breathes: a branch opens when the column runs short of rows, one closes when it overflows.
function breathe(env, column, k, t) {
  const {state} = env;
  const fill = settledRows(column.roots);
  const open = fill < column.target * (0.78 + 0.2 * hash2(k, 71));
  const pool = branches(column.roots, !open).filter((node) => !onPath(node, state.hover));
  if (!pool.length) return;
  const node = pool[Math.floor(hash2(k, column.seed) * pool.length)];
  setOpen(node, open, t);
  if (open) column.spy = node.kids[Math.floor(hash2(k, 5) * node.kids.length)];
}

// Lays out the visible rows of a column: each row's height and alpha are its ancestors' openness.
function layout(env, column, t) {
  const rows = [];
  let y = column.top;
  const walk = (nodes, v, x) => {
    for (const node of nodes) {
      if (v < 0.004) return;
      const row = {node, x, y: y + (ROW * v) / 2, v, o: node.kids.length ? openness(node, t) : 0, column, first: rows.length};
      rows.push(row);
      y += ROW * v;
      if (row.o > 0.004) {
        const start = rows.length;
        walk(node.kids, v * row.o, x + INDENT);
        row.kids = rows.slice(start).filter((r) => r.node.parent === node);
      }
    }
  };
  walk(column.roots, 1, column.x);
  return rows;
}

function roundBar(ctx, x, y, w, h) {
  const r = h / 2;
  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x + w - r, y - r);
  ctx.arc(x + w - r, y, r, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x + r, y + r);
  ctx.arc(x + r, y, r, Math.PI / 2, Math.PI * 1.5);
}

const SCENE = {
  home: 'light', seed: 523, reseed: ['depth'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), bar: read('--sf-neutral-80', '#c6c6cf'), head: read('--sf-neutral-70', '#aaabb4'),
      ink: read('--sf-neutral-60', '#8f9099'), accent: read('--sf-primary-50', '#2a74de'), soft: read('--sf-primary-90', '#d7e3ff')}
    : {ground: read('--sf-neutral-5', '#111318'), low: read('--sf-neutral-10', '#1a1b20'), bar: read('--sf-neutral-30', '#45464f'), head: read('--sf-neutral-40', '#5d5e66'),
      ink: read('--sf-neutral-50', '#76777f'), accent: read('--sf-primary-80', '#acc7ff'), soft: read('--sf-primary-30', '#00458f')},
  setup(env, random) {
    const {w, h} = env;
    const depth = clamp(Math.round(env.values.depth ?? 3), 2, 4);
    // Columns tile from the right edge; the text side keeps the left of the area.
    const count = w < 560 ? 1 : clamp(Math.floor((w * 0.5 + GAP) / (COL + GAP)), 1, 3);
    const top = h < 240 ? 16 : clamp(h * 0.09, 24, 64);
    const columns = Array.from({length: count}, (_, i) => {
      const x = w < 560 ? Math.max(14, w - COL - 8) : w - (COL + GAP) * (i + 1) + GAP * 0.4;
      const target = Math.max(4, Math.floor((h - top - 28) / ROW));
      const roots = Array.from({length: Math.max(3, Math.ceil(target / 3))}, () => grow(random, 0, depth, null));
      const column = {x, top: top + 22, target: target - 1, roots, seed: 11 + i * 17, spy: null,
        fade: count === 1 ? 1 : clamp(0.55 + (x / w - 0.35) * 1.4, 0.45, 1)};
      // Open branches at random until the column is about full, all settled.
      for (let guard = 0; guard < 40 && settledRows(roots) < column.target * 0.85; guard += 1) {
        const pool = branches(roots, false);
        if (!pool.length) break;
        const node = pool[Math.floor(random() * pool.length)];
        node.o0 = node.o1 = 1;
      }
      const open = branches(roots, true);
      column.spy = open.length ? open[Math.floor(random() * open.length)].kids[0] : roots[1];
      return column;
    });
    return {columns, k: null, hover: null, rows: []};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    env.time = t;
    const k = values.intensity / 100;
    const light = scheme === 'light';
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.85)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Seeded breaths on a fixed beat: the same sequence however the frames fall.
    const beat = Math.floor(t / PERIOD);
    if (state.k === null || beat - state.k > 4) state.k = beat;
    for (; state.k < beat; state.k += 1) state.columns.forEach((column) => breathe(env, column, state.k + 1, t));
    const rows = [];
    for (const column of state.columns) rows.push(...layout(env, column, t));
    state.rows = rows;
    // The item nearest the pointer, and its path to the root.
    let hover = null;
    if (pointer.on) {
      const px = pointer.x * w, py = pointer.y * h;
      let best = 150 * 150;
      for (const row of rows) {
        if (row.v < 0.6) continue;
        const dx = Math.max(0, row.x - 6 - px, px - (row.x + 14 + row.node.len)), dy = row.y - py;
        const d = dx * dx + dy * dy * 2;
        if (d < best) { best = d; hover = row.node; }
      }
    }
    // Its branch opens once, when the pointer comes to it; a click may close it again.
    if (hover && hover !== state.hover) setOpen(hover, true, t);
    state.hover = hover;
    const lit = new Set();
    const mark = hover ?? null;
    for (let n = mark; n; n = n.parent) lit.add(n);
    const spies = new Set([state.columns[0].spy]);
    const fadeAt = (y) => clamp((h - 10 - y) / 70, 0, 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h - 14);
    ctx.clip();
    ctx.lineCap = 'round';
    // A faint rail at the left of each column and a heading bar, as on a documentation page.
    for (const column of state.columns) {
      const a = column.fade * k;
      ctx.strokeStyle = rgba(tones.bar, (light ? 0.7 : 0.8) * a);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(column.x - 14) + 0.5, column.top - 8);
      ctx.lineTo(Math.round(column.x - 14) + 0.5, h - 24);
      ctx.stroke();
      ctx.fillStyle = rgba(tones.ink, (light ? 0.5 : 0.6) * a);
      ctx.beginPath();
      roundBar(ctx, column.x, column.top - 24, 58, 5);
      ctx.fill();
    }
    for (const row of rows) {
      const {node, x, y, v, column} = row;
      const a = smooth(clamp(v * 1.4 - 0.25, 0, 1)) * column.fade * k * fadeAt(y);
      if (a < 0.01) continue;
      const on = lit.has(node), here = node === mark, spy = !mark && spies.has(node);
      // Elbow connectors from a branch's chevron to each child.
      if (row.kids?.length && row.o > 0.01) {
        const last = row.kids[row.kids.length - 1];
        const cx = Math.round(x + 4) + 0.5;
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(tones.bar, (light ? 0.9 : 1) * a * row.o);
        ctx.beginPath();
        ctx.moveTo(cx, y + 7);
        ctx.lineTo(cx, last.y - 5);
        ctx.quadraticCurveTo(cx, last.y, cx + 5, last.y);
        ctx.lineTo(last.x - 4, last.y);
        for (const kid of row.kids) if (kid !== last) { ctx.moveTo(cx, kid.y); ctx.lineTo(kid.x - 4, kid.y); }
        ctx.stroke();
        const lead = row.kids.find((kid) => lit.has(kid.node));
        if (lead) {
          ctx.strokeStyle = rgba(tones.accent, 0.7 * a * row.o);
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(cx, y + 7);
          if (lead === last) { ctx.lineTo(cx, lead.y - 5); ctx.quadraticCurveTo(cx, lead.y, cx + 5, lead.y); } else { ctx.lineTo(cx, lead.y); }
          ctx.lineTo(lead.x - 4, lead.y);
          ctx.stroke();
        }
      }
      if (here || spy) {
        ctx.fillStyle = rgba(tones.soft, (here ? (light ? 0.7 : 0.55) : light ? 0.45 : 0.35) * a);
        ctx.beginPath();
        roundBar(ctx, x - 8, y, node.len + 30, ROW - 8);
        ctx.fill();
        ctx.fillStyle = rgba(tones.accent, (here ? 0.85 : 0.5) * a);
        ctx.fillRect(column.x - 15, y - 7, 2, 14);
      }
      const ink = on || spy ? tones.accent : node.level ? tones.bar : tones.head;
      const strength = on ? (here ? 0.85 : 0.6) : spy ? 0.5 : light ? 0.95 : 1;
      // The marker: a chevron that turns as the branch opens, or a dot for a leaf.
      ctx.strokeStyle = ctx.fillStyle = rgba(on || spy ? tones.accent : tones.ink, (on ? 0.8 : light ? 0.6 : 0.7) * a);
      if (node.kids.length) {
        const turn = (row.o - 1) * Math.PI / 2, c = Math.cos(turn), s = Math.sin(turn);
        const pt = (u, q) => [x + 4 + u * c - q * s, y + u * s + q * c];
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(...pt(-3.2, -1.6));
        ctx.lineTo(...pt(0, 1.6));
        ctx.lineTo(...pt(3.2, -1.6));
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(x + 4, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba(ink, strength * a);
      ctx.beginPath();
      roundBar(ctx, x + 14, y, node.len, node.level ? 5 : 6.5);
      ctx.fill();
    }
    ctx.restore();
  },
  // A click toggles the nearest branch: the item's own, or the one it sits in.
  click(env, x, y) {
    const {state} = env;
    let best = Infinity, row = null;
    for (const r of state.rows) {
      if (r.v < 0.6) continue;
      const d = Math.max(0, r.x - 6 - x, x - (r.x + 14 + r.node.len)) ** 2 + (r.y - y) ** 2 * 2;
      if (d < best) { best = d; row = r; }
    }
    if (!row || best > 200 * 200) return;
    const node = row.node.kids.length ? row.node : row.node.parent;
    if (!node) return;
    const t = env.time ?? 0;
    setOpen(node, node.o1 !== 1, t);
  },
  start: 6,
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
