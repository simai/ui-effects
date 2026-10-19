# Security

## Reporting

Please report security problems privately through GitHub's
**Report a vulnerability** (the repository's Security tab), not in a public
issue. Include the effect or file, the commit, and how to reproduce it. We
answer within five working days.

## What is in scope

- An effect in `effects/` that reaches the network, reads or changes the page
  outside its host, keeps running after `destroy`, or can be made to do so
  through its settings.
- A published file whose SHA-256 differs from `catalogue/index.json` at the
  same commit.
- `site/lib/placement.js` loading or running a file without checking its
  SHA-256.
- The catalogue site exposing anything beyond the catalogue.

## The model

- Official effects are reviewed, pass the Framework kit and are published
  pinned by commit plus SHA-256; they run inline in the page that loads them.
- Anything else must run in the Framework's sandbox (an iframe without
  `allow-same-origin`, strict CSP, settings by message); the sandbox runner
  ships in a later core release.
- Static checks (the kit, `scripts/check-hygiene.mjs`) catch mistakes; they
  cannot prove that JavaScript is safe.

Only the latest commit on `main` is supported. A fix is a new commit; pinned
older commits stay as they are, so update the commit in your snippet.
