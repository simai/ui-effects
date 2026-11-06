# Paper flurry (`paper-flurry`)

Document sheets fall from above and swing down like falling leaves of paper, endlessly and calmly; small sheets stay stiff and tumble, big ones bend, sag and flap as they glide. A press tosses a heap of sheets up from the point.

- **Russian name:** Ворох бумаг
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** paper, docs, confetti
- **Role:** A light, lively background for documentation and product pages: the sheets fall mostly on the centre-right and right, the few over the text on the left are faint. Works in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `amount` | integer | 10–100 % | `50` | Amount of sheets in the air |
| `size` | integer | 50–150 % | `100` | Sheet size; bigger sheets bend more |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: a press tosses a heap of sheets up and scatters the falling ones with a gust; the pointer gently blows them aside |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture: white paper on a light ground, dark-grey paper on a dark one.

Theme modes a placement may choose: `auto`, `dark`, `light`.

While it moves, every mount lays new sheets; the reduced-motion still frame is seeded and the same every time, with sheets already spread over the height.

On a right-to-left page (`direction: rtl`) the whole picture is mirrored, so the sheets keep away from the text on the right; pointer and press land under the real pointer.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
