# The component set `effects`

This folder is the source of the free component set `effects` (standard
`simai.component-set` 1.0.0 of SIMAI Framework): its passport `set.json`, the
element `sf-effect` with the effects engine under `src/smart/effect/`, its
tests and the scripts that test and stage it. The effects themselves and their
catalogue stay where they are, in `../effects/` and `../catalogue/`; a release
carries them with the bundle, so a page names no catalogue.

- Build: ui-builder `verify-package-reproducibility.cjs --package effects
  --package-source <this repository> --package-path package`, then
  `publish-package-release.sh`, which lays the output into `package/dist/`
  (`smart/`, `set.json`, `package-receipt.json`) in a commit `Build: effects ...`
  on a branch, never on main.
- Tests: `node package/scripts/test.mjs --ui-source <ui-source checkout>` (unit
  tests in the overlay); `node package/tests/browser/effects-set.browser.mjs`
  (the element in a real browser, from a `gh/`-style and an npm-style base).
- npm: `node package/scripts/stage-npm.mjs <out>` lays out `@simai-studio/effects`
  (`dist/`, the catalogue and the effect files, `set.json`, the licence).

The page connects it in one line:

```html
<script src="https://cdn.jsdelivr.net/npm/@simai-studio/ui@<v>/distr/core/js/core.min.js" data-sf-sets="effects"></script>
```
