#!/usr/bin/env node
// Fails when a file that git tracks (or would track) holds a local path or
// something shaped like a secret, or when an effect module reaches the network.
//
//   node scripts/check-hygiene.mjs
//
// It complements, not replaces, a full secret scanner such as gitleaks.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ROOT} from './lib/common.mjs';

const files = execFileSync('git', ['-C', ROOT, 'ls-files', '--cached', '--others', '--exclude-standard'], {encoding: 'utf8'}).split('\n').filter(Boolean);
const TEXT = /\.(m?js|json|md|html|css|ya?ml|txt|sh)$|^(LICENSE|NOTICE|\.gitignore)$/u;
const LOCAL = [
  [/\/Users\/[A-Za-z0-9._-]+/u, 'a macOS home path'],
  [/\/home\/[a-z][a-z0-9_-]*\//u, 'a Linux home path'],
  [/\/private\/(?:tmp|var)\//u, 'a temporary path'],
  [/[A-Z]:\\Users\\/u, 'a Windows home path'],
  [/file:\/\/\//u, 'a file URL'],
  [/\b(?!blank\.test)[a-z0-9-]+\.test\//u, 'a local .test host (blank.test is the smoke page)'],
];
const SECRET = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/u, 'a private key'],
  [/\bAKIA[0-9A-Z]{16}\b/u, 'an AWS key id'],
  [/\bgh[pousr]_[A-Za-z0-9]{30,}/u, 'a GitHub token'],
  [/\bgithub_pat_[A-Za-z0-9_]{30,}/u, 'a GitHub token'],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/u, 'a Slack token'],
  [/\bsk-[A-Za-z0-9]{32,}/u, 'an API key'],
  [/\b(?:password|passwd|secret|api[_-]?key|token)\s*[:=]\s*['"][^'"\s]{8,}['"]/iu, 'a credential assignment'],
];
// What an effect module must not contain (BRIEF: no network).
const NETWORK = [/\bfetch\s*\(/u, /\bimport\s*\(/u, /XMLHttpRequest/u, /WebSocket/u, /EventSource/u, /sendBeacon/u, /https?:\/\//u, /url\(/u];

const problems = [];
for (const file of files) {
  if (/(^|\/)\.env(\.|$)/u.test(file)) problems.push(`${file}: an environment file is tracked`);
  if (!TEXT.test(file.split('/').pop())) continue;
  const text = readFileSync(join(ROOT, file), 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    for (const [pattern, what] of [...LOCAL, ...SECRET]) if (pattern.test(line)) problems.push(`${file}:${index + 1}: ${what}`);
  });
  if (/^(effects|templates)\/[^/]+\/index\.js$/u.test(file)) {
    for (const pattern of NETWORK) if (pattern.test(text)) problems.push(`${file}: an effect module reaches out (${pattern})`);
  }
}
if (problems.length) {
  console.error(problems.map((problem) => `FAIL ${problem}`).join('\n'));
  process.exit(1);
}
console.log(`hygiene: ok, ${files.length} files, no local paths, no secret-shaped strings, effect modules offline`);
