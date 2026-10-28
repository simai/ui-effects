# Rain on glass (`rain-glass`)

A fogged window at night: a lamp-lit street in bokeh behind it, a car going by now and then; drops on the glass, and you can write on it.

- **Russian name:** Дождь на стекле
- **Version:** 2.2.0, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** water, glow
- **Role:** A cosy evening behind a window. Dark scheme only.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `60` | Intensity |
| `density` | integer | 10–100 % | `55` | Density |
| `fog` | integer | 0–100 % | `70` | Fog |
| `traffic` | integer | 0–100 % | `40` | Traffic. How often cars go by |
| `lamps` | choice | `warm`, `white`, `mixed`, `none` | `"warm"` | Street lamps |
| `interactive` | boolean | — | `true` | React to the pointer. Press and drag to write on the fogged glass with a finger |

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
