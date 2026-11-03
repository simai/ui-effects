#!/usr/bin/env node
// Browser probe of the set effects: <sf-effect> loaded the three ways a page
// may name the set, from a local stand that answers the hosts it would use.
//
//   node package/tests/browser/effects-set.browser.mjs --framework <output> [--commit <rev>] [--json FILE]
//
// --framework is the output of ui-builder verify-product-reproducibility
// (<workspace>/wave-1/output), a SIMAI Framework Core of core.runtime 1.25.0 or
// later. The stand serves, on one local origin:
//
//   /ui/distr/...                          that Core (core, rule, component, utility, smart)
//   /gh/simai/ui-effects@<rev>/...         this repository at <rev> (default HEAD), from git:
//                                          the jsDelivr gh/ layout, package/dist/smart the base
//   /npm/@simai-studio/effects@<v>/...     the npm package as stage-npm.mjs stages it
//   /npm/@simai-studio/sets@1/index.json   a compatibility index with that one release
//
// Pages and checks:
//   gh       SF_BOOT_CONFIG.packages.effects = '<gh base>'
//   index    <script ... data-sf-sets="effects">, the index and npm root set to the stand
//   version  <script ... data-sf-sets="effects@<v>">, no index read
//   double   an <sf-effect> beside a frozen <div data-sf-effect> (the Core alias)
// Each: the element draws (sf-effect-ready, one drawing surface per host),
// settings from attributes reach the effect (an out-of-range one is reported
// invalid), SF.package('effects') gives the engine, packageOf names the base,
// version and release, and no request leaves the stand.
import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {extname, join, resolve, sep} from 'node:path';
import {ROOT, launchOptions, loadChromium} from '../../../scripts/lib/common.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const output = option('--framework', null);
if (!output) {
  console.error('usage: effects-set.browser.mjs --framework <wave-1/output> [--commit <rev>] [--json FILE]');
  process.exit(2);
}
const commit = execFileSync('git', ['-C', ROOT, 'rev-parse', option('--commit', 'HEAD')], {encoding: 'utf8'}).trim();
const PACKAGE = join(ROOT, 'package');
const manifest = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8'));
const VERSION = manifest.version;
const gitFile = (path) => {
  try {
    return execFileSync('git', ['-C', ROOT, 'show', `${commit}:${path}`], {maxBuffer: 64 * 1024 * 1024});
  } catch {
    return null;
  }
};
const receipt = JSON.parse(gitFile('package/dist/package-receipt.json') ?? 'null');
if (!receipt) {
  console.error(`package/dist/package-receipt.json is not at ${commit.slice(0, 12)}: build and lay the set first`);
  process.exit(2);
}
const passport = JSON.parse(gitFile('package/dist/set.json'));
const RELEASE = `effects-${receipt.package_source.revision.slice(0, 12)}`;

// The npm package, staged from the same tree.
const stage = mkdtempSync(join(tmpdir(), 'effects-set-npm-'));
execFileSync(process.execPath, [join(PACKAGE, 'scripts', 'stage-npm.mjs'), '--out', stage], {stdio: 'ignore'});

const INDEX = {
  schema: 'simai.framework.set-index',
  schema_version: 1,
  summary: 'A local stand: one release of effects.',
  sets: [{id: 'effects', title: passport.title, repository: passport.repository, npm: '@simai-studio/effects', licence: passport.licence, docs: passport.docs}],
  releases: [{
    set: 'effects', release: RELEASE, version: VERSION, source_revision: receipt.package_source.revision,
    framework: {core_runtime: passport.framework.core_runtime, source_revision: passport.framework.source_revision, pair: 'ui-000000000000'},
    requires_sets: [], receipt_sha256: '0'.repeat(64), published_on: '2026-11-03',
  }],
};

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png',
};
const DISTR = {
  core: join(output, 'core', 'core'), rule: join(output, 'core', 'rule'), component: join(output, 'component', 'component'),
  utility: join(output, 'utility', 'utility'), smart: join(output, 'smart', 'smart'),
};
const GH = `/gh/simai/ui-effects@${commit.slice(0, 12)}/`;
const NPM = `/npm/@simai-studio/effects@${VERSION}/`;
const fromDisk = (root, rest) => {
  const file = resolve(root, rest);
  if (file !== root && !file.startsWith(root + sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? readFileSync(file) : null;
};
const pages = {};

function answer(path) {
  if (pages[path]) return [TYPES['.html'], pages[path]];
  if (path === '/npm/@simai-studio/sets@1/index.json') return [TYPES['.json'], `${JSON.stringify(INDEX)}\n`];
  if (path.startsWith('/ui/distr/')) {
    const [part, ...rest] = path.slice('/ui/distr/'.length).split('/');
    return DISTR[part] ? [TYPES[extname(path)], fromDisk(DISTR[part], rest.join('/'))] : null;
  }
  if (path.startsWith(GH)) return [TYPES[extname(path)], gitFile(path.slice(GH.length))];
  if (path.startsWith(NPM)) return [TYPES[extname(path)], fromDisk(stage, path.slice(NPM.length))];
  return null;
}

const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  const [type, body] = answer(path) ?? [];
  if (!body) {
    response.writeHead(404, {'content-type': 'text/plain; charset=utf-8'});
    return response.end('not found');
  }
  response.writeHead(200, {'content-type': type ?? 'application/octet-stream', 'cache-control': 'no-store', 'access-control-allow-origin': '*'});
  response.end(body);
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

const head = (boot, script = '') => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="/ui/distr/core/css/core.css">
<script>
  window.sfPath = '/ui/distr/';
  window.SF_BOOT_CONFIG = ${JSON.stringify({preloader: {enabled: false}, setIndex: `${ORIGIN}/npm/@simai-studio/sets@1/index.json`, setNpm: `${ORIGIN}/npm`, ...boot})};
  window.sfSeen = {ready: [], failed: []};
  document.addEventListener('sf-effect-ready', (event) => window.sfSeen.ready.push({id: event.target.id, ...event.detail}), true);
  document.addEventListener('sf-effect-failed', (event) => window.sfSeen.failed.push({id: event.target.id, ...event.detail}), true);
</script>
<script src="/ui/distr/core/js/core.min.js"${script}></script>
<style>sf-effect, [data-sf-effect] { block-size: 240px; inline-size: 360px; }</style></head><body>`;
const element = (id, extra = '') => `<sf-effect id="${id}" effect="aurora-curtain" speed="200" setting-intensity="40"${extra}></sf-effect>`;
pages['/gh.html'] = `${head({packages: {effects: `${ORIGIN}${GH}package/dist/smart`}})}${element('a')}${element('bad', ' contrast="9999"')}</body></html>`;
pages['/index.html'] = `${head({}, ' data-sf-sets="effects"')}${element('a')}</body></html>`;
pages['/version.html'] = `${head({setIndex: `${ORIGIN}/no-index-here.json`}, ` data-sf-sets="effects@${VERSION}"`)}${element('a')}</body></html>`;
// A page from before the set: Core's frozen engine places the div from its own
// catalogue setting, the set places the element; each is drawn once.
pages['/double.html'] = `${head({packages: {effects: `${ORIGIN}${GH}package/dist/smart`}, effects: {catalogue: `${ORIGIN}${GH}`}})}${element('a')}<div id="legacy" data-sf-effect="aurora-curtain"></div></body></html>`;

const chromium = await loadChromium();
const browser = await chromium.launch(launchOptions());
const results = [];
const check = (page, id, got, want) => results.push({page, id, pass: JSON.stringify(got) === JSON.stringify(want), got, want});

async function open(name, expected) {
  const context = await browser.newContext({viewport: {width: 900, height: 700}});
  const tab = await context.newPage();
  const outside = [];
  const errors = [];
  tab.on('request', (request) => { if (!request.url().startsWith(ORIGIN) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) outside.push(request.url()); });
  tab.on('pageerror', (error) => errors.push(String(error)));
  tab.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await tab.goto(`${ORIGIN}/${name}.html`);
  await tab.waitForFunction((count) => window.sfSeen.ready.length + window.sfSeen.failed.length >= count, expected, {timeout: 30000}).catch(() => {});
  // The frozen Core alias places the div on its own time.
  await tab.waitForFunction(() => {
    const legacy = document.getElementById('legacy');
    return !legacy || legacy.querySelector('iframe, canvas') || legacy.hasAttribute('data-sf-effect-reason');
  }, null, {timeout: 20000}).catch(() => {});
  await tab.waitForTimeout(400);
  const seen = await tab.evaluate(async () => {
    const effects = await SF.package('effects');
    const record = SF.RuleLoader.packageOf('effects');
    const surfaces = (host) => host ? host.querySelectorAll('iframe, canvas').length : -1;
    return {
      ready: window.sfSeen.ready.map(({id, effect, drawn, invalid, sandboxed}) => ({id, effect, drawn, invalid, sandboxed})),
      failed: window.sfSeen.failed,
      record: record && {base: record.base, version: record.version, release: record.release, api: record.api, registered: record.registered},
      exports: Object.keys(effects).sort(),
      sandboxSame: effects.SANDBOX_RUNNER_SHA256 === SF.Effects?.SANDBOX_RUNNER_SHA256,
      surfaces: {a: surfaces(document.getElementById('a')), legacy: surfaces(document.getElementById('legacy'))},
      legacy: document.getElementById('legacy')?.getAttribute('data-sf-effect-reason') ?? null,
      defined: Boolean(customElements.get('sf-effect')),
      notes: (SF.deprecations?.list?.() ?? []).map((note) => note.from).sort(),
    };
  });
  check(name, 'no request leaves the stand', outside, []);
  check(name, 'no page or console error', errors, []);
  check(name, 'sf-effect is defined', seen.defined, true);
  check(name, 'no sf-effect-failed', seen.failed, []);
  const a = seen.ready.find((item) => item.id === 'a');
  check(name, 'sf-effect-ready for aurora-curtain', a && {effect: a.effect, drawn: a.drawn, invalid: a.invalid}, {effect: 'aurora-curtain', drawn: 'self', invalid: []});
  check(name, 'one drawing surface in the element', seen.surfaces.a, 1);
  check(name, 'SF.package(effects) gives the engine', ['loadEffect', 'mountEffect', 'placeEffect', 'SANDBOX_RUNNER_SHA256'].every((key) => seen.exports.includes(key)), true);
  check(name, 'the engine runs the same sandbox runner as Core', seen.sandboxSame, true);
  check(name, 'packageOf names the api and the registration', seen.record && {api: seen.record.api, registered: seen.record.registered}, {api: 'cl-effect', registered: true});
  await context.close();
  return seen;
}

const gh = await open('gh', 2);
check('gh', 'base is the gh/ package/dist/smart', gh.record?.base, `${ORIGIN}${GH}package/dist/smart`);
const bad = gh.ready.find((item) => item.id === 'bad');
check('gh', 'an out-of-range setting is reported invalid', bad?.invalid, ['contrast']);

const indexed = await open('index', 1);
check('index', 'the index gives the version, release and npm base', indexed.record && {base: indexed.record.base, version: indexed.record.version, release: indexed.record.release},
  {base: `${ORIGIN}/npm/@simai-studio/effects@${VERSION}/dist/smart`, version: VERSION, release: RELEASE});

const versioned = await open('version', 1);
check('version', 'a version is its npm base, without the index', versioned.record && {base: versioned.record.base, version: versioned.record.version},
  {base: `${ORIGIN}/npm/@simai-studio/effects@${VERSION}/dist/smart`, version: VERSION});

const double = await open('double', 1);
check('double', 'the frozen alias draws the div once', [double.surfaces.legacy, double.legacy], [1, null]);
check('double', 'the alias is noted', double.notes.includes('data-sf-effect'), true);
check('double', 'the old option is noted too', double.notes.includes('SF_BOOT_CONFIG.effects'), true);

await browser.close();
server.close();
rmSync(stage, {recursive: true, force: true});
const failed = results.filter((result) => !result.pass);
const summary = {commit: commit.slice(0, 12), release: RELEASE, version: VERSION, checks: results.length, passed: results.length - failed.length, failed};
if (option('--json', null)) writeFileSync(option('--json'), `${JSON.stringify({...summary, results}, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
process.exit(failed.length ? 1 : 0);
