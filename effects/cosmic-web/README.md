# Cosmic web (`cosmic-web`)

A dark, nearly even gas gathers into filaments and nodes; stars light up in the densest nodes and bubbles of light grow and merge until the web is lit. Then it fades and a new web begins.

- **Russian name:** Космическая паутина
- **Version:** 0.1.0, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** particles, lines
- **Role:** Science, data, connections. Dark scheme only.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `scale` | integer | 10–100 % | `40` | Scale. A fine web or a large one |
| `palette` | choice | `cyan`, `fire`, `theme` | `"cyan"` | Palette |
| `interactive` | boolean | — | `true` | React to the pointer. The pointer draws matter to itself; a click lights a star |

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
