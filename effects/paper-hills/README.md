# Paper hills (`paper-hills`)

Layers of paper hills in aerial perspective: far ones paler and slower, mist in the valleys.

- **Russian name:** Бумажные холмы
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, product
- **Tags:** paper, depth
- **Role:** Paper hills in haze; its dark pair is the neon horizon.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 3–8 | `6` | Layers |
| `intensity` | integer | 0–100 % | `60` | Strength |
| `mood` | choice | `dawn`, `day`, `mist` | `"day"` | Mood |
| `interactive` | boolean | — | `true` | React to the pointer |
| `scheme` | choice | `light` | `"light"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## Pair

[`neon-horizon`](../neon-horizon/README.md) (Neon horizon) draws the dark scheme with the same role. In the `auto` theme mode it replaces this effect when the page is dark.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
