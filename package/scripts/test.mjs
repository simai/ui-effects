#!/usr/bin/env node
// Usage: node package/scripts/test.mjs [--ui-source <ui-source checkout>] [--overlay <new directory>]
//
// The set's unit suite. Lays the overlay -- ui-source at the revision
// framework.lock.json pins (from git, never a working tree), with this folder's
// src/, tests/ and docs/ (from the working tree) laid over it -- and runs this
// folder's tests/*.test.mjs in it, where the element's relative imports of
// SIMAI Framework Core resolve as they do in ui-builder's package build. A
// package file may not replace a ui-source file. The ui-source checkout
// defaults to $UI_SOURCE_ROOT, else ../ui-source beside this repository.
import {execFileSync, spawnSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const option = (name) => {
  const at = process.argv.indexOf(name);
  return at > 0 ? process.argv[at + 1] : undefined;
};
const repositoryRoot = execFileSync('git', ['-C', PACKAGE_ROOT, 'rev-parse', '--show-toplevel'], {encoding: 'utf8'}).trim();
const uiSource = resolve(option('--ui-source') ?? process.env.UI_SOURCE_ROOT ?? join(repositoryRoot, '..', 'ui-source'));
const lock = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'framework.lock.json'), 'utf8'));
const revision = lock.source?.revision;
if (!/^[0-9a-f]{40}$/u.test(revision ?? '')) throw new Error('framework.lock.json: source.revision must be a full commit');
execFileSync('git', ['-C', uiSource, 'cat-file', '-e', `${revision}^{commit}`], {stdio: 'pipe'});

const overlay = option('--overlay') ? resolve(option('--overlay')) : join(mkdtempSync(join(tmpdir(), 'effects-set-')), 'overlay');
if (existsSync(overlay)) throw new Error(`the overlay directory must not exist: ${overlay}`);
mkdirSync(overlay, {recursive: true});
execFileSync('sh', ['-c', 'git -C "$1" archive --format=tar "$2" | tar -x -C "$3"', 'overlay', uiSource, revision, overlay]);

const files = (root, current = root) => readdirSync(current, {withFileTypes: true})
  .flatMap((entry) => (entry.isDirectory() ? files(root, join(current, entry.name)) : [relative(root, join(current, entry.name))]));
for (const directory of ['src', 'tests', 'docs']) {
  const from = join(PACKAGE_ROOT, directory);
  if (!existsSync(from)) continue;
  for (const file of files(from)) {
    const to = join(overlay, directory, file);
    if (existsSync(to)) throw new Error(`the set would replace ui-source's ${directory}/${file}`);
    mkdirSync(dirname(to), {recursive: true});
    cpSync(join(from, file), to);
  }
}

const tests = readdirSync(join(PACKAGE_ROOT, 'tests')).filter((name) => name.endsWith('.test.mjs')).map((name) => join(overlay, 'tests', name));
const run = spawnSync(process.execPath, ['--test', ...tests], {cwd: overlay, stdio: 'inherit', env: {...process.env, EFFECTS_SET_ROOT: PACKAGE_ROOT}});
if (!option('--overlay')) rmSync(dirname(overlay), {recursive: true, force: true});
process.exit(run.status ?? 1);
