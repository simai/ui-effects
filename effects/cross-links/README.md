# Cross-links (`cross-links`)

Page cards appear one by one at free places, live a while and fade out, and others take their place elsewhere; small markers fly along arcs from a word on one page to a word on another, leaving a fading trail, and the landing lights the target word. Every load lays the pages anew.

- **Russian name:** Перекрёстные ссылки
- **Version:** 0.2.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** docs, links, pages
- **Role:** A calm background for documentation sites: the pages keep a calm, airy layout, few and faint near the text on the left, and the routes bend away from it. Works in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `pages` | integer | 3–12 | `7` | Pages shown at most |
| `links` | integer | 1–8 | `5` | Links in flight at once |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the page nearest the pointer lifts and sends links of its own; a click on a page sends links to every other page, a click on an empty spot adds a new page there |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture. With reduced motion the effect draws one seeded still frame, the same on every load.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
