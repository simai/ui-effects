#!/usr/bin/env node
// Measures every effect the way the contrast check of simai.effect 1.1 does,
// ahead of that kit: drawn at its default settings in a .theme-<scheme> area on
// --sf-surface-0, five host screenshots 450 ms apart after 400 ms, and for
// --sf-on-surface and --sf-on-surface-variant the 5th percentile of the
// per-pixel contrast, the worst frame counting. --sf-on-surface needs 4.5:1,
// --sf-on-surface-variant 3:1.
//
//   UI_ROOT=../ui node scripts/contrast-probe.mjs [--only id,id] [--roles <ui commit>] [--shots dir] [--json file]
//     [--set key=value,key=value]   try other defaults while tuning (numbers as numbers)
//
// The runtime is distr/core of ui at framework.lock.json; --roles takes
// core.css (the role values) from another ui commit. The scheme comes from the
// `scheme` setting, as scripts/kit.mjs runs it until the manifests carry schemes.
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import {launchOptions, loadChromium, loadPolicy, lock, ROOT} from './lib/common.mjs';

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const only = option('--only')?.split(',');
const framework = lock();
const uiRoot = resolve(process.env.UI_ROOT ?? join(ROOT, '..', 'ui'));
const roles = option('--roles') ?? framework.ui.commit;
const work = mkdtempSync(join(tmpdir(), 'contrast-probe-'));
const NEEDS = {'--sf-on-surface': 4.5, '--sf-on-surface-variant': 3};
const extract = (commit, path, into) => {
  mkdirSync(into, {recursive: true});
  const tar = join(work, 'archive.tar');
  execFileSync('git', ['-C', uiRoot, 'archive', '--format=tar', '-o', tar, commit, path]);
  execFileSync('tar', ['-x', '-f', tar, '-C', into]);
  rmSync(tar);
};
extract(framework.ui.commit, 'distr/core', join(work, 'run'));
extract(roles, 'distr/core/css', join(work, 'roles'));
const core = join(work, 'run', 'distr', 'core');
const sheet = join(work, 'roles', 'distr', 'core', 'css', 'core.css');

const page = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>contrast probe</title>
<script>window.sfPath = '/distr/'; window.SF_BOOT_CONFIG = {cacheVersion: 'probe', pluginListVersion: 'probe', preloader: {enabled: false}, icons: {enabled: false}, theme: false};</script>
<link rel="stylesheet" href="/distr/core/css/core.css">
</head><body style="margin:0"><div id="host" style="position:relative;inline-size:400px;block-size:300px"></div>
<script src="/distr/core/js/core.js"></script></body></html>`;
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  if (path === '/probe.html') { response.writeHead(200, {'content-type': 'text/html; charset=utf-8'}); return response.end(page); }
  const [prefix, root] = path.startsWith('/effect/') ? ['/effect/', join(ROOT, 'effects')] : ['/distr/core/', core];
  const file = path === '/distr/core/css/core.css' ? sheet : resolve(root, path.slice(prefix.length));
  if (!path.startsWith(prefix) || !(file === sheet || file.startsWith(root + sep)) || !existsSync(file)) { response.writeHead(404); return response.end(); }
  response.writeHead(200, {'content-type': `${file.endsWith('.css') ? 'text/css' : 'text/javascript'}; charset=utf-8`});
  response.end(readFileSync(file));
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const base = `http://127.0.0.1:${server.address().port}`;

// The kit's measure(), unchanged in substance.
const measure = (tab, png, colors) => tab.evaluate(async ({data, colors}) => {
  const image = new Image();
  image.src = `data:image/png;base64,${data}`;
  await image.decode();
  const canvas = Object.assign(document.createElement('canvas'), {width: image.width, height: image.height});
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const channel = (value) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const luminance = (r, g, b) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const parse = (color) => {
    const probe = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
    probe.fillStyle = color;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return luminance(r, g, b);
  };
  const lums = [];
  for (let index = 0; index < pixels.length; index += 4) lums.push(luminance(pixels[index], pixels[index + 1], pixels[index + 2]));
  const contrast = {};
  for (const [name, color] of Object.entries(colors)) {
    const text = parse(color);
    const ratios = lums.map((value) => (Math.max(value, text) + 0.05) / (Math.min(value, text) + 0.05)).sort((a, b) => a - b);
    contrast[name] = Number(ratios[Math.floor(ratios.length * 0.05)].toFixed(2));
  }
  return {mean: Number((lums.reduce((sum, value) => sum + value, 0) / lums.length).toFixed(3)), contrast};
}, {data: png.toString('base64'), colors});

const chromium = await loadChromium();
const browser = await chromium.launch(launchOptions());
const shots = option('--shots');
if (shots) mkdirSync(shots, {recursive: true});
const rows = [];
try {
  for (const entry of loadPolicy().entries) {
    if (only && !only.includes(entry.id)) continue;
    for (const scheme of entry.schemes) {
      const manifest = structuredClone(entry.manifest);
      manifest.settings.find((setting) => setting.key === 'scheme').default = scheme;
      for (const pair of option('--set')?.split(',') ?? []) {
        const [key, value] = pair.split('=');
        const setting = manifest.settings.find((item) => item.key === key);
        if (setting) setting.default = typeof setting.default === 'number' ? Number(value) : typeof setting.default === 'boolean' ? value === 'true' : value;
      }
      const context = await browser.newContext();
      const tab = await context.newPage();
      await tab.goto(`${base}/probe.html`);
      await tab.waitForFunction(() => window.SF?.Effects, null, {timeout: 10000});
      const colors = await tab.evaluate(async ({manifest, scheme}) => {
        const host = document.getElementById('host');
        host.className = `theme-${scheme}`;
        host.style.background = 'var(--sf-surface-0)';
        const module = await import(`/effect/${manifest.id}/${manifest.entry}`);
        window.__handle = window.SF.Effects.mountEffect(host, {manifest, module, scheme});
        const probe = host.appendChild(document.createElement('span'));
        const resolved = Object.fromEntries(['--sf-on-surface', '--sf-on-surface-variant'].map((role) => {
          probe.style.color = `var(${role})`;
          return [role, getComputedStyle(probe).color];
        }));
        probe.remove();
        return resolved;
      }, {manifest, scheme});
      await tab.waitForTimeout(400);
      const frames = [];
      for (let index = 0; index < 5; index += 1) {
        const png = await tab.locator('#host').screenshot();
        if (shots && index === 0) writeFileSync(join(shots, `${entry.id}--${scheme}.png`), png);
        frames.push(await measure(tab, png, colors));
        await tab.waitForTimeout(450);
      }
      const worst = (role) => Math.min(...frames.map((frame) => frame.contrast[role]));
      const row = {id: entry.id, scheme, onSurface: worst('--sf-on-surface'), variant: worst('--sf-on-surface-variant'), mean: frames.map((frame) => frame.mean), colors};
      row.ok = row.onSurface >= NEEDS['--sf-on-surface'] && row.variant >= NEEDS['--sf-on-surface-variant'];
      rows.push(row);
      console.log(`${row.ok ? 'ok  ' : 'FAIL'} ${entry.id.padEnd(18)} ${scheme.padEnd(5)} on-surface ${row.onSurface.toFixed(2)}  variant ${row.variant.toFixed(2)}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
  rmSync(work, {recursive: true, force: true});
}
if (option('--json')) writeFileSync(option('--json'), `${JSON.stringify({framework: framework.pair, roles, rows}, null, 2)}\n`);
console.log(`contrast: ${rows.filter((row) => row.ok).length}/${rows.length} runs hold 4.5:1 on-surface and 3:1 variant (roles from ui ${roles.slice(0, 12)})`);
process.exit(rows.every((row) => row.ok) ? 0 : 1);
