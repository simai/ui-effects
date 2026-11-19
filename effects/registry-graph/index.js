// Registry graph (simai.effect 1.4.0; dark): SIMAI Framework parts as a galaxy. Data: the pair's
// registry export in a JSON script of the page (source = its id).

const {sin, cos, sqrt, min, max, abs, PI, round, ceil, floor, log, exp, hypot, tan} = Math;
const TAU = PI * 2, R0 = .12, EXT = 1.3, RS = 1024, COSI = .42, TILT = -.28;
const RINGS = [[0, .38], [.38, .7], [.7, 1]];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`, wh = a => rgba([255, 255, 255], a);
const hash = (s, k) => {
  let h = 2166136261 ^ k;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};
const cv = (doc, w, h) => Object.assign(doc.createElement('canvas'), {width: w, height: h});
const ringOf = r => (r < .38 ? 0 : r < .7 ? 1 : 2);
const words = s => new Set(String(s ?? '').split(/[\s,]+/u));

function readTones(host, mono) {
  const doc = host.ownerDocument, probe = host.appendChild(doc.createElement('i')), pixel = doc.createElement('canvas').getContext('2d', {willReadFrequently: true});
  probe.style.cssText = 'position:absolute;visibility:hidden';
  const read = pair => {
    const [name, fallback] = pair.split('=');
    probe.style.color = `var(--sf-${name}, ${fallback})`;
    pixel.fillStyle = fallback; pixel.fillStyle = getComputedStyle(probe).color; pixel.fillRect(0, 0, 1, 1);
    return [...pixel.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  };
  const list = s => s.split(' ').map(read);
  const t = {star: list('amber-85=#ffca9f orange-70=#ff8d4f cyan-90=#80f4ff blue-85=#c2d4ff'), neb: list('amber-60=#d87900 pink-50=#be4e8f teal-50=#00876d blue-50=#3375d9'),
    sky: list('indigo-10=#08006c gray-5=#111'), field: read('blue-95=#edf0ff'), bulge: read('amber-70=#fa911c'), pill: read('gray-95=#f1f1f1'), ink: read('gray-10=#1b1b1b'), mono: read('primary-85=#c2d4ff')};
  probe.remove();
  if (mono) t.star = t.star.map(() => t.mono);
  t.sky[0] = t.sky[0].map((v, i) => v * .45 + t.sky[1][i] * .55);
  t.core = t.star.map(c => c.map(v => v * .45 + 140));
  return t;
}

// Links are [user, used]; counts come from them. No data: the sky and the bulge only.
function model(data, v) {
  const N = (Array.isArray(data?.nodes) ? data.nodes : []).map((n, i) => ({i, n: String(n?.name ?? ''), f: max(0, ['core', 'utility', 'component', 'smart'].indexOf(n?.family)), d: n?.docs ?? {}, u: 0, o: 0, users: [], used: []}));
  for (const [a, b] of Array.isArray(data?.edges) ? data.edges : []) {
    const A = N[a], B = N[b];
    if (A && B && A !== B) { A.o++; B.u++; A.used.push(b); B.users.push(a); }
  }
  const deg = n => n.u + n.o, rank = v.radiusBy === 'degree' ? deg : n => n.u, size = v.sizeBy === 'usedBy' ? n => n.u : deg, key = n => n.n || 'n' + n.i;
  const order = N.slice().sort((a, b) => !b.f - !a.f || rank(b) - rank(a) || b.o - a.o || hash(key(a), 1) - hash(key(b), 1));
  const rest = order.filter(n => n.f), K = max(1, rest.length - 1), P = 1 / tan(clamp(v.pitch, 5, 40) * PI / 180), four = v.arms === '4', two = v.arms === '2';
  rest.forEach((n, k) => { n.k = k; });
  for (const n of N) {
    const s = key(n), h = j => hash(s, j), spread = (h(6) + h(7) + h(8) - 1.5) * 1.4;
    n.tf = h(3) * TAU;
    if (!n.f) { n.r = .02 + .06 * h(2); n.ta = n.tf; n.s = 4 + 1.5 * h(4); continue; }
    n.r = R0 + .86 * (n.k / K) ** .9 + (h(2) - .5) * .025;
    const arm = four ? floor(h(5) * 4) : two || h(4) < .72 ? (h(5) < .5 ? 0 : 2) : h(5) < .5 ? 1 : 3;
    n.ta = arm * PI / 2 + .3 + log(n.r / R0) * P + spread * (n.f > 2 ? .15 : n.f > 1 ? .2 : .48) * (arm % 2 && !four ? 1.35 : 1);
    n.s = min(9, 1.2 + 1.15 * sqrt(size(n)));
  }
  rest.slice().sort((a, b) => deg(b) - deg(a)).slice(0, 8).forEach(n => { n.sp = 1; });
  return {N, order, P, arms: two ? [0, 2] : [0, 1, 2, 3], weak: !two && !four};
}

// Nebulae, bulge and dust in three rings; each turns at its mean speed.
function rings(doc, M, T, F, k) {
  const C = RINGS.map(() => cv(doc, RS, RS)), X = C.map(c => c.getContext('2d')), px = q => (q / EXT * .5 + .5) * RS;
  const blob = (r0, x, y, r, c, a) => {
    const g = X[ringOf(r0)], cx = px(x), cy = px(y), R = r / EXT * .5 * RS, gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, rgba(c, min(1, a * k))); gr.addColorStop(1, rgba(c, 0));
    g.fillStyle = gr; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
  };
  const along = (arm, r) => arm * PI / 2 + .3 + log(r / R0) * M.P;
  for (const g of X) g.globalCompositeOperation = 'lighter';
  if (F.nebula) {
    for (const n of M.N) if (n.f) { const a = F.arms ? n.ta : n.tf; blob(n.r, n.r * cos(a), n.r * sin(a), .07 + .018 * sqrt(n.u + n.o), T.neb[n.f], .085); }
    if (F.arms) for (const arm of M.arms) for (let r = R0 + .02; r < 1; r += .016) {
      const a = along(arm, r), x = r * cos(a), y = r * sin(a), w = [0, 0, 0, 0], weak = arm % 2 && M.weak ? .6 : 1;
      let all = 0;
      for (const n of M.N) if (n.f) {
        const dx = n.r * cos(n.ta) - x, dy = n.r * sin(n.ta) - y, d = 1 - (dx * dx + dy * dy) / .0144;
        if (d > 0) { w[n.f] += d; all += d; }
      }
      if (all) blob(r, x, y, weak < 1 ? .08 : .1, [0, 1, 2].map(j => (T.neb[1][j] * w[1] + T.neb[2][j] * w[2] + T.neb[3][j] * w[3]) / all), .1 * weak);
    }
  }
  if (F.bulge) { blob(0, 0, 0, .34, T.bulge, .55); blob(0, 0, 0, .14, T.bulge, .7); blob(0, 0, 0, .05, [255, 250, 240], .9); }
  if (F.dust && F.arms) {
    for (const g of X) g.globalCompositeOperation = 'source-over';
    for (const arm of M.weak ? [0, 2] : M.arms) for (let r = R0 + .04; r < .95; r += .009) {
      const a = along(arm, r) - .2 + (hash('d' + r, arm) - .5) * .08, rr = r + (hash('e' + r, arm) - .5) * .02;
      blob(rr, rr * cos(a), rr * sin(a), .03 + .035 * hash('f' + r, arm), T.sky[1], .8 * (1 - r * .4) / k);
    }
  }
  return C.map(c => { const o = cv(doc, RS, RS), g = o.getContext('2d'); g.filter = 'blur(3px)'; g.drawImage(c, 0, 0); return o; });
}

function field(doc, W, H, dpr, T) {
  const PAD = 60, tw = [];
  const L = [.35, .6, 1].map((depth, li) => {
    const c = cv(doc, round((W + 2 * PAD) * dpr), round((H + 2 * PAD) * dpr)), g = c.getContext('2d'), n = min(600, round(W * H / [2600, 4500, 9000][li]));
    for (let i = 0; i < n; i++) {
      const h = j => hash(j + i, li), x = h('x') * (W + 2 * PAD), y = h('y') * (H + 2 * PAD), s = .5 + h('s') * (li > 1 ? 1.2 : .7), a = .25 + h('a') * .55 * depth;
      if (li > 1 && h('t') < .12) { tw.push([x - PAD, y - PAD, a, h('p') * TAU, .6 + h('q') * 1.4]); continue; }
      const d = dpr > 1.5 && s > 1.3 ? 2 : 1;
      g.fillStyle = rgba(T.field, a.toFixed(3)); g.fillRect(round(x * dpr), round(y * dpr), d, d);
    }
    return [c, depth];
  });
  return {L, tw, PAD};
}

export function mount(host, settings = {}, context = {}) {
  const doc = host.ownerDocument, win = doc.defaultView, canvas = doc.createElement('canvas'), g = canvas.getContext('2d', {alpha: false}), motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  let v = {...settings}, T, F, M, ringC, fl, halos, cores, bg, src, nav, OM = 0, PX, PY, PS, font = '', lines = 0,
    still = !!(context.reducedMotion || motion?.matches), paused = false, visible = true, raf = 0, last = 0, t = 0, W = 1, H = 1, dpr = 1, CX = 0, CY = 0, S = 1, narrow = false,
    view = {z: 1, x: 0, y: 0}, rest = {...view}, anim = null, hold = null, pinch = null, start = null, hover = -1, mine = false, hoverT = 0, tapped = -1;
  const par = {x: 0, y: 0}, parT = {x: 0, y: 0}, downs = new Map(), now = () => win.performance.now(), sn = q => round(q * dpr) / dpr, op = o => { g.globalCompositeOperation = o; }, base = () => g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const flags = () => {
    const on = words(v.layers), act = words(v.interactive);
    F = {arms: v.layout !== 'constellation', hover: act.has('hover'), click: act.has('click'), hold: act.has('hold')};
    for (const k of ['bulge', 'nebula', 'dust', 'field', 'twinkle', 'bloom', 'spikes', 'names']) F[k] = on.has(k);
    OM = v.rotation > 0 ? TAU / v.rotation : 0;
  };
  const retone = () => {
    T = readTones(host, v.colourBy === 'theme');
    halos = T.star.map(c => {
      const s = cv(doc, 64, 64), x = s.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      [[0, .55], [.3, .2], [.62, .04], [1, 0]].forEach(([at, a]) => gr.addColorStop(at, rgba(c, a)));
      x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      return s;
    });
    cores = {}; ringC = fl = bg = null;
  };
  // Crisp stars: core discs cached at device resolution, copied 1:1 on whole device pixels.
  const disc = (f, rd) => {
    const q = max(1, round(rd * 4)) / 4, key = f + ':' + q;
    let c = cores[key];
    if (!c) {
      const n = 2 * ceil(q + 1), x = (c = cores[key] = cv(doc, n, n)).getContext('2d');
      x.fillStyle = rgba(T.core[f]); x.beginPath(); x.arc(n / 2, n / 2, q, 0, TAU); x.fill();
    }
    return c;
  };

  const lang = () => (host.closest('[lang]')?.lang || 'ru').slice(0, 2).toLowerCase();
  const href = n => {
    const p = n.d[lang()] || n.d.ru, url = String(v.hrefPattern || '{path}').replace('{path}', p);
    return /^\//u.test(p ?? '') && /^(https?:)?\//u.test(url) ? url : '';
  };
  // Hidden list of links after the source: focus lights a star; + − 0 arrows zoom.
  const onFocus = e => { const i = e.target.dataset?.i; if (i != null) { mine = false; setHover(+i); } };
  const onBlur = () => setHover(-1);
  const LISTEN = [['focusin', onFocus], ['focusout', onBlur], ['keydown', onKey]];
  const drop = () => {
    if (!nav) return;
    for (const [type, fn] of LISTEN) nav.removeEventListener(type, fn);
    if (!--nav.users) nav.remove();
    nav = null;
  };
  const list = () => {
    drop();
    if (!src || !M.N.some(n => n.n)) return;
    nav = src.nextElementSibling?.matches('[data-registry-graph]') ? src.nextElementSibling : null;
    if (!nav) {
      nav = doc.createElement('nav');
      nav.dataset.registryGraph = '';
      nav.setAttribute('aria-label', lang() === 'ru' ? 'Части SIMAI Framework' : 'SIMAI Framework parts');
      nav.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';
      const ul = nav.appendChild(doc.createElement('ul'));
      for (const n of M.order) {
        const url = href(n);
        if (!n.n || !url) continue;
        const a = ul.appendChild(doc.createElement('li')).appendChild(doc.createElement('a'));
        a.href = url; a.textContent = n.n; a.dataset.i = n.i;
        if (!n.d[lang()]) a.hreflang = 'ru';
      }
      src.after(nav); nav.users = 0;
    }
    nav.users++;
    for (const [type, fn] of LISTEN) nav.addEventListener(type, fn);
  };
  const load = () => {
    src = doc.getElementById(String(v.source || ''));
    let data = null;
    try { data = JSON.parse(src?.textContent || 'null'); } catch { data = null; }
    M = model(data, v); [PX, PY, PS] = [0, 0, 0].map(() => new Float32Array(M.N.length)); hover = tapped = -1; ringC = null;
    list();
  };

  const resize = () => {
    const box = host.getBoundingClientRect();
    dpr = min(2, win.devicePixelRatio || 1); W = max(1, box.width); H = max(1, box.height);
    canvas.width = round(W * dpr); canvas.height = round(H * dpr);
    if (narrow !== (narrow = W < 700)) ringC = null;
    [CX, CY, S] = narrow ? [W * .52, H * .66, W * .8] : [W * .65, H * .52, min(W * .44, H * .95)];
    const style = getComputedStyle(host);
    if (style.direction === 'rtl') CX = W - CX;
    font = style.fontFamily; fl = bg = null; cores = {};
    draw();
  };
  // Bounded differential turn: arms never wind up.
  const spin = r => (OM ? OM * t + .38 * (1 - min(1, r)) * sin(TAU * t / 240) : 0);

  const draw = () => {
    // Narrow: text lies over the galaxy, nebulae at 60 %.
    if (!ringC) ringC = rings(doc, M, T, F, (v.intensity ?? 80) / (narrow ? 133 : 80));
    if (!fl && F.field) fl = field(doc, W, H, dpr, T);
    base(); op('source-over'); g.globalAlpha = 1;
    const z = view.z, tn = now();
    par.x += (parT.x - par.x) * .05; par.y += (parT.y - par.y) * .05;
    // Sky and field are cached together and redrawn only when the parallax or the pan moves.
    const key = [sn(par.x * 14), sn(par.y * 10), sn(view.x * .06), sn(view.y * .06)] + '';
    if (!bg || bg.key !== key) {
      bg ||= cv(doc, canvas.width, canvas.height).getContext('2d');
      const k = bg, gr = k.createRadialGradient(CX * dpr, CY * dpr, 0, CX * dpr, CY * dpr, max(W, H) * dpr);
      gr.addColorStop(0, rgba(T.sky[0])); gr.addColorStop(.6, rgba(T.sky[1])); gr.addColorStop(1, rgba(T.sky[1]));
      k.fillStyle = gr; k.fillRect(0, 0, k.canvas.width, k.canvas.height); k.key = key;
      if (F.field) for (const [c, d] of fl.L) k.drawImage(c, round((-fl.PAD - par.x * 14 * d + view.x * .06 * d) * dpr), round((-fl.PAD - par.y * 10 * d + view.y * .06 * d) * dpr));
    }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bg.canvas, 0, 0); base();
    if (F.field) {
      const p = (dpr > 1.5 ? 2 : 1) / dpr;
      for (const s of fl.tw) {
        g.fillStyle = rgba(T.field, (F.twinkle && !still ? s[2] * (.55 + .45 * sin(tn / 1000 * s[4] + s[3])) : s[2]).toFixed(3));
        g.fillRect(sn(s[0] - par.x * 14 + view.x * .06), sn(s[1] - par.y * 10 + view.y * .06), p, p);
      }
    }
    const ox = CX + view.x, oy = CY + view.y, sc = S * z, ct = cos(TILT), st = sin(TILT);
    op('lighter');
    ringC.forEach((c, k) => {
      base(); g.translate(ox, oy); g.rotate(TILT); g.scale(sc, sc * COSI); g.rotate(spin((RINGS[k][0] + RINGS[k][1]) / 2));
      g.drawImage(c, -EXT, -EXT, 2 * EXT, 2 * EXT);
    });
    base();
    const kin = hover >= 0, me = M.N[hover], lit = new Set(kin ? [hover, ...me.users, ...me.used] : []);
    lines = 0;
    if (kin) {
      const fade = still ? 1 : min(1, (tn - hoverT) / 350);
      g.lineWidth = 1;
      [...me.users.map(u => [hover, u]), ...me.used.map(u => [u, hover])].forEach(([a, b], k) => {
        const ax = PX[a], ay = PY[a], bx = PX[b], by = PY[b], gr = g.createLinearGradient(ax, ay, bx, by);
        gr.addColorStop(0, wh(.3 * fade)); gr.addColorStop(1, wh(.08 * fade));
        g.strokeStyle = gr; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); lines++;
        if (still || paused) return;
        const q = (tn / 1600 + k * .37) % 1, c = disc(M.N[b].f, 1.1 * (.5 + .5 * sin(PI * q)) * dpr), w = c.width / dpr;
        g.globalAlpha = fade * .9; g.drawImage(c, sn(ax + (bx - ax) * q) - w / 2, sn(ay + (by - ay) * q) - w / 2, w, w); g.globalAlpha = 1;
      });
    }
    const shrink = narrow ? .82 : 1, grow = z > 1 ? z ** .35 : 1;
    for (let j = 0; j < M.N.length; j++) {
      const n = M.N[j], a = (F.arms ? n.ta : n.tf) + spin(n.r), gx = n.r * cos(a), gy = n.r * sin(a) * COSI, X = ox + (gx * ct - gy * st) * sc, Y = oy + (gx * st + gy * ct) * sc, sz = n.s * shrink * grow;
      PX[j] = X; PY[j] = Y; PS[j] = sz;
      if (X < -40 || Y < -40 || X > W + 40 || Y > H + 40) continue;
      const on = lit.has(j), al = kin && !on ? .18 : 1, cx = sn(X), cy = sn(Y), cr = max(.6, .45 + .2 * sz);
      if (F.bloom) { const hs = min(31 / dpr, cr * (on ? 5.5 : 4.5)); g.globalAlpha = al * (on ? .85 : .6); g.drawImage(halos[n.f], cx - hs, cy - hs, 2 * hs, 2 * hs); }
      const c = disc(n.f, cr * dpr), w = c.width / dpr;
      g.globalAlpha = al; g.drawImage(c, cx - w / 2, cy - w / 2, w, w);
      if (F.spikes && n.sp) {
        const l = cr * 9, p = 1 / dpr;
        for (const [x0, y0, x1, y1] of [[cx - l, cy, cx + l, cy], [cx, cy - l, cx, cy + l]]) {
          const gr = g.createLinearGradient(x0, y0, x1, y1);
          gr.addColorStop(0, wh(0)); gr.addColorStop(.5, wh(.7)); gr.addColorStop(1, wh(0));
          g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0 || p, y1 - y0 || p);
        }
      }
    }
    g.globalAlpha = 1; op('source-over'); g.textBaseline = 'middle';
    // Names past x2.2: biggest first, 40 at most, no overlap.
    if (F.names && z > 2.2) {
      const vis = [], boxes = [];
      for (let j = 0; j < M.N.length; j++) { const x = PX[j], y = PY[j]; if (M.N[j].n && (narrow || x > W * .46) && x > 0 && y > 0 && x < W && y < H) vis.push(j); }
      vis.sort((a, b) => PS[b] - PS[a]);
      g.font = `12px ${font}`; g.fillStyle = wh((.8 * min(1, (z - 2.2) * 1.5)).toFixed(3));
      for (const j of vis) {
        if (boxes.length >= 40) break;
        const tx = PX[j] + PS[j] + 5, ty = PY[j], w = g.measureText(M.N[j].n).width;
        if (boxes.some(([bx, by, bw]) => tx < bx + bw && tx + w > bx && abs(ty - by) < 14)) continue;
        boxes.push([tx, ty, w]); g.fillText(M.N[j].n, sn(tx), sn(ty));
      }
    }
    if (kin && me.n) {
      const x = PX[hover], y = PY[hover];
      g.strokeStyle = wh(.85); g.lineWidth = 1.25; g.beginPath(); g.arc(x, y, max(6, PS[hover] * 1.6 + 3), 0, TAU); g.stroke();
      g.font = `600 13px ${font}`;
      const w = round(g.measureText(me.n).width + 16);
      let lx = round(x + 14), ly = round(y - 38);
      if (lx + w > W - 8) lx = round(x - w - 14);
      if (ly < 8) ly = round(y + 14);
      g.fillStyle = rgba(T.pill, .94); g.beginPath(); g.roundRect(lx, ly, w, 24, 6); g.fill();
      g.fillStyle = rgba(T.ink); g.fillText(me.n, lx + 8, ly + 12);
    }
  };

  const live = () => !still && !paused && !!(OM || (F.twinkle && fl?.tw.length));
  const needs = () => visible && !doc.hidden && (live() || hold || anim || pinch || (hover >= 0 && !still && !paused) || abs(parT.x - par.x) + abs(parT.y - par.y) > .004);
  const stop = () => { if (raf) win.cancelAnimationFrame(raf); raf = last = 0; };
  const kick = () => { if (!raf && visible && !doc.hidden) raf = win.requestAnimationFrame(frame); };
  const frame = ts => {
    raf = 0;
    const dt = last ? min(50, ts - last) : 16;
    last = ts;
    if (live()) t += dt / 1000 / (view.z > 1 ? sqrt(view.z) : 1);
    if (hold) zoomTo(still ? max(view.z, 3) : view.z * exp(dt / 1000 * 1.15), hold.x, hold.y);
    if (anim) {
      const k = min(1, (ts - anim.t0) / anim.d), e = 1 - (1 - k) ** 3;
      for (const p of 'zxy') view[p] = anim.a[p] + (anim.b[p] - anim.a[p]) * e;
      if (k >= 1) anim = null;
    }
    draw();
    if (needs()) raf = win.requestAnimationFrame(frame); else last = 0;
  };

  const zoomTo = (z, ax, ay) => { z = clamp(z, 1, 8); const k = z / view.z; view.x = ax - CX - (ax - CX - view.x) * k; view.y = ay - CY - (ay - CY - view.y) * k; view.z = z; };
  const ease = (b, d = 700) => { anim = {a: {...view}, b, t0: now(), d: still ? 1 : d}; kick(); };
  const keep = () => { rest = {...view}; };
  const reset = () => { rest = {z: 1, x: 0, y: 0}; ease(rest); };
  const setHover = j => { if (j !== hover) { hoverT = now(); hover = j; kick(); } };
  const hit = (x, y, touch) => {
    let best = -1, bd = 1e9;
    M.N.forEach((n, j) => {
      const dx = PX[j] - x, dy = PY[j] - y, d = dx * dx + dy * dy, l = max(touch ? 22 : 10, PS[j] * 1.2 + 4);
      if (n.n && d < l * l && d < bd) { bd = d; best = j; }
    });
    return best;
  };
  // The page may cancel registry-graph-open.
  const go = j => {
    const n = M.N[j], url = href(n);
    if (url && host.dispatchEvent(new win.CustomEvent('registry-graph-open', {bubbles: true, cancelable: true, detail: {name: n.n, url}}))) win.location.assign(url);
  };

  const at = e => {
    const box = host.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top, target = e.target;
    return {x, y, in: x >= 0 && y >= 0 && x <= box.width && y <= box.height && !target?.closest?.('a,button,input,textarea,select,label,[role="button"]') && host.parentElement?.contains(target) !== false};
  };
  const onMove = e => {
    const p = at(e);
    if (downs.has(e.pointerId)) downs.set(e.pointerId, p);
    if (!narrow) { parT.x = p.in ? p.x / W - .5 : 0; parT.y = p.in ? p.y / H - .5 : 0; kick(); }
    if (pinch) {
      if (downs.size === 2) { const [a, b] = downs.values(); zoomTo(pinch.z * hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); keep(); kick(); }
      return;
    }
    if (start) {
      if (!start.moved && hypot(p.x - start.x, p.y - start.y) > 6) { start.moved = 1; if (!hold) clearTimeout(start.timer); }
      if (hold) { hold.x = p.x; hold.y = p.y; return; }
      if (start.moved && view.z > 1.01) { view.x += p.x - start.lx; view.y += p.y - start.ly; keep(); kick(); }
      start.lx = p.x; start.ly = p.y;
      return;
    }
    if (e.pointerType === 'mouse' && F.hover) {
      const j = p.in ? hit(p.x, p.y) : -1;
      if (j >= 0 || mine) { mine = j >= 0; setHover(j); }
    }
  };
  const onDown = e => {
    const p = at(e);
    if (!p.in || (e.pointerType === 'mouse' && e.button)) return;
    downs.set(e.pointerId, p);
    if (downs.size === 2) {
      clearTimeout(start?.timer); start = hold = null;
      const [a, b] = downs.values();
      pinch = {d: hypot(a.x - b.x, a.y - b.y) || 1, z: view.z};
      return;
    }
    start = {x: p.x, y: p.y, lx: p.x, ly: p.y, type: e.pointerType, moved: 0,
      timer: F.hold && win.setTimeout(() => { if (start && !start.moved) { hold = {x: start.lx, y: start.ly}; anim = null; kick(); } }, e.pointerType === 'mouse' ? 260 : 380)};
  };
  const onUp = (e, cancel) => {
    const p = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    if (pinch) { if (downs.size < 2) pinch = null; return; }
    if (!start) return;
    clearTimeout(start.timer);
    const s = start, mouse = s.type === 'mouse';
    start = null;
    if (hold) { hold = null; ease(rest, 750); return; }
    if (cancel || s.moved || !p) return;
    // Touch: first tap shows, second opens.
    const j = hit(p.x, p.y, !mouse);
    if (j >= 0 && (mouse || tapped === j)) { if (F.click) go(j); } else if (!mouse) { tapped = j; mine = true; setHover(j); }
  };
  const onWheel = e => {
    const p = at(e);
    if (!p.in || !F.hold || !(e.ctrlKey || e.metaKey || view.z > 1.01)) return;
    e.preventDefault(); anim = null;
    zoomTo(view.z * exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)), p.x, p.y); keep(); kick();
  };
  function onKey(e) {
    const k = e.key, d = 40;
    if (!F.hold) return;
    anim = null;
    if (k === '0') reset();
    else if (k === '+' || k === '=') zoomTo(view.z * 1.25, CX, CY);
    else if (k === '-' || k === '_' || k === '−') zoomTo(view.z / 1.25, CX, CY);
    else if (k.startsWith('Arrow')) { view.x += {ArrowLeft: d, ArrowRight: -d}[k] ?? 0; view.y += {ArrowUp: d, ArrowDown: -d}[k] ?? 0; } else return;
    e.preventDefault();
    if (k !== '0') { keep(); kick(); }
  }
  const events = [['pointermove', onMove], ['pointerdown', onDown], ['pointerup', e => onUp(e, false)], ['pointercancel', e => onUp(e, true)],
    ['dblclick', e => { if (F.hold && at(e).in) reset(); }], ['contextmenu', e => { if (hold || start) e.preventDefault(); }], ['wheel', onWheel]];
  for (const [type, fn] of events) win.addEventListener(type, fn, {passive: !/wh|co/.test(type)});

  const sizes = new ResizeObserver(resize);
  const screen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) kick(); else stop(); });
  const onVisibility = () => { last = 0; if (doc.hidden) stop(); else kick(); };
  const onMotion = () => { still = !!(context.reducedMotion || motion.matches); stop(); kick(); };
  doc.addEventListener('visibilitychange', onVisibility);
  motion?.addEventListener?.('change', onMotion);
  flags(); retone(); load(); resize(); sizes.observe(host); screen.observe(host); kick();
  // Read-only state for tests.
  canvas.registryGraph = () => ({z: view.z, lines, hover, N: M.N, PX, PY, href});

  return {
    update(next = {}) {
      const before = v;
      v = {...next}; flags();
      if ('source radiusBy sizeBy arms pitch layout hrefPattern'.split(' ').some(k => before[k] !== v[k])) load();
      retone(); resize(); kick();
    },
    pause() { paused = true; stop(); },
    resume() { paused = false; kick(); },
    destroy() {
      stop(); clearTimeout(start?.timer); sizes.disconnect(); screen.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      motion?.removeEventListener?.('change', onMotion);
      for (const [type, fn] of events) win.removeEventListener(type, fn);
      drop(); canvas.remove();
    },
  };
}
