# Glyph tide (`glyph-tide`)

A field of monospaced glyphs that a slow wave of light passes over.

- **Russian name:** Знаковый прилив
- **Version:** 2.2.1, simai.effect 1.3.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** type
- **Role:** A field of glyphs with a wave: glyphs light up on dark and print darker on light.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `55` | Density. Share of filled cells |
| `charset` | choice | `javascript`, `html`, `terminal`, `easter`, `prose`, `custom`, `letters`, `hex`, `binary`, `digits`, `signs` | `"hex"` | Text. The same list as in text flow; `prose` is words that sound meaningful and say nothing, in the page's language |
| `text` | text | up to 600 characters | `""` | Own text. For `custom`: sentences, or one per line |
| `language` | choice | `auto`, `en`, `ru` | `"auto"` | Words language. For `prose`; `auto` follows the page |
| `size` | integer | 10–24 px | `14` | Glyph size |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | — | `true` | React to the pointer. Glyphs light up near the pointer |

Since 2.0.0 the old `symbols` value is called `signs` (it is still read as signs). Text is laid in reading order and keeps its letters; an alphabet is scattered as thick as `density` asks, and the tide turns its glyphs into others.

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.3.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
