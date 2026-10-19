#!/usr/bin/env node
// Browser smoke of the built catalogue site.
//
//   node scripts/smoke.mjs [--root dist] [--prefix /ui-effects/] [--shots DIR] [--json FILE] [--only id,id]
//
// dist/ is served under the prefix, the way GitHub Pages serves the project
// site, and opened in headless Chromium at 1440×900 and 390×844, light and dark.
// It fails on:
//   - a page error or console error, or a request to any host other than the
//     local server and the two pinned jsDelivr bases;
//   - a Framework component or Smart module loaded by the site (its class
//     names must not trigger the Loader);
//   - horizontal scroll;
//   - an effect page whose outcome differs from the theme policy, whose
//     effect does not mount, whose theme-mode control offers a mode the
//     effect cannot draw, or whose contrast readout is below 4.5:1 (hero and
//     windows layouts);
//   - site text below 4.5:1 (3:1 for large text) outside the effect areas;
//   - keyboard: the skip link, the filters and the cards are reachable and
//     show a focus ring; the code tabs follow the arrow keys;
//   - reduced motion: the system setting and the page's own switch leave a
//     still frame (no animation frames asked for);
//   - the configurator's snippets: HTML, JS and settings JSON are pasted into
//     a blank page that loads the Framework, and the effect mounts with every
//     file checked against its SHA-256; a tampered file is refused.
//
// jsDelivr is answered locally: simai/ui@<lock commit> from UI_ROOT (git
// objects, read-only) when it is set, else from the network; and
// simai/ui-effects@<site commit> from this repository's git objects at that
// commit (the files jsDelivr would serve), else from the working tree.
// CHROME_PATH runs a given Chrome in the new headless mode; PLAYWRIGHT_CORE
// points at another playwright-core.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ROOT, launchOptions, loadChromium, lock} from './lib/common.mjs';
import {serve} from './lib/serve.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const distDir = resolve(ROOT, option('--root', 'dist'));
const prefix = option('--prefix', '/ui-effects/');
const shots = option('--shots', null) ? resolve(option('--shots')) : null;
const jsonOut = option('--json', null);
const only = option('--only', '') ? option('--only', '').split(',') : null;
if (shots) mkdirSync(shots, {recursive: true});

const framework = lock();
const {resolveTheme, allowedModes} = await import(pathToFileURL(join(ROOT, 'site/lib/placement.js')).href);
const catalogue = JSON.parse(readFileSync(join(distDir, 'catalogue', 'index.json'), 'utf8'));
const config = JSON.parse(readFileSync(join(distDir, 'index.html'), 'utf8').match(/<script type="application\/json" id="site-config">(.*?)<\/script>/su)[1]);
const byId = new Map(catalogue.effects.map((entry) => [entry.id, entry]));
const effects = catalogue.effects.filter((entry) => !only || only.includes(entry.id));
const reference = (entry, withPair = true) => ({id: entry.id, schemes: entry.schemes, pair: withPair && entry.pair ? reference(byId.get(entry.pair), false) : null});

// --- jsDelivr, answered locally ------------------------------------------------------
const UI_CDN = `https://cdn.jsdelivr.net/gh/simai/ui@${framework.ui.commit}/`;
const EFFECTS_CDN = config.cdn;
const uiRoot = process.env.UI_ROOT ? resolve(process.env.UI_ROOT) : null;
const hasCommit = (root, commit) => { try { execFileSync('git', ['-C', root, 'cat-file', '-e', `${commit}^{commit}`], {stdio: 'ignore'}); return true; } catch { return false; } };
if (uiRoot && !hasCommit(uiRoot, framework.ui.commit)) throw new Error(`UI_ROOT ${uiRoot} does not hold ${framework.ui.commit}`);
const effectsFromGit = hasCommit(ROOT, config.commit);
const blobs = new Map();
const gitFile = (root, commit, path) => {
  const key = `${root}\n${commit}\n${path}`;
  if (!blobs.has(key)) {
    try { blobs.set(key, execFileSync('git', ['-C', root, 'show', `${commit}:${path}`], {maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore']})); } catch { blobs.set(key, null); }
  }
  return blobs.get(key);
};
const TYPES = {js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', json: 'application/json; charset=utf-8', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml'};
let tamper = null; // a path under the ui-effects CDN answered with a changed body
const failures = [];
const fail = (where, message) => { failures.push(`${where}: ${message}`); console.log(`FAIL ${where}: ${message}`); };
const external = [];

async function routeAll(context) {
  await context.route(/^https?:\/\//u, async (route) => {
    const url = route.request().url();
    const headers = (path) => ({'content-type': TYPES[path.split('.').pop()] ?? 'application/octet-stream', 'access-control-allow-origin': '*'});
    if (url.startsWith(UI_CDN)) {
      if (!uiRoot) return route.continue();
      const path = decodeURIComponent(new URL(url).pathname.slice(new URL(UI_CDN).pathname.length));
      const body = gitFile(uiRoot, framework.ui.commit, path);
      return body ? route.fulfill({status: 200, headers: headers(path), body}) : route.fulfill({status: 404, body: 'not found'});
    }
    if (url.startsWith(EFFECTS_CDN)) {
      const path = decodeURIComponent(new URL(url).pathname.slice(new URL(EFFECTS_CDN).pathname.length));
      let body = effectsFromGit ? gitFile(ROOT, config.commit, path) : (existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path)) : null);
      if (body && tamper === path) body = Buffer.concat([body, Buffer.from('\n// changed\n')]);
      return body ? route.fulfill({status: 200, headers: headers(path), body}) : route.fulfill({status: 404, body: 'not found'});
    }
    const host = new URL(url).hostname;
    if (host === '127.0.0.1' || host === 'blank.test') return route.fallback();
    external.push(url);
    return route.abort();
  });
}

// Problems a page reports: errors and Framework modules it should not load.
function watch(page, where) {
  const problems = [];
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') problems.push(`console error: ${message.text()}`); });
  page.on('request', (request) => {
    if (/\/distr\/(component|smart|packages)\//u.test(request.url())) problems.push(`loads a Framework module the site does not use: ${request.url().split('/distr/')[1]}`);
  });
  page.on('response', (response) => { if (response.status() >= 400) problems.push(`HTTP ${response.status()} ${response.url()}`); });
  return () => { for (const problem of problems.splice(0)) fail(where, problem); };
}

const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// Text outside the effect areas against its painted ground.
const chromeContrast = (page) => page.evaluate(() => {
  const scratch = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  const rgba = (value) => {
    scratch.clearRect(0, 0, 1, 1);
    scratch.fillStyle = 'rgba(0,0,0,0)';
    scratch.fillStyle = value;
    scratch.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = scratch.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const channel = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const over = (top, bottom) => [0, 1, 2].map((k) => top[k] * top[3] + bottom[k] * (1 - top[3])).concat(1);
  const groundOf = (element) => {
    const layers = [];
    for (let node = element; node; node = node.parentElement) {
      const colour = rgba(getComputedStyle(node).backgroundColor);
      if (colour[3] > 0) layers.push(colour);
      if (colour[3] >= 0.999) break;
    }
    let ground = [255, 255, 255, 1];
    for (const layer of layers.reverse()) ground = over(layer, ground);
    return ground;
  };
  const failing = [];
  let checked = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;
    if (!node.textContent.trim() || seen.has(element)) continue;
    seen.add(element);
    if (element.closest('[data-effect-area], [hidden], .visually-hidden, .skip, script, style')) continue;
    const box = element.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    const style = getComputedStyle(element);
    const ink = rgba(style.color);
    const ground = groundOf(element);
    const text = over(ink, ground);
    const value = (Math.max(lum(text), lum(ground)) + 0.05) / (Math.min(lum(text), lum(ground)) + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    checked += 1;
    if (value < (large ? 3 : 4.5)) failing.push(`${value.toFixed(2)}:1 «${node.textContent.trim().slice(0, 40)}» (${element.className || element.tagName})`);
  }
  return {checked, failing};
});

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const report = {site: config, framework: framework.pair, pages: [], snippets: [], keyboard: [], motion: []};

const chromium = await loadChromium();
const browser = await chromium.launch(launchOptions());
const {server, url: base} = await serve(distDir, prefix);
console.log(`smoke: ${base} (Framework ${uiRoot ? 'from UI_ROOT git objects' : 'from jsDelivr'}; ui-effects CDN from ${effectsFromGit ? `git ${config.commit.slice(0, 12)}` : 'the working tree'})`);

try {
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    for (const scheme of ['light', 'dark']) {
      const tag = `${viewport.width}-${scheme}`;
      const context = await browser.newContext({viewport, colorScheme: scheme, deviceScaleFactor: 1});
      await routeAll(context);
      const page = await context.newPage();

      // Gallery.
      let flush = watch(page, `gallery ${tag}`);
      await page.goto(base);
      await page.waitForFunction(() => document.documentElement.dataset.ready === 'true' && document.body.style.opacity !== '0', null, {timeout: 20000});
      await page.waitForFunction(() => document.querySelector('[data-intro]')?.dataset.state, null, {timeout: 20000});
      await wait(1500);
      const gallery = await page.evaluate(() => ({cards: document.querySelectorAll('.card').length, intro: document.querySelector('[data-intro]').dataset.state, introTheme: document.querySelector('[data-intro]').className}));
      if (gallery.cards !== catalogue.effects.length) fail(`gallery ${tag}`, `${gallery.cards} cards`);
      const introExpected = resolveTheme(reference(byId.get('nebula-mesh')), scheme, 'auto').outcome;
      if (gallery.intro !== introExpected) fail(`gallery ${tag}`, `intro outcome ${gallery.intro}, expected ${introExpected}`);
      if (!await noHorizontalScroll(page)) fail(`gallery ${tag}`, 'horizontal scroll');
      const galleryContrast = await chromeContrast(page);
      galleryContrast.failing.forEach((item) => fail(`gallery ${tag}`, `contrast ${item}`));
      if (shots) await page.screenshot({path: join(shots, `gallery-${tag}.png`)});
      for (const filter of ['dual', 'dark', 'light', 'all']) {
        await page.click(`[data-filter="${filter}"]`);
        const visible = await page.evaluate(() => [...document.querySelectorAll('.card')].filter((card) => !card.hidden).length);
        const expected = filter === 'all' ? catalogue.effects.length : catalogue.counts[filter];
        if (visible !== expected) fail(`gallery ${tag}`, `filter ${filter} shows ${visible}, expected ${expected}`);
      }
      if (shots && viewport.width === 1440) await page.screenshot({path: join(shots, `gallery-${tag}-full.png`), fullPage: true});
      flush();
      report.pages.push({page: 'gallery', viewport: tag, ...gallery, contrastChecked: galleryContrast.checked});

      // Keyboard, once per viewport, on the light gallery.
      if (scheme === 'light') {
        await page.goto(base);
        await page.waitForFunction(() => document.documentElement.dataset.ready === 'true' && document.body.style.opacity !== '0');
        const stops = [];
        for (let index = 0; index < 14; index += 1) {
          await page.keyboard.press('Tab');
          stops.push(await page.evaluate(() => {
            const element = document.activeElement;
            // A card shows the ring for its link, which covers the whole card.
            const style = getComputedStyle(element.closest('.card') ?? element);
            return {text: (element.textContent || '').trim().slice(0, 30), cls: element.className, ring: style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2};
          }));
        }
        const reached = (test) => stops.some(test);
        if (stops[0].cls !== 'skip') fail(`keyboard ${viewport.width}`, `first stop is ${stops[0].cls}, not the skip link`);
        if (!reached((stop) => /seg__btn/u.test(stop.cls) && /Двухтемные/u.test(stop.text))) fail(`keyboard ${viewport.width}`, 'filters not reached');
        if (!reached((stop) => stop.cls === '' && stop.text && !/Галерея|Авторам|GitHub/u.test(stop.text))) fail(`keyboard ${viewport.width}`, 'cards not reached');
        const noRing = stops.filter((stop) => !stop.ring);
        if (noRing.length) fail(`keyboard ${viewport.width}`, `no focus ring on ${noRing.map((stop) => stop.text || stop.cls).join(', ')}`);
        report.keyboard.push({viewport: viewport.width, stops});
      }

      // Effect pages.
      for (const entry of effects) {
        const where = `${entry.id} ${tag}`;
        flush = watch(page, where);
        await page.goto(`${base}effect/${entry.id}/`);
        await page.waitForFunction(() => document.documentElement.dataset.ready === 'true' && document.body.style.opacity !== '0', null, {timeout: 20000});
        const expected = resolveTheme(reference(entry), scheme, 'auto');
        const checkLayout = async (layout) => {
          await page.waitForFunction(() => ['yes', 'hidden', 'error'].includes(document.documentElement.dataset.mounted), null, {timeout: 20000});
          await page.waitForFunction(() => document.querySelector('[data-readout]').dataset.measured === 'true', null, {timeout: 20000});
          await wait(400);
          const facts = await page.evaluate((windows) => {
            const area = document.querySelector(windows ? '[data-cards]' : '[data-hero]');
            const host = area.querySelector(':scope > [data-effect-host]');
            const readout = document.querySelector('[data-readout]');
            return {
              mounted: document.documentElement.dataset.mounted,
              outcome: document.documentElement.dataset.outcome,
              drawn: document.documentElement.dataset.drawn,
              shown: document.documentElement.dataset.shown,
              canvas: Boolean(host?.querySelector('canvas')),
              sfEffect: host?.getAttribute('data-sf-effect') ?? null,
              clip: host?.style.clipPath ?? '',
              areaTheme: windows ? [...area.querySelectorAll('[data-effect-window]')].map((card) => card.classList.contains(`theme-${document.documentElement.dataset.drawn}`)) : [area.classList.contains(`theme-${document.documentElement.dataset.drawn}`)],
              plainCards: windows ? [...area.querySelectorAll('.demo-card:not([data-effect-window])')].every((card) => !card.hasAttribute('data-effect-drawn')) : true,
              p5: Number(readout.dataset.p5),
              readout: readout.textContent.trim(),
              modes: [...document.querySelectorAll('[data-modes] [data-mode]')].map((button) => button.dataset.mode),
            };
          }, layout === 'windows');
          if (facts.mounted === 'error') fail(where, `${layout}: the effect did not start`);
          if (facts.outcome !== expected.outcome || facts.drawn !== expected.drawn) fail(where, `${layout}: outcome ${facts.outcome}/${facts.drawn}, expected ${expected.outcome}/${expected.drawn}`);
          if (expected.shown && (!facts.canvas || facts.sfEffect !== expected.shown.id)) fail(where, `${layout}: ${expected.shown.id} not mounted (canvas ${facts.canvas}, data-sf-effect ${facts.sfEffect})`);
          if (!expected.shown && facts.canvas) fail(where, `${layout}: a hidden effect drew a canvas`);
          if (!facts.areaTheme.every(Boolean)) fail(where, `${layout}: an effect area lacks theme-${facts.drawn}`);
          if (!facts.plainCards) fail(where, `${layout}: a card outside the windows took the effect theme`);
          if (layout === 'windows' && expected.shown && !facts.clip.startsWith('path(')) fail(where, 'windows: the host is not clipped to the windows');
          if (!(facts.p5 >= 4.5)) fail(where, `${layout}: contrast ${facts.readout}`);
          if (JSON.stringify(facts.modes) !== JSON.stringify(allowedModes(reference(entry)))) fail(where, `theme modes offered ${facts.modes}, allowed ${allowedModes(reference(entry))}`);
          return facts;
        };
        const hero = await checkLayout('hero');
        if (!await noHorizontalScroll(page)) fail(where, 'horizontal scroll');
        const contrast = await chromeContrast(page);
        contrast.failing.forEach((item) => fail(where, `contrast ${item}`));
        if (shots && (viewport.width === 1440 || ['comet-flow', 'foam-cells', 'guilloche'].includes(entry.id))) {
          await page.evaluate(() => document.querySelector('.toolbar').scrollIntoView({block: 'start'}));
          await page.screenshot({path: join(shots, `effect-${entry.id}-${tag}.png`), type: 'png'});
        }
        let windows = null;
        if (viewport.width === 1440) {
          await page.click('[data-layout="windows"]');
          windows = await checkLayout('windows');
          if (shots && ['comet-flow', 'foam-cells', 'constellation-net'].includes(entry.id)) {
            await page.evaluate(() => document.querySelector('[data-cards]').scrollIntoView({block: 'center'}));
            await page.screenshot({path: join(shots, `effect-${entry.id}-${tag}-windows.png`)});
          }
          // Each fixed mode the effect offers draws that scheme.
          for (const mode of allowedModes(reference(entry)).filter((item) => item !== 'auto')) {
            await page.click(`[data-modes] [data-mode="${mode}"]`);
            await wait(300);
            await page.waitForFunction(() => ['yes', 'hidden', 'error'].includes(document.documentElement.dataset.mounted));
            const drawn = await page.evaluate(() => document.documentElement.dataset.drawn);
            if (drawn !== mode) fail(where, `mode ${mode} drew ${drawn}`);
          }
        }
        flush();
        report.pages.push({page: entry.id, viewport: tag, hero, windows, contrastChecked: contrast.checked});
        console.log(`ok   ${where}: ${hero.outcome}/${hero.drawn}, contrast ${hero.p5.toFixed(2)}${windows ? ` (windows ${windows.p5.toFixed(2)})` : ''}`);
      }
      await context.close();
    }
  }

  // Code tabs follow the arrow keys.
  {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}});
    await routeAll(context);
    const page = await context.newPage();
    const flush = watch(page, 'tabs');
    await page.goto(`${base}effect/${effects[0].id}/`);
    await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    await page.focus('#tab-html');
    await page.keyboard.press('ArrowRight');
    const selected = await page.evaluate(() => [document.activeElement.id, document.querySelector('[data-panel="js"]').hidden]);
    if (selected[0] !== 'tab-js' || selected[1]) fail('tabs', `ArrowRight left ${selected[0]} focused, JS panel hidden ${selected[1]}`);
    await page.keyboard.press('End');
    if (await page.evaluate(() => document.activeElement.id) !== 'tab-json') fail('tabs', 'End does not reach the last tab');
    flush();
    await context.close();
  }

  // Reduced motion: the system setting, the page's switch and pause.
  {
    const counter = () => {
      window.__frames = 0;
      const own = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (fn) => { window.__frames += 1; return own(fn); };
    };
    const frames = async (page) => {
      const from = await page.evaluate(() => window.__frames);
      await wait(800);
      return (await page.evaluate(() => window.__frames)) - from;
    };
    const target = effects.find((entry) => entry.schemes.includes('dark')) ?? effects[0];
    for (const [label, reducedMotion] of [['system', 'reduce'], ['switch', 'no-preference'], ['pause', 'no-preference']]) {
      const context = await browser.newContext({viewport: {width: 1440, height: 900}, colorScheme: 'dark', reducedMotion});
      await routeAll(context);
      await context.addInitScript(counter);
      const page = await context.newPage();
      const flush = watch(page, `motion ${label}`);
      await page.goto(`${base}effect/${target.id}/`);
      await page.waitForFunction(() => document.documentElement.dataset.mounted === 'yes', null, {timeout: 20000});
      await wait(600);
      const running = await frames(page);
      if (label === 'switch') await page.click('[data-reduced]');
      if (label === 'pause') await page.click('[data-pause]');
      await wait(600);
      await page.waitForFunction(() => document.documentElement.dataset.mounted === 'yes');
      // The readout and the page's own timers ask for no animation frames.
      await page.evaluate(() => { window.__frames = 0; });
      const after = await frames(page);
      const canvas = await page.evaluate(() => Boolean(document.querySelector('[data-hero] [data-effect-host] canvas')));
      if (after !== 0 || !canvas) fail(`motion ${label}`, `${after} frames asked for after ${label} (before: ${running}), canvas ${canvas}`);
      report.motion.push({label, effect: target.id, framesBefore: running, framesAfter: after});
      console.log(`ok   motion ${label}: ${target.id}, frames ${running} -> ${after}`);
      flush();
      await context.close();
    }
  }

  // Snippets in a blank page that loads the Framework.
  {
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, colorScheme: 'light'});
    await routeAll(context);
    let blank = '';
    await context.route('https://blank.test/**', (route) => route.fulfill({status: 200, headers: {'content-type': 'text/html; charset=utf-8'}, body: blank}));
    const page = await context.newPage();
    const configurator = await context.newPage();
    const codeOf = async (id, layout) => {
      await configurator.goto(`${base}effect/${id}/`);
      await configurator.waitForFunction(() => document.documentElement.dataset.ready === 'true');
      if (layout === 'windows') await configurator.click('[data-layout="windows"]');
      return configurator.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-code]')].map((block) => [block.dataset.code, block.textContent])));
    };
    const open = async (body, head) => {
      blank = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>blank</title>${head}</head><body>${body}</body></html>`;
      await page.goto('https://blank.test/');
    };
    const settle = () => page.waitForFunction(() => {
      const area = document.querySelector('[data-effect-area]');
      return area && (area.dataset.effectState === 'hidden' || area.querySelector('[data-effect-host] canvas'));
    }, null, {timeout: 20000}).then(() => true, () => false);
    for (const entry of effects) {
      const expected = resolveTheme(reference(entry), 'light', 'auto');
      // HTML tab, hero layout.
      let code = await codeOf(entry.id, 'hero');
      let flush = watch(page, `snippet html ${entry.id}`);
      await open(code.html, code.connect);
      let ok = await settle();
      let facts = await page.evaluate(() => {
        const area = document.querySelector('[data-effect-area]');
        return {state: area?.dataset.effectState, drawn: area?.dataset.effectDrawn, effect: area?.querySelector('[data-effect-host]')?.getAttribute('data-sf-effect') ?? null};
      });
      if (!ok || facts.drawn !== expected.drawn || (expected.shown ? facts.effect !== expected.shown.id : facts.state !== 'hidden')) fail(`snippet html ${entry.id}`, `mounted ${JSON.stringify(facts)}, expected ${expected.shown?.id ?? 'hidden'} ${expected.drawn}`);
      flush();
      // Settings JSON: valid stored values for the manifest.
      const json = JSON.parse(code.json);
      const settings = await page.evaluate(async ({url, json}) => {
        const manifest = await (await fetch(url)).json();
        const {invalid} = window.SF.Effects.effectSettings(manifest, json);
        return {invalid, keys: Object.keys(json).sort().join(), expected: manifest.settings.map((setting) => setting.key).sort().join()};
      }, {url: `${EFFECTS_CDN}${entry.path}effect.json`, json});
      if (settings.invalid.length || settings.keys !== settings.expected) fail(`snippet json ${entry.id}`, JSON.stringify(settings));
      // JS tab, windows layout, in a page with its own windows.
      code = await codeOf(entry.id, 'windows');
      flush = watch(page, `snippet js ${entry.id}`);
      await open(`<ul data-effect-area style="list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:0">${'<li data-effect-window style="min-height:160px;border-radius:12px"><b>Окно</b></li>'.repeat(2)}<li style="min-height:160px">Без окна</li></ul><script type="module">\n${code.js}\n</script>`, code.connect);
      ok = await settle();
      facts = await page.evaluate(() => {
        const area = document.querySelector('[data-effect-area]');
        const host = area.querySelector('[data-effect-host]');
        return {state: area.dataset.effectState, clip: host?.style.clipPath.slice(0, 5), windows: [...area.querySelectorAll('[data-effect-window]')].map((item) => item.dataset.effectDrawn), effect: host?.getAttribute('data-sf-effect') ?? null};
      });
      if (!ok || (expected.shown && (facts.effect !== expected.shown.id || facts.clip !== 'path(')) || facts.windows.some((value) => value !== expected.drawn)) fail(`snippet js ${entry.id}`, `mounted ${JSON.stringify(facts)}`);
      flush();
      report.snippets.push({effect: entry.id, html: expected.shown?.id ?? 'hidden', js: facts});
      console.log(`ok   snippets ${entry.id}: html, json, js (windows)`);
    }
    // A file that differs from its SHA-256 never runs.
    const victim = effects.find((entry) => entry.schemes.includes('light')) ?? effects[0];
    const code = await codeOf(victim.id, 'hero');
    tamper = `${victim.path}index.js`;
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await open(code.html, code.connect);
    await wait(3000);
    const drawn = await page.evaluate(() => Boolean(document.querySelector('[data-effect-host] canvas')));
    if (drawn || !errors.some((text) => /SHA-256/u.test(text))) fail('snippet integrity', `tampered ${tamper}: canvas ${drawn}, errors ${JSON.stringify(errors)}`);
    else console.log(`ok   snippet integrity: tampered ${tamper} refused (${errors[0].slice(0, 90)})`);
    report.integrity = {tampered: tamper, refused: !drawn, error: errors[0] ?? null};
    tamper = null;
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

for (const url of new Set(external)) fail('network', `request outside the allowed hosts: ${url}`);
report.failures = failures;
if (jsonOut) writeFileSync(resolve(jsonOut), `${JSON.stringify(report, null, 2)}\n`);
console.log(`smoke: ${report.pages.length} page views, ${report.snippets.length * 3 + 1} snippet checks, ${failures.length} failing`);
process.exit(failures.length ? 1 : 0);
