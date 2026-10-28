# Constellations (`constellation-net`)

Stars in three depth layers drift and link with fine lines, like a living network.

- **Russian name:** Созвездия
- **Version:** 2.0.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** particles, lines, sky
- **Role:** A night sky of stars linked into constellations. It draws the dark scheme only: a light starry sky reads as a mistake.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `55` | Density |
| `linkDistance` | integer | 60–220 px | `120` | Link distance |
| `interactive` | boolean | — | `true` | React to the pointer. Parallax and links to the pointer |

## Schemes

The manifest declares `"schemes": ["dark"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## On a light page

In the `auto` theme mode the effect stays dark, and its area keeps `theme-dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
