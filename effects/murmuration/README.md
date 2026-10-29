# Murmuration (`murmuration`)

A great flock of starlings moves as one: it stretches, folds and thickens again.

- **Russian name:** Мурмурация
- **Version:** 0.1.0, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** particles, nature
- **Role:** Nature, coordination, a community: light and dark schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `size` | integer | 30–100 % | `85` | Flock size. How much of the area the flock takes |
| `interactive` | boolean | — | `true` | React to the pointer. The pointer is a falcon the flock swerves round; a click startles the birds |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
