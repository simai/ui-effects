#!/usr/bin/env node
// Builds the catalogue site from site/ into dist/.
//
//   node scripts/build-site.mjs [--out dist]
//
// The commit the snippets point at (jsDelivr gh/simai/ui-effects@<commit>) is
// UI_EFFECTS_COMMIT, else GITHUB_SHA (CI), else the checkout's HEAD. The
// Framework is loaded from jsDelivr at the commit of framework.lock.json.
// Every URL in the built pages is relative, so the site works under any base
// path (GitHub Pages serves it at https://effects.simai.io/).
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {CATALOGUE, ROOT, fileDigest, frameworkBase, lock, readJson} from './lib/common.mjs';

const args = process.argv.slice(2);
const out = resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist');
const framework = lock();
const catalogue = readJson(join(CATALOGUE, 'index.json'));

let commit = process.env.UI_EFFECTS_COMMIT || process.env.GITHUB_SHA || '';
let source = process.env.UI_EFFECTS_COMMIT ? 'UI_EFFECTS_COMMIT' : process.env.GITHUB_SHA ? 'GITHUB_SHA' : 'HEAD';
if (!commit) {
  commit = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  const dirty = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', 'effects', 'site', 'catalogue'], {encoding: 'utf8'}).trim();
  if (dirty) console.warn('build-site: effects/, site/ or catalogue/ differ from HEAD; the snippets point at HEAD, which does not hold these files');
}
if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error(`build-site: ${source} is not a full commit: ${commit}`);

// The core checks every effect file against the catalogue before it runs, so
// the two must agree before anything is published.
for (const effect of catalogue.effects) {
  for (const file of effect.files) {
    if (fileDigest(join(ROOT, effect.path, file.path)).sha256 !== file.sha256) throw new Error(`build-site: ${effect.path}${file.path} differs from the catalogue`);
  }
}

rmSync(out, {recursive: true, force: true});
mkdirSync(out, {recursive: true});
const partial = (name) => readFileSync(join(ROOT, 'site', 'partials', `${name}.html`), 'utf8');
const escape = (value) => String(value).replace(/&/gu, '&amp;').replace(/"/gu, '&quot;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');
const render = (template, values) => {
  let page = template.replace('{{HEAD}}', partial('head')).replace('{{HEADER}}', partial('header')).replace('{{FOOTER}}', partial('footer'));
  for (const [key, value] of Object.entries(values)) page = page.replaceAll(`{{${key}}}`, value);
  const left = page.match(/\{\{[A-Z_]+\}\}/u);
  if (left) throw new Error(`build-site: ${left[0]} left in a page`);
  return page;
};
const siteConfig = (rootPath) => JSON.stringify({
  root: rootPath,
  commit,
  commit_source: source,
  cdn: `https://cdn.jsdelivr.net/gh/simai/ui-effects@${commit}/`,
  framework: {pair: framework.pair, commit: framework.ui.commit, base: frameworkBase(framework)},
}).replace(/</gu, '\\u003c');
const common = (rootPath) => ({
  ROOT: rootPath,
  CONFIG: siteConfig(rootPath),
  FRAMEWORK_BASE: frameworkBase(framework),
  PAIR: framework.pair,
  COMMIT_SHORT: commit.slice(0, 12),
});

writeFileSync(join(out, 'index.html'), render(readFileSync(join(ROOT, 'site', 'index.html'), 'utf8'), {
  ...common('./'),
  TITLE: 'Фоновые эффекты SIMAI Framework',
  DESCRIPTION: `Каталог фоновых эффектов для SIMAI Framework: ${catalogue.effects.length} эффектов, живой пример, настройки и код подключения.`,
}));
const effectTemplate = readFileSync(join(ROOT, 'site', 'effect.html'), 'utf8');
for (const effect of catalogue.effects) {
  mkdirSync(join(out, 'effect', effect.id), {recursive: true});
  writeFileSync(join(out, 'effect', effect.id, 'index.html'), render(effectTemplate, {
    ...common('../../'),
    TITLE: `${escape(effect.label.ru)} — фоновые эффекты SIMAI Framework`,
    DESCRIPTION: escape(effect.description.ru),
    EFFECT_ID: effect.id,
    EFFECT_LABEL: escape(effect.label.ru),
    EFFECT_DESCRIPTION: escape(effect.description.ru),
  }));
  mkdirSync(join(out, effect.path), {recursive: true});
  for (const file of effect.files) if (file.path !== 'README.md') cpSync(join(ROOT, effect.path, file.path), join(out, effect.path, file.path));
}
cpSync(join(ROOT, 'site', 'assets'), join(out, 'assets'), {recursive: true});
mkdirSync(join(out, 'catalogue'), {recursive: true});
cpSync(join(CATALOGUE, 'index.json'), join(out, 'catalogue', 'index.json'));
cpSync(join(CATALOGUE, 'index.schema.json'), join(out, 'catalogue', 'index.schema.json'));
writeFileSync(join(out, '.nojekyll'), '');
if (!existsSync(join(out, 'assets', 'configurator.js'))) throw new Error('build-site: assets missing');
console.log(`build-site: ${catalogue.effects.length + 1} pages in ${out}; snippets pinned to ${commit.slice(0, 12)} (${source}); Framework ${framework.pair}`);
