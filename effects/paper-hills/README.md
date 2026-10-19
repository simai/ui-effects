# Paper hills (`paper-hills`)

Layers of paper hills in aerial perspective: far ones paler and slower, mist in the valleys.

- **Russian name:** Бумажные холмы
- **Version:** 1.2.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, product
- **Tags:** paper, depth
- **Role:** Paper hills in the haze.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 3–8 | `6` | Layers |
| `intensity` | integer | 0–100 % | `60` | Strength |
| `mood` | choice | `dawn`, `day`, `mist` | `"day"` | Mood |
| `interactive` | boolean | — | `true` | React to the pointer |

## Schemes

The manifest declares `"schemes": ["light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## On a dark page

In the `auto` theme mode the effect is not shown; the area is a plain dark surface (`theme-dark`).

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
