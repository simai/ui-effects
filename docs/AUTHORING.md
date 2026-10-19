# Writing an effect

This guide is for authors of effects in `simai/ui-effects`. For now the
catalogue holds only SIMAI's own effects (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

## 1. The standard

An effect follows **simai.effect 1.0.0**, the standard of the SIMAI Framework
core. Its normative text, manifest schema and kit live in `simai/ui-source`
(`contracts/standards/simai.effect/1.0.0/`, `src/core/contracts/effect.v1.schema.json`,
`scripts/effect-kit.mjs`); the Framework documentation explains it on the page
«Фоновые эффекты» of the layouts guide.

An effect is a folder:

| File | Rule |
|:---|:---|
| `effect.json` | The manifest: `"schema": "simai.effect"`, `"schema_version": 1`, `id` equal to the folder name, `entry: "index.js"`, typed and bounded settings, `"needs": {"network": false}` |
| `index.js` | One ES module, no imports, exporting `mount(host, settings, context)` |
| `preview.png` | 640×360 still of the home scheme |
| `README.md` | English: what it is, every setting, schemes, pair |

Rules every effect follows:

- **Lifecycle.** `mount` returns `{update(settings), pause(), resume(), destroy()}`.
  `update` changes settings without a remount (the host keeps its nodes).
  An optional `refreshTheme()` re-reads the palette.
- **Drawing.** Only inside `host`, on the effect's own canvas or SVG, `aria-hidden`,
  no pointer capture. Pointer reactions listen on `window`, passively.
- **No network.** No requests, no dynamic imports, no remote images or fonts.
  System fonts only.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, or
  `context.reducedMotion`, draw one still frame and ask for no frames. React
  to changes.
- **Hidden tab, off screen.** Ask for no frames while the tab is hidden or the
  host is off screen (`IntersectionObserver`).
- **Pixel ratio** capped at 2; size from `ResizeObserver`.
- **Cleanup.** `destroy` leaves no nodes, frames, observers or listeners, and a
  second mount works.
- **Settings.** Typed and bounded (`integer`, `number`, `boolean`, `choice`,
  `color` ...), each with a valid default and a Russian label. Every effect has
  `speed` (%), `intensity` or `density`, one setting of its own, `interactive`
  where it makes sense, and `scheme` as the **last** setting (below).

## 2. Schemes and pairs

An effect declares the schemes it can draw: `dark`, `light` or both.

- Until simai.effect 1.1, the schemes are the options of the `scheme` choice
  setting, home scheme first and as the default, **and** the `schemes` of the
  effect's entry in `effects/policy.json`. The catalogue check fails when the
  two differ.
- Both schemes of a dual effect are **designed**, each from its own tones. A
  dual effect is not an inverted picture. Good candidates are line work,
  geometry, grids and type. Effects of emitted light (aurora, neon, caustics)
  or of paper and shadow stay single-scheme.
- A single-scheme effect may name a **pair** in the policy: an effect of the
  other scheme that plays the same role (comet-flow ↔ ink-threads). The pair
  must draw the scheme the effect lacks. Name a pair for every single-scheme
  effect meant for public pages, unless the role has no counterpart.

What a placement shows (theme mode `auto` | `dark` | `light`):

| Effect | Page / target | Shown |
|:---|:---|:---|
| draws the target scheme | any | the effect, in that scheme |
| lacks it, has a pair | any | the pair, in that scheme |
| dark only, no pair | light | the effect, still dark; the area is `theme-dark` |
| light only, no pair | dark | nothing: a plain dark surface |

An editor never offers a fixed mode the effect cannot draw. The effect's area
takes the theme it is drawn in. The host sends the scheme in `settings.scheme`,
through `mount` and `update`; react to it in `update`.

## 3. Draw with palette tones, not roles

Read colours from `getComputedStyle(host)` at mount and on `update`/`refreshTheme`,
and read **palette tones** only: `--sf-primary-40`, `--sf-primary-80`,
`--sf-secondary-40`, `--sf-tertiary-80`, `--sf-neutral-5`, `--sf-neutral-98` and
so on.

Never read **roles** (`--sf-primary`, `--sf-surface-0`, `--sf-surface-container`,
`--sf-on-surface`): a role changes with the page theme, a tone does not. A dark
effect must draw the same dark picture on a light page, and the area around it
then takes `theme-dark`. Tones still follow the project's colour, so a site
with its own primary gets an effect in its own colours.

Resolve the variables through a probe element, as the template does, so
`var()` chains and `light-dark()` settle. Always give a fallback colour.

## 4. Readability

Text sits on the effect. On its **brightest frame**, the effect must leave
room for 4.5:1 text in the on-surface colour of the theme it is drawn in:

- keep bright elements small and the main area calm;
- light effects keep their darkest areas well above mid-grey, dark effects
  keep their brightest areas small;
- small accent text (an eyebrow, a caption) may sit on a veil of the area's
  surface (84 % in the catalogue); body and heading text should need none;
- nothing flashes more than 3 times a second (WCAG 2.3.1); motion is slow by
  default.

The catalogue site measures every effect page: 95 % of the area under the text
must reach 4.5:1, in the hero and in the windows layout.

## 5. Frame budget and size

- About **3 ms** of JavaScript per frame at 1440×900, smooth at 60 fps on a
  laptop. Heavy per-pixel work runs in a small buffer and is scaled up.
- Degrade gracefully: if frames stay slow, lower the internal resolution.
- A module stays under about **15 KB**; the catalogue check fails above 20 KB.
  No dependencies.

## 6. Windows safety

The page may draw one effect behind a group of cards and show it only through
them. Every effect must work that way:

- no single focal point that only makes sense when seen whole;
- any crop of 200×140 px looks finished;
- the host is clipped (`clip-path`) by the page; draw the whole host anyway,
  and do not read the clip.

The catalogue site and the smoke test run every effect in both layouts.

## 7. Start from the template

```sh
cp -R templates/effect effects/<id>
```

Then:

1. set `id`, `label`, `surfaces` and the settings in `effect.json`;
2. replace `draw()` in `index.js`; keep the lifecycle code;
3. add the entry to `effects/policy.json` (`description.ru`, `schemes`, `pair`,
   `role.ru`, `tags`) at its place in the catalogue order;
4. write `README.md` (every setting key in backticks) and `preview.png`.

## 8. Run the checks

```sh
npm ci
export UI_ROOT=../ui UI_SOURCE_ROOT=../ui-source     # clones that hold the commits of framework.lock.json
node scripts/kit.mjs --only <id>         # the Framework kit, in every scheme: 11/11 each
node scripts/build-catalogue.mjs         # catalogue/index.json with SHA-256 and the kit result
node scripts/build-catalogue.mjs --check
node scripts/check-hygiene.mjs
node scripts/build-site.mjs
node scripts/smoke.mjs --prefix /ui-effects/ --only <id>
node scripts/serve.mjs                   # look at it: http://127.0.0.1:4173/ui-effects/effect/<id>/
```

The kit runs `scripts/effect-kit.mjs` of `simai/ui-source` against `distr/core`
of `simai/ui`, read with `git archive`. A non-home scheme runs on a copy whose
`scheme` default is that scheme. Results go to `catalogue/kit.json` with a
digest of the manifest and module; change either and the catalogue reports the
result as stale until the kit runs again.

## 9. Review checklist

- [ ] Kit 11/11 in every declared scheme, at the locked Framework.
- [ ] `build-catalogue --check` and `check-hygiene` pass; the module is offline and under the size limit.
- [ ] Palette tones only; no role variable is read (`grep -- '--sf-on-\|--sf-surface' index.js`).
- [ ] Each scheme is designed, not inverted; the preview shows the home scheme.
- [ ] The pair, if any, plays the same role and draws the missing scheme.
- [ ] Contrast readout at least 4.5:1 in the hero and windows layouts, light and dark page, at 1440 and 390.
- [ ] Reduced motion: one still frame. Pause, hidden tab and off screen: no frames.
- [ ] Calm by default; nothing flashes more than 3 times a second.
- [ ] Frame time under about 3 ms at 1440×900; graceful on a slow machine.
- [ ] Any crop looks finished (windows mode).
- [ ] `destroy` then `mount` again works; settings at their bounds do not throw.
- [ ] README describes every setting, the schemes and the pair; Russian labels read naturally.
- [ ] A second reviewer has approved the change.
