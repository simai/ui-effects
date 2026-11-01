// The votes store: who liked or disliked an effect, and who copied its code or
// downloaded its example. Nobody is named: a browser sends a random id it keeps,
// and only a keyed hash of that id is stored. Every record is a set member or a
// last-write value, so replaying the log over the snapshot gives the same state
// however often a record is applied.
//
// state/snapshot.json  the whole state, written atomically (temporary file, rename);
// state/events.jsonl   what came after the snapshot, one JSON line per change;
// state/salt           the hash key, made once.
import {createHash, randomBytes} from 'node:crypto';
import {appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

export const KINDS = ['copy', 'download'];

export function openStore(dir) {
  mkdirSync(dir, {recursive: true});
  const saltFile = join(dir, 'salt');
  if (!existsSync(saltFile)) writeFileSync(saltFile, randomBytes(32).toString('hex'), {mode: 0o600});
  const salt = readFileSync(saltFile, 'utf8').trim();
  const snapshotFile = join(dir, 'snapshot.json');
  const logFile = join(dir, 'events.jsonl');

  // effect -> {votes: Map<who, 1 | -1>, copy: Set<who>, download: Set<who>}
  const effects = new Map();
  const of = (effect) => {
    if (!effects.has(effect)) effects.set(effect, {votes: new Map(), copy: new Set(), download: new Set()});
    return effects.get(effect);
  };
  const apply = (record) => {
    const entry = of(record.e);
    if (record.k === 'vote') {
      if (record.s === 0) entry.votes.delete(record.w); else entry.votes.set(record.w, record.s);
    } else if (KINDS.includes(record.k)) entry[record.k].add(record.w);
  };

  if (existsSync(snapshotFile)) {
    const snapshot = JSON.parse(readFileSync(snapshotFile, 'utf8'));
    for (const [effect, saved] of Object.entries(snapshot.effects ?? {})) {
      const entry = of(effect);
      for (const [who, value] of Object.entries(saved.votes ?? {})) entry.votes.set(who, value);
      for (const kind of KINDS) for (const who of saved[kind] ?? []) entry[kind].add(who);
    }
  }
  let dirty = false;
  if (existsSync(logFile)) {
    // A line cut short by a crash is the last one; it is skipped. Anything in
    // the log is not in the snapshot yet.
    const log = readFileSync(logFile, 'utf8');
    dirty = log.length > 0;
    for (const line of log.split('\n')) {
      if (!line) continue;
      try { apply(JSON.parse(line)); } catch { /* a torn last line */ }
    }
  }

  const record = (entry) => {
    appendFileSync(logFile, `${JSON.stringify(entry)}\n`);
    apply(entry);
    dirty = true;
  };
  const who = (voter) => createHash('sha256').update(`${salt}:${voter}`).digest('hex').slice(0, 32);

  return {
    vote(effect, voter, value) { record({k: 'vote', e: effect, w: who(voter), s: value}); },
    use(effect, voter, kind) {
      const w = who(voter);
      if (of(effect)[kind].has(w)) return;
      record({k: kind, e: effect, w});
    },
    stats() {
      const out = {};
      for (const [effect, entry] of effects) {
        let up = 0, down = 0;
        for (const value of entry.votes.values()) if (value > 0) up += 1; else down += 1;
        out[effect] = {up, down, copied: entry.copy.size, downloaded: entry.download.size, score: wilson(up, down)};
      }
      return out;
    },
    // The snapshot first, then an empty log: a crash between the two replays
    // records the snapshot already holds, which changes nothing.
    compact() {
      if (!dirty && existsSync(snapshotFile)) return false;
      const saved = {};
      for (const [effect, entry] of effects) {
        saved[effect] = {votes: Object.fromEntries(entry.votes), copy: [...entry.copy], download: [...entry.download]};
      }
      const temporary = `${snapshotFile}.tmp`;
      writeFileSync(temporary, JSON.stringify({version: 1, written: new Date().toISOString(), effects: saved}));
      renameSync(temporary, snapshotFile);
      writeFileSync(logFile, '');
      dirty = false;
      return true;
    },
  };
}

// The lower bound of the Wilson score interval (95 %) for the share of likes:
// a few likes do not outrank many, and no votes is 0.
export function wilson(up, down) {
  const n = up + down;
  if (!n) return 0;
  const z = 1.959964, p = up / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n)) / (1 + (z * z) / n);
}
