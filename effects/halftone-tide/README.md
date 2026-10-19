# Halftone tide (`halftone-tide`)

A print halftone screen at 15 degrees: dots grow and shrink under slow crossing waves.

- **Russian name:** Растровая волна
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** hero, product, docs
- **Tags:** print
- **Role:** A halftone with waves: newsprint on light, a phosphor screen on dark.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 10–28 px | `16` | Screen pitch, px |
| `intensity` | integer | 0–100 % | `50` | Strength |
| `shape` | choice | `dot`, `line`, `cross` | `"dot"` | Screen element |
| `tone` | choice | `primary`, `secondary`, `tertiary`, `ink` | `"primary"` | Colour |
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
