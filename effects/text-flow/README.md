# Text flow (`text-flow`)

Rows of code scroll, lit by slow folds of light; the text takes the theme colour.

- **Russian name:** Текстовый поток
- **Version:** 3.2.2, simai.effect 1.3.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** type, flow
- **Role:** Code for developer products: light and dark schemes. From the Larena sign-in picture.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed |
| `intensity` | integer | 0–100 % | `52` | Light. Brightness of the folds of light |
| `theme` | choice | `javascript`, `html`, `terminal`, `easter`, `prose`, `custom`, `letters`, `hex`, `binary`, `digits`, `signs` | `"javascript"` | Text. The same list as in glyph tide; `prose` is words that sound meaningful and say nothing, in the page's language |
| `text` | text | up to 600 characters | `""` | Own text. For `custom`: sentences, or one per line |
| `language` | choice | `auto`, `en`, `ru` | `"auto"` | Words language. For `prose`; `auto` follows the page |
| `size` | integer | 8–18 px | `12` | Letter size |
| `base` | integer | 0–30 % | `5` | Text in the dark |
| `scale` | integer | 50–200 % | `65` | Fold size |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | — | `true` | Wave on click. A click in the area sends a wave of light |

Since 3.0.0 the old `symbols` value is called `letters` (it is still read as letters).

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.3.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
