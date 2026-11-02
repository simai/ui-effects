# Neon horizon (`neon-horizon`)

A neon perspective grid runs to a glowing horizon under sparse stars. Light riders ride the floor along its grid lines,
turning at the crossings. Each rider is a small futuristic bike of its own design, drawn in perspective from its
heading: a low dark wedge body between two glowing wheel rings, with a tail light and a nose light, turning smoothly at a
crossing. Behind its rear wheel it leaves a light wall in its own palette colour, a bright top edge over a body fading to
the floor; the walls fade after several seconds, oldest first. A rider that runs into any wall, its own or another's, bursts in a flash and a few fragments,
its wall fades out, and a new rider enters from the far edge after a pause. Riders look ahead and turn away from walls,
so crashes happen when one is boxed in. A click on the area releases a new rider under the pointer, heading away.

- **Russian name:** Неоновый горизонт
- **Version:** 1.6.0, simai.effect 1.3.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** geometry, depth
- **Role:** A neon horizon and a grid running into the depth.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `50` | Intensity |
| `horizon` | integer | 20–70 % | `42` | Horizon height |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | — | `true` | React to the pointer. The vanishing point follows the pointer; a click releases a new rider |
| `riders` | boolean | — | `true` | Light riders. Riders ride the grid lines and leave light walls |
| `riderCount` | integer | 2–4 | `3` | Number of riders, read only while `riders` is on: a rider that runs into a wall bursts |

## Reduced motion

With reduced motion the effect draws one still frame: the riders are seeded, shown mid-ride with their walls, and no
burst is in progress.

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
