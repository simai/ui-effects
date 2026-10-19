# Leaf shadows (`leaf-shadows`)

Blurred shadows of branches sway in the wind on a sunlit wall; morning, noon or evening.

- **Russian name:** Тень листвы
- **Version:** 1.2.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, product
- **Tags:** nature
- **Role:** Leaf shadows on a sunlit wall.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Shadow depth |
| `density` | integer | 10–100 % | `55` | Foliage, % |
| `daytime` | choice | `morning`, `noon`, `evening` | `"morning"` | Time of day |
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
