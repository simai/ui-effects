#!/usr/bin/env node
// Builds the catalogue site from site/ into dist/, once per language, each in its
// own folder (en/, ru/, es/, pt-br/, …). The root holds only redirects: each page
// there sends a visitor to the same page in their language, English by default. Pages take their texts
// from site/i18n/<lang>.json ({{t:key}} in a template, t() in a script) and the
// effects' names and descriptions from the catalogue; assets, the catalogue and
// the effects are shared at the root.
//
//   node scripts/build-site.mjs [--out dist] [--votes URL]
//
// The votes service (service/votes/, its /api/ address) is --votes, else
// UI_EFFECTS_VOTES; without one the site has no likes and no popular order.
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
const votes = args.includes('--votes') ? args[args.indexOf('--votes') + 1] : process.env.UI_EFFECTS_VOTES || '';
if (votes && !/^(?:https?:\/\/[^/\s]+)?\/(?:\S*\/)?$/u.test(votes)) throw new Error(`build-site: the votes address must be an http(s) URL or a path from the root, ending in /: ${votes}`);
const framework = lock();
const catalogue = readJson(join(CATALOGUE, 'index.json'));

let commit = process.env.UI_EFFECTS_COMMIT || process.env.GITHUB_SHA || '';
let source = process.env.UI_EFFECTS_COMMIT ? 'UI_EFFECTS_COMMIT' : process.env.GITHUB_SHA ? 'GITHUB_SHA' : 'HEAD';
if (!commit) {
  commit = execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  const dirty = execFileSync('git', ['-C', ROOT, 'status', '--porcelain', '--', 'effects', 'site', 'catalogue'], {encoding: 'utf8'}).trim();
  if (dirty) console.warn('build-site: effects/, site/ or catalogue/ differ from HEAD; the snippets point at HEAD, which does not hold these files');
}
// A draft build (a local commit nobody pushed) names a commit jsDelivr cannot
// serve: the snippets and the downloaded example work once it is published.
const isPublished = () => {
  if (source !== 'HEAD') return true;
  try { execFileSync('git', ['-C', ROOT, 'merge-base', '--is-ancestor', commit, 'origin/main'], {stdio: 'ignore'}); return true; } catch (error) { return false; }
};
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
// Languages: the first is the default and sits at the root. Every dictionary holds
// the same keys; a text of the catalogue missing in a language falls back to English.
const LOCALES = [
  {lang: 'en', dir: 'en/'}, {lang: 'ru', dir: 'ru/'}, {lang: 'es', dir: 'es/'}, {lang: 'pt-BR', dir: 'pt-br/'},
  {lang: 'de', dir: 'de/'}, {lang: 'zh-CN', dir: 'zh-cn/'}, {lang: 'fr', dir: 'fr/'}, {lang: 'ja', dir: 'ja/'},
];
const dictionaries = Object.fromEntries(LOCALES.map(({lang}) => [lang, readJson(join(ROOT, 'site', 'i18n', `${lang}.json`))]));
const keys = Object.keys(dictionaries[LOCALES[0].lang]).sort().join();
for (const {lang} of LOCALES) if (Object.keys(dictionaries[lang]).sort().join() !== keys) throw new Error(`build-site: site/i18n/${lang}.json does not hold the same keys as ${LOCALES[0].lang}.json`);
const pick = (value, lang) => (value && (value[lang] || value.en || value.ru)) || '';
const fill = (line, values = {}) => line.replace(/\{(\w+)\}/gu, (match, name) => (name in values ? String(values[name]) : match));
const render = (template, values, lang) => {
  let page = template.replace('{{HEAD}}', partial('head')).replace('{{HEADER}}', partial('header')).replace('{{FOOTER}}', partial('footer'));
  for (const [key, value] of Object.entries(values)) page = page.replaceAll(`{{${key}}}`, value);
  page = page.replace(/\{\{t:([a-z0-9.-]+)\}\}/gu, (match, key) => {
    if (!(key in dictionaries[lang])) throw new Error(`build-site: no text ${key} in site/i18n/${lang}.json`);
    return escape(dictionaries[lang][key]);
  });
  const left = page.match(/\{\{[A-Za-z_:.-]+\}\}/u);
  if (left) throw new Error(`build-site: ${left[0]} left in a page`);
  return page;
};
// The same page in every language, for the switch and for search engines. `page`
// is the page's path under a language folder ('' or 'effect/<id>/').
const up = (path) => '../'.repeat(path.split('/').filter(Boolean).length);
const alternates = (locale, page) => LOCALES.map((other) => ({lang: other.lang, name: dictionaries[other.lang]['lang.name'], english: dictionaries[other.lang]['lang.english'], href: `${up(locale.dir + page)}${other.dir}${page}`}));
// The languages: a globe in the tools that opens the Framework's menu of this page in every
// language, each named in itself with its English name below, the current one marked. The menu sits after the header; site/assets/common.js opens it.
const languageButton = (locale) => {
  const word = escape(dictionaries[locale.lang]['lang.switch']);
  return `<button slot="tools" type="button" class="sf-icon-button sf-icon-button--icon sf-icon-button--on-surface sf-icon-button--link sf-icon-button--size-1/2" aria-label="${word}" title="${word}" aria-haspopup="menu" data-lang-button><sf-icon icon="language" aria-hidden="true"></sf-icon></button>`;
};
const languageMenu = (locale, page) => {
  const entries = alternates(locale, page).map((other) => ({id: other.lang, text: other.name, ...(other.english !== other.name && {caption: other.english}), lang: other.lang, href: other.href, current: other.lang === locale.lang}));
  return `<sf-menu-context popup aria-label="${escape(dictionaries[locale.lang]['lang.switch'])}" data-lang-menu data-entries="${escape(JSON.stringify(entries))}"></sf-menu-context>`;
};
const alternateTags = (locale, page) => alternates(locale, page).map((other) => `<link rel="alternate" hreflang="${other.lang}" href="${other.href}">`).join('\n');
const siteConfig = (rootPath, locale, page) => JSON.stringify({
  root: rootPath,
  home: up(page) || './',
  lang: locale.lang,
  strings: dictionaries[locale.lang],
  commit,
  commit_source: source,
  cdn: `https://cdn.jsdelivr.net/gh/simai/ui-effects@${commit}/`,
  published: isPublished(),
  votes: votes || null,
  framework: {pair: framework.pair, commit: framework.ui.commit, base: frameworkBase(framework)},
}).replace(/</gu, '\\u003c');
const common = (locale, page) => ({
  ROOT: up(locale.dir + page) || './',
  HOME: up(page) || './',
  LANG: locale.lang,
  LANGUAGES: languageButton(locale),
  LANGUAGE_MENU: languageMenu(locale, page),
  ALTERNATES: alternateTags(locale, page),
  CONFIG: siteConfig(up(locale.dir + page) || './', locale, page),
  FRAMEWORK_BASE: frameworkBase(framework),
  PAIR: framework.pair,
  COMMIT_SHORT: commit.slice(0, 12),
});

const galleryTemplate = readFileSync(join(ROOT, 'site', 'index.html'), 'utf8');
const effectTemplate = readFileSync(join(ROOT, 'site', 'effect.html'), 'utf8');
const authorsTemplate = readFileSync(join(ROOT, 'site', 'authors.html'), 'utf8');
for (const locale of LOCALES) {
  const strings = dictionaries[locale.lang];
  mkdirSync(join(out, locale.dir), {recursive: true});
  writeFileSync(join(out, locale.dir, 'index.html'), render(galleryTemplate, {
    ...common(locale, ''),
    TITLE: escape(strings['site.title']),
    DESCRIPTION: escape(fill(strings['site.description'], {n: catalogue.effects.length})),
  }, locale.lang));
  mkdirSync(join(out, locale.dir, 'authors'), {recursive: true});
  writeFileSync(join(out, locale.dir, 'authors', 'index.html'), render(authorsTemplate, {
    ...common(locale, 'authors/'),
    TITLE: escape(strings['nav.authors.title']),
    DESCRIPTION: escape(strings['authors.description']),
  }, locale.lang));
  for (const effect of catalogue.effects) {
    const page = `effect/${effect.id}/`;
    mkdirSync(join(out, locale.dir, page), {recursive: true});
    writeFileSync(join(out, locale.dir, page, 'index.html'), render(effectTemplate, {
      ...common(locale, page),
      TITLE: escape(fill(strings['effect.title'], {label: pick(effect.label, locale.lang)})),
      DESCRIPTION: escape(pick(effect.description, locale.lang)),
      EFFECT_ID: effect.id,
      EFFECT_LABEL: escape(pick(effect.label, locale.lang)),
      EFFECT_DESCRIPTION: escape(pick(effect.description, locale.lang)),
    }, locale.lang));
  }
}
// The root: the gallery, the authors page and every effect page lead to the same page in the
// language the visitor chose before (stored by site/assets/common.js), else the first of the
// browser's languages the site has (by its main subtag too: pt -> pt-BR, zh -> zh-CN), else
// English. Old links to the root keep working. Without scripts, a refresh goes to English.
const redirect = (page) => {
  const english = `${LOCALES[0].dir}${page}`, base = up(page) || './';
  const offered = JSON.stringify(LOCALES.map(({lang, dir}) => [lang, dir]));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>SIMAI Framework background effects</title>
<link rel="canonical" href="${english}">
${LOCALES.map(({lang, dir}) => `<link rel="alternate" hreflang="${lang}" href="${dir}${page}">`).join('\n')}
<script>
(() => {
  const offered = ${offered};
  const find = (tag) => tag && (offered.find(([lang]) => lang.toLowerCase() === tag.toLowerCase()) || offered.find(([lang]) => lang.split('-')[0] === tag.toLowerCase().split('-')[0]));
  let kept = null;
  try { kept = localStorage.getItem('ui-effects-lang'); } catch { /* none kept */ }
  const chosen = find(kept) || [...(navigator.languages || [navigator.language])].map(find).find(Boolean) || offered[0];
  location.replace('${base}' + chosen[1] + '${page}' + location.search + location.hash);
})();
</script>
<noscript><meta http-equiv="refresh" content="0; url=${english}"></noscript>
</head>
<body><p><a href="${english}">SIMAI Framework background effects</a></p></body>
</html>
`;
};
for (const page of ['', 'authors/', ...catalogue.effects.map((effect) => `effect/${effect.id}/`)]) {
  mkdirSync(join(out, page), {recursive: true});
  writeFileSync(join(out, page, 'index.html'), redirect(page));
}
for (const effect of catalogue.effects) {
  mkdirSync(join(out, effect.path), {recursive: true});
  for (const file of effect.files) if (file.path !== 'README.md') cpSync(join(ROOT, effect.path, file.path), join(out, effect.path, file.path));
}
cpSync(join(ROOT, 'site', 'assets'), join(out, 'assets'), {recursive: true});
mkdirSync(join(out, 'catalogue'), {recursive: true});
cpSync(join(CATALOGUE, 'index.json'), join(out, 'catalogue', 'index.json'));
cpSync(join(CATALOGUE, 'index.schema.json'), join(out, 'catalogue', 'index.schema.json'));
writeFileSync(join(out, '.nojekyll'), '');
if (!existsSync(join(out, 'assets', 'configurator.js'))) throw new Error('build-site: assets missing');
console.log(`build-site: ${(catalogue.effects.length + 2) * LOCALES.length} pages (${LOCALES.map(({lang}) => lang).join(', ')}) in ${out}; snippets pinned to ${commit.slice(0, 12)} (${source}); Framework ${framework.pair}`);
