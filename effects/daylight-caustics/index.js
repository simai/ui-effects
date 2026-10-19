// Daylight caustics (daylight-caustics) -- SIMAI Framework light background effect, simai.effect 1.1.0.
// One module, no imports, no network. Generated from the effects-lab light sources.

// Shared runtime of the light set, copied into every module so each stays one file with no imports.
// It owns the canvas, sizing (pixel ratio capped at 2), theme colours, the pointer, the frame loop
// and every rule of simai.effect 1.1.0: still frame for reduced motion, idle while hidden or off
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
    // themes, so this light effect looks the same on a light or a dark page.
    // The host forces its area into .theme-light for the text over it.
    api.colors = {
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

// Daylight caustics: sunlight through shallow water on a pale floor. A small buffer holds an
// interference network of warped waves; it is stretched over the host with smoothing, so the light
// stays soft and the cost stays tied to the buffer, not to the screen.
const LUT = new Float32Array(4096);
for (let i = 0; i < 4096; i += 1) LUT[i] = Math.sin((i / 4096) * Math.PI * 2);
const sn = (x) => LUT[((x * 651.8986469) | 0) & 4095];
const SCALE = {fine: 55, medium: 90, broad: 150};

export function mount(host, settings, context) {
  let buffer = null;
  let bctx = null;
  let image = null;
  let bw = 0;
  let bh = 0;
  return run(host, settings, context, {
    still: 37,
    resize(api) {
      const cell = 7 / api.quality;
      bw = Math.min(240, Math.ceil(api.w / cell) + 1);
      bh = Math.min(160, Math.ceil(api.h / cell) + 1);
      buffer = buffer || api.doc.createElement('canvas');
      buffer.width = bw;
      buffer.height = bh;
      bctx = buffer.getContext('2d');
      image = bctx.createImageData(bw, bh);
    },
    draw(api) {
      const {w, h, t, values, colors} = api;
      const k = values.intensity / 100;
      const tone = api.tone(values.tone);
      const deep = mix(colors.surface, tone, 0.06 + 0.16 * k);
      const pale = mix(colors.surface, tone, 0.02 + 0.05 * k);
      const lit = mix(colors.surface, [255, 255, 255], 0.9);
      const feature = SCALE[values.scale] || SCALE.medium;
      const sx = w / (bw - 1) / feature;
      const sy = h / (bh - 1) / feature;
      const p = api.pointer;
      const px = p.x * w / feature;
      const py = p.y * h / feature;
      const glow = values.interactive ? p.on : 0;
      const data = image.data;
      const tt = t * 0.55;
      let o = 0;
      for (let j = 0; j < bh; j += 1) {
        const v = j * sy;
        for (let i = 0; i < bw; i += 1) {
          const u = i * sx;
          const wx = u + 0.55 * sn(v * 1.3 + tt * 0.7) + 0.25 * sn(v * 2.9 - tt * 0.4);
          const wy = v + 0.55 * sn(u * 1.1 - tt * 0.6 + 1.7) + 0.25 * sn(u * 2.7 + tt * 0.5);
          const f1 = (sn(wx * 2.1 + tt) + sn(wy * 2.0 - tt * 0.8) + sn((wx + wy) * 1.45 + tt * 0.5)) / 3;
          const f2 = (sn(wx * 3.3 - tt * 0.9 + 2.1) + sn(wy * 3.1 + tt * 0.7) + sn((wx - wy) * 2.2 - tt * 0.6)) / 3;
          let a = 1 - (f1 < 0 ? -f1 : f1);
          let b = 1 - (f2 < 0 ? -f2 : f2);
          a *= a; a *= a; a *= a;
          b *= b; b *= b; b *= b;
          let light = (a + b * 0.8) * 0.85;
          // Broad shallow and deep zones, so the floor is not uniform.
          const zone = 0.5 + 0.5 * sn(u * 0.33 + v * 0.21 + tt * 0.15);
          if (glow > 0) {
            const dx = u - px;
            const dy = v - py;
            light *= 1 + 0.9 * glow * Math.exp(-(dx * dx + dy * dy) * 0.35);
          }
          if (light > 1) light = 1;
          const br = deep[0] + (pale[0] - deep[0]) * zone;
          const bg = deep[1] + (pale[1] - deep[1]) * zone;
          const bb = deep[2] + (pale[2] - deep[2]) * zone;
          data[o] = br + (lit[0] - br) * light;
          data[o + 1] = bg + (lit[1] - bg) * light;
          data[o + 2] = bb + (lit[2] - bb) * light;
          data[o + 3] = 255;
          o += 4;
        }
      }
      bctx.putImageData(image, 0, 0);
      const ctx = api.ctx;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(buffer, 0, 0, bw, bh, 0, 0, w, h);
    },
  });
}
