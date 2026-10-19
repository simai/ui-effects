# Status and roadmap

The state of the catalogue, the decisions behind it and what waits on the Framework. Update this file when any of them changes.

## Decisions

- **Effects live here, not in the Framework.** The Framework ships only the core:
  - the `simai.effect` standard;
  - `SF.Effects`;
  - the kit;
  - the sandbox runner.
- **Only SIMAI's own effects for now.** Community submissions need a separate decision; see `CONTRIBUTING.md`.
- **Theme policy.**
  - Each effect declares `schemes`. **No pairs** (owner, 2026-10-19): an effect that works well in both themes is dual, the rest draw one scheme.
  - A placement has a theme mode: `auto` (the default), `dark` or `light`.
  - In `auto`, if the effect lacks the page's scheme, a dark-only effect stays dark, and a light-only effect is not shown on a dark page.
  - **A fixed mode the effect cannot draw is never offered.**
  - The effect's area takes the drawn theme.
- **Windows mode is part of the standard.** One scene sits behind a group of cards and is seen only through them. Every effect here is safe for it.
- **Readability.** At the manifest's default settings, text over an effect meets 4.5:1 in `--sf-on-surface` and 3:1 in `--sf-on-surface-variant`. 3:1 is the WCAG level for large text, so the dimmed role over an effect is for large text only (24px, or 18.66px bold); smaller text uses `--sf-on-surface`. The catalogue site's own text over effects is all in `--sf-on-surface` or `--sf-primary`. Raising a setting past its default is the page's choice.
- **Captions over windows** sit on a veil that fades in from the effect, with no hard edge.
- **The site's switches** are the Framework's segmented `<sf-button-group>` (single choice); the motion toggles are a plain Button Group in the segmented look.

## Today

- **Framework.** Release `ui-a5bab69a11bb`, pinned in `framework.lock.json`: simai.effect 1.1.0 with `SF.Effects` (theme policy, windows mode, declarative mount, integrity loading) and the segmented Button Group.
- **Manifests** declare `schemes` (home scheme first) and `capabilities: ["windows"]`. The modules read the scheme from `context.scheme`. `effects/policy.json` holds only order, Russian descriptions and roles, and tags.
- **Kit.** The 1.1 kit runs per scheme, the scheme switch, contrast (4.5:1 on-surface, 3:1 on-surface-variant, at defaults) and windows. Every effect passes all checks the lock expects for it: 14 for one scheme, 17 for both.
- **Site and snippets** place effects through the core: the site reads its own copy of the catalogue, and «Получить код» gives the declarative markup and the `SF.Effects.placeEffect` script, pinned by commit. `site/assets/place.js` only adds the configurator's still-frame switch and names what is shown.
- **Theme modes.** An editor offers a fixed mode only when the effect draws it (the core's `allowedModes`).

- **Portal.** Releases `vX.Y.Z` carry the portal artifact for https://simai.io/ru/framework/effects/ (`.github/workflows/portal.yml`). The hub pins one in `portal.lock.json`; GitHub Pages keeps serving `main` until the redirect is agreed.

## Waiting on the Framework, in its order

1. **The sandbox runner.** **Then here:** document foreign effects in `README.md` and `SECURITY.md`. Community submissions stay closed until the owner decides.

## Effects

There are 17 effects: 5 draw both schemes, 7 dark only and 5 light only. `ink-threads`, `foam-cells` and `guilloche` were removed (owner, 2026-10-19). Schemes are in the manifests; the order, descriptions and tags are in `effects/policy.json`; the per-effect kit results are in `catalogue/kit.json`.

Every effect's defaults pass the 1.1 contrast rule in each scheme it draws. `scripts/contrast-probe.mjs` measures it the way the kit does and takes other defaults with `--set`, for tuning.
