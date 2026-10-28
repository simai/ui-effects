# Star flight (`star-flight`)

A slow flight through stars and nebulae.

- **Russian name:** Звёздный полёт
- **Version:** 1.0.0, simai.effect 1.1.0
- **Author:** Rim Zabarov / SIMAI
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** glow, sky, depth
- **Role:** Deep space: stars fly past and the nebulae's gas glows. It keeps a night sky's own colours. From the Larena sign-in picture. WebGL, with a 2D canvas fallback.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `nebula` | integer | 0–100 % | `60` | Nebulae. How much gas shows between the stars |

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
