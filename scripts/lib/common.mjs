// Shared helpers of the repository scripts: paths, digests, the policy
// sidecar, the Framework lock and the browser.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {createRequire} from 'node:module';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EFFECTS = join(ROOT, 'effects');
export const CATALOGUE = join(ROOT, 'catalogue');
export const SCHEMES = ['dark', 'light'];
export const ID = /^[a-z][a-z0-9-]{1,40}$/u;
// Files an effect folder may hold. Anything else fails the catalogue.
export const EFFECT_FILES = ['effect.json', 'index.js', 'preview.png', 'README.md'];
// An effect module above this size fails; the author guide asks for about 15 KB.
export const MODULE_LIMIT = 20 * 1024;
// The module that stands in for simai.effect 1.1 until the core ships it.
export const PLACEMENT = 'site/lib/placement.js';

export const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const fileDigest = (path) => {
  const bytes = readFileSync(path);
  return {sha256: sha256(bytes), size: bytes.length};
};
export const stableJson = (value) => `${JSON.stringify(value, null, 2)}\n`;

export const lock = () => readJson(join(ROOT, 'framework.lock.json'));
export const frameworkBase = (framework = lock()) => framework.cdn.replace('{commit}', framework.ui.commit);

// The policy sidecar, read and checked against the manifests. Returns
// {entries, problems}; each entry carries its manifest.
export function loadPolicy() {
  const problems = [];
  const policy = readJson(join(EFFECTS, 'policy.json'));
  const entries = [];
  const seen = new Set();
  for (const rule of policy.effects ?? []) {
    const id = rule.id;
    if (!ID.test(id ?? '')) { problems.push(`policy: bad id ${JSON.stringify(id)}`); continue; }
    if (seen.has(id)) problems.push(`policy: ${id} twice`);
    seen.add(id);
    const folder = join(EFFECTS, id);
    if (!existsSync(join(folder, 'effect.json'))) { problems.push(`${id}: no effects/${id}/effect.json`); continue; }
    const manifest = readJson(join(folder, 'effect.json'));
    if (manifest.id !== id) problems.push(`${id}: manifest id is ${manifest.id}`);
    const entry = typeof manifest.entry === 'string' ? manifest.entry : 'index.js';
    if (entry !== 'index.js') problems.push(`${id}: entry must be index.js`);
    if (!existsSync(join(folder, entry))) problems.push(`${id}: no module ${entry}`);
    const files = readdirSync(folder).filter((name) => !name.startsWith('.'));
    for (const name of files) if (!EFFECT_FILES.includes(name)) problems.push(`${id}: unexpected file ${name}`);
    for (const name of EFFECT_FILES) if (!files.includes(name)) problems.push(`${id}: missing ${name}`);
    const scheme = (manifest.settings ?? []).find((setting) => setting.key === 'scheme');
    const options = scheme?.type === 'choice' ? (scheme.options ?? []).map((option) => option.value) : [];
    const schemes = rule.schemes ?? [];
    if (!schemes.length || schemes.length > 2 || schemes.some((value) => !SCHEMES.includes(value)) || new Set(schemes).size !== schemes.length) {
      problems.push(`${id}: schemes must be one or two of dark, light`);
    }
    if (JSON.stringify(options) !== JSON.stringify(schemes)) problems.push(`${id}: policy schemes ${JSON.stringify(schemes)} differ from the scheme options ${JSON.stringify(options)}`);
    if (scheme && scheme.default !== schemes[0]) problems.push(`${id}: the scheme default ${scheme.default} is not the home scheme ${schemes[0]}`);
    if (manifest.settings?.at(-1)?.key !== 'scheme') problems.push(`${id}: scheme is not the last setting`);
    if (existsSync(join(folder, entry)) && statSync(join(folder, entry)).size > MODULE_LIMIT) problems.push(`${id}: module above ${MODULE_LIMIT} bytes`);
    entries.push({...rule, manifest, folder});
  }
  for (const name of readdirSync(EFFECTS)) {
    if (statSync(join(EFFECTS, name)).isDirectory() && !seen.has(name)) problems.push(`effects/${name}: not listed in effects/policy.json`);
  }
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  for (const entry of entries) {
    if (entry.pair === null || entry.pair === undefined) continue;
    const pair = byId.get(entry.pair);
    const lacking = SCHEMES.filter((value) => !entry.schemes.includes(value));
    if (!pair) problems.push(`${entry.id}: pair ${entry.pair} is not in the catalogue`);
    else if (!lacking.length) problems.push(`${entry.id}: a dual-scheme effect names no pair`);
    else if (lacking.some((value) => !pair.schemes.includes(value))) problems.push(`${entry.id}: pair ${entry.pair} does not draw ${lacking.join(', ')}`);
  }
  return {policy, entries, problems};
}

// playwright-core: PLAYWRIGHT_CORE points at another copy, else this
// repository's devDependency. CHROME_PATH runs a given Chrome with the new
// headless mode instead of Playwright's own browser.
export async function loadChromium() {
  const path = process.env.PLAYWRIGHT_CORE
    ? join(process.env.PLAYWRIGHT_CORE, 'index.mjs')
    : createRequire(join(ROOT, 'package.json')).resolve('playwright-core').replace(/index\.js$/u, 'index.mjs');
  const playwright = await import(pathToFileURL(path).href);
  return (playwright.default ?? playwright).chromium;
}
export const launchOptions = () => (process.env.CHROME_PATH
  ? {executablePath: process.env.CHROME_PATH, headless: false, args: ['--headless=new']}
  : {headless: true});

// A small JSON Schema reader: the keywords the catalogue schemas use.
export function validate(schema, value, at = '$', root = schema, problems = []) {
  if (schema.$ref) {
    const target = schema.$ref.replace(/^#\//u, '').split('/').reduce((node, key) => node[key], root);
    return validate(target, value, at, root, problems);
  }
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((option) => validate(option, value, at, root, []).length === 0);
    if (passing.length !== 1) problems.push(`${at}: matches ${passing.length} of oneOf`);
    return problems;
  }
  const type = Array.isArray(value) ? 'array' : value === null ? 'null' : Number.isInteger(value) ? 'integer' : typeof value;
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.includes(type) && !(type === 'integer' && types.includes('number'))) {
      problems.push(`${at}: ${type}, expected ${types.join('|')}`);
      return problems;
    }
  }
  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) problems.push(`${at}: not ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((option) => JSON.stringify(option) === JSON.stringify(value))) problems.push(`${at}: not one of ${JSON.stringify(schema.enum)}`);
  if (type === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) problems.push(`${at}: does not match ${schema.pattern}`);
    if (schema.minLength !== undefined && value.length < schema.minLength) problems.push(`${at}: shorter than ${schema.minLength}`);
  }
  if (type === 'integer' || type === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) problems.push(`${at}: below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) problems.push(`${at}: above ${schema.maximum}`);
  }
  if (type === 'array') {
    if (schema.minItems !== undefined && value.length < schema.minItems) problems.push(`${at}: fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) problems.push(`${at}: more than ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) problems.push(`${at}: items repeat`);
    if (schema.items) value.forEach((item, index) => validate(schema.items, item, `${at}[${index}]`, root, problems));
  }
  if (type === 'object') {
    for (const key of schema.required ?? []) if (!(key in value)) problems.push(`${at}: missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) validate(schema.properties[key], item, `${at}.${key}`, root, problems);
      else if (schema.additionalProperties === false) problems.push(`${at}: undeclared ${key}`);
      else if (typeof schema.additionalProperties === 'object') validate(schema.additionalProperties, item, `${at}.${key}`, root, problems);
    }
  }
  return problems;
}
