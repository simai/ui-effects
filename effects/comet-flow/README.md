# Comet flow (`comet-flow`)

Glowing particles follow an invisible flow field and leave soft tails.

- **Russian name:** Кометные потоки
- **Version:** 1.4.2, simai.effect 1.3.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** particles, flow
- **Role:** A stream of glowing particles on the dark.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `55` | Density |
| `trail` | integer | 20–95 % | `70` | Trail length |
| `turbulence` | integer | 0–100 % | `50` | Turbulence |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | — | `true` | React to the pointer. The pointer stirs a vortex |

## Schemes

The manifest declares `"schemes": ["dark"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## On a light page

In the `auto` theme mode the effect stays dark, and its area keeps `theme-dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.3.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
