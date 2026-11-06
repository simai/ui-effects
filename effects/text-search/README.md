# Text search (`text-search`)

Faint pages of grey word bars, one to four side by side, drift slowly upward while soft search markers sweep onto words one after another, like the results of a query being found; now and then every word of one length lights up together.

- **Russian name:** Поиск
- **Version:** 0.2.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** text, search
- **Role:** A quiet background for documentation and search pages: the text is abstract and faint, softer still behind the page heading, so real text above reads easily. Works in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `density` | integer | 10–100 % | `50` | Density: line spacing and word size |
| `columns` | integer | 1–4 | `2` | Columns: how many pages of text stand side by side. Narrow areas show fewer, so each page keeps at least 260 px of text; a single page takes a reading measure right of centre |
| `hits` | integer | 1–10 | `4` | Hits: how many highlights are lit at once |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: a loupe follows the pointer and makes the words under it crisper and larger; a click highlights every word of the same length |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
