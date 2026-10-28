#!/usr/bin/env node
// Local work: builds the catalogue and the site into dist/, then rebuilds them
// whenever an effect, a site file or the policy changes. Serve dist/ with any
// local web server (a .test site pointed at it, or scripts/serve.mjs) and
// reload the page after a save.
//
//   node scripts/dev.mjs [--out dist]
//
// An effect changed here has no kit result yet, so the catalogue reports it
// as stale and the build goes on: the site still checks every file against
// the fresh index, as the published site does. Run the kit and the gates
// before a commit.
import {spawnSync} from 'node:child_process';
import {watch} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib/common.mjs';

const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist';
const node = process.execPath;

function build(reason) {
  const started = Date.now();
  // The index is written even when an effect's kit result is stale.
  const catalogue = spawnSync(node, [join(ROOT, 'scripts', 'build-catalogue.mjs')], {encoding: 'utf8'});
  const stale = (catalogue.stderr.match(/kit stale/gu) ?? []).length;
  const site = spawnSync(node, [join(ROOT, 'scripts', 'build-site.mjs'), '--out', out], {encoding: 'utf8'});
  if (site.status !== 0) {
    console.error(`dev: site build failed (${reason})\n${site.stderr || site.stdout}`);
    return;
  }
  console.log(`dev: built in ${Date.now() - started} ms (${reason})${stale ? `; ${stale} effect(s) changed since their kit run` : ''}`);
}

build('start');
let timer = 0;
const changed = new Set();
const schedule = (what) => {
  changed.add(what);
  clearTimeout(timer);
  timer = setTimeout(() => {
    const reason = [...changed].slice(0, 3).join(', ');
    changed.clear();
    build(reason);
  }, 150);
};
for (const folder of ['effects', 'site']) {
  watch(join(ROOT, folder), {recursive: true}, (event, file) => { if (file && !file.startsWith('.')) schedule(`${folder}/${file}`); });
}
watch(join(ROOT, 'framework.lock.json'), () => schedule('framework.lock.json'));
console.log(`dev: watching effects/ and site/; the site is in ${out}/`);
