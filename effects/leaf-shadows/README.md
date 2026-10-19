# Leaf shadows (`leaf-shadows`)

Blurred shadows of branches sway in the wind on a sunlit wall; morning, noon or evening.

- **Russian name:** Тень листвы
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, product
- **Tags:** nature
- **Role:** Leaf shadows on a lit wall; its dark pair is rain on a night window.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Shadow depth |
| `density` | integer | 10–100 % | `55` | Foliage, % |
| `daytime` | choice | `morning`, `noon`, `evening` | `"morning"` | Time of day |
| `interactive` | boolean | — | `true` | React to the pointer |
| `scheme` | choice | `light` | `"light"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## Pair

[`rain-glass`](../rain-glass/README.md) (Rain on glass) draws the dark scheme with the same role. In the `auto` theme mode it replaces this effect when the page is dark.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
