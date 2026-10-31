# Cosmic web (`cosmic-web`)

Fine, sharp filaments fill the area round dark voids and slowly part, join and find a new shape. Drawn on the video card; without one it is a still picture.

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
| `density` | integer | 10–100 % | `50` | Thread density. How many fine threads, and how few voids |
| `scale` | integer | 10–100 % | `40` | Scale. A fine web or a large one |
| `palette` | choice | `cyan`, `fire`, `theme` | `"cyan"` | Palette |
| `interactive` | boolean | — | `true` | React to the pointer. The pointer lights the web; a click sends a ring of light through it |

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
