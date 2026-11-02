# Watercolour (`watercolor`)

Drops of paint touch wet paper and bloom into stains with ragged edges.

- **Russian name:** Акварель
- **Version:** 0.1.1, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** paper, gradient
- **Role:** Live watercolour. Light scheme only.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `interactive` | boolean | — | `true` | React to the pointer. A click drops paint, a press-drag is a wet brush |

## Schemes

The manifest declares `"schemes": ["light"]`, and `"capabilities": ["windows"]`.

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## On a dark page

In the `auto` theme mode the effect stays light, and its area keeps `theme-light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
