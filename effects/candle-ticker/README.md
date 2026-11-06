# Candle ticker (`candle-ticker`)

Faint market candles with a moving average slowly drift to the left as new ones appear on the right.

- **Russian name:** Свечной ряд
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** chart, finance
- **Role:** A background for finance, trading and market data. The candles are thin and pale, so text reads in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `density` | integer | 10–100 % | `50` | Density: how many cells or candles fit the area |
| `volatility` | integer | 10–100 % | `50` | Volatility |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: a crosshair follows the pointer and highlights the candle under it |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
