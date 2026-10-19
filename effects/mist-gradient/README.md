# Morning mist (`mist-gradient`)

A mesh gradient of five soft theme-colour patches drifting on Lissajous paths, with fine grain against banding.

- **Russian name:** Утренняя дымка
- **Version:** 1.2.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, docs, dashboard, product
- **Tags:** gradient
- **Role:** A soft light mesh gradient.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Saturation |
| `palette` | choice | `theme`, `warm`, `cool`, `mono` | `"theme"` | Palette |
| `grain` | boolean | — | `true` | Paper grain |
| `interactive` | boolean | — | `true` | React to the pointer |

## Schemes

The manifest declares `"schemes": ["light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## On a dark page

In the `auto` theme mode the effect is not shown; the area is a plain dark surface (`theme-dark`).

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
