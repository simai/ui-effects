# SIMAI Framework background effects

Animated backgrounds for [SIMAI Framework](https://github.com/simai/ui) pages:
hero sections, sign-in screens, dashboards and card groups. Each effect is one
small ES module with a manifest, checked by the Framework's effect kit,
reviewed, and published pinned by commit and SHA-256.

**Catalogue site:** https://effects.simai.io/ (gallery, a live
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
<!-- SIMAI Framework pinned by its release package version, the catalogue by its full commit -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@simai-studio/ui@5.20261019.1827/distr/core/css/core.min.css">
<script>
  window.sfPath = 'https://cdn.jsdelivr.net/npm/@simai-studio/ui@5.20261019.1827/distr/';
  window.SF_BOOT_CONFIG = Object.assign(window.SF_BOOT_CONFIG || {}, {
    effects: {catalogue: 'https://cdn.jsdelivr.net/gh/simai/ui-effects@<commit>/'},
  });
</script>
<script src="https://cdn.jsdelivr.net/npm/@simai-studio/ui@5.20261019.1827/distr/core/js/core.min.js"></script>
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

- Give the area a background from the roles (`background: var(--sf-surface-0)`):
  it takes the theme the effect is drawn in, and the core sets its text colour
  (class `sf-effect-area`, at the lowest layer, so the page's own colour wins).
- Window cards draw no background of their own while the effect runs.
- The core imports a module from its verified bytes through a `blob:` URL, so
  a Content Security Policy must allow `blob:` scripts; `crypto.subtle` needs
  a secure context (https or localhost).
- Every URL is pinned by commit, never a branch.

## Security model

- **Official effects** (this repository) are reviewed, pass the kit, and are
  published pinned by commit plus SHA-256 per file. They run inline, in the
  page, like any other script the page chose to load.
- **Anything else** (an effect from another source, a user upload, a
  modified copy) runs in the Framework's sandbox: the address of any
  `effect.json` outside the pinned catalogue goes into an
  `<iframe sandbox="allow-scripts">` with an opaque origin and a strict CSP.
  It gets its settings and the palette tones by message, and has no access
  to the page, its storage or the network. Its host must serve the files with
  CORS; there is no digest to check them against, so the frame is the trust
  boundary.
- **What the sandbox does not stop.** The frame can navigate itself, post
  messages to the page and use CPU.
- **A page with its own CSP** must allow `blob:` scripts (catalogue modules
  are imported from their verified bytes) and, for foreign effects,
  `'sha256-<SF.Effects.SANDBOX_RUNNER_SHA256>'`.
- **To refuse foreign effects** set `SF_BOOT_CONFIG.effects.foreign` to
  `'refuse'`; `'sandbox'` is the default.
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
UI_ROOT=../ui node scripts/smoke.mjs
node scripts/serve.mjs                      # http://127.0.0.1:4173/
```

For quick local work, `node scripts/dev.mjs` (`npm run dev`) builds the
catalogue and the site into `dist/` and rebuilds them within a second of any
change under `effects/` or `site/`. Point a local web server at `dist/` (or run
`scripts/serve.mjs` beside it) and reload the page after a save. A changed
effect has no kit result yet, so run the kit and the gates before a commit.

`kit.mjs` and `smoke.mjs` read `simai/ui` and `simai/ui-source` with
`git archive` / `git show` at the commits of `framework.lock.json`; they never
check out or write in those clones. `CHROME_PATH` runs a given Chrome in the
new headless mode.

## Licence

Apache License 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).
