#!/usr/bin/env node
// Tests of the votes service (service/votes/): the API, one vote per browser,
// uses counted once, and the state surviving a restart, a compaction and a torn
// last log line.
//
//   node scripts/votes-test.mjs
import assert from 'node:assert/strict';
import {appendFileSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {after, test} from 'node:test';
import {createVotesServer} from '../service/votes/server.mjs';
import {wilson} from '../service/votes/store.mjs';
import {CATALOGUE} from './lib/common.mjs';

const catalogue = join(CATALOGUE, 'index.json');
const [first, second] = JSON.parse(readFileSync(catalogue, 'utf8')).effects.map((effect) => effect.id);
const stateDir = mkdtempSync(join(tmpdir(), 'votes-'));
after(() => rmSync(stateDir, {recursive: true, force: true}));
const voter = (n) => n.toString(16).padStart(32, '0');

async function start(origins = []) {
  const {server, store} = createVotesServer({stateDir, catalogue, origins});
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  const call = (path, body, headers = {}) => fetch(base + path, body === undefined ? {headers} : {method: 'POST', headers: {'content-type': 'application/json', ...headers}, body: JSON.stringify(body)});
  return {server, store, call, stop: () => new Promise((done) => { server.close(done); server.closeAllConnections(); })};
}

test('votes, uses and the stats', async () => {
  const {call, stop} = await start();
  assert.equal((await (await call('health')).json()).ok, true);
  await call('vote', {effect: first, voter: voter(1), value: 1});
  await call('vote', {effect: first, voter: voter(2), value: 1});
  await call('vote', {effect: first, voter: voter(3), value: -1});
  // The same browser again: its vote changes, it is not added.
  await call('vote', {effect: first, voter: voter(3), value: 1});
  await call('vote', {effect: second, voter: voter(1), value: -1});
  await call('vote', {effect: second, voter: voter(1), value: 0});
  await call('use', {effect: first, voter: voter(1), kind: 'copy'});
  await call('use', {effect: first, voter: voter(1), kind: 'copy'});
  await call('use', {effect: first, voter: voter(2), kind: 'download'});
  const stats = (await (await call('stats')).json()).effects;
  assert.deepEqual({...stats[first], score: undefined}, {up: 3, down: 0, copied: 1, downloaded: 1, score: undefined});
  assert.equal(stats[second].up + stats[second].down, 0);
  await stop();
});

test('bad requests are refused', async () => {
  const {call, stop} = await start();
  assert.equal((await call('vote', {effect: 'no-such-effect', voter: voter(1), value: 1})).status, 400);
  assert.equal((await call('vote', {effect: first, voter: 'not-an-id', value: 1})).status, 400);
  assert.equal((await call('vote', {effect: first, voter: voter(1), value: 5})).status, 400);
  assert.equal((await call('use', {effect: first, voter: voter(1), kind: 'share'})).status, 400);
  assert.equal((await call('vote', {effect: first, voter: voter(1), value: 1, pad: 'x'.repeat(2000)})).status, 400);
  assert.equal((await call('nothing')).status, 404);
  await stop();
});

test('only the allowed pages may call', async () => {
  const {call, stop} = await start(['https://effects.simai.io']);
  const allowed = await call('stats', undefined, {origin: 'https://effects.simai.io'});
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://effects.simai.io');
  assert.equal((await call('stats', undefined, {origin: 'https://elsewhere.example'})).status, 403);
  await stop();
});

test('the state survives a restart, a compaction and a torn line', async () => {
  const before = await start();
  const counted = (await (await before.call('stats')).json()).effects[first];
  await before.stop();
  // A crash in the middle of a write leaves half a line at the end of the log.
  appendFileSync(join(stateDir, 'events.jsonl'), '{"k":"vote","e":');
  const again = await start();
  assert.deepEqual((await (await again.call('stats')).json()).effects[first], counted);
  again.store.compact();
  assert.equal(readFileSync(join(stateDir, 'events.jsonl'), 'utf8'), '');
  await again.stop();
  const third = await start();
  assert.deepEqual((await (await third.call('stats')).json()).effects[first], counted);
  // The stored ids are hashes, never the ids browsers sent.
  assert.ok(!readFileSync(join(stateDir, 'snapshot.json'), 'utf8').includes(voter(1)));
  await third.stop();
});

test('the Wilson bound ranks many likes over a few', () => {
  assert.equal(wilson(0, 0), 0);
  assert.ok(wilson(40, 5) > wilson(3, 0));
  assert.ok(wilson(10, 0) > wilson(10, 10));
});
