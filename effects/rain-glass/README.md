# Rain on glass (`rain-glass`)

Drops on a night window with blurred city lights behind; large drops slide down and leave a trail.

- **Russian name:** Дождь на стекле
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** water, depth
- **Role:** The mood of a window at night; its light pair is leaf shadows on a wall by day.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `55` | Droplet density. How many droplets cover the glass |
| `lights` | integer | 10–100 % | `60` | City lights. How many blurred lights shine behind the glass |
| `interactive` | boolean | — | `true` | React to the pointer. A moving pointer shakes drops loose |
| `scheme` | choice | `dark` | `"dark"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## Pair

[`leaf-shadows`](../leaf-shadows/README.md) (Leaf shadows) draws the light scheme with the same role. In the `auto` theme mode it replaces this effect when the page is light.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
