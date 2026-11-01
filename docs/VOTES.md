# Votes service

Likes, dislikes and use counts for the catalogue site: `service/votes/`, Node 20+, no dependencies.

## What it keeps

- **One vote per browser and effect.** A browser picks a random 128-bit id once and keeps it in `localStorage`. The service stores only a keyed SHA-256 of that id; the key (`state/salt`) is made on first start and never leaves the server. Voting again changes the vote, and pressing the same button again takes it back.
- **Uses.** A copy of an effect's code (its copy button or a text selection) and a download of its example each count once per browser.
- **Nothing else.** No accounts, cookies or IP addresses are stored. Client addresses stay in memory for the write limit only (60 writes a minute).

## Storage and restarts

The state lives in `VOTES_STATE_DIR`, outside the site build, so rebuilding or redeploying the site does not touch it.

- `snapshot.json` holds the whole state. It is written to a temporary file and then renamed into place.
- `events.jsonl` holds the changes since the snapshot, one line each, appended before the change is answered.
- Every 10 minutes, and on shutdown, the snapshot is rewritten and the log emptied.

Every record is a set member or a last-write value, so replaying the log over the snapshot is harmless. A torn last line, left by a crash, is skipped. Back up the state directory with the server's other data.

## API

| Request | Answer |
|:---|:---|
| `GET /api/health` | `{ok, effects}` |
| `GET /api/stats` | `{effects: {<id>: {up, down, copied, downloaded, score}}}`, cached 30 s |
| `POST /api/vote {effect, voter, value}` | the effect's counts; `value` is 1, -1 or 0 |
| `POST /api/use {effect, voter, kind}` | the effect's counts; `kind` is `copy` or `download` |

Only effects in the catalogue (`VOTES_CATALOGUE`) are accepted. Bodies over 1 KB are refused. When `VOTES_ORIGINS` is set, other origins get 403.

`score` is the lower bound of the 95 % Wilson interval for the share of likes. The gallery's «Популярные» order sorts by it, then by uses, then by catalogue order. With this score, a few likes do not outrank many.

## The site

The site uses the service only when it is built with its address:

```sh
node scripts/build-site.mjs --votes https://<host>/api/
```

`UI_EFFECTS_VOTES` gives the same address. Without an address, or when the service does not answer, the like buttons and the popular order stay hidden.

## Locally

To run the service on the same address as the site:

```sh
node scripts/build-site.mjs --votes /api/ && node scripts/serve.mjs --votes .votes-state
```

This serves the site at http://127.0.0.1:4173/ with the service under `/api/`.

- `npm run test:votes` tests the service.
- The smoke checks the like buttons and the popular order when the site is built with a path address.

## Deploying

The service is not deployed yet. Deploying it, and choosing its host and backups, needs the owner's approval.
