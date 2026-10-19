// Template effect (simai.effect 1.0.0; schemes dark and light): soft dots drift
// slowly. Copy this folder to effects/<id>/, rename, and replace draw().
//
// What every effect must do, and where this template does it:
// - mount(host, settings, context) returns {update, pause, resume, destroy};
// - draw only inside host, on its own canvas; aria-hidden; no pointer capture
//   (pointer reactions listen on window, passive);
// - no network: no requests, no dynamic imports, no remote images or fonts;
// - reduced motion (context.reducedMotion or the media query): one still frame,
//   no animation frames;
// - hidden tab or host off screen: no frames;
// - devicePixelRatio capped at 2, ResizeObserver for size;
// - colours from palette tones (--sf-primary-40, --sf-neutral-98 ...), never roles;
// - destroy leaves no nodes, frames, observers or listeners; a second mount works.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Palette tones of the theme, read through a probe so var() chains settle.
// A tone keeps its value in both page themes; a role (--sf-primary,
// --sf-surface-0, --sf-on-surface) does not, so roles are never read.
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
  // Each scheme is its own design: a deep ground with light dots, or paper with ink dots.
  const tones = scheme === 'light'
    ? {ground: read('--sf-neutral-98', '#faf9fe'), dot: read('--sf-primary-40', '#005bbe'), alt: read('--sf-tertiary-40', '#7c4c86')}
    : {ground: read('--sf-neutral-5', '#111318'), dot: read('--sf-primary-80', '#acc7ff'), alt: read('--sf-tertiary-80', '#e9b4f2')};
  probe.remove();
  return tones;
}

export function mount(host, settings, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none';
  host.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false});
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let values = {...settings};
  let tones = readTones(host, values.scheme);
  let still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  let paused = false;
  let visible = true;
  let frame = 0;
  let w = 1;
  let h = 1;
  let t = 0;
  let last = 0;
  const pointer = {x: 0.5, y: 0.5};
  let dots = [];

  const seed = () => {
    const count = Math.round(20 + values.density * 0.8);
    dots = Array.from({length: count}, (_, i) => ({x: Math.random(), y: Math.random(), r: 2 + Math.random() * values.size, p: i * 1.7, alt: i % 5 === 0}));
  };
  const draw = () => {
    ctx.fillStyle = rgba(tones.ground);
    ctx.fillRect(0, 0, w, h);
    for (const dot of dots) {
      const x = (dot.x + Math.sin(t * 0.05 + dot.p) * 0.02 + (values.interactive ? (pointer.x - 0.5) * 0.02 : 0)) * w;
      const y = (dot.y + Math.cos(t * 0.04 + dot.p) * 0.02) * h;
      ctx.fillStyle = rgba(dot.alt ? tones.alt : tones.dot, 0.18);
      ctx.beginPath();
      ctx.arc(x, y, dot.r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  const loop = (now) => {
    frame = 0;
    t += clamp((now - (last || now)) / 1000, 0, 0.1) * (values.speed / 100);
    last = now;
    draw();
    schedule();
  };
  const schedule = () => {
    if (frame || still || paused || !visible || doc.hidden) return;
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
    w = Math.max(1, box.width);
    h = Math.max(1, box.height);
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  };
  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  const screen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) schedule(); else stop(); });
  screen.observe(host);
  const onVisibility = () => (doc.hidden ? stop() : schedule());
  doc.addEventListener('visibilitychange', onVisibility);
  const onMotion = () => { still = Boolean(context.reducedMotion) || motion.matches; if (still) { stop(); draw(); } else schedule(); };
  motion?.addEventListener?.('change', onMotion);
  const onPointer = (event) => { pointer.x = event.clientX / win.innerWidth; pointer.y = event.clientY / win.innerHeight; };
  win.addEventListener('pointermove', onPointer, {passive: true});

  seed();
  resize();
  schedule();

  return {
    update(next) {
      const reseed = next.density !== values.density || next.size !== values.size;
      const rescheme = next.scheme !== values.scheme;
      values = {...next};
      if (rescheme) tones = readTones(host, values.scheme);
      if (reseed) seed();
      draw();
    },
    refreshTheme() { tones = readTones(host, values.scheme); draw(); },
    pause() { paused = true; stop(); },
    resume() { paused = false; schedule(); },
    destroy() {
      stop();
      sizes.disconnect();
      screen.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      motion?.removeEventListener?.('change', onMotion);
      win.removeEventListener('pointermove', onPointer);
      canvas.remove();
    },
  };
}
