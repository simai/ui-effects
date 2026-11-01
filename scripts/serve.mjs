#!/usr/bin/env node
// Serves dist/ at the root, as https://effects.simai.io/ does, for a look in the browser.
//   node scripts/serve.mjs [--port 4173] [--votes STATE_DIR]
// --votes answers /api/ with the votes service on the same address, keeping its
// state in STATE_DIR; build the site with --votes /api/ to use it.
import {join, resolve} from 'node:path';
import {ROOT} from './lib/common.mjs';
import {serve} from './lib/serve.mjs';

const args = process.argv.slice(2);
const port = args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : 4173;
const votesDir = args.includes('--votes') ? args[args.indexOf('--votes') + 1] : null;
let api = null;
if (votesDir) {
  const {createVotesServer} = await import('../service/votes/server.mjs');
  const {server} = createVotesServer({stateDir: resolve(votesDir), catalogue: join(ROOT, 'catalogue', 'index.json')});
  api = (request, response) => server.emit('request', request, response);
}
const {url} = await serve(join(ROOT, 'dist'), '/', port, api);
console.log(`serving dist/ at ${url}`);
