# Paper flurry (`paper-flurry`)

A heap of document sheets is tossed up from below; the sheets turn over, swing down like falling leaves of paper and drift out at the bottom, and a new toss comes every few seconds.

- **Russian name:** Ворох бумаг
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** paper, docs, confetti
- **Role:** A light, lively background for documentation and product pages: the sheets fly mostly on the right, the text on the left stays clear. Works in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `amount` | integer | 10–100 % | `50` | Amount of sheets in each toss |
| `size` | integer | 50–150 % | `100` | Sheet size |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the pointer gently blows the sheets aside; a press scatters them with a gust and tosses new ones |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture: white paper on a light ground, dark-grey paper on a dark one.

Theme modes a placement may choose: `auto`, `dark`, `light`.

While it moves, every mount tosses a new heap; the reduced-motion still frame is seeded and the same every time.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
