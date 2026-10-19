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
| `effects/<id>/` | One effect: `effect.json` (simai.effect 1.0 manifest), `index.js`, `preview.png`, `README.md` |
| `effects/policy.json` | Theme policy sidecar: `schemes`, `pair`, tags, Russian descriptions, catalogue order |
| `catalogue/index.json` | Generated catalogue: every effect, its files with SHA-256 and size, the kit result ([schema](catalogue/index.schema.json)) |
| `catalogue/kit.json` | Kit results per effect and scheme, written by `scripts/kit.mjs` |
| `framework.lock.json` | The Framework release everything is checked against (`ui-7493766fe39e`) |
| `site/` | The catalogue site; `site/lib/placement.js` is the stand-in for simai.effect 1.1 (below) |
| `templates/effect/` | A template effect to start from |
| `docs/AUTHORING.md` | The author guide |
| `scripts/` | Catalogue build and check, kit runner, site build, browser smoke, hygiene check |

20 effects today: 7 draw both schemes, 7 are dark only, 6 light only. 11 of the
single-scheme effects name a pair of the other scheme.

## Theme policy

- Each effect declares the **schemes** it can draw (`dark`, `light` or both)
  and may name a **pair**: an effect of the other scheme with the same role.
- A placement has a **theme mode**: `auto` (follow the page, the default),
  `dark` or `light`. A fixed mode the effect cannot draw is never offered.
- In `auto`, when the effect lacks the page's scheme: its pair is shown; with
  no pair, a dark effect stays dark, and a light effect is not shown (the
  reader chose dark to avoid glare; the area is a plain dark surface).
- The effect's area takes the theme it is drawn in (`theme-dark` or
  `theme-light`), so text and controls over it keep 4.5:1.
- **Windows mode:** one effect is drawn behind a group of cards and seen only
  through them, continuous from card to card. Every effect here is safe for it.

## Using an effect today

Today's core is simai.effect 1.0 with `SF.Effects.mountEffect`. It has no
manifest fields for schemes and pairs, no theme mode and no windows mode, so
this repository carries them:

- `schemes` and `pair` live in `effects/policy.json` (1.0 forbids extra
  manifest fields); `schemes` also equal the options of each manifest's
  `scheme` setting;
- `site/lib/placement.js` implements the theme mode, the pair, the windows
  mode and integrity loading on top of `SF.Effects.mountEffect`. It is kept
  small and isolated so the core can replace it.

The configurator's «Получить код» gives a working snippet for the chosen
effect, settings, theme mode and layout. In short:

```html
<!-- SIMAI Framework, pinned by its full release commit -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/simai/ui@7493766fe39ec6633cb1420532690c61661b0354/distr/core/css/core.min.css">
<script>window.sfPath = 'https://cdn.jsdelivr.net/gh/simai/ui@7493766fe39ec6633cb1420532690c61661b0354/distr/';</script>
<script src="https://cdn.jsdelivr.net/gh/simai/ui@7493766fe39ec6633cb1420532690c61661b0354/distr/core/js/core.min.js"></script>

<section data-effect-area>…</section>
<script type="module">
  // CDN = 'https://cdn.jsdelivr.net/gh/simai/ui-effects@<commit>/'
  // 1. fetch site/lib/placement.js, check its SHA-256 from catalogue/index.json, import it;
  // 2. mountPlacement(area, {effect, themeMode: 'auto', settings, windows});
  //    it fetches effect.json and index.js, checks both against their SHA-256,
  //    and mounts through SF.Effects.mountEffect.
</script>
```

Every URL is pinned by commit, never a branch. The SHA-256 values come from
`catalogue/index.json` at the same commit.

## After the core ships simai.effect 1.1

The Framework will add, in its core: manifest fields `schemes` and `pair`, a
placement `themeMode`, windows mode, a declarative mount, integrity loading
from the catalogue and a sandbox runner for foreign effects. Then:

```html
<section data-sf-effect="https://cdn.jsdelivr.net/gh/simai/ui-effects@<commit>/effects/comet-flow/effect.json"
         data-sf-effect-theme="auto"
         data-sf-effect-settings='{"speed":100}'>…</section>
```

(attribute names follow the core plan and may change before release), and:

- the effects here move `schemes` and `pair` into their manifests;
- `effects/policy.json` keeps only order, descriptions and tags;
- `site/lib/placement.js` is removed; the site and the snippets call the core.

This form does not work yet. The site marks it «после выхода ядра simai.effect 1.1».

## Security model

- **Official effects** (this repository) are reviewed, pass the kit, and are
  published pinned by commit plus SHA-256 per file. They run inline, in the
  page, like any other script the page chose to load.
- **Anything else** (an effect from another source, a user upload, a
  modified copy) must run in the Framework's sandbox: an iframe without
  `allow-same-origin`, a strict CSP, settings passed by message, no access to
  the page, cookies or network. The sandbox runner ships with core 1.1.
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
