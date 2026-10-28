# Text flow (`text-flow`)

Rows of code scroll in the dark, lit by slow folds of light.

- **Russian name:** Текстовый поток
- **Version:** 1.0.0, simai.effect 1.1.0
- **Author:** Rim Zabarov / SIMAI
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** type, flow
- **Role:** Code in the dark, for developer products. A click in the area sends a wave of light. From the Larena sign-in picture.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed |
| `intensity` | integer | 0–100 % | `52` | Light. Brightness of the folds of light |
| `theme` | choice | `symbols`, `javascript`, `html`, `terminal`, `easter` | `"javascript"` | Text |
| `size` | integer | 8–18 px | `12` | Letter size |
| `base` | integer | 0–30 % | `5` | Text in the dark |
| `scale` | integer | 50–200 % | `65` | Fold size |
| `hue` | integer | 0–360 ° | `190` | Hue |
| `interactive` | boolean | — | `true` | Wave on click. A click in the area sends a wave of light |

## Schemes

The manifest declares `"schemes": ["dark"]`, and `"capabilities": ["windows"]`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## On a light page

In the `auto` theme mode the effect stays dark, and its area keeps `theme-dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
