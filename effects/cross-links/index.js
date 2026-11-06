// Cross-links (simai.effect 1.1.0; schemes light and dark): pale page cards float across the area,
// and thin arcs draw themselves from a word on one page to a word on another, a living map of the
// links in a documentation site.
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

// A link's life in seconds: the arc grows, holds, then withdraws from its source and fades.
const GROW = 1.5, HOLD = 0.9, FADE = 1.4, LIFE = GROW + HOLD + FADE;
const WAVE_GROW = 0.8, WAVE_LIFE = 2.6, HOP = 0.5;

// The text zone: the left half between the top and bottom margins, where a hero's heading sits.
const inZone = (x, y, w, h) => w >= 560 && x < w * 0.52 && y > h * 0.08 && y < h * 0.92;

// A rounded rectangle as a path.
function rounded(path, x, y, w, h, r) {
  path.moveTo(x + r, y);
  path.arcTo(x + w, y, x + w, y + h, r);
  path.arcTo(x + w, y + h, x, y + h, r);
  path.arcTo(x, y + h, x, y, r);
  path.arcTo(x, y, x + w, y, r);
  path.closePath();
}

// One page: a card with a title bar and rows of word bars; every word is a possible link end.
function page(random, cw, ch) {
  const pad = cw * 0.1, inner = cw - pad * 2, bar = Math.max(2.5, cw * 0.028);
  const body = new Path2D();
  rounded(body, 0, 0, cw, ch, cw * 0.06);
  const title = new Path2D(), lines = new Path2D(), words = [];
  const ty = pad + cw * 0.02;
  title.moveTo(pad, ty);
  title.lineTo(pad + inner * (0.38 + random() * 0.3), ty);
  const step = cw * 0.078, gap = cw * 0.035;
  for (let y = ty + cw * 0.11; y < ch - pad * 0.8; y += step) {
    if (random() < 0.16) continue;
    const width = inner * (random() < 0.3 ? 0.35 + random() * 0.35 : 0.8 + random() * 0.2);
    for (let x = 0; x < width - cw * 0.04;) {
      const ww = Math.min(width - x, inner * (0.08 + random() * 0.18));
      lines.moveTo(pad + x, y);
      lines.lineTo(pad + x + ww, y);
      words.push({x: pad + x, y, w: ww});
      x += ww + gap;
    }
  }
  if (!words.length) { lines.moveTo(pad, ch / 2); lines.lineTo(pad + inner * 0.5, ch / 2); words.push({x: pad, y: ch / 2, w: inner * 0.5}); }
  return {body, title, lines, words, bar, titleBar: bar * 1.7};
}

// A cubic arc between two points, bowed upward by part of their distance.
function arc(ax, ay, bx, by, unit) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
  let nx = -dy / d, ny = dx / d;
  if (ny > 0) { nx = -nx; ny = -ny; }
  const off = Math.min(d * 0.3, unit * 0.9);
  return [ax, ay, ax + dx * 0.25 + nx * off, ay + dy * 0.25 + ny * off, ax + dx * 0.75 + nx * off, ay + dy * 0.75 + ny * off, bx, by];
}
const at = (p, s) => {
  const u = 1 - s, a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, e = s * s * s;
  return [a * p[0] + b * p[2] + c * p[4] + e * p[6], a * p[1] + b * p[3] + c * p[5] + e * p[7]];
};
// The stretch of the arc from s0 to s1, in short straight pieces.
function stroke(ctx, p, s0, s1) {
  if (s1 - s0 < 0.005) return;
  ctx.beginPath();
  const n = Math.max(2, Math.ceil((s1 - s0) * 36));
  for (let i = 0; i <= n; i += 1) {
    const [x, y] = at(p, s0 + ((s1 - s0) * i) / n);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

const SCENE = {
  home: 'light', seed: 523, reseed: ['pages'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), card: read('--sf-neutral-100', '#ffffff'),
      edge: read('--sf-neutral-80', '#c6c6d0'), bar: read('--sf-neutral-80', '#c6c6d0'), shade: read('--sf-neutral-40', '#5d5e66'),
      title: read('--sf-primary-80', '#acc7ff'), accent: read('--sf-primary-50', '#2a74de'), second: read('--sf-tertiary-50', '#8a6d8f')}
    : {ground: read('--sf-neutral-5', '#111318'), low: read('--sf-neutral-10', '#1a1b20'), card: read('--sf-neutral-20', '#2f3036'),
      edge: read('--sf-neutral-40', '#5d5e66'), bar: read('--sf-neutral-50', '#76777f'), shade: read('--sf-neutral-0', '#000000'),
      title: read('--sf-primary-40', '#005bbe'), accent: read('--sf-primary-80', '#acc7ff'), second: read('--sf-tertiary-80', '#ddbce0')},
  setup(env, random) {
    const {w, h} = env;
    const count = clamp(Math.round(env.values.pages ?? 7), 3, 12);
    const unit = clamp(Math.min(w * 0.13, h * 0.3), 84, 176) * (count > 8 ? 0.9 : 1);
    const cards = [];
    // Scattered placement: no two cards overlap, and the text zone takes few of them.
    for (let tries = 0; cards.length < count && tries < 900; tries += 1) {
      const cw = unit * (0.88 + random() * 0.3), ch = cw * (0.72 + random() * 0.18);
      const x = -cw * 0.15 + random() * (w - cw * 0.7), y = -ch * 0.12 + random() * (h - ch * 0.76);
      const zone = inZone(x + cw / 2, y + ch / 2, w, h);
      if (zone && random() > 0.18) continue;
      const loose = tries > 600 ? 0 : unit * 0.12;
      if (cards.some((c) => x < c.x + c.cw + loose && c.x < x + cw + loose && y < c.y + c.ch + loose && c.y < y + ch + loose)) continue;
      cards.push({x, y, cw, ch, zone: zone ? 0.42 : 1, p: random() * 6.28, q: random() * 6.28, row: random() * 50, ...page(random, cw, ch)});
    }
    for (let tries = 0; cards.length < 3 && tries < 3; tries += 1) {
      const cw = unit, ch = unit * 0.78;
      cards.push({x: w * (0.6 + tries * 0.12) - cw / 2, y: h * (0.25 + tries * 0.22), cw, ch, zone: 1, p: tries, q: tries * 2, row: tries * 9, ...page(random, cw, ch)});
    }
    // The link map: each page links to two or three of its nearest pages.
    const near = new Set();
    cards.forEach((c, i) => {
      c.out = [];
      const order = cards.map((o, j) => [Math.hypot(o.x - c.x, o.y - c.y), j]).filter(([, j]) => j !== i).sort((a, b) => a[0] - b[0]);
      const pool = order.slice(0, 4);
      const want = Math.min(pool.length, 2 + (random() < 0.5 ? 1 : 0));
      while (c.out.length < want) {
        const [, j] = pool.splice(Math.floor(random() * pool.length), 1)[0];
        c.out.push({to: j, a: Math.floor(random() * c.words.length), b: Math.floor(random() * cards[j].words.length)});
        near.add(`${Math.min(i, j)}:${Math.max(i, j)}`);
      }
    });
    const adjacent = cards.map(() => []);
    for (const key of near) { const [a, b] = key.split(':').map(Number); adjacent[a].push(b); adjacent[b].push(a); }
    return {cards, adjacent, unit, random, links: [], wave: [], lift: cards.map(() => 0), clock: null, next: 0, now: 0, pos: [], pulse: null};
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    const {cards, unit, random} = state;
    const k = values.intensity / 100;
    const light = scheme === 'light';
    const dt = state.clock === null ? 0 : clamp(t - state.clock, 0, 0.1);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.85)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (!cards.length) return;
    // Where each card floats now.
    const pos = cards.map((c, i) => [
      c.x + (noise2(t * 0.06 + c.row, c.p) - 0.5) * unit * 0.22 + Math.sin(t * 0.21 + c.p) * unit * 0.03,
      c.y + (noise2(c.q, t * 0.05 + c.row) - 0.5) * unit * 0.16 + Math.cos(t * 0.17 + c.q) * unit * 0.025 - state.lift[i] * 5,
    ]);
    state.pos = pos;
    // The pointer lifts the card under it, or the nearest one close by.
    let hover = -1;
    if (pointer.on && values.interactive !== false) {
      const px = pointer.x * w, py = pointer.y * h;
      let best = unit * 0.9 + 1e-6;
      cards.forEach((c, i) => {
        const [x, y] = pos[i];
        const d = Math.hypot(Math.max(x - px, 0, px - x - c.cw), Math.max(y - py, 0, py - y - c.ch));
        if (d < best) { best = d; hover = i; }
      });
    }
    state.lift = state.lift.map((v, i) => (env.still ? (i === hover ? 1 : 0) : v + ((i === hover ? 1 : 0) - v) * Math.min(1, dt * 7)));
    // The first frame starts the endless stream mid-flow, so even a still frame shows links.
    const want = clamp(Math.round(values.links ?? 3), 1, 8);
    const pick = (born) => {
      const weights = cards.map((c) => c.zone * c.zone * (c.out.length ? 1 : 0));
      let r = random() * weights.reduce((a, b) => a + b, 0), i = 0;
      while (i < cards.length - 1 && r > weights[i]) { r -= weights[i]; i += 1; }
      const edge = cards[i].out[Math.floor(random() * cards[i].out.length)];
      if (edge) state.links.push({from: i, to: edge.to, a: Math.floor(random() * cards[i].words.length), b: Math.floor(random() * cards[edge.to].words.length), born});
    };
    if (state.clock === null) {
      for (let i = 0; i < want; i += 1) pick(t - 0.2 - ((i + 0.5) * LIFE) / want);
      state.next = t + 0.6;
    }
    state.clock = t;
    state.now = t;
    state.links = state.links.filter((l) => t - l.born < LIFE);
    state.wave = state.wave.filter((l) => t - l.born < WAVE_LIFE);
    if (state.links.length >= want) state.next = Math.max(state.next, t);
    while (state.links.length < want && t >= state.next) { pick(state.next); state.next += 0.3 + random() * 0.9; }
    // The cards, the lifted one last.
    const order = cards.map((_, i) => i).sort((a, b) => state.lift[a] - state.lift[b]);
    for (const i of order) {
      const c = cards[i], [x, y] = pos[i], lift = state.lift[i], z = c.zone;
      ctx.save();
      ctx.translate(x, y);
      if (lift > 0.01) {
        ctx.shadowColor = rgba(tones.shade, (light ? 0.16 : 0.5) * lift);
        ctx.shadowBlur = 22 * lift;
        ctx.shadowOffsetY = 7 * lift;
      } else {
        ctx.translate(0, 2);
        ctx.fillStyle = rgba(tones.shade, (light ? 0.035 : 0.18) * z);
        ctx.fill(c.body);
        ctx.translate(0, -2);
      }
      ctx.fillStyle = rgba(tones.card, (light ? 0.82 : 0.5) * (0.4 + 0.6 * z) * (0.6 + 0.4 * k) + lift * 0.15);
      ctx.fill(c.body);
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 1;
      ctx.strokeStyle = rgba(tones.edge, ((light ? 0.55 : 0.5) * z + lift * 0.3) * k);
      ctx.stroke(c.body);
      ctx.lineCap = 'round';
      ctx.lineWidth = c.titleBar;
      ctx.strokeStyle = rgba(tones.title, ((light ? 0.75 : 0.7) * z + lift * 0.2) * k);
      ctx.stroke(c.title);
      ctx.lineWidth = c.bar;
      ctx.strokeStyle = rgba(tones.bar, ((light ? 0.5 : 0.42) * z + lift * 0.2) * k);
      ctx.stroke(c.lines);
      ctx.restore();
    }
    // A word lit in the accent: a bar over the word and a soft halo.
    const word = (i, j, glow, colour) => {
      if (glow <= 0.01) return;
      const c = cards[i], wd = c.words[j], [x, y] = pos[i];
      ctx.lineCap = 'round';
      ctx.lineWidth = c.bar * 3.2;
      ctx.strokeStyle = rgba(colour, 0.14 * glow * k);
      ctx.beginPath(); ctx.moveTo(x + wd.x, y + wd.y); ctx.lineTo(x + wd.x + wd.w, y + wd.y); ctx.stroke();
      ctx.lineWidth = c.bar;
      ctx.strokeStyle = rgba(colour, 0.85 * glow * k);
      ctx.stroke();
    };
    const end = (i, j) => { const wd = cards[i].words[j]; return [pos[i][0] + wd.x + wd.w / 2, pos[i][1] + wd.y]; };
    // One link at a moment of its life: s0..s1 of the arc, its alpha, the head and the lit target.
    const link = (l, s0, s1, alpha, glow, colour) => {
      const [ax, ay] = end(l.from, l.a), [bx, by] = end(l.to, l.b);
      const p = arc(ax, ay, bx, by, unit);
      const z = Math.sqrt(Math.min(cards[l.from].zone, cards[l.to].zone));
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = rgba(colour, (light ? 0.6 : 0.62) * alpha * z * k);
      stroke(ctx, p, s0, s1);
      word(l.from, l.a, alpha * 0.6 * z, colour);
      if (s1 < 0.999) {
        const [hx, hy] = at(p, s1);
        ctx.fillStyle = rgba(colour, 0.8 * alpha * z * k);
        ctx.beginPath(); ctx.arc(hx, hy, 2.2, 0, Math.PI * 2); ctx.fill();
      }
      word(l.to, l.b, glow * z, colour);
    };
    for (const l of state.links) {
      const age = t - l.born;
      if (age < 0) continue;
      const grow = smooth(clamp(age / GROW, 0, 1));
      const fade = clamp((age - GROW - HOLD) / FADE, 0, 1);
      const glow = age < GROW ? 0 : Math.sin(Math.PI * clamp((age - GROW) / (HOLD + FADE * 0.6), 0, 1));
      link(l, smooth(fade), grow, 1 - fade * fade, glow, tones.accent);
    }
    // The click's wave: links hop outward from the pressed page, one ring after another.
    for (const l of state.wave) {
      const age = t - l.born;
      if (age < 0) continue;
      const grow = smooth(clamp(age / WAVE_GROW, 0, 1));
      const fade = clamp((age - WAVE_GROW - 0.5) / (WAVE_LIFE - WAVE_GROW - 0.5), 0, 1);
      const glow = age < WAVE_GROW ? 0 : 1 - fade;
      link(l, smooth(fade) * 0.9, grow, 1 - fade, glow, l.ring % 2 ? tones.second : tones.accent);
    }
    // The lifted card shows all its outgoing links at once.
    cards.forEach((c, i) => {
      const lift = state.lift[i];
      if (lift < 0.02) return;
      const s = smooth(lift);
      for (const e of c.out) link({from: i, to: e.to, a: e.a, b: e.b}, 0, s, lift, s * 0.9, tones.accent);
    });
  },
  click(env, x, y) {
    const {state} = env;
    const {cards, pos, adjacent, random} = state;
    if (!cards.length || !pos.length) return;
    let start = 0, best = Infinity;
    cards.forEach((c, i) => {
      const d = Math.hypot(pos[i][0] + c.cw / 2 - x, pos[i][1] + c.ch / 2 - y);
      if (d < best) { best = d; start = i; }
    });
    const depth = new Map([[start, 0]]), queue = [start];
    state.wave = [];
    while (queue.length && state.wave.length < 24) {
      const i = queue.shift(), d = depth.get(i);
      for (const j of adjacent[i]) {
        if (depth.has(j)) continue;
        depth.set(j, d + 1);
        queue.push(j);
        state.wave.push({from: i, to: j, ring: d, a: Math.floor(random() * cards[i].words.length), b: Math.floor(random() * cards[j].words.length), born: state.now + d * HOP + random() * 0.12});
      }
    }
  },
  start: 4,
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
