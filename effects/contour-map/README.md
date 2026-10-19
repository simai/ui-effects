# Contour map (`contour-map`)

Contour lines of a slowly changing relief, every fifth one heavier, as on a topographic map.

- **Russian name:** Горизонтали
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** dashboard, docs, hero
- **Tags:** lines
- **Role:** Contour lines: a topographic sheet on light, a night map on dark.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 6–30 | `14` | Levels |
| `lineWeight` | number | 0.5–2 px | `1` | Line weight, px |
| `tone` | choice | `primary`, `secondary`, `tertiary`, `ink` | `"ink"` | Colour |
| `interactive` | boolean | — | `true` | React to the pointer |
| `scheme` | choice | `light`, `dark` | `"light"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Pair

None needed: the effect draws both schemes.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
