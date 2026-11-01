#!/usr/bin/env node
// The votes service of the catalogue site: likes, dislikes and how many browsers
// copied an effect's code or downloaded its example. No accounts, no cookies, no
// addresses kept: one vote per browser and effect, by the random id the browser
// keeps (service/votes/store.mjs keeps only a keyed hash of it).
//
//   VOTES_STATE_DIR=state VOTES_ORIGINS=https://effects.simai.io node service/votes/server.mjs
//
// GET  /api/health                         {ok, effects}
// GET  /api/stats                          {effects: {<id>: {up, down, copied, downloaded, score}}}
// POST /api/vote {effect, voter, value}    value 1 (like), -1 (dislike) or 0 (taken back)
// POST /api/use  {effect, voter, kind}     kind copy or download, counted once per browser
//
// VOTES_PORT (8787), VOTES_HOST (127.0.0.1), VOTES_STATE_DIR (./state),
// VOTES_CATALOGUE (catalogue/index.json beside this repository's service/: the
// effects that may be voted for), VOTES_ORIGINS (pages allowed to call, comma
// separated; empty answers any origin, for local work).
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {KINDS, openStore} from './store.mjs';

const here = dirname(fileURLToPath(import.meta.url));

export function createVotesServer({stateDir, catalogue, origins = []}) {
  const ids = new Set(JSON.parse(readFileSync(catalogue, 'utf8')).effects.map((effect) => effect.id));
  const store = openStore(stateDir);
  // Writes per client address per minute; the address is kept in memory only.
  const LIMIT = 60, buckets = new Map();
  const limited = (address) => {
    const now = Date.now(), bucket = buckets.get(address);
    if (!bucket || now - bucket.since > 60000) { buckets.set(address, {since: now, count: 1}); return false; }
    bucket.count += 1;
    return bucket.count > LIMIT;
  };
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [address, bucket] of buckets) if (now - bucket.since > 60000) buckets.delete(address);
  }, 60000);
  const compactor = setInterval(() => store.compact(), 10 * 60000);
  sweep.unref();
  compactor.unref();

  const VOTER = /^[0-9a-f]{32}$/u;
  const send = (response, status, body, headers = {}) => {
    response.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', ...headers});
    response.end(body === null ? '' : JSON.stringify(body));
  };
  const readBody = (request) => new Promise((done, failed) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      // A body over the limit is read to its end and dropped, so the answer still arrives.
      size += chunk.length;
      if (size <= 1024) chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > 1024) { failed(new Error('too large')); return; }
      try { done(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { failed(error); }
    });
    request.on('error', failed);
  });

  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    const cors = {};
    if (origin && (!origins.length || origins.includes(origin))) {
      Object.assign(cors, {'access-control-allow-origin': origin, vary: 'Origin'});
    } else if (origin) {
      return send(response, 403, {error: 'origin'});
    }
    const path = new URL(request.url, 'http://x').pathname;
    if (request.method === 'OPTIONS') {
      return send(response, 204, null, {...cors, 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400'});
    }
    if (request.method === 'GET' && path === '/api/health') return send(response, 200, {ok: true, effects: ids.size}, cors);
    if (request.method === 'GET' && path === '/api/stats') return send(response, 200, {effects: store.stats()}, {...cors, 'cache-control': 'public, max-age=30'});
    if (request.method !== 'POST' || (path !== '/api/vote' && path !== '/api/use')) return send(response, 404, {error: 'not found'}, cors);
    if (limited(request.socket.remoteAddress ?? '')) return send(response, 429, {error: 'slow down'}, cors);
    let body;
    try { body = await readBody(request); } catch { return send(response, 400, {error: 'body'}, cors); }
    const {effect, voter} = body ?? {};
    if (!ids.has(effect)) return send(response, 400, {error: 'effect'}, cors);
    if (!VOTER.test(voter ?? '')) return send(response, 400, {error: 'voter'}, cors);
    if (path === '/api/vote') {
      if (![1, -1, 0].includes(body.value)) return send(response, 400, {error: 'value'}, cors);
      store.vote(effect, voter, body.value);
    } else {
      if (!KINDS.includes(body.kind)) return send(response, 400, {error: 'kind'}, cors);
      store.use(effect, voter, body.kind);
    }
    return send(response, 200, {effect, ...(store.stats()[effect] ?? {up: 0, down: 0, copied: 0, downloaded: 0, score: 0})}, cors);
  });
  server.on('close', () => { clearInterval(sweep); clearInterval(compactor); store.compact(); });
  return {server, store};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const env = process.env;
  const {server, store} = createVotesServer({
    stateDir: resolve(env.VOTES_STATE_DIR || 'state'),
    catalogue: resolve(env.VOTES_CATALOGUE || join(here, '..', '..', 'catalogue', 'index.json')),
    origins: (env.VOTES_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean),
  });
  const port = Number(env.VOTES_PORT || 8787), host = env.VOTES_HOST || '127.0.0.1';
  server.listen(port, host, () => console.log(`votes: http://${host}:${port}/api/`));
  const stop = () => { store.compact(); process.exit(0); };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
