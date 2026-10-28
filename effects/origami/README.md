# Origami (`origami`)

Paper folds, with light gliding slowly over the facets.

- **Russian name:** Оригами
- **Version:** 0.1.0 (draft), simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** paper, geometry
- **Role:** Paper and light. Light scheme only.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |

## Schemes

The manifest declares `"schemes": ["light"]`, and `"capabilities": ["windows"]`.

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## On a dark page

In the `auto` theme mode the effect is not shown; the area is a plain dark surface (`theme-dark`).

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
