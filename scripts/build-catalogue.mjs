#!/usr/bin/env node
// Writes catalogue/index.json: every effect with its theme policy, its files
// with SHA-256 and size, and the Framework kit result.
//
//   node scripts/build-catalogue.mjs           # write catalogue/index.json
//   node scripts/build-catalogue.mjs --check   # fail unless the committed file is current and every effect passes
//
// Sources: effects/policy.json (order, Russian description, schemes, pair,
// tags), effects/<id>/ (manifest, module, preview, README), catalogue/kit.json
// (written by scripts/kit.mjs) and framework.lock.json. A kit result counts
// only when it was taken on the current manifest and module (its digest) and
// against the locked Framework commits; otherwise the effect is «stale».
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {CATALOGUE, EFFECT_FILES, PLACEMENT, ROOT, fileDigest, loadPolicy, lock, readJson, sha256, stableJson, validate} from './lib/common.mjs';

const checkMode = process.argv.includes('--check');
const problems = [];
const framework = lock();
const {policy, entries, problems: policyProblems} = loadPolicy();
problems.push(...policyProblems);
problems.push(...validate(readJson(join(CATALOGUE, 'policy.schema.json')), policy).map((problem) => `effects/policy.json ${problem}`));

const kitPath = join(CATALOGUE, 'kit.json');
const kit = existsSync(kitPath) ? readJson(kitPath) : {effects: {}};
const kitCurrent = kit.framework?.ui === framework.ui.commit && kit.framework?.ui_source === framework.ui_source.commit;

const effects = entries.map((entry) => {
  const {manifest, folder} = entry;
  const files = EFFECT_FILES.filter((name) => existsSync(join(folder, name))).map((name) => ({path: name, ...fileDigest(join(folder, name))}));
  // The README names every setting.
  if (existsSync(join(folder, 'README.md'))) {
    const readme = readFileSync(join(folder, 'README.md'), 'utf8');
    for (const setting of manifest.settings ?? []) if (!readme.includes(`\`${setting.key}\``)) problems.push(`${entry.id}: README.md does not describe \`${setting.key}\``);
  }
  const digest = sha256(['effect.json', 'index.js'].map((name) => sha256(readFileSync(join(folder, name)))).join('\n'));
  const record = kit.effects?.[entry.id];
  let status = 'missing';
  const schemes = {};
  if (record) {
    for (const scheme of entry.schemes) {
      const result = record.schemes?.[scheme];
      if (result) schemes[scheme] = {passed: result.passed, total: result.total};
    }
    const complete = entry.schemes.every((scheme) => schemes[scheme]);
    const passing = complete && Object.values(schemes).every((result) => result.passed === result.total && result.total === framework.kit.checks.length);
    status = record.digest !== digest || !kitCurrent ? 'stale' : !complete ? 'missing' : passing ? 'pass' : 'fail';
  }
  if (status !== 'pass') problems.push(`${entry.id}: kit ${status}${status === 'stale' ? ' (run scripts/kit.mjs)' : ''}`);
  return {
    id: entry.id,
    version: manifest.version,
    label: manifest.label,
    description: entry.description,
    role: entry.role,
    schemes: entry.schemes,
    pair: entry.pair ?? null,
    tags: entry.tags,
    surfaces: manifest.surfaces,
    path: `effects/${entry.id}/`,
    entry: 'index.js',
    files,
    kit: {status, framework: framework.pair, schemes},
  };
});

const catalogue = {
  $schema: './index.schema.json',
  schema: 'simai.ui-effects.catalogue',
  version: 1,
  repository: 'simai/ui-effects',
  standard: framework.standard,
  framework: {pair: framework.pair, ui: framework.ui.commit, ui_source: framework.ui_source.commit},
  runtime: {placement: {path: PLACEMENT, ...fileDigest(join(ROOT, PLACEMENT)), replaced_by: 'simai.effect 1.1 (SF.Effects themeMode, pair, windows, integrity loading)'}},
  counts: {
    effects: effects.length,
    dual: effects.filter((effect) => effect.schemes.length === 2).length,
    dark: effects.filter((effect) => effect.schemes.join() === 'dark').length,
    light: effects.filter((effect) => effect.schemes.join() === 'light').length,
  },
  effects,
};
problems.push(...validate(readJson(join(CATALOGUE, 'index.schema.json')), catalogue).map((problem) => `catalogue ${problem}`));

const path = join(CATALOGUE, 'index.json');
const text = stableJson(catalogue);
if (checkMode) {
  if (!existsSync(path)) problems.push('catalogue/index.json is missing: run scripts/build-catalogue.mjs');
  else if (readFileSync(path, 'utf8') !== text) problems.push('catalogue/index.json is not current: run scripts/build-catalogue.mjs and commit it');
} else {
  writeFileSync(path, text);
  console.log(`wrote catalogue/index.json: ${effects.length} effects (${catalogue.counts.dual} dual, ${catalogue.counts.dark} dark, ${catalogue.counts.light} light)`);
}
if (problems.length) {
  console.error(problems.map((problem) => `FAIL ${problem}`).join('\n'));
  process.exit(1);
}
console.log(`catalogue ${checkMode ? 'check' : 'build'}: ok, ${effects.length} effects, kit pass on all, framework ${framework.pair}`);
