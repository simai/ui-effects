# Text flow (`text-flow`)

Rows of code scroll, lit by slow folds of light; the text takes the theme colour.

- **Russian name:** Текстовый поток
- **Version:** 2.0.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** type, flow
- **Role:** Code for developer products: light and dark schemes. From the Larena sign-in picture.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed |
| `intensity` | integer | 0–100 % | `52` | Light. Brightness of the folds of light |
| `theme` | choice | `javascript`, `html`, `terminal`, `easter`, `symbols`, `hex`, `binary`, `digits`, `signs` | `"javascript"` | Text |
| `size` | integer | 8–18 px | `12` | Letter size |
| `base` | integer | 0–30 % | `5` | Text in the dark |
| `scale` | integer | 50–200 % | `65` | Fold size |
| `interactive` | boolean | — | `true` | Wave on click. A click in the area sends a wave of light |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
