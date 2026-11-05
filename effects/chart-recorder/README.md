# Chart recorder (`chart-recorder`)

Over a faint coordinate grid, pens trace a few smooth series from left to right; the old trace fades, as on an oscilloscope.

- **Russian name:** Самописец
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** chart, grid
- **Role:** Chart paper with a live trace: light or dark.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed of the pens; at 100 % a sweep takes about fourteen seconds |
| `intensity` | integer | 10–100 % | `70` | Intensity of the lines and the grid |
| `density` | integer | 10–100 % | `50` | Grid density: the step of the grid, every fifth line firmer |
| `lines` | integer | 1–4 | `3` | Lines: how many series the pens draw |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: a dashed crosshair follows it and marks where each line crosses |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
