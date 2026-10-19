# SIMAI Framework background effects

Animated backgrounds for [SIMAI Framework](https://github.com/simai/ui) pages:
hero sections, sign-in screens, dashboards and card groups. Each effect is one
small ES module with a manifest, checked by the Framework's effect kit,
reviewed, and published pinned by commit and SHA-256.

**Catalogue site:** https://simai.github.io/ui-effects/ (gallery, a live
configurator for every effect, and «Получить код»). The site is in Russian,
like the Framework documentation.

The effects live here, outside the Framework: they are content and taste, and
there will be many. The Framework ships only the core: `SF.Effects`, the
`simai.effect` standard and the kit.

## What is here

| Path | What it is |
|:---|:---|
| `effects/<id>/` | One effect: `effect.json` (simai.effect 1.1 manifest with `schemes` and `capabilities`), `index.js`, `preview.png`, `README.md` |
| `effects/policy.json` | Catalogue sidecar: order, Russian descriptions and roles, tags |
| `catalogue/index.json` | Generated catalogue: every effect, its files with SHA-256 and size, the kit result ([schema](catalogue/index.schema.json)) |
| `catalogue/kit.json` | Kit results per effect, written by `scripts/kit.mjs` |
| `framework.lock.json` | The Framework release everything is checked against (`ui-e7701fef3733`) |
| `site/` | The catalogue site; it places effects through the core's `SF.Effects` |
| `templates/effect/` | A template effect to start from |
| `docs/AUTHORING.md` | The author guide |
| `scripts/` | Catalogue build and check, kit runner, site build, browser smoke, hygiene check |

17 effects today: 5 draw both schemes, 7 are dark only, 5 light only. The
catalogue uses no pairs: an effect that works well in both themes is dual.

## Theme policy

- Each effect declares the **schemes** it can draw (`dark`, `light` or both).
  The catalogue names no pairs.
- A placement has a **theme mode**: `auto` (follow the page, the default),
  `dark` or `light`. A fixed mode the effect cannot draw is never offered.
- In `auto`, when the effect lacks the page's scheme: a dark effect stays
  dark, and a light effect is not shown (the
  reader chose dark to avoid glare; the area is a plain dark surface).
- The effect's area takes the theme it is drawn in (`theme-dark` or
  `theme-light`), so text and controls over it keep 4.5:1.
- **Windows mode:** one effect is drawn behind a group of cards and seen only
  through them, continuous from card to card. Every effect here is safe for it.

## Using an effect

The Framework core runs effects from this catalogue: `SF.Effects` (simai.effect
1.1) loads an effect, checks every file against the SHA-256 in
`catalogue/index.json`, applies the theme policy, follows the page theme and
runs windows mode. The page names the catalogue, pinned by commit:

```html
<!-- SIMAI Framework and the catalogue, both pinned by their full commit -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/simai/ui@08c07b3e938a0eb4bd9204b187c267b2cb4ba5b7/distr/core/css/core.min.css">
<script>
  window.sfPath = 'https://cdn.jsdelivr.net/gh/simai/ui@08c07b3e938a0eb4bd9204b187c267b2cb4ba5b7/distr/';
  window.SF_BOOT_CONFIG = Object.assign(window.SF_BOOT_CONFIG || {}, {
    effects: {catalogue: 'https://cdn.jsdelivr.net/gh/simai/ui-effects@<commit>/'},
  });
</script>
<script src="https://cdn.jsdelivr.net/gh/simai/ui@08c07b3e938a0eb4bd9204b187c267b2cb4ba5b7/distr/core/js/core.min.js"></script>
```

Then markup alone places an effect:

```html
<section data-sf-effect="comet-flow"
         data-sf-effect-theme="auto"
         data-sf-effect-settings='{"speed":100}'>…</section>

<ul data-sf-effect-windows="comet-flow" data-sf-effect-theme="auto">
  <li data-sf-effect-window>…</li>
  <li data-sf-effect-window>…</li>
</ul>
```

or a script does: `await SF.Effects.placeEffect(element, {effect: 'comet-flow',
themeMode: 'auto', settings, windows})`. The configurator's «Получить код»
gives both for the chosen effect, settings, theme mode and layout.

- Give the area a background and text colour from the roles
  (`background: var(--sf-surface-0); color: var(--sf-on-surface)`): it takes
  the theme the effect is drawn in.
- Window cards draw no background of their own while the effect runs.
- The core imports a module from its verified bytes through a `blob:` URL, so
  a Content Security Policy must allow `blob:` scripts; `crypto.subtle` needs
  a secure context (https or localhost).
- Every URL is pinned by commit, never a branch.

## Releases for the simai.io portal

The portal hosts the catalogue at https://simai.io/ru/framework/effects/. A tag
`vX.Y.Z` on a `main` commit that passed Quality runs `.github/workflows/portal.yml`:
`scripts/pack-portal.mjs` builds the site for that path (canonical addresses on
simai.io, a link back to the portal home, none of the files the hub owns) and
the release gets `framework-effects-vX.Y.Z-portal.tar.gz`, its `.sha256` and
its receipt (`simai.io.portal-artifact` v1, see simai/simai.io
`docs/ASSEMBLY.md`). A release is never replaced; the portal pins its digest.
https://simai.github.io/ui-effects/ keeps serving `main`.

## Security model

- **Official effects** (this repository) are reviewed, pass the kit, and are
  published pinned by commit plus SHA-256 per file. They run inline, in the
  page, like any other script the page chose to load.
- **Anything else** (an effect from another source, a user upload, a
  modified copy) must run in the Framework's sandbox: an iframe without
  `allow-same-origin`, a strict CSP, settings passed by message, no access to
  the page, cookies or network. The sandbox runner ships in a later core release.
- **Static checks cannot make JavaScript safe.** The kit and the hygiene check
  catch mistakes (network calls, leaks, missing cleanup); they do not prove
  that code is harmless. Review and pinning are what make official effects
  trustworthy; the sandbox is what contains the rest.

See [SECURITY.md](SECURITY.md) to report a problem.

## Working on the repository

Node 20.19 or later. `npm ci` installs playwright-core (pinned).

```sh
node scripts/build-catalogue.mjs            # write catalogue/index.json
node scripts/build-catalogue.mjs --check    # fail unless current and every effect passes the kit
node scripts/check-hygiene.mjs              # local paths, secret-shaped strings, offline modules
UI_ROOT=../ui UI_SOURCE_ROOT=../ui-source node scripts/kit.mjs --template
node scripts/build-site.mjs                 # dist/
UI_ROOT=../ui node scripts/smoke.mjs --prefix /ui-effects/
node scripts/serve.mjs                      # http://127.0.0.1:4173/ui-effects/
```

`kit.mjs` and `smoke.mjs` read `simai/ui` and `simai/ui-source` with
`git archive` / `git show` at the commits of `framework.lock.json`; they never
check out or write in those clones. `CHROME_PATH` runs a given Chrome in the
new headless mode.

## Licence

Apache License 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).
