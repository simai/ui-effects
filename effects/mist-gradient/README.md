# Morning mist (`mist-gradient`)

A mesh gradient of five soft theme-colour patches drifting on Lissajous paths, with fine grain against banding.

- **Russian name:** Утренняя дымка
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, docs, dashboard, product
- **Tags:** gradient
- **Role:** A soft mesh gradient; its dark pair is the nebula mesh.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Saturation |
| `palette` | choice | `theme`, `warm`, `cool`, `mono` | `"theme"` | Palette |
| `grain` | boolean | — | `true` | Paper grain |
| `interactive` | boolean | — | `true` | React to the pointer |
| `scheme` | choice | `light` | `"light"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## Pair

[`nebula-mesh`](../nebula-mesh/README.md) (Nebula mesh) draws the dark scheme with the same role. In the `auto` theme mode it replaces this effect when the page is dark.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
