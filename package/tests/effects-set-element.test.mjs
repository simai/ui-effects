// The set effects (standard simai.component-set 1.0.0): the element's
// attribute mapping, the engine's exports and the boundaries the move from
// SIMAI Framework Core keeps. Runs in the overlay (package/scripts/test.mjs):
// ../src/smart/effect is this set's, ../src/core is SIMAI Framework's.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import {RESERVED, attributeName, kebab, readSettings} from '../src/smart/effect/attributes.js';

const root = new URL('../', import.meta.url);
const read = (relative) => readFileSync(new URL(relative, root), 'utf8');
const element = (attributes) => ({
  getAttribute: (name) => (Object.hasOwn(attributes, name) ? attributes[name] : null),
  hasAttribute: (name) => Object.hasOwn(attributes, name),
});
const MANIFEST = {settings: [
  {key: 'speed', type: 'integer', default: 50, min: 0, max: 100},
  {key: 'linkDistance', type: 'number', default: 1, min: 0, max: 5},
  {key: 'trails', type: 'boolean', default: false},
  {key: 'style', type: 'choice', default: 'dots', options: [{value: 'dots'}, {value: 'lines'}]},
  {key: 'theme', type: 'choice', default: 'a', options: [{value: 'a'}, {value: 'b'}]},
]};

test('a manifest key is its kebab-case attribute unless that name is taken', () => {
  assert.equal(kebab('linkDistance'), 'link-distance');
  assert.equal(attributeName('riderCount'), 'rider-count');
  assert.equal(attributeName('speed'), 'speed');
  for (const taken of ['style', 'title', 'hidden', 'id', 'class', 'lang', 'dir', 'slot', 'part', 'inert', 'tabindex', ...RESERVED]) {
    assert.equal(attributeName(taken), null, `${taken} is reached only as setting-${taken}`);
  }
  assert.equal(attributeName('onclick'), null, 'an event handler attribute would run as script');
  assert.equal(attributeName('online'), 'online', 'a word that only starts with on is a plain attribute');
});

test('attributes become stored settings: setting-<key> first, then the plain one, then the JSON', () => {
  const stored = readSettings(element({
    speed: '40',
    'link-distance': '2.5',
    trails: '',
    style: 'color: red',
    'setting-style': 'lines',
    'setting-theme': 'b',
    settings: '{"speed": 90, "extra": 1}',
  }), MANIFEST);
  assert.deepEqual(stored, {speed: '40', linkDistance: '2.5', trails: true, style: 'lines', theme: 'b', extra: 1});
  assert.deepEqual(readSettings(element({settings: '[1]'}), MANIFEST), {}, 'a non-object JSON is ignored');
  assert.deepEqual(readSettings(element({trails: 'false'}), MANIFEST), {trails: 'false'}, 'the engine reads false and 0');
});

test('the engine left Core whole: the API SF.Effects had, no global, no data-sf-effect scan', async () => {
  const engine = read('src/smart/effect/engine/engine.js');
  assert.doesNotMatch(engine, /window\.SF\.Effects\s*=|defineProperty\(window\.SF, 'Effects'/u, 'the set writes no global SIMAI Framework owns');
  assert.doesNotMatch(engine, /\[data-sf-effect\]:not|MutationObserver\(\(records\) => \{\s*for \(const record of records\) \{\s*for \(const node of record\.addedNodes\) if \(node\.nodeType === 1\) scan/u, 'no declarative scan: nothing is drawn twice');
  assert.doesNotMatch(engine, /SF_BOOT_CONFIG\?\.effects\b/u, 'the configuration is the set declaration');
  const core = read('src/core/contracts/public-js-api.json');
  const members = JSON.parse(core).globals.find(({name}) => name === 'SF.Effects').members.filter((name) => name !== 'EFFECT_SCHEMA');
  const exported = [...engine.matchAll(/export const api = Object\.freeze\(\{([\s\S]*?)\}\);/gu)][0][1];
  for (const member of members) assert.match(exported, new RegExp(`\\b${member}\\b`, 'u'), `the set exports ${member}`);
  const index = read('src/smart/effect/index.js');
  assert.match(index, /registerPackage\?\.\(SET, \{exports: api\}\)/u, 'the bundle gives its exports to the Loader');
  assert.equal(engine.match(/FRAME_RUNNER_SHA256 = '([^']+)'/u)[1], read('src/core/js/effects.js').match(/FRAME_RUNNER_SHA256 = '([^']+)'/u)[1], 'the sandbox runner is the same bytes, so the CSP hash holds');
});

test('the set root is the base without dist/smart, from npm or from the repository', async () => {
  globalThis.document = {baseURI: 'https://example.org/page/'};
  const {setRoot} = await import('../src/smart/effect/engine/engine.js');
  assert.equal(setRoot('https://cdn.jsdelivr.net/npm/@simai-studio/effects@1.0.0/dist/smart'), 'https://cdn.jsdelivr.net/npm/@simai-studio/effects@1.0.0/');
  assert.equal(setRoot('https://cdn.jsdelivr.net/gh/simai/ui-effects@0123456789abcdef0123456789abcdef01234567/package/dist/smart/'), 'https://cdn.jsdelivr.net/gh/simai/ui-effects@0123456789abcdef0123456789abcdef01234567/');
  assert.equal(setRoot('/vendor/effects/dist/smart'), 'https://example.org/vendor/effects/');
  assert.equal(setRoot('/vendor/effects/smart'), null, 'another shape is not guessed at');
  assert.equal(setRoot(''), null);
});

test('the passport, the npm manifest and the lock agree', () => {
  // The passport and the lock sit beside src/, outside the overlay: the runner
  // names the set folder.
  const folder = process.env.EFFECTS_SET_ROOT;
  if (!folder) return;
  const passport = JSON.parse(readFileSync(`${folder}/set.json`, 'utf8'));
  const lock = JSON.parse(readFileSync(`${folder}/framework.lock.json`, 'utf8'));
  const npm = JSON.parse(readFileSync(`${folder}/package.json`, 'utf8'));
  assert.equal(passport.framework.source_revision, lock.source.revision, 'one SIMAI Framework revision');
  assert.equal(npm.name, `@simai-studio/${passport.id}`);
  assert.equal(npm.license, passport.licence.spdx);
  assert.equal(npm.simai.api, passport.components[0].rule);
  assert.equal(passport.id, 'effects');
  assert.deepEqual(passport.components.map(({element, rule, folder}) => [element, rule, folder]), [['sf-effect', 'cl-effect', 'effect']]);
  assert.equal(read('src/smart/effect/rule.js').includes("SF.RuleLoader['cl-effect']"), true);
});
