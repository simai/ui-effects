# simai/ui-effects: instructions for the agent working here

This repository is the catalogue of background effects for SIMAI Framework:
- the effects;
- the catalogue site at https://effects.simai.io/ (GitHub Pages; simai.github.io/ui-effects/ redirects there);
- the author guide and the checks.

The thread working here is the **only writer** in this repository.

## Start of every session

1. Read `README.md`, then `docs/STATUS.md` (state, decisions, roadmap) and `docs/AUTHORING.md` (the effect contract).
2. Read the private handoff, which holds local paths, the other threads and the working rules. It is not in this public repository. It is `control/handoffs/2026-10-19-ui-effects-thread.md` in the dispatcher's private `ui-control` checkout.
3. Check `git status` and `git log`. Check that the last Quality and Pages runs are green: `gh run list -R simai/ui-effects`.

## Language

- Talk to the owner in Russian: the result first, in plain words.
- Write everything in this repository in English: commits, comments, docs, READMEs.
- The catalogue site's text is Russian.

## Rules

- Publishing after green gates is pre-approved: commit, push to `main`, then watch Quality and Pages.
- Never force push or rewrite history. Never accept effects from outside SIMAI without the owner's decision.
- Never commit local paths, secrets, `.env`, cookies or credentials. `scripts/check-hygiene.mjs` fails on them.
- Never write in the Framework repositories (`ui`, `ui-source`, `ui-builder`), the docs (`ui-doc`, `docara`) or `ui-control`. Read them with `git show` / `git archive`. Framework defects go to issues on `simai/ui-source`. Docs changes go through the dispatcher thread.
- Every URL the site or a snippet gives out is pinned by commit, never a branch. The integrity values come from `catalogue/index.json` at that commit.
- An effect is done only when all of these hold:
  - it passes the Framework kit in every scheme it draws;
  - at its default settings, text over it meets 4.5:1 in `--sf-on-surface` and 3:1 in `--sf-on-surface-variant`, which is for large text only (`scripts/contrast-probe.mjs`);
  - it obeys reduced motion and the hidden tab;
  - it cleans up after itself;
  - it stays inside the frame budget and size.

## Gates before every push

See `README.md` → «Working on the repository», and `.github/workflows/quality.yml`. Run, in order:
- catalogue `--check`;
- hygiene;
- the kit over all effects and schemes, plus the template;
- the site build;
- the browser smoke at the site root, which must report 0 failing.
