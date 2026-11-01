// Likes, dislikes and uses, kept by the votes service (service/votes/) the site
// is built with (config.votes). No service, or one that does not answer: the
// buttons and the popular order stay hidden and nothing else changes.
//
// The browser is known by a random id kept in localStorage, nothing else; its
// own votes are kept beside it, so the buttons show them without asking.
import {config} from './common.js';

export const enabled = Boolean(config.votes);
const base = enabled ? new URL(config.votes, document.baseURI) : null;
const ID_KEY = 'ui-effects-voter', MINE_KEY = 'ui-effects-votes';

const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* the choice lasts for this page */ } };
let voter = read(ID_KEY);
if (!/^[0-9a-f]{32}$/u.test(voter ?? '')) {
  voter = [...crypto.getRandomValues(new Uint8Array(16))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  write(ID_KEY, voter);
}
let mine = {};
try { mine = JSON.parse(read(MINE_KEY) ?? '{}') ?? {}; } catch { mine = {}; }

export const myVote = (effect) => mine[effect] ?? 0;

const call = async (path, body) => {
  const response = await fetch(new URL(path, base), {
    method: body ? 'POST' : 'GET',
    headers: body ? {'content-type': 'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`votes: HTTP ${response.status}`);
  return response.json();
};

// The counts of every effect, or null when the service is not there.
export async function loadStats() {
  if (!enabled) return null;
  try { return (await call('stats')).effects ?? {}; } catch { return null; }
}

// value 1, -1 or 0 (taken back); answers the effect's new counts, or null.
export async function vote(effect, value) {
  try {
    const counts = await call('vote', {effect, voter, value});
    if (value) mine[effect] = value; else delete mine[effect];
    write(MINE_KEY, JSON.stringify(mine));
    return counts;
  } catch { return null; }
}

// kind copy or download; counted once per browser by the service.
export function used(effect, kind) {
  if (enabled) call('use', {effect, voter, kind}).catch(() => {});
}
