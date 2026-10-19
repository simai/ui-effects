# Rain on glass (`rain-glass`)

Drops on a night window with blurred city lights behind; large drops slide down and leave a trail.

- **Russian name:** Дождь на стекле
- **Version:** 1.2.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** water, depth
- **Role:** A night window in the rain.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `55` | Droplet density. How many droplets cover the glass |
| `lights` | integer | 10–100 % | `50` | City lights. How many blurred lights shine behind the glass |
| `interactive` | boolean | — | `true` | React to the pointer. A moving pointer shakes drops loose |

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
