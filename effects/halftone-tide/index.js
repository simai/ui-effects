// Halftone tide (halftone-tide) -- SIMAI Framework background effect, simai.effect 1.0.0; schemes light and dark.
// One module, no imports, no network. Generated from the effects-lab light sources.

// Shared runtime of the light set, copied into every module so each stays one file with no imports.
// It owns the canvas, sizing (pixel ratio capped at 2), theme colours, the pointer, the frame loop
// and every rule of simai.effect 1.0.0: still frame for reduced motion, idle while hidden or off
// screen, nothing left behind after destroy.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const TONES = {primary: 'primary', secondary: 'secondary', tertiary: 'tertiary', ink: 'ink'};

function run(host, settings, context, spec) {
  const doc = host.ownerDocument;
  const win = doc.defaultView || globalThis;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  let placed = null;
  if (win.getComputedStyle(host).position === 'static') {
    placed = host.style.position;
    host.style.position = 'relative';
  }
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const api = {canvas, ctx, doc, w: 1, h: 1, ratio: 1, quality: 1, t: 0, still: false,
    values: {...settings}, colors: null, pointer: {x: 0.5, y: 0.5, on: 0, tx: 0.5, ty: 0.5, to: 0}};
  const motion = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const scheme = win.matchMedia ? win.matchMedia('(prefers-color-scheme: dark)') : null;
  let reduced = Boolean(context && context.reducedMotion) || Boolean(motion && motion.matches);
  let paused = false;
  let onScreen = true;
  let destroyed = false;
  let dirty = false;
  let frame = 0;
  let last = 0;
  let cost = 0;
  let slow = 0;
  let listening = false;

  const readTheme = () => {
    const probe = doc.createElement('i');
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
    host.append(probe);
    const one = doc.createElement('canvas');
    one.width = one.height = 1;
    const c1 = one.getContext('2d', {willReadFrequently: true});
    const read = (name, fallback) => {
      probe.style.color = `var(${name}, ${fallback})`;
      c1.fillStyle = fallback;
      c1.fillStyle = win.getComputedStyle(probe).color;
      c1.fillRect(0, 0, 1, 1);
      const d = c1.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    // Palette tones only, never theme roles: a tone keeps its value in both
    // themes, so the picture does not depend on the page theme. The `scheme`
    // setting picks one of two designed tone sets: light draws a paper ground
    // with 40 tones, dark a deep ground with 80 tones. The host gives the area
    // the matching theme class (.theme-light / .theme-dark) for the text over it.
    api.dark = api.values.scheme === 'dark';
    api.colors = api.dark ? {
      surface: mix(read('--sf-neutral-5', '#0f0f12'), read('--sf-primary-10', '#001a40'), 0.4),
      ink: read('--sf-neutral-90', '#e3e2e6'),
      primary: read('--sf-primary-80', '#acc7ff'),
      secondary: read('--sf-secondary-80', '#bbc6e4'),
      tertiary: read('--sf-tertiary-80', '#ecb2f5'),
      primary80: read('--sf-primary-30', '#004494'),
    } : {
      surface: read('--sf-neutral-98', '#faf9fe'),
      ink: read('--sf-neutral-10', '#1a1b1f'),
      primary: read('--sf-primary-40', '#005bbe'),
      secondary: read('--sf-secondary-40', '#535e77'),
      tertiary: read('--sf-tertiary-40', '#7c4c86'),
      primary80: read('--sf-primary-80', '#acc7ff'),
    };
    probe.remove();
    api.tone = (key) => api.colors[TONES[key] || 'primary'];
  };

  const paint = () => {
    if (doc.hidden) { dirty = true; return; }
    dirty = false;
    ctx.setTransform(api.ratio, 0, 0, api.ratio, 0, 0);
    spec.draw(api);
  };
  const resize = () => {
    const box = host.getBoundingClientRect();
    api.w = Math.max(1, box.width);
    api.h = Math.max(1, box.height);
    api.ratio = Math.min(win.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(api.w * api.ratio));
    canvas.height = Math.max(1, Math.round(api.h * api.ratio));
    if (spec.resize) spec.resize(api);
    paint();
  };
  const live = () => !destroyed && !paused && !reduced && onScreen && !doc.hidden;
  const tick = (now) => {
    frame = 0;
    if (!live()) return;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    api.t += dt * api.values.speed / 100;
    const p = api.pointer;
    const k = 1 - Math.exp(-dt * 3);
    p.x += (p.tx - p.x) * k;
    p.y += (p.ty - p.y) * k;
    p.on += (p.to - p.on) * k;
    const begin = win.performance.now();
    paint();
    // Graceful degradation: a frame that keeps costing more than ~4 ms lowers the quality a step.
    cost = cost * 0.9 + (win.performance.now() - begin) * 0.1;
    if (cost > 4 && api.quality > 0.5) {
      if (++slow > 40) {
        slow = 0;
        cost = 0;
        api.quality = Math.max(0.5, api.quality - 0.25);
        if (spec.resize) spec.resize(api);
      }
    } else slow = 0;
    frame = win.requestAnimationFrame(tick);
  };
  const sync = () => {
    if (live()) {
      if (!frame) {
        last = win.performance.now();
        frame = win.requestAnimationFrame(tick);
      }
    } else if (frame) {
      win.cancelAnimationFrame(frame);
      frame = 0;
    }
  };
  const still = () => {
    api.still = reduced;
    if (reduced) {
      api.t = spec.still || 10;
      api.pointer.on = api.pointer.to = 0;
    }
  };

  const onPointer = (event) => {
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const p = api.pointer;
    p.tx = x;
    p.ty = y;
    p.to = x > -0.05 && x < 1.05 && y > -0.05 && y < 1.05 ? 1 : 0;
  };
  const onLeave = (event) => { if (!event.relatedTarget) api.pointer.to = 0; };
  const listen = () => {
    const want = Boolean(api.values.interactive) && !reduced && !destroyed;
    if (want === listening) return;
    listening = want;
    const verb = want ? 'addEventListener' : 'removeEventListener';
    win[verb]('pointermove', onPointer, {passive: true});
    doc[verb]('pointerout', onLeave, {passive: true});
    if (!want) api.pointer.to = 0;
  };

  const refreshTheme = () => {
    if (destroyed) return;
    readTheme();
    if (spec.theme) spec.theme(api);
    paint();
  };
  const onVisibility = () => {
    if (!doc.hidden && dirty) paint();
    sync();
  };
  const onMotion = () => {
    reduced = Boolean(context && context.reducedMotion) || Boolean(motion && motion.matches);
    still();
    listen();
    paint();
    sync();
  };

  readTheme();
  still();
  if (spec.init) spec.init(api);
  resize();
  const sizes = new win.ResizeObserver(resize);
  sizes.observe(host);
  const sight = win.IntersectionObserver ? new win.IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1].isIntersecting;
    sync();
  }) : null;
  if (sight) sight.observe(host);
  const themeWatch = new win.MutationObserver(refreshTheme);
  const watched = {attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-sf-theme', 'data-color-scheme']};
  themeWatch.observe(doc.documentElement, watched);
  if (doc.body) themeWatch.observe(doc.body, watched);
  doc.addEventListener('visibilitychange', onVisibility);
  if (motion && motion.addEventListener) motion.addEventListener('change', onMotion);
  if (scheme && scheme.addEventListener) scheme.addEventListener('change', refreshTheme);
  listen();
  sync();

  return {
    update(next) {
      if (destroyed) return;
      api.values = {...api.values, ...next};
      readTheme();
      listen();
      if (spec.resize) spec.resize(api);
      paint();
      sync();
    },
    pause() { paused = true; sync(); },
    resume() { paused = false; sync(); },
    refreshTheme,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      sync();
      listen();
      sizes.disconnect();
      if (sight) sight.disconnect();
      themeWatch.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      if (motion && motion.removeEventListener) motion.removeEventListener('change', onMotion);
      if (scheme && scheme.removeEventListener) scheme.removeEventListener('change', refreshTheme);
      if (spec.destroy) spec.destroy(api);
      canvas.width = canvas.height = 0;
      canvas.remove();
      if (placed !== null) host.style.position = placed;
    },
  };
}

// Halftone tide: a print screen set at 15 degrees whose dots swell and shrink with slow crossing
// waves, like a newspaper image of the sea. One path per frame, filled or stroked once.
const LUT = new Float32Array(1024);
for (let i = 0; i < 1024; i += 1) LUT[i] = Math.sin((i / 1024) * Math.PI * 2);
const sn = (x) => LUT[((x * 162.9746617) | 0) & 1023];

export function mount(host, settings, context) {
  return run(host, settings, context, {
    still: 14,
    draw(api) {
      const {ctx, w, h, t, values, colors} = api;
      const s = values.density / Math.sqrt(api.quality);
      const shape = values.shape;
      // Light: newsprint dots. Dark: a phosphor screen, dots of the 80 tone lit from a deep ground,
      // with a slow vertical falloff so the bottom of the screen settles darker.
      const tone = mix(colors.surface, api.tone(values.tone), api.dark ? 0.16 + 0.24 * (values.intensity / 100) : 0.2 + 0.3 * (values.intensity / 100));
      ctx.fillStyle = css(colors.surface);
      ctx.fillRect(0, 0, w, h);
      const ang = Math.PI / 12;
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      const p = api.pointer;
      const lens = values.interactive ? p.on : 0;
      const lx = p.x * w;
      const ly = p.y * h;
      // The rotated lattice is walked over the box that covers the host.
      const half = Math.hypot(w, h) / 2;
      const cx = w / 2;
      const cy = h / 2;
      const n = Math.ceil(half / s) + 1;
      const path = new Path2D();
      const rmax = s * 0.5;
      const k1 = 1 / 210;
      const k2 = 1 / 330;
      for (let j = -n; j <= n; j += 1) {
        for (let i = -n; i <= n; i += 1) {
          const u = i * s;
          const v = j * s;
          const x = cx + u * ca - v * sa;
          const y = cy + u * sa + v * ca;
          if (x < -s || y < -s || x > w + s || y > h + s) continue;
          let f = 0.56 + 0.26 * sn(x * k1 + y * k1 * 0.55 - t * 0.5) + 0.2 * sn(-x * k2 + y * k2 * 1.3 + t * 0.37) + 0.12 * sn((x + y) * k1 * 0.4 + t * 0.21);
          if (lens > 0) {
            const dx = (x - lx) / 140;
            const dy = (y - ly) / 140;
            f += 0.45 * lens * Math.exp(-(dx * dx + dy * dy));
          }
          if (f <= 0.08) continue;
          if (f > 1) f = 1;
          const r = rmax * Math.pow(f, 1.3);
          if (r < 0.35) continue;
          if (shape === 'line') {
            path.moveTo(x - r * ca * 1.6, y - r * sa * 1.6);
            path.lineTo(x + r * ca * 1.6, y + r * sa * 1.6);
          } else if (shape === 'cross') {
            const b = r * 0.32;
            path.rect(x - r, y - b, r * 2, b * 2);
            path.rect(x - b, y - r, b * 2, r - b);
            path.rect(x - b, y + b, b * 2, r - b);
          } else {
            path.moveTo(x + r, y);
            path.arc(x, y, r, 0, Math.PI * 2);
          }
        }
      }
      if (shape === 'line') {
        ctx.strokeStyle = css(tone);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(0.8, s * 0.16);
        ctx.stroke(path);
      } else if (api.dark) {
        const fall = ctx.createLinearGradient(0, 0, 0, h);
        fall.addColorStop(0, css(tone));
        fall.addColorStop(1, css(mix(colors.surface, tone, 0.6)));
        ctx.fillStyle = fall;
        ctx.fill(path);
      } else {
        ctx.fillStyle = css(tone);
        ctx.fill(path);
      }
    },
  });
}
