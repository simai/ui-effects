#!/usr/bin/env node
// Serves dist/ under /ui-effects/ for a look in the browser.
//   node scripts/serve.mjs [--port 4173]
import {join} from 'node:path';
import {ROOT} from './lib/common.mjs';
import {serve} from './lib/serve.mjs';

const args = process.argv.slice(2);
const port = args.includes('--port') ? Number(args[args.indexOf('--port') + 1]) : 4173;
const {url} = await serve(join(ROOT, 'dist'), '/ui-effects/', port);
console.log(`serving dist/ at ${url}`);
