// Cross-links (simai.effect 1.1.0; light and dark): pages appear at free places, live and leave;
// markers fly along arcs from a word on one page to a word on another, trailing a fading tail.

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

// Seconds: a page grows IN, fades OUT; a route fades AFTER landing; a word stays LIT.
const IN = 1.4, OUT = 1.8, PACE = 150, AFTER = 1.5, LIT = 1.9;

// The text zone, where a hero's heading sits.
const inZone = (x, y, cw, ch, w, h) => w >= 560 && x < w * 0.46 && y < h * 0.7 && y + ch > h * 0.12;

// One page: a title bar and rows of word bars; every word is a possible link end.
function page(random, cw, ch) {
  const pad = cw * 0.1, inner = cw - pad * 2, bar = Math.max(2.5, cw * 0.026);
  const body = new Path2D();
  body.roundRect(0, 0, cw, ch, Math.min(cw, ch) * 0.07);
  const title = new Path2D(), lines = new Path2D(), words = [];
  const ty = pad + cw * 0.02;
  title.moveTo(pad, ty);
  title.lineTo(pad + inner * (0.38 + random() * 0.3), ty);
  const step = Math.max(8, cw * 0.075), gap = cw * 0.035;
  for (let y = ty + step * 1.5; y < ch - pad * 0.8; y += step) {
    if (random() < 0.16) continue;
    const width = inner * (random() < 0.3 ? 0.35 + random() * 0.35 : 0.8 + random() * 0.2);
    for (let x = 0; x < width - cw * 0.04;) {
      const ww = Math.min(width - x, inner * (0.08 + random() * 0.18));
      words.push({x: pad + x, y, w: ww});
      x += ww + gap;
    }
  }
  if (!words.length) words.push({x: pad, y: ch / 2, w: inner * 0.5});
  for (const {x, y, w} of words) { lines.moveTo(x, y); lines.lineTo(x + w, y); }
  return {body, title, lines, words, bar, titleBar: bar * 1.7};
}

// A free place: the best of a few candidates, far from other pages; the text zone rarely takes one.
function spot(cards, w, h, cw, ch, gap, random, at) {
  let best = null, score = -1;
  for (let i = 0, found = 0; i < (at ? 1 : 90) && found < 10; i += 1) {
    const x = clamp(at ? at[0] - cw / 2 : 6 + random() * (w - cw - 12), 6, w - cw - 6), y = clamp(at ? at[1] - ch / 2 : 6 + random() * (h - ch - 12), 6, h - ch - 6);
    const zone = inZone(x, y, cw, ch, w, h);
    if (zone && !at && random() > 0.08) continue;
    if (cards.some((c) => x < c.x + c.cw + gap && c.x < x + cw + gap && y < c.y + c.ch + gap && c.y < y + ch + gap)) continue;
    found += 1;
    const d = cards.reduce((m, c) => Math.min(m, Math.hypot(c.x + c.cw / 2 - x - cw / 2, c.y + c.ch / 2 - y - ch / 2)), w + h);
    const s = d * (0.6 + random() * 0.4);
    if (s > score) { score = s; best = {x, y, zone: zone ? 0.32 : 1}; }
  }
  return best;
}
function card(state, w, h, at) {
  const {unit: u, random} = state, cw = u * (0.7 + random() * 0.62), ch = cw * (0.62 + random() * 0.56);
  const s = spot(state.cards, w, h, cw, ch, u * (at ? 0.06 : 0.26), random, at);
  return s && {...s, cw, ch, born: 0, life: 11 + random() * 10, pulse: -9, lit: [], lift: 0, p: random() * 50, q: random() * 50, ...page(random, cw, ch)};
}

// A cubic arc between two points, bowed away from the text zone at (zx, zy), side kept per flight.
function arc(f, ax, ay, bx, by, unit, zx, zy) {
  const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, mx = (ax + bx) / 2 - zx, my = (ay + by) / 2 - zy;
  let o = Math.min(d * 0.32, unit * 1.2) / d;
  f.side ??= Math.hypot(mx + dy * o, my - dx * o) < Math.hypot(mx - dy * o, my + dx * o) ? -1 : 1;
  o *= f.side;
  return [ax, ay, ax + dx * 0.25 + dy * o, ay + dy * 0.25 - dx * o, ax + dx * 0.75 + dy * o, ay + dy * 0.75 - dx * o, bx, by];
}
const at = (p, s) => {
  const u = 1 - s, a = u * u * u, b = 3 * u * u * s, c = 3 * u * s * s, e = s * s * s;
  return [a * p[0] + b * p[2] + c * p[4] + e * p[6], a * p[1] + b * p[3] + c * p[5] + e * p[7]];
};
function stroke(ctx, p, s0, s1) {
  if (s1 - s0 < 0.003) return;
  ctx.beginPath();
  const n = Math.max(2, Math.ceil((s1 - s0) * 36));
  for (let i = 0; i <= n; i += 1) {
    const [x, y] = at(p, s0 + ((s1 - s0) * i) / n);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
}

// A page's presence at t; ready when fully in and staying.
const shown = (c, t) => smooth(clamp((t - c.born) / IN, 0, 1)) * (1 - smooth(clamp((t - c.born - c.life) / OUT, 0, 1)));
const ready = (c, t, need) => t - c.born > IN && c.born + c.life - t > need;
// The page nearest to a point, within a distance.
function nearest(cards, x, y, best) {
  let hit = null;
  for (const c of cards) {
    const d = Math.hypot(Math.max(c.sx - x, 0, x - c.sx - c.cw), Math.max(c.sy - y, 0, y - c.sy - c.ch));
    if (c.a > 0.6 && d < best) { best = d; hit = c; }
  }
  return hit;
}
const pick = (random, list) => Math.floor(random() * list.length);

// A flight from a word to a word, at one pace on every route.
function fly(state, from, to, born, tint) {
  const dur = clamp(Math.hypot(to.x + to.cw / 2 - from.x - from.cw / 2, to.y + to.ch / 2 - from.y - from.ch / 2) * 1.15 / PACE, 1.3, 4.2);
  const f = {from, to, a: pick(state.random, from.words), b: pick(state.random, to.words), born, dur, tint};
  if (state.flights.length < 48) state.flights.push(f);
  return f;
}
// Another page fit for a flight, nearer ones likelier.
function target(state, from, t) {
  const pool = state.cards.filter((c) => c !== from && c.zone > 0.5 && ready(c, t, 6));
  if (!pool.length) return null;
  const weight = pool.map((c) => 1 / (from ? 1 + Math.hypot(c.x - from.x, c.y - from.y) / (state.unit * 4) : 1));
  let r = state.random() * weight.reduce((a, b) => a + b, 0), i = 0;
  while (i < pool.length - 1 && r > weight[i]) { r -= weight[i]; i += 1; }
  return pool[i];
}

const SCENE = {
  home: 'light', seed: 523, fresh: true, reseed: ['pages'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), card: read('--sf-neutral-100', '#ffffff'),
      edge: read('--sf-neutral-80', '#c6c6d0'), bar: read('--sf-neutral-80', '#c6c6d0'), shade: read('--sf-neutral-40', '#5d5e66'),
      title: read('--sf-primary-80', '#acc7ff'), accent: read('--sf-primary-50', '#2a74de'), second: read('--sf-tertiary-50', '#8a6d8f')}
    : {ground: read('--sf-neutral-5', '#111318'), low: read('--sf-neutral-10', '#1a1b20'), card: read('--sf-neutral-20', '#2f3036'),
      edge: read('--sf-neutral-40', '#5d5e66'), bar: read('--sf-neutral-50', '#76777f'), shade: read('--sf-neutral-0', '#000000'),
      title: read('--sf-primary-40', '#005bbe'), accent: read('--sf-primary-80', '#acc7ff'), second: read('--sf-tertiary-80', '#ddbce0')},
  setup(env) {
    const {w, h} = env;
    // A moving mount salts the seed: each load lays the pages anew.
    const random = rng(SCENE.seed + env.salt);
    const count = clamp(Math.round(env.values.pages ?? 7), 3, 12);
    const unit = clamp(Math.min(w * 0.12, h * 0.3), 70, 160) * (count > 8 ? 0.88 : 1);
    const state = {cards: [], flights: [], unit, random, count, clock: null};
    for (let tries = 0; state.cards.length < count && tries < count * 3; tries += 1) {
      const c = card(state, w, h);
      if (c) state.cards.push(c);
    }
    return state;
  },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    const {cards, unit: u, random} = state;
    const k = values.intensity / 100;
    const light = scheme === 'light';
    const dt = state.clock === null ? 0 : clamp(t - state.clock, 0, 0.1);
    const g = ctx.fillStyle = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.85)));
    ctx.fillRect(0, 0, w, h);
    const want = clamp(Math.round(values.links ?? 3), 1, 8);
    // The first frame starts mid-flow: staggered pages, flights on their way.
    if (state.clock === null) {
      for (const c of cards) c.born = t - IN - random() * c.life;
      for (let i = 0; i < want; i += 1) {
        const from = target(state, null, t), to = from && target(state, from, t);
        if (to) { const f = fly(state, from, to, t, 'accent'); f.born = t - f.dur * (0.2 + (0.6 * (i + 0.5)) / want); }
      }
      state.nextCard = t + 1;
      state.nextFly = t + 0.5;
    }
    state.clock = t;
    state.now = t;
    // Faded pages leave; a new one takes a free place a moment later.
    for (let i = cards.length - 1; i >= 0; i -= 1) if (t - cards[i].born > cards[i].life + OUT) cards.splice(i, 1);
    if (!env.still && cards.length < state.count && t >= state.nextCard) {
      const c = card(state, w, h);
      if (c) { c.born = t; cards.push(c); state.nextCard = t + 0.4 + random(); } else state.nextCard = t + 0.6;
    }
    // Each page now: a slow drift, its growth, a pulse when a flight lands.
    for (const c of cards) {
      const a = c.a = shown(c, t), beat = c.beat = clamp(1 - (t - c.pulse) / 1.2, 0, 1);
      c.s = (0.9 + 0.1 * a) * (1 + 0.03 * Math.sin(Math.PI * beat)) * (1 + 0.02 * c.lift);
      c.sx = c.x + (noise2(t * 0.05 + c.p, c.q) - 0.5) * u * 0.1;
      c.sy = c.y + (noise2(c.q, t * 0.05 + c.p) - 0.5) * u * 0.08 - c.lift * 5;
    }
    // The pointer lifts the nearest page, which sends flights of its own.
    const hover = pointer.on && values.interactive !== false ? nearest(cards, pointer.x * w, pointer.y * h, u * 0.8) : null;
    if (hover !== state.hover) { state.hover = hover; state.nextHover = t + 0.15; }
    for (const c of cards) c.lift = env.still ? +(c === hover) : c.lift + (+(c === hover) - c.lift) * Math.min(1, dt * 7);
    if (hover && !env.still && t >= state.nextHover) {
      const to = target(state, hover, t);
      if (to) fly(state, hover, to, t, 'accent');
      state.nextHover = t + 0.5 + random() * 0.3;
    }
    // The steady traffic: so many flights in the air.
    const flights = state.flights = state.flights.filter((f) => t - f.born < f.dur + AFTER && f.from.a > 0.02 && f.to.a > 0.02);
    if (!env.still) {
      let air = flights.filter((f) => f.tint === 'accent' && t - f.born < f.dur).length;
      while (air < want && t >= state.nextFly) {
        const from = target(state, null, t), to = from && target(state, from, t);
        if (to) fly(state, from, to, state.nextFly, 'accent');
        state.nextFly += 0.5 + random() * 1.3;
        air += 1;
      }
      if (air >= want) state.nextFly = Math.max(state.nextFly, t);
    }
    // The pages, the lifted one last.
    for (const c of [...cards].sort((a, b) => a.lift - b.lift)) {
      const a = c.a * c.zone, lift = c.lift;
      if (a < 0.01) continue;
      ctx.save();
      ctx.translate(c.sx + c.cw / 2, c.sy + c.ch / 2);
      ctx.scale(c.s, c.s);
      ctx.translate(-c.cw / 2, -c.ch / 2);
      ctx.shadowColor = rgba(tones.shade, (light ? 0.05 + 0.11 * lift : 0.3 + 0.2 * lift) * a);
      ctx.shadowBlur = 4 + 18 * lift;
      ctx.shadowOffsetY = 2 + 5 * lift;
      ctx.fillStyle = rgba(tones.card, ((light ? 0.82 : 0.5) * (0.6 + 0.4 * k) + lift * 0.15) * (0.4 + 0.6 * a) * c.a);
      ctx.fill(c.body);
      ctx.shadowColor = 'transparent';
      ctx.lineCap = 'round';
      for (const [path, width, tone, alpha] of [[c.body, 1, tones.edge, (light ? 0.55 : 0.5) * a + lift * 0.3], [c.body, 1, tones.accent, 0.45 * c.beat * a],
        [c.title, c.titleBar, tones.title, (light ? 0.75 : 0.7) * a + lift * 0.2], [c.lines, c.bar, tones.bar, (light ? 0.5 : 0.42) * a + lift * 0.2]]) {
        ctx.lineWidth = width;
        ctx.strokeStyle = rgba(tone, alpha * k);
        ctx.stroke(path);
      }
      ctx.restore();
    }
    // A word's place now, and the word lit: a bar and a soft halo.
    const end = (c, j) => {
      const wd = c.words[j];
      return [c.sx + c.cw / 2 + (wd.x + wd.w / 2 - c.cw / 2) * c.s, c.sy + c.ch / 2 + (wd.y - c.ch / 2) * c.s];
    };
    const word = (c, j, glow, colour) => {
      if (glow <= 0.01) return;
      const [x, y] = end(c, j), half = (c.words[j].w / 2) * c.s;
      ctx.beginPath(); ctx.moveTo(x - half, y); ctx.lineTo(x + half, y);
      for (const [width, alpha] of [[3.2, 0.15], [1, 0.85]]) {
        ctx.lineWidth = c.bar * width * c.s;
        ctx.strokeStyle = rgba(colour, alpha * glow * k);
        ctx.stroke();
      }
    };
    // Flights: a faint route, a fading trail, the marker; landing lights the word.
    for (const f of flights) {
      const age = t - f.born;
      if (age < 0) continue;
      const colour = tones[f.tint], z = Math.sqrt(Math.min(f.from.a * f.from.zone, f.to.a * f.to.zone));
      const q = smooth(clamp(age / f.dur, 0, 1)) * 0.94 + clamp(age / f.dur, 0, 1) * 0.06;
      const fade = 1 - clamp((age - f.dur) / AFTER, 0, 1);
      if (age >= f.dur && !f.done) { f.done = true; f.to.pulse = t; f.to.lit.push([f.b, t, f.tint]); }
      const [ax, ay] = end(f.from, f.a), [bx, by] = end(f.to, f.b), p = arc(f, ax, ay, bx, by, u, w * 0.2, h * 0.4);
      ctx.lineCap = 'round';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = rgba(colour, (light ? 0.3 : 0.26) * fade * z * k);
      stroke(ctx, p, 0, q);
      ctx.setLineDash([]);
      word(f.from, f.a, clamp(1 - age / (f.dur * 0.7), 0, 1) * 0.7 * z, colour);
      if (q >= 1) continue;
      ctx.lineWidth = 1.8;
      for (let i = 0; i < 8; i += 1) {
        ctx.strokeStyle = rgba(colour, 0.7 * (1 - i / 8) * z * k);
        stroke(ctx, p, Math.max(0, q - (i + 1) * 0.02), Math.max(0, q - i * 0.02));
      }
      const [hx, hy] = at(p, q);
      for (const [r, alpha] of [[6.5, 0.14], [2.4, 0.95]]) {
        ctx.fillStyle = rgba(colour, alpha * z * k);
        ctx.beginPath(); ctx.arc(hx, hy, r, 0, 6.29); ctx.fill();
      }
    }
    for (const c of cards) {
      c.lit = c.lit.filter(([, born]) => t - born < LIT);
      for (const [j, born, tint] of c.lit) word(c, j, (1 - (t - born) / LIT) * c.a * Math.sqrt(c.zone), tones[tint]);
    }
  },
  click(env, x, y) {
    const {state, w, h} = env;
    const {cards, now: t, unit: u} = state;
    // On a page: a burst of flights to every other page.
    const hit = nearest(cards, x, y, u * 0.3);
    if (hit) {
      cards.filter((c) => c !== hit && c.zone > 0.5 && ready(c, t, 5)).forEach((c, i) => fly(state, hit, c, t + i * 0.07, 'second'));
      hit.pulse = t;
      return;
    }
    // Elsewhere: a new page there, if there is room; at the limit the oldest leaves first.
    const c = card(state, w, h, [x, y]);
    if (!c) return;
    c.born = t;
    const staying = cards.filter((o) => t - o.born < o.life);
    if (cards.length >= state.count && staying.length) {
      const old = staying.reduce((a, b) => (a.born < b.born ? a : b));
      old.life = Math.max(0, t - old.born);
      c.born = t + OUT * 0.6;
    }
    cards.push(c);
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

// The fixed palettes stand in for the theme's colour scales on the effect's own layer: a dark
// ground, the mass, the bright colour and the hot one. 'theme' leaves the theme's scales alone.
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
// 'custom' builds the four from the colour setting (a hex).
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
