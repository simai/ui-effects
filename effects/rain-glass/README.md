# Rain on glass (`rain-glass`)

A fogged window on a rainy night: the street behind it out of focus, only its lights. Lamps run off, neon shifts and flickers, a traffic light at the crossing stops and lets the cars go, every light trembles as a streak on the wet road. Drops run down the glass; wipe it with a finger, and it fogs again.

- **Russian name:** Дождь на стекле
- **Version:** 3.0.0, simai.effect 1.1.0
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
| `view` | choice | `street`, `low` | `"street"` | View |
| `palette` | choice | `blue`, `neon`, `amber`, `mono` | `"blue"` | Palette |
| `rain` | boolean | — | `true` | Rain outside. Rain shows where the lights catch it |
| `interactive` | boolean | — | `true` | React to the pointer. Press and drag to wipe the fog and the drops |

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
