#!/usr/bin/env node
// Runs the Framework's effect kit on every effect; the kit runs each scheme it declares.
//
//   UI_ROOT=../ui UI_SOURCE_ROOT=../ui-source node scripts/kit.mjs [--only id,id] [--jobs 4]
//
// The kit is scripts/effect-kit.mjs of simai/ui-source, and the build it runs
// against is distr/core of simai/ui, both at the commits of framework.lock.json.
// They are read with `git archive` from local clones (UI_ROOT and UI_SOURCE_ROOT,
// default ../ui and ../ui-source beside this checkout) into a work folder
// (KIT_WORK, default .kit/); nothing is checked out or written in those clones.
//
// The kit of simai.effect 1.1 mounts the effect in each scheme it declares
// (context.scheme), switches a two-scheme effect, measures contrast and runs
// the windows check. A run passes when every check the lock expects for that
// manifest ran and held. The results go to catalogue/kit.json with a digest of
// the manifest and module they were taken on; build-catalogue.mjs refuses a
// result whose digest is stale.
//
// The kit imports `playwright`; a small shim in the work folder hands it this
// repository's playwright-core (PLAYWRIGHT_CORE overrides it), with CHROME_PATH
// launched in the new headless mode when set.
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CATALOGUE, ROOT, expectedChecks, loadPolicy, lock, readJson, sha256, stableJson} from './lib/common.mjs';

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

// One run per effect.
const runs = [];
for (const entry of entries) {
  if (only && !only.includes(entry.id)) continue;
  runs.push({entry, folder: entry.folder});
}

// --template also runs templates/effect; it is not recorded.
if (args.includes('--template')) {
  const folder = join(ROOT, 'templates', 'effect');
  runs.push({entry: {id: 'templates/effect', folder, template: true}, folder});
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
    const expected = expectedChecks(readJson(join(run.folder, 'effect.json')), framework);
    const ran = new Map(outcome.results.map((result) => [result.id, result.ok]));
    const failing = [...outcome.results.filter((result) => !result.ok).map((result) => result.id), ...expected.filter((id) => !ran.has(id)).map((id) => `${id} (not run)`)];
    const passed = expected.filter((id) => ran.get(id) === true).length;
    const total = expected.length;
    const ok = outcome.ok && passed === total && !failing.length;
    if (!ok) failed += 1;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${run.entry.id} ${passed}/${total}${failing.length ? ` failing: ${failing.join(', ')}` : ''}`);
    if (!ok) for (const result of outcome.results.filter((item) => !item.ok)) console.log(`     ${result.id} ${JSON.stringify(result.detail ?? null)}`);
    if (run.entry.template) continue;
    // Pass counts only: measured values (contrast, frame means) differ across
    // platforms, and CI checks that the committed results reproduce.
    results.set(run.entry.id, {digest: digestOf(run.entry.folder), passed, total, failed: failing});
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
  if (fresh) effects[entry.id] = fresh;
  else if (sameFramework && previous.effects?.[entry.id]) effects[entry.id] = previous.effects[entry.id];
}
mkdirSync(CATALOGUE, {recursive: true});
writeFileSync(path, stableJson({
  schema: 'simai.ui-effects.kit',
  version: 2,
  framework: {pair: framework.pair, ui: framework.ui.commit, ui_source: framework.ui_source.commit},
  kit: {script: framework.kit.script, sha256: sha256(readFileSync(kitScript))},
  effects,
}));
console.log(`kit: ${runs.length - failed}/${runs.length} runs passed (${new Set(runs.map((run) => run.entry.id)).size} effects${args.includes('--template') ? ', with the template' : ''}); wrote catalogue/kit.json`);
process.exit(failed ? 1 : 0);
