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
  - Each effect declares `schemes` and may name a `pair`.
  - A placement has a theme mode: `auto` (the default), `dark` or `light`.
  - In `auto`, if the effect lacks the page's scheme, its pair is shown. If there is no pair, a dark-only effect stays dark, and a light-only effect is not shown on a dark page.
  - **A fixed mode the effect cannot draw is never offered.**
  - The effect's area takes the drawn theme.
- **Windows mode is part of the standard.** One scene sits behind a group of cards and is seen only through them. Every effect here is safe for it.
- **Pair trust.**
  - A pair given as a catalogue id resolves against the catalogue and is checked by SHA-256 before it runs.
  - A pair given as a foreign URL runs only in the sandbox.
  - A trusted effect never pulls an untrusted pair inline.
- **Readability.** At the manifest's default settings, text over an effect meets 4.5:1 in `--sf-on-surface` and 3:1 in `--sf-on-surface-variant`. 3:1 is the WCAG level for large text, so the dimmed role over an effect is for large text only (24px, or 18.66px bold); smaller text uses `--sf-on-surface`. The catalogue site's own text over effects is all in `--sf-on-surface` or `--sf-primary`. Raising a setting past its default is the page's choice.
- **Captions over windows** sit on a veil that fades in from the effect, with no hard edge.
- **The configurator's segmented switches** move to the Framework's segmented `<sf-button-group>` when it ships (simai/ui-source#4).

## Today

- **Standard.** The Framework release is pinned in `framework.lock.json`, on standard simai.effect 1.0.0.
- **Schemes and pairs.** They live in `effects/policy.json`, because 1.0 manifests allow no extra fields. Each manifest also has a `scheme` setting.
- **Placement.** `site/lib/placement.js` adds the theme mode, the pair, windows mode and integrity loading on top of `SF.Effects.mountEffect`. It is the only stand-in for the core.
- **The declarative snippet** in «Получить код» is marked «после выхода ядра simai.effect 1.1» and does not work yet.

## Waiting on the Framework, in its order

1. **simai.effect 1.1.**
   - Manifest fields:
     - `schemes`;
     - `pair`: a catalogue id or an https URL ending in `/effect.json`, allowed only with a single scheme;
     - `capabilities: ["windows"]`;
     - `context.scheme`, with `update(settings, context)` on a scheme switch.
   - Kit checks: per-scheme runs, a scheme switch, windows, and contrast (worst of five frames, 95 % of pixels; 4.5:1 on-surface, 3:1 on-surface-variant).
   - **Then here:**
     - repin the lock;
     - move the manifests to the new fields and drop the `scheme` setting;
     - shrink `policy.json` to order, descriptions and tags;
     - update the schemas, the kit runner, `AUTHORING.md` and the template.
2. **SF.Effects.**
   - `themeMode` with `allowedModes()` and `resolveTheme()`, windows mode, the declarative `data-sf-effect` mount, and integrity loading.
   - **Then here:**
     - delete `site/lib/placement.js` and call the core;
     - make the declarative snippet real, with the attribute names as shipped;
     - update the README.
3. **The segmented Button Group** (simai/ui-source#4). **Then here:** replace `.seg` on the site.
4. **The sandbox runner.** **Then here:** document foreign effects in `README.md` and `SECURITY.md`.

## Effects

There are 20 effects: 7 draw both schemes, 7 dark only and 6 light only. Eleven name a pair. `aurora-curtain` (dark) and `foam-cells` (light) have no pair, by design. The order, descriptions and tags are in `effects/policy.json`; the per-effect kit results are in `catalogue/kit.json`.

Every effect's defaults pass the 1.1 contrast rule in each scheme it draws. `scripts/contrast-probe.mjs` measures it the way the 1.1 kit does, ahead of that kit.
