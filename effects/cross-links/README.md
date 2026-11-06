# Cross-links (`cross-links`)

Pale page cards float across the area, and thin arcs draw themselves from a word on one page to a word on another: a living map of the links in a documentation site.

- **Russian name:** Перекрёстные ссылки
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** docs, links, pages
- **Role:** A calm background for documentation sites: the pages stay faint and few near the text on the left, the links come and go on the right. Works in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `pages` | integer | 3–12 | `7` | Pages |
| `links` | integer | 1–8 | `3` | Links drawn at once |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the page under the pointer lifts and shows all its links; a click sends a wave of links hopping from page to page |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
