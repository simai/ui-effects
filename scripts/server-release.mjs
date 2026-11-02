#!/usr/bin/env node
// Lays out the release of effects.simai.io for the simai-env server: the built
// site under public/, served by nginx, and the votes service, which answers
// /api/ on the same address. .simai/app.json tells the server how to run it
// (profile node with a static root; see simai-env docs/architecture/app-manifest.md).
//
//   node scripts/server-release.mjs [--site dist] [--out .release]
//
// Build the site with --votes /api/ first. The votes are kept in the site's
// shared state, outside every release, so a new release keeps them.
import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {ROOT} from './lib/common.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const site = resolve(ROOT, option('--site', 'dist'));
const out = resolve(ROOT, option('--out', '.release'));

const page = readFileSync(join(site, 'en', 'index.html'), 'utf8');
const config = JSON.parse(page.match(/<script type="application\/json" id="site-config">(.*?)<\/script>/su)[1]);
if (config.votes !== '/api/') throw new Error(`server-release: build the site with --votes /api/ (it has ${JSON.stringify(config.votes)})`);
if (!existsSync(join(site, 'catalogue', 'index.json'))) throw new Error('server-release: the site has no catalogue/index.json');

rmSync(out, {recursive: true, force: true});
mkdirSync(join(out, '.simai'), {recursive: true});
cpSync(site, join(out, 'public'), {recursive: true});
for (const file of ['server.mjs', 'store.mjs']) cpSync(join(ROOT, 'service', 'votes', file), join(out, 'service', 'votes', file));

const hardening = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000',
};
const app = {
  schema: 'simai-app/1',
  profile: 'node',
  node: {version: '22', start: 'node service/votes/server.mjs', install: 'none'},
  env: {
    // The effects that may be voted for are the ones this release publishes.
    VOTES_CATALOGUE: '{root}/current/public/catalogue/index.json',
    VOTES_STATE_DIR: '{state}',
    VOTES_ORIGINS: 'https://effects.simai.io',
    VOTES_TRUST_PROXY: '1',
  },
  shared: ['state'],
  static: {root: 'public', fallback: '404'},
  routes: [{path: '/api/', to: 'service'}],
  headers: {site: hardening},
  page: {headers: ['site'], cache: 'no-cache'},
  health: {path: '/api/health', timeout: 60},
};
writeFileSync(join(out, '.simai', 'app.json'), `${JSON.stringify(app, null, 2)}\n`);
console.log(`server-release: ${out} (site at public/, votes service, .simai/app.json)`);
