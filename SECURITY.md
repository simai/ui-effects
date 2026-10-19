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
- The catalogue site or a published snippet running an effect file without
  the core checking its SHA-256 against `catalogue/index.json`.
- The catalogue site exposing anything beyond the catalogue.

## The model

- Official effects are reviewed, pass the Framework kit and are published
  pinned by commit plus SHA-256; they run inline in the page that loads them.
- Anything else runs in the Framework's sandbox: an
  `<iframe sandbox="allow-scripts">` with an opaque origin, a strict CSP,
  settings and palette tones by message, and no access to the page, its
  storage or the network. The frame can still navigate itself, post messages
  to the page and use CPU. `SF_BOOT_CONFIG.effects.foreign = 'refuse'` turns
  foreign effects off. Report a sandbox escape to simai/ui-source, which owns
  the runner.
- Static checks (the kit, `scripts/check-hygiene.mjs`) catch mistakes; they
  cannot prove that JavaScript is safe.

Only the latest commit on `main` is supported. A fix is a new commit; pinned
older commits stay as they are, so update the commit in your snippet.
