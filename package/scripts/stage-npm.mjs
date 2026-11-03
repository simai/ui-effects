#!/usr/bin/env node
// Stage the npm package @simai-studio/effects from a released set build.
//
//   node package/scripts/stage-npm.mjs [--out DIR] [--check]
//
// The package is what jsDelivr serves at
// https://cdn.jsdelivr.net/npm/@simai-studio/effects@<version>/:
//
//   dist/                 package/dist as the release route laid it: set.json,
//                         smart/ (rule.js and the element's folder) and the
//                         package receipt
//   catalogue/*.json      the catalogue and its integrity index
//   effects/<id>/...      effect.json and the module files the index hashes
//   package.json, README.md, LICENSE, NOTICE
//
// The engine finds the catalogue from its own base: <root>/dist/smart/ ->
// <root>/catalogue/index.json, the same walk as the repository layout
// <commit>/package/dist/smart/ -> <commit>/catalogue/. So the catalogue, the
// effects and the built element are one commit, staged together.
//
// It refuses a build whose passport is not package/set.json (the set changed
// and was not rebuilt) and an effect file the catalogue index hashes that is
// missing or different. --check stages into a temporary folder and runs
// `npm pack --dry-run` on it. Nothing is published.
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PACKAGE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(PACKAGE, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const check = args.includes('--check');
const out = check ? mkdtempSync(join(tmpdir(), 'effects-npm-')) : resolve(option('--out', join(PACKAGE, 'stage')));
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { console.error(`STAGE_FAILED — ${message}`); process.exit(1); };

function copy(from, to) {
  mkdirSync(dirname(to), {recursive: true});
  copyFileSync(from, to);
}

function copyTree(from, to) {
  for (const name of readdirSync(from).sort()) {
    const source = join(from, name);
    if (statSync(source).isDirectory()) copyTree(source, join(to, name));
    else copy(source, join(to, name));
  }
}

const dist = join(PACKAGE, 'dist');
if (!existsSync(join(dist, 'smart', 'rule.js'))) fail('package/dist holds no build: run the release route first');
if (!existsSync(join(dist, 'set.json'))) fail('package/dist/set.json is missing');
if (readFileSync(join(dist, 'set.json'), 'utf8') !== readFileSync(join(PACKAGE, 'set.json'), 'utf8')) {
  fail('package/dist/set.json is not package/set.json: the set changed after its build');
}
const manifest = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8'));
if (manifest.simai?.base !== 'dist/smart') fail('package.json simai.base is not dist/smart');

rmSync(out, {recursive: true, force: true});
mkdirSync(out, {recursive: true});
copyTree(dist, join(out, 'dist'));
for (const name of ['package.json', 'README.md']) copy(join(PACKAGE, name), join(out, name));
for (const name of ['LICENSE', 'NOTICE']) copy(join(ROOT, name), join(out, name));
for (const name of readdirSync(join(ROOT, 'catalogue')).filter((file) => file.endsWith('.json')).sort()) {
  copy(join(ROOT, 'catalogue', name), join(out, 'catalogue', name));
}

// Every file the integrity index hashes, checked as it is copied.
const index = JSON.parse(readFileSync(join(ROOT, 'catalogue', 'index.json'), 'utf8'));
let files = 0;
for (const entry of index.effects) {
  for (const file of entry.files ?? []) {
    if (!/\.(json|js|css)$/u.test(file.path)) continue;
    const source = join(ROOT, 'effects', entry.id, file.path);
    if (!existsSync(source)) fail(`effects/${entry.id}/${file.path} is in the catalogue index but not in the tree`);
    if (sha256(readFileSync(source)) !== file.sha256) fail(`effects/${entry.id}/${file.path} is not the byte the catalogue index hashes`);
    copy(source, join(out, 'effects', entry.id, file.path));
    files += 1;
  }
}

if (check) {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], {cwd: out, encoding: 'utf8'}))[0];
  const names = new Set(packed.files.map((file) => file.path));
  for (const wanted of ['dist/set.json', 'dist/smart/rule.js', 'catalogue/index.json', 'package.json', 'LICENSE']) {
    if (!names.has(wanted)) fail(`npm pack leaves out ${wanted}`);
  }
  console.log(JSON.stringify({package: `${packed.name}@${packed.version}`, files: packed.entryCount, size: packed.size, effects_files: files}));
  rmSync(out, {recursive: true, force: true});
} else {
  console.log(JSON.stringify({staged: out, package: `${manifest.name}@${manifest.version}`, effects_files: files}));
}
