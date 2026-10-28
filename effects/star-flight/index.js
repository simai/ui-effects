// Star flight (simai.effect 1.1.0; dark scheme only): a slow flight through stars and nebulae. A
// fragment shader draws distant stars, a faint Milky Way band, layers of gas in a Hubble palette and
// star layers flying past, at a fraction of the screen's resolution and scaled up. Without WebGL a
// 2D canvas draws the same flight from pre-rendered gas textures. From the Larena sign-in picture
// by Rim Zabarov / SIMAI.
//
// A night sky keeps its own colours: the gas and the stars are drawn as they are, not from the
// palette. The scene is deterministic: the clock starts at a fixed time, and the 2D stars come from
// a seeded generator. Reduced motion draws one still frame; a hidden tab or an area off screen asks
// for no frames.

const VERTEX = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
const FRAGMENT = `
precision highp float;
uniform vec2 res;
uniform float time;
uniform float intensity;
uniform float nebula;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 hash2(vec2 p) { float n = hash(p); return vec2(n, hash(p + n)); }
float noise(vec2 p) {
vec2 i = floor(p), f = fract(p);
vec2 u = f * f * (3.0 - 2.0 * f);
return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
float v = 0.0, a = 0.5;
mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
return v;
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
// Ridged noise: thin bright ridges where plain noise crosses its middle, for gas filaments.
float ridged(vec2 p) {
float v = 0.0, a = 0.5;
mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
for (int i = 0; i < 3; i++) { float n = 1.0 - abs(noise(p) * 2.0 - 1.0); v += a * n * n; p = m * p; a *= 0.5; }
return v;
}
// Star colour by temperature: hot blue-white, sun-like white and yellow, cool orange.
vec3 starColour(float k) {
if (k < 0.12) return vec3(0.68, 0.78, 1.0);
if (k < 0.55) return vec3(1.0, 0.97, 0.92);
if (k < 0.85) return vec3(1.0, 0.86, 0.62);
return vec3(1.0, 0.68, 0.42);
}
// One star layer: most stars faint, a few bright ones with a soft halo and Hubble-like "+" spikes.
vec3 stars(vec2 uv, float seed) {
vec3 col = vec3(0.0);
vec2 gv = fract(uv) - 0.5, id = floor(uv);
for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
vec2 o = vec2(x, y);
vec2 cell = id + o;
float n = hash(cell + seed);
vec2 pos = o + hash2(cell + seed) - 0.5 - gv;
float d = length(pos);
float b = pow(fract(n * 345.32), 4.0);          // brightness: many faint, few bright
float star = 0.01 / max(d, 0.004);
star *= smoothstep(0.9, 0.05, d);
float bright = smoothstep(0.82, 1.0, b);
float spikes = (max(0.0, 1.0 - abs(pos.x) * 120.0) * smoothstep(0.32, 0.0, abs(pos.y))
+ max(0.0, 1.0 - abs(pos.y) * 120.0) * smoothstep(0.32, 0.0, abs(pos.x)));
float halo = 0.02 / (d * d * 40.0 + 0.02) * 0.08;
col += starColour(fract(n * 2345.2)) * (star * (0.15 + b) + (spikes * 0.45 + halo) * bright);
}
return col;
}
void main() {
vec2 uv = (gl_FragCoord.xy - 0.5 * res) / res.y;
float t = time;
// A slow drift and bank of the camera, so the flight turns gently instead of only zooming.
uv = uv * rot(sin(t * 0.021) * 0.18) + vec2(sin(t * 0.043), cos(t * 0.031)) * 0.06;
vec3 col = vec3(0.0);
// A faint Milky Way band far behind everything.
vec2 bandDir = normalize(vec2(0.55, 1.0));
float band = exp(-pow(dot(uv, vec2(bandDir.y, -bandDir.x)) * 2.6, 2.0));
col += vec3(0.55, 0.6, 0.75) * band * (0.025 + 0.05 * fbm(uv * 3.0)) ;
col += stars(uv * 70.0, 91.0) * (0.2 + band * 0.9) * 0.45; // distant stars, denser in the band
// Nebula layers, in a Hubble palette: cold gas from deep blue to cyan, dense clouds warm
// (rose to amber), hot knots magenta, filaments, rims lit from one side, dark dust lanes.
vec2 lightDir = normalize(vec2(-0.6, 0.8));
const float N = 5.0;
for (float i = 0.0; i < 1.0; i += 1.0 / N) {
float depth = fract(i + t * 0.035);
float scale = mix(5.0, 0.45, depth);
float fade = smoothstep(0.0, 0.35, depth) * smoothstep(1.0, 0.75, depth);
vec2 p = uv * rot(i * 6.2831 + t * 0.01) * scale + i * 31.7;
vec2 warp = vec2(fbm(p * 0.7 + t * 0.02), fbm(p * 0.7 + 5.2 - t * 0.015));
float n1 = fbm(p + warp * 1.8);
float n1lit = fbm(p + warp * 1.8 + lightDir * 0.06);
float n2 = fbm(p * 2.3 - 4.3);
float h = fbm(p * 0.35 + i * 5.0);
float thin = smoothstep(0.42, 0.82, n1);
float dense = smoothstep(0.56, 0.95, n1);
float lit = clamp((n1 - n1lit) * 9.0 + 0.5, 0.0, 1.0);   // which side faces the light
float fil = smoothstep(0.45, 0.85, ridged(p * 0.9 + warp * 2.0)) * thin;
vec3 cold = mix(vec3(0.06, 0.16, 0.52), vec3(0.26, 0.6, 1.0), n2);
// Warm clouds are their own regions, red to orange, never laid over the blue: mixing
// the two is what turned them muddy violet.
vec3 warm = mix(vec3(0.82, 0.13, 0.05), vec3(1.0, 0.52, 0.12), n2);
vec3 ember = mix(warm, vec3(1.0, 0.72, 0.35), smoothstep(0.7, 0.95, fbm(p * 0.3 - 3.0)));
float warmth = smoothstep(0.47, 0.6, h);
vec3 body = mix(cold, ember, warmth);
vec3 emission = cold * thin * thin * 0.4 * (1.0 - warmth) + warm * thin * thin * 0.22 * warmth;
emission += body * dense * mix(0.55, 1.25, lit);
emission += mix(body, vec3(1.0, 0.9, 0.8), 0.4) * fil * 0.45;               // filaments
emission += mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.82, 0.6), warmth) * pow(dense, 5.0) * lit * 0.45; // lit rims
// Aerial perspective: the far gas is dimmer; only the blue gas grows colder with distance.
emission *= mix(0.55, 1.0, depth);
emission = mix(emission * mix(vec3(0.75, 0.85, 1.1), vec3(1.0), warmth), emission, depth);
col += emission * fade * nebula;
float dust = smoothstep(0.6, 0.9, fbm(p * 1.4 + 11.0)) * thin;
col = col * (1.0 - 0.6 * dust * fade) + vec3(0.08, 0.03, 0.012) * dust * fade * lit;
}
// Star layers, flying past.
const float S = 4.0;
for (float i = 0.0; i < 1.0; i += 1.0 / S) {
float depth = fract(i + t * 0.05);
float scale = mix(28.0, 1.2, depth);
float fade = depth * smoothstep(1.0, 0.85, depth);
col += stars(uv * scale + i * 453.2, i * 17.0) * fade;
}
// Deep backdrop, vignette, a filmic curve that keeps colour in the bright parts, and grain.
col += mix(vec3(0.012, 0.01, 0.03), vec3(0.03, 0.012, 0.04), uv.y + 0.5) * 0.6;
col *= 1.0 - 0.32 * dot(uv * 0.8, uv * 0.8);
col *= 0.8 * intensity;
col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.3);
col += (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) * 0.012;
gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
};
const START = 40; // seconds into the flight where every mount begins

// The WebGL renderer: one full-screen triangle and the shader.
function webglRenderer(canvas) {
  const gl = canvas.getContext('webgl', {antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: true});
  if (!gl) return null;
  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  } catch {
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (name) => gl.getUniformLocation(program, name);
  const uRes = u('res');
  const uTime = u('time');
  const uIntensity = u('intensity');
  const uNebula = u('nebula');
  return {
    // The scene is soft, so it is drawn below screen resolution and scaled up.
    scale: 0.6,
    draw(clock, values) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, clock);
      gl.uniform1f(uIntensity, values.intensity / 100);
      gl.uniform1f(uNebula, values.nebula / 100);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}

// The 2D renderer: gas textures drawn once, then turned and scaled as the flight goes.
function canvasRenderer(canvas, doc) {
  const ctx = canvas.getContext('2d', {alpha: false});
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (x, y) => { let v = 0, a = 0.5; for (let i = 0; i < 5; i++) { v += a * noise(x, y); x = x * 1.6 + y * 1.2; y = -x * 0.75 + y * 1.6; a *= 0.5; } return v; };
  const palette = [[18, 46, 140], [72, 158, 255], [200, 80, 40], [255, 170, 95]];
  const texture = (seed) => {
    const size = 128, t = doc.createElement('canvas');
    t.width = t.height = size;
    const tc = t.getContext('2d'), img = tc.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const u = x / size * 4 + seed * 7.1, v = y / size * 4 + seed * 3.3;
      const n1 = fbm(u + fbm(u * 0.7, v * 0.7) * 1.6, v), n2 = fbm(u * 1.9 - 4.3, v * 1.9);
      const gas = clamp((n1 - 0.34) / 0.46, 0, 1);
      const dx = x / size - 0.5, dy = y / size - 0.5, edge = Math.max(0, 1 - Math.hypot(dx, dy) * 2);
      const k = fbm(u * 0.5 + 9, v * 0.5);
      const blue = palette[0].map((c, i) => c + (palette[1][i] - c) * n2);
      const warm = palette[2].map((c, i) => c + (palette[3][i] - c) * n1);
      const mix = clamp((k - 0.3) / 0.5, 0, 1);
      const o = (y * size + x) * 4;
      for (let i = 0; i < 3; i++) img.data[o + i] = blue[i] + (warm[i] - blue[i]) * mix;
      img.data[o + 3] = Math.min(255, Math.pow(gas, 1.4) * Math.pow(edge, 0.7) * 270);
    }
    tc.putImageData(img, 0, 0);
    return t;
  };
  const layers = [0, 1, 2, 3, 4].map((i) => ({tex: texture(i + 1), phase: i / 5, turn: i * 1.3}));
  const random = rng(11);
  const stars = Array.from({length: 600}, () => ({x: random() * 2 - 1, y: random() * 2 - 1, z0: random(), c: random()}));
  return {
    scale: 0.75,
    draw(clock, values) {
      const w = canvas.width, h = canvas.height, base = Math.max(w, h);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#03040a';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const light = values.intensity / 100;
      for (const l of layers) {
        const depth = (l.phase + clock * 0.035) % 1;
        const fade = Math.min(1, depth / 0.35) * Math.min(1, (1 - depth) / 0.25);
        const size = base * (0.6 + depth * depth * 3.2);
        ctx.save();
        ctx.globalAlpha = clamp(fade * 0.85 * light * values.nebula / 100, 0, 1);
        ctx.translate(w / 2, h / 2);
        ctx.rotate(l.turn + clock * 0.01);
        ctx.drawImage(l.tex, -size / 2, -size / 2, size, size);
        ctx.restore();
      }
      // Each star's depth is a function of the clock, so a frame depends on the time alone.
      for (const s of stars) {
        const z = 0.02 + (((s.z0 - clock * 0.05) % 0.98) + 0.98) % 0.98;
        const px = w / 2 + (s.x / z) * base * 0.35, py = h / 2 + (s.y / z) * base * 0.35;
        if (px < 0 || py < 0 || px > w || py > h) continue;
        const b = Math.min(1, (1 - z) * 1.3) * light, r = Math.max(0.5, (1 - z) * 1.8);
        ctx.fillStyle = s.c > 0.7 ? `rgba(255,225,200,${b})` : `rgba(210,230,255,${b})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    destroy() {},
  };
}

export function mount(host, settings, context = {}) {
  const doc = host.ownerDocument;
  const win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;background:#03040a';
  host.append(canvas);
  const renderer = webglRenderer(canvas) ?? canvasRenderer(canvas, doc);
  const motion = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let values = {...settings};
  let still = Boolean(context.reducedMotion) || Boolean(motion?.matches);
  let paused = false;
  let visible = true;
  let frame = 0;
  let last = 0;
  let clock = START;

  const draw = () => renderer.draw(clock, values);
  const loop = (now) => {
    frame = 0;
    clock += clamp((now - (last || now)) / 1000, 0, 0.05) * (values.speed / 100);
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
    const scale = Math.min(2, win.devicePixelRatio || 1) * renderer.scale;
    canvas.width = Math.max(1, Math.round(box.width * scale));
    canvas.height = Math.max(1, Math.round(box.height * scale));
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

  resize();
  schedule();

  return {
    update(next) {
      values = {...next};
      draw();
    },
    pause() { paused = true; stop(); },
    resume() { paused = false; schedule(); },
    destroy() {
      stop();
      sizes.disconnect();
      screen.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
      motion?.removeEventListener?.('change', onMotion);
      renderer.destroy();
      canvas.remove();
    },
  };
}
