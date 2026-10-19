# Contributing

## Our own effects only, for now

The catalogue holds only effects made by SIMAI. **We do not accept effects
from outside contributors yet**: pull requests that add an effect from another
author will be closed. The Framework's sandbox runs foreign effects
safely on a page, but a submission to this catalogue would run inline, so it
needs a review process for foreign code and the owner's decision first; we
will say so here when submissions open.

An effect hosted elsewhere does not need this catalogue: a page can name its
`effect.json` address, and the Framework runs it in the sandbox.

Reports and suggestions are welcome: open an issue for a bug in an effect or
the site, an accessibility problem, or an idea for an effect.

## How changes are made

- Every change goes through a pull request and needs an approving **review**.
  An effect change also needs the review checklist in
  [docs/AUTHORING.md](docs/AUTHORING.md#9-review-checklist).
- CI (`quality.yml`) must be green: the catalogue check, the Framework kit on
  every effect and scheme, the site build and the browser smoke.
- `catalogue/index.json` and `catalogue/kit.json` are generated; commit them
  as the scripts write them.
- Commits, comments, docs and changelogs are in English. Site text and
  Russian labels stay Russian.
- A repin of the Framework changes `framework.lock.json` only, then the kit
  and the catalogue are run again.

## Licence

By contributing you agree that your contribution is licensed under the
Apache License 2.0 of this repository.
