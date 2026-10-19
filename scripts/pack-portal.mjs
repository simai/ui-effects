#!/usr/bin/env node
// Packs the portal artifact of a catalogue release: the site built for its
// simai.io path, as simai/simai.io docs/ASSEMBLY.md asks.
//
//   node scripts/pack-portal.mjs --release v1.0.0 [--commit <40 hex>] [--out portal-release]
//
// Writes to --out:
//   framework-effects-<release>-portal.tar.gz          the site, index.html at the archive root
//   framework-effects-<release>-portal.tar.gz.sha256   its sha256, in sha256sum format
//   framework-effects-<release>-portal-receipt.json    simai.io.portal-artifact v1
// The commit (default HEAD) is the source the snippets are pinned to; the
// working tree must match it. The catalogue must pass its check first.
import {execFileSync} from 'node:child_process';
import {mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {ROOT, lock, sha256, stableJson} from './lib/common.mjs';

const PRODUCT = 'framework-effects';
const LOCALE = 'ru';
const BASE_PATH = '/ru/framework/effects/';
const PORTAL = `https://simai.io${BASE_PATH}`;
// Files the portal hub owns; none may be in the archive.
const HUB_OWNED = ['CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml', '404.html'];

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const release = option('--release', null);
if (!/^v\d+\.\d+\.\d+$/u.test(release ?? '')) throw new Error(`pack-portal: --release must be vX.Y.Z, got ${release}`);
const git = (...rest) => execFileSync('git', ['-C', ROOT, ...rest], {encoding: 'utf8'}).trim();
const commit = option('--commit', null) ?? git('rev-parse', 'HEAD');
if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error(`pack-portal: --commit is not a full commit: ${commit}`);
if (git('rev-parse', 'HEAD') !== commit) throw new Error(`pack-portal: the checkout is not at ${commit}`);
if (git('status', '--porcelain', '--', 'effects', 'site', 'catalogue', 'scripts', 'framework.lock.json')) throw new Error('pack-portal: the working tree differs from the commit');

const out = resolve(ROOT, option('--out', 'portal-release'));
const site = join(out, 'site');
rmSync(out, {recursive: true, force: true});
mkdirSync(out, {recursive: true});
const node = process.execPath;
execFileSync(node, [join(ROOT, 'scripts', 'build-catalogue.mjs'), '--check'], {stdio: 'inherit'});
execFileSync(node, [join(ROOT, 'scripts', 'build-site.mjs'), '--out', site, '--portal', PORTAL], {stdio: 'inherit', env: {...process.env, UI_EFFECTS_COMMIT: commit}});

// What the hub checks, checked here first.
const files = [];
const walk = (dir, prefix = '') => {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, `${prefix}${name}/`);
    else if (stat.isFile()) files.push(`${prefix}${name}`);
    else throw new Error(`pack-portal: ${prefix}${name} is not a regular file`);
  }
};
walk(site);
const owned = files.filter((file) => HUB_OWNED.includes(file));
if (owned.length) throw new Error(`pack-portal: the hub owns ${owned.join(', ')}`);
if (!files.includes('index.html')) throw new Error('pack-portal: no index.html at the root');
for (const page of files.filter((file) => file.endsWith('.html'))) {
  const text = readFileSync(join(site, page), 'utf8');
  const address = `${PORTAL}${page.replace(/index\.html$/u, '')}`;
  if (!text.includes(`<link rel="canonical" href="${address}">`)) throw new Error(`pack-portal: ${page} lacks its canonical address ${address}`);
  if (!/<html lang="ru"/u.test(text) || !/<title>[^<]+<\/title>/u.test(text) || !/<meta name="description" content="[^"]+">/u.test(text)) throw new Error(`pack-portal: ${page} lacks lang, title or description`);
}

// The archive: the site's top-level entries, so index.html sits at its root.
const archive = `${PRODUCT}-${release}-portal.tar.gz`;
execFileSync('tar', ['-czf', join(out, archive), '-C', site, ...readdirSync(site).sort()], {env: {...process.env, COPYFILE_DISABLE: '1'}});
const digest = sha256(readFileSync(join(out, archive)));
writeFileSync(join(out, `${archive}.sha256`), `${digest}  ${archive}\n`);
const receipt = {
  schema: 'simai.io.portal-artifact',
  version: 1,
  product: PRODUCT,
  release,
  repository: 'simai/ui-effects',
  commit,
  locale: LOCALE,
  base_path: BASE_PATH,
  archive,
  sha256: digest,
  files: files.length,
  framework_pair: lock().pair,
};
writeFileSync(join(out, `${PRODUCT}-${release}-portal-receipt.json`), stableJson(receipt));
rmSync(site, {recursive: true, force: true});
console.log(`pack-portal: ${archive}, ${files.length} files, sha256 ${digest}`);
