# Page stack (`page-stack`)

Translucent document sheets with a header strip and lines of text float down through the air in layers of depth: far ones small and pale, near ones larger and slanted.

- **Russian name:** Стопка страниц
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** documents, pages, depth
- **Role:** A calm background for documentation and knowledge bases: near sheets keep to the right, and those passing behind the text block thin out, so headings and paragraphs read easily. Works in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `pages` | integer | 4–20 | `10` | Pages: the number of sheets in the air |
| `depth` | integer | 10–100 % | `60` | Depth: how strongly near and far sheets shift apart (parallax) |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the sheets shift gently towards the pointer, the nearest one lifts, and a click turns it over like a page |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
