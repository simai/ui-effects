// Guilloche (guilloche) -- SIMAI Framework background effect, simai.effect 1.0.0; schemes light and dark.
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

// Guilloche: the engraved line-work of banknotes and certificates. Rosettes and bands of thin
// modulated curves interleave; their phase creeps, so the moire breathes without ever flickering.
export function mount(host, settings, context) {
  return run(host, settings, context, {
    still: 12,
    draw(api) {
      const {ctx, w, h, t, values, colors} = api;
      // Light: warm security paper. Dark: a deep note with a faint glow behind the main rosette,
      // so the line-work reads as engraving catching light, not as inverted ink.
      ctx.fillStyle = css(api.dark ? colors.surface : mix(colors.surface, [250, 248, 242], 0.4));
      ctx.fillRect(0, 0, w, h);
      if (api.dark) {
        const glow = ctx.createRadialGradient(w * 0.78, h * 0.3, 0, w * 0.78, h * 0.3, Math.max(w, h) * 0.6);
        glow.addColorStop(0, css(mix(colors.surface, colors.primary80, 0.55), 1));
        glow.addColorStop(1, css(colors.surface, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }
      const pattern = values.pattern;
      const lines = Math.round(values.density * (0.6 + 0.4 * api.quality));
      const tone = api.tone(values.tone);
      // Light lines on a dark ground carry more weight per pixel, so the dark scheme mixes less.
      const k = api.dark ? 0.26 + 0.3 * (values.intensity / 100) : 0.35 + 0.35 * (values.intensity / 100);
      const p = api.pointer;
      const follow = values.interactive ? p.on : 0;
      const ph = t * 0.06;
      ctx.lineWidth = api.dark ? 0.6 : 0.7;
      ctx.lineJoin = 'round';
      // A rosette: rings of curves r(a) = r0 + A sin(n a + phase), the phases spread over one petal,
      // so neighbouring curves cross and weave into a lattice ribbon -- the engraver's rose engine.
      const rosette = (cx, cy, R, colour, alpha) => {
        const path = new Path2D();
        for (let ring = 0; ring < 3; ring += 1) {
          const r0 = R * (0.3 + ring * 0.3);
          const petals = Math.max(8, Math.round(r0 / 34));
          const amp = Math.min(26, r0 * 0.08);
          const per = Math.max(4, Math.round(lines / 3));
          const samples = Math.max(160, Math.min(900, petals * 14));
          for (let c = 0; c < per; c += 1) {
            const phase = (c / per) * Math.PI * 2 + ph * (ring % 2 ? -1 : 1);
            for (let s = 0; s <= samples; s += 1) {
              const a = (s / samples) * Math.PI * 2;
              const rr = r0 + amp * Math.sin(petals * a + phase) * (0.8 + 0.2 * Math.sin(2 * a - ph));
              const x = cx + rr * Math.cos(a);
              const y = cy + rr * Math.sin(a);
              if (s) path.lineTo(x, y); else path.moveTo(x, y);
            }
          }
        }
        ctx.strokeStyle = css(colour, alpha);
        ctx.stroke(path);
      };
      const bands = (colour, alpha) => {
        const path = new Path2D();
        const gap = 150;
        const per = Math.max(4, Math.round(lines / 3));
        const step = 5;
        for (let yc = gap * 0.5 - (follow ? (p.y - 0.5) * 20 : 0); yc < h + gap; yc += gap) {
          for (let c = 0; c < per; c += 1) {
            const phase = (c / per) * Math.PI * 2 + ph * 2;
            for (let x = -step; x <= w + step; x += step) {
              const y = yc + 26 * Math.sin(x / 70 + phase) * (0.6 + 0.4 * Math.sin(x / 410 - ph));
              if (x === -step) path.moveTo(x, y); else path.lineTo(x, y);
            }
          }
        }
        ctx.strokeStyle = css(colour, alpha);
        ctx.stroke(path);
      };
      const main = mix(colors.surface, tone, k);
      const second = mix(colors.surface, values.tone === 'tertiary' ? colors.primary : colors.tertiary, k * 0.8);
      const fx = follow ? (p.x - 0.5) * w * 0.04 : 0;
      const fy = follow ? (p.y - 0.5) * h * 0.04 : 0;
      const R = Math.max(w, h) * 0.5;
      if (pattern === 'bands' || pattern === 'mesh') bands(main, pattern === 'mesh' ? 0.4 : 0.6);
      if (pattern === 'rosettes' || pattern === 'mesh') {
        rosette(w * 0.78 + fx, h * 0.3 + fy, R, main, 0.55);
        rosette(w * 0.12 - fx, h * 0.92 - fy, R * 0.8, second, 0.45);
      }
    },
  });
}
