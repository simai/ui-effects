// Markdown press (simai.effect 1.1.0; schemes light and dark): rows of raw Markdown drift in from
// the left and, as they cross a soft boundary, come out typeset: headings, bullets, quotes and code.
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

// Row kinds. Each row is laid out twice, raw (a monospace token and thin word bars) and typeset;
// every part morphs on its own as it crosses the boundary, so a row turns into a line part by part.
const KINDS = ['p', 'p', 'p', 'p', 'h1', 'h2', 'li', 'li', 'li', 'ol', 'ol', 'q', 'code', 'code'];
const TOKENS = {p: '', h1: '#', h2: '##', li: '-', ol: '1.', q: '>', code: '```'};
const MONO = 'ui-monospace, Menlo, Consolas, monospace';

function makeRow(env, random, number) {
  const {s, ls, cw} = env.state;
  const kind = KINDS[Math.floor(random() * KINDS.length)];
  const head = kind === 'h1' || kind === 'h2';
  const token = kind === 'ol' ? `${number}.` : TOKENS[kind];
  const n = head ? 2 + Math.floor(random() * 3) : kind === 'code' ? 3 + Math.floor(random() * 3) : 3 + Math.floor(random() * 5);
  const indent = {p: 0, h1: 0, h2: 0, li: 14, ol: 16, q: 12, code: 12}[kind] * s;
  const words = [];
  let rx = token ? (token.length + 1) * cw : 0;
  let tx = indent;
  for (let i = 0; i < n; i += 1) {
    const r = random();
    const mark = kind === 'p' || kind === 'li' || kind === 'q' ? (r < 0.12 ? 'b' : r < 0.2 ? 'a' : '') : '';
    const len = (kind === 'code' ? 10 + random() * 30 : head ? 26 + random() * 44 : 12 + random() * 44) * ls;
    const pre = mark === 'b' ? 2 * cw : mark === 'a' ? cw : 0;
    const post = mark === 'b' ? 2 * cw : mark === 'a' ? 5 * cw : 0;
    words.push({rx: rx + pre, tx, len, mark, hue: Math.floor(random() * 3), ph: random() * 6.28});
    rx += pre + len + post + cw;
    tx += len + (head ? 8 : kind === 'code' ? 7 : 6) * s;
  }
  return {kind, token, words, tw: tx, width: Math.max(rx, tx + 12 * s), s: 0};
}

const SCENE = {
  home: 'light', seed: 523, reseed: ['density'],
  tones: (read, scheme) => scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), low: read('--sf-neutral-95', '#f0f0f6'), raw: read('--sf-neutral-60', '#8f9099'),
      body: read('--sf-neutral-50', '#76777f'), head: read('--sf-primary-40', '#005bbe'), accent: read('--sf-primary-50', '#0074ec'),
      quote: read('--sf-tertiary-50', '#8a6d8f'), codeBg: read('--sf-primary-95', '#ecf0ff'), codeEdge: read('--sf-primary-80', '#acc7ff'),
      code: [read('--sf-primary-50', '#0074ec'), read('--sf-tertiary-50', '#8a6d8f'), read('--sf-secondary-50', '#008792')]}
    : {ground: read('--sf-neutral-5', '#0f0f12'), low: read('--sf-neutral-10', '#1a1b1f'), raw: read('--sf-neutral-50', '#76777f'),
      body: read('--sf-neutral-70', '#aaabb4'), head: read('--sf-primary-80', '#acc7ff'), accent: read('--sf-primary-70', '#7aabff'),
      quote: read('--sf-tertiary-70', '#c0a1c4'), codeBg: read('--sf-primary-10', '#001a40'), codeEdge: read('--sf-primary-30', '#004494'),
      code: [read('--sf-primary-70', '#7aabff'), read('--sf-tertiary-70', '#c0a1c4'), read('--sf-secondary-60', '#00a2b0')]},
  setup(env, random) {
    const {w, h, ctx} = env;
    const density = clamp(env.values.density ?? 50, 10, 100);
    const gap = mix(54, 22, (density - 10) / 90);
    const s = clamp(gap / 34, 0.72, 1.25);
    const fs = Math.round(clamp(gap * 0.36, 9, 13));
    ctx.font = `500 ${fs}px ${MONO}`;
    const state = {gap, s, ls: clamp(w / 1300, 0.55, 1.15), fs, cw: ctx.measureText('M').width, lanes: [], bursts: [], now: 0, pk: 0, px: w * 0.6, py: h / 2, lt: null};
    const count = Math.max(1, Math.floor((h - gap * 0.2) / gap));
    const top = (h - (count - 1) * gap) / 2;
    for (let i = 0; i < count; i += 1) {
      state.lanes.push({y: top + i * gap, v: Math.max(16, w / 64) * (0.8 + random() * 0.4), random: rng(Math.floor(random() * 1e9) + (env.salt | 0)), rows: [], number: 1});
    }
    return state;
  },
  click(env, x, y) { env.state.bursts.push({x, y, t: env.state.now}); },
  draw(env, t) {
    const {ctx, w, h, tones, state, values, scheme, pointer} = env;
    const k = values.intensity / 100;
    const light = scheme === 'light';
    const {s, gap, cw} = state;
    const dt = state.lt === null ? 1 : clamp(t - state.lt, 0, 0.1);
    state.lt = t;
    state.now = t;
    // The pointer eases in and out, so the boundary bends smoothly toward it.
    const e = Math.min(1, dt * 5);
    state.pk += ((pointer.on ? 1 : 0) - state.pk) * e;
    if (pointer.on) { state.px += (pointer.x * w - state.px) * e; state.py += (pointer.y * h - state.py) * e; }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgba(tones.ground));
    g.addColorStop(1, rgba(mixc(tones.ground, tones.low, 0.8)));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const base = w * 0.6;
    const band = Math.max(70, w * 0.07);
    // A faint glow marks where the press works.
    const glow = ctx.createLinearGradient(base - band * 1.5, 0, base + band * 1.5, 0);
    glow.addColorStop(0, rgba(tones.accent, 0));
    glow.addColorStop(0.5, rgba(tones.accent, (light ? 0.05 : 0.07) * k));
    glow.addColorStop(1, rgba(tones.accent, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(base - band * 1.5, 0, band * 3, h);
    const bursts = state.bursts = state.bursts.filter((b) => t - b.t < 2.6 && t >= b.t);
    const reach = 300 * s;
    // How typeset a point is: past the (bent) boundary, or swept by a recent click.
    const amount = (x, y) => {
      let bx = base;
      if (state.pk > 0.01) bx += clamp((state.px - base) * 0.5, -w * 0.22, w * 0.22) * state.pk * Math.exp(-(((y - state.py) / (h * 0.3 + 60)) ** 2));
      let u = smooth(clamp((x - bx) / band + 0.5, 0, 1));
      for (const b of bursts) {
        const a = t - b.t;
        const r = mix(30, reach, smooth(Math.min(1, a / 0.7)));
        const f = (a < 1.4 ? 1 : 1 - (a - 1.4) / 1.2) * smooth(clamp((r - Math.hypot(x - b.x, y - b.y)) / 70, 0, 1));
        if (f > u) u = f;
      }
      return u;
    };
    const near = (x, y) => (state.pk > 0.01 ? state.pk * Math.exp(-(((x - state.px) ** 2) + ((y - state.py) * 2) ** 2) / (170 * 170)) : 0);
    // Rows enter faint and grow clearer toward the boundary, so the left, where text sits, stays calm.
    const fade = (x) => smooth(clamp((x + 30) / (w * 0.14), 0, 1)) * mix(0.6, 1, smooth(clamp((x - w * 0.15) / (w * 0.35), 0, 1))) * smooth(clamp((w - x) / (w * 0.06), 0, 1));
    const rawA = (light ? 0.4 : 0.48) * k;
    const pad = 40;
    ctx.textBaseline = 'middle';
    const font = `500 ${state.fs}px ${MONO}`;
    const sans = `600 ${Math.round(state.fs * 1.05)}px system-ui, sans-serif`;
    for (const lane of state.lanes) {
      const {rows, v} = lane;
      // Endless: new rows enter on the left, rows that leave on the right are dropped.
      if (!rows.length) {
        const row = makeRow(env, lane.random, lane.number++);
        row.s = w + lane.random() * 120 - row.width - v * t;
        rows.push(row);
      }
      while (rows[rows.length - 1].s + v * t > -pad) {
        const prev = rows[rows.length - 1];
        if (prev.kind !== 'ol') lane.number = 1;
        const row = makeRow(env, lane.random, lane.number++);
        row.s = prev.s - (24 + lane.random() * 110) * state.ls - row.width;
        rows.push(row);
      }
      while (rows.length && rows[0].s + v * t > w + pad) rows.shift();
      for (const row of rows) {
        const x0 = row.s + v * t;
        if (x0 > w + pad || x0 + row.width < -pad) continue;
        const y = lane.y;
        const kind = row.kind;
        const head = kind === 'h1' || kind === 'h2';
        if (kind === 'code') {
          const l = x0 - 4 * s, r = x0 + row.tw + 8 * s;
          const ul = amount(l, y), um = amount((l + r) / 2, y), ur = amount(r, y);
          if (ul + um + ur > 0.02) {
            const fill = ctx.createLinearGradient(l, 0, r, 0);
            const a = (light ? 0.9 : 0.75) * k;
            fill.addColorStop(0, rgba(tones.codeBg, ul * a * fade(l)));
            fill.addColorStop(0.5, rgba(tones.codeBg, um * a * fade((l + r) / 2)));
            fill.addColorStop(1, rgba(tones.codeBg, ur * a * fade(r)));
            const edge = ctx.createLinearGradient(l, 0, r, 0);
            const b = (light ? 0.6 : 0.5) * k;
            edge.addColorStop(0, rgba(tones.codeEdge, ul * b * fade(l)));
            edge.addColorStop(0.5, rgba(tones.codeEdge, um * b * fade((l + r) / 2)));
            edge.addColorStop(1, rgba(tones.codeEdge, ur * b * fade(r)));
            const bh = Math.min(gap * 0.74, 30 * s);
            ctx.beginPath();
            ctx.roundRect(l, y - bh / 2, r - l, bh, 5 * s);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = edge;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
        // The token, and what it becomes.
        if (row.token) {
          const tx = x0 + row.token.length * cw * 0.5;
          const u = amount(tx, y), f = fade(tx), lit = 1 + near(tx, y) * 0.6;
          if (u < 0.99) {
            ctx.font = font;
            ctx.fillStyle = rgba(head ? tones.head : tones.raw, rawA * (head ? 0.8 : 1) * (1 - u) * f * lit);
            ctx.fillText(row.token, x0, y);
          }
          if (u > 0.01) {
            const a = u * f * k * lit;
            if (kind === 'li') { ctx.fillStyle = rgba(tones.accent, a * 0.7); ctx.beginPath(); ctx.arc(x0 + 4 * s, y, 2.6 * s, 0, Math.PI * 2); ctx.fill(); }
            else if (kind === 'ol') { ctx.font = sans; ctx.fillStyle = rgba(tones.accent, a * 0.75); ctx.fillText(row.token, x0, y + 0.5); }
            else if (kind === 'q') { ctx.fillStyle = rgba(tones.quote, a * 0.65); ctx.beginPath(); ctx.roundRect(x0, y - gap * 0.32, 3 * s, gap * 0.64, 1.5 * s); ctx.fill(); }
          }
        }
        for (let i = 0; i < row.words.length; i += 1) {
          const word = row.words[i];
          const cx = x0 + (word.rx + word.tx) / 2 + word.len / 2;
          const u = amount(cx, y), f = fade(cx);
          if (f < 0.01) continue;
          const lit = near(cx, y);
          const x = x0 + mix(word.rx, word.tx, u);
          // Raw words waver a little off the line; near the pointer they straighten.
          const dy = Math.sin(t * 0.8 + word.ph) * 1.6 * s * (1 - u) * (1 - lit);
          let tone = tones.body, th = 5.5 * s, ta = light ? 0.5 : 0.48;
          if (head) { tone = tones.head; th = (kind === 'h1' ? 11 : 8) * s; ta = light ? 0.55 : 0.6; }
          else if (kind === 'code') { tone = tones.code[word.hue]; th = 4 * s; ta = light ? 0.6 : 0.65; }
          else if (word.mark === 'b') { tone = mixc(tones.body, tones.head, 0.5); th = 7.5 * s; ta = light ? 0.62 : 0.62; }
          else if (word.mark === 'a') { tone = tones.accent; ta = light ? 0.6 : 0.66; }
          else if (kind === 'q') { tone = mixc(tones.body, tones.quote, 0.6); }
          const bh = mix(3 * s, th, u);
          const a = mix(rawA, ta * k, u) * f * (1 + lit * 0.6);
          ctx.fillStyle = rgba(mixc(tones.raw, tone, u), a);
          ctx.beginPath();
          ctx.roundRect(x, y + dy - bh / 2, word.len, bh, bh / 2);
          ctx.fill();
          if (word.mark && u < 0.99) {
            ctx.font = font;
            ctx.fillStyle = rgba(tones.raw, rawA * (1 - u) * f * (1 + lit * 0.6));
            ctx.textAlign = 'right';
            ctx.fillText(word.mark === 'b' ? '**' : '[', x - 1, y + dy);
            ctx.textAlign = 'left';
            ctx.fillText(word.mark === 'b' ? '**' : '](…)', x + word.len + 1, y + dy);
          }
          if (word.mark === 'a' && u > 0.01) {
            ctx.fillStyle = rgba(tones.accent, ta * k * u * f * 0.7);
            ctx.fillRect(x, y + bh / 2 + 2 * s, word.len, Math.max(1, s));
          }
        }
      }
    }
    // A click sends out a soft ring that typesets what it passes.
    for (const b of bursts) {
      const a = t - b.t;
      ctx.strokeStyle = rgba(tones.accent, 0.22 * k * (1 - a / 2.6));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, mix(30, reach, smooth(Math.min(1, a / 0.7))), 0, Math.PI * 2);
      ctx.stroke();
    }
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
