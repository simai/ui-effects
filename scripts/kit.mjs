#!/usr/bin/env node
// Runs the Framework's effect kit on every effect, in every scheme it declares.
//
//   UI_ROOT=../ui UI_SOURCE_ROOT=../ui-source node scripts/kit.mjs [--only id,id] [--jobs 4]
//
// The kit is scripts/effect-kit.mjs of simai/ui-source, and the build it runs
// against is distr/core of simai/ui, both at the commits of framework.lock.json.
// They are read with `git archive` from local clones (UI_ROOT and UI_SOURCE_ROOT,
// default ../ui and ../ui-source beside this checkout) into a work folder
// (KIT_WORK, default .kit/); nothing is checked out or written in those clones.
//
// A scheme other than the effect's home scheme is run on a copy whose `scheme`
// default is that scheme, so the kit mounts it drawn that way. The results go
// to catalogue/kit.json with a digest of the manifest and module they were
// taken on; build-catalogue.mjs refuses a result whose digest is stale.
//
// The kit imports `playwright`; a small shim in the work folder hands it this
// repository's playwright-core (PLAYWRIGHT_CORE overrides it), with CHROME_PATH
// launched in the new headless mode when set.
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CATALOGUE, ROOT, loadPolicy, lock, sha256, stableJson} from './lib/common.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
};
const only = option('--only', '') ? option('--only', '').split(',') : null;
const jobs = Number(option('--jobs', '4'));

const framework = lock();
const uiRoot = resolve(process.env.UI_ROOT ?? join(ROOT, '..', 'ui'));
const sourceRoot = resolve(process.env.UI_SOURCE_ROOT ?? join(ROOT, '..', 'ui-source'));
const work = resolve(process.env.KIT_WORK ?? join(ROOT, '.kit'));

const git = (root, ...rest) => execFileSync('git', ['-C', root, ...rest], {stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 30});
for (const [root, commit] of [[uiRoot, framework.ui.commit], [sourceRoot, framework.ui_source.commit]]) {
  try { git(root, 'cat-file', '-e', `${commit}^{commit}`); } catch {
    console.error(`kit: ${root} does not hold ${commit}; set UI_ROOT / UI_SOURCE_ROOT to clones that do`);
    process.exit(2);
  }
}

// The build: <work>/build/core/core is distr/core of ui at the lock.
rmSync(work, {recursive: true, force: true});
mkdirSync(join(work, 'archive'), {recursive: true});
const extract = (root, commit, path, into) => {
  const tar = git(root, 'archive', '--format=tar', commit, path);
  execFileSync('tar', ['-x', '-C', into], {input: tar});
};
extract(uiRoot, framework.ui.commit, 'distr/core', join(work, 'archive'));
mkdirSync(join(work, 'build', 'core'), {recursive: true});
cpSync(join(work, 'archive', 'distr', 'core'), join(work, 'build', 'core', 'core'), {recursive: true});
rmSync(join(work, 'archive'), {recursive: true, force: true});

// The kit script, unchanged, and the playwright shim beside it.
const kitDir = join(work, 'kit');
mkdirSync(join(kitDir, 'scripts'), {recursive: true});
extract(sourceRoot, framework.ui_source.commit, framework.kit.script, kitDir);
const kitScript = join(kitDir, framework.kit.script);
const corePath = process.env.PLAYWRIGHT_CORE
  ? join(process.env.PLAYWRIGHT_CORE, 'index.mjs')
  : createRequire(join(ROOT, 'package.json')).resolve('playwright-core').replace(/index\.js$/u, 'index.mjs');
mkdirSync(join(kitDir, 'node_modules', 'playwright'), {recursive: true});
writeFileSync(join(kitDir, 'node_modules', 'playwright', 'package.json'), stableJson({name: 'playwright', type: 'module', main: 'index.mjs'}));
writeFileSync(join(kitDir, 'node_modules', 'playwright', 'index.mjs'), `// Shim: the kit's playwright is ui-effects' playwright-core.
import core from ${JSON.stringify(pathToFileURL(corePath).href)};
const chrome = process.env.CHROME_PATH;
export const chromium = {
  launch: (options = {}) => core.chromium.launch(chrome
    ? {...options, executablePath: chrome, headless: false, args: [...(options.args ?? []), '--headless=new']}
    : options),
};
export default {chromium};
`);
const {runEffectKit} = await import(pathToFileURL(kitScript).href);

const {entries, problems} = loadPolicy();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
const digestOf = (folder) => sha256(['effect.json', 'index.js'].map((name) => sha256(readFileSync(join(folder, name)))).join('\n'));

// One run per effect and scheme.
const runs = [];
for (const entry of entries) {
  if (only && !only.includes(entry.id)) continue;
  for (const scheme of entry.schemes) {
    let folder = entry.folder;
    if (scheme !== entry.schemes[0]) {
      folder = join(work, 'variants', `${entry.id}--${scheme}`);
      mkdirSync(folder, {recursive: true});
      for (const name of ['effect.json', 'index.js', 'preview.png']) cpSync(join(entry.folder, name), join(folder, name));
      const manifest = JSON.parse(readFileSync(join(folder, 'effect.json'), 'utf8'));
      const setting = manifest.settings.find((item) => item.key === 'scheme');
      if (!setting) throw new Error(`${entry.id}: no scheme setting`);
      setting.default = scheme;
      writeFileSync(join(folder, 'effect.json'), stableJson(manifest));
    }
    runs.push({entry, scheme, folder});
  }
}

// --template also runs templates/effect, in both schemes; it is not recorded.
if (args.includes('--template')) {
  const folder = join(ROOT, 'templates', 'effect');
  for (const scheme of ['dark', 'light']) {
    let target = folder;
    if (scheme !== 'dark') {
      target = join(work, 'variants', `template--${scheme}`);
      mkdirSync(target, {recursive: true});
      for (const name of ['effect.json', 'index.js']) cpSync(join(folder, name), join(target, name));
      const manifest = JSON.parse(readFileSync(join(target, 'effect.json'), 'utf8'));
      manifest.settings.find((item) => item.key === 'scheme').default = scheme;
      writeFileSync(join(target, 'effect.json'), stableJson(manifest));
    }
    runs.push({entry: {id: 'templates/effect', folder, template: true}, scheme, folder: target});
  }
}

const results = new Map();
let failed = 0;
const queue = [...runs];
const worker = async () => {
  while (queue.length) {
    const run = queue.shift();
    let outcome;
    try {
      outcome = await runEffectKit(run.folder, join(work, 'build'));
    } catch (error) {
      outcome = {ok: false, results: [{id: 'run', ok: false, detail: String(error?.message ?? error)}]};
    }
    const failing = outcome.results.filter((result) => !result.ok).map((result) => result.id);
    const passed = outcome.results.filter((result) => result.ok).length;
    const total = framework.kit.checks.length;
    const ok = outcome.ok && passed === total;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${run.entry.id} ${run.scheme} ${passed}/${total}${failing.length ? ` failing: ${failing.join(', ')}` : ''}`);
    if (!ok) for (const result of outcome.results.filter((item) => !item.ok)) console.log(`     ${result.id} ${JSON.stringify(result.detail ?? null)}`);
    if (run.entry.template) continue;
    const record = results.get(run.entry.id) ?? {digest: digestOf(run.entry.folder), schemes: {}};
    record.schemes[run.scheme] = {passed, total, failed: failing};
    results.set(run.entry.id, record);
  }
};
await Promise.all(Array.from({length: Math.max(1, jobs)}, worker));

// catalogue/kit.json: results in catalogue order, merged into the previous
// file when only some effects ran.
const path = join(CATALOGUE, 'kit.json');
const previous = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {effects: {}};
const sameFramework = previous.framework?.ui === framework.ui.commit && previous.framework?.ui_source === framework.ui_source.commit;
const effects = {};
for (const entry of entries) {
  const fresh = results.get(entry.id);
  if (fresh) effects[entry.id] = {digest: fresh.digest, schemes: Object.fromEntries(entry.schemes.map((scheme) => [scheme, fresh.schemes[scheme]]))};
  else if (sameFramework && previous.effects?.[entry.id]) effects[entry.id] = previous.effects[entry.id];
}
mkdirSync(CATALOGUE, {recursive: true});
writeFileSync(path, stableJson({
  schema: 'simai.ui-effects.kit',
  version: 1,
  framework: {pair: framework.pair, ui: framework.ui.commit, ui_source: framework.ui_source.commit},
  kit: {script: framework.kit.script, sha256: sha256(readFileSync(kitScript)), checks: framework.kit.checks.length},
  effects,
}));
console.log(`kit: ${runs.length - failed}/${runs.length} runs passed (${new Set(runs.map((run) => run.entry.id)).size} effects${args.includes('--template') ? ', with the template' : ''}); wrote catalogue/kit.json`);
process.exit(failed ? 1 : 0);
