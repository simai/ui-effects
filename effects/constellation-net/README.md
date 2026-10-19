# Constellations (`constellation-net`)

Stars in three depth layers drift and link with fine lines, like a living network.

- **Russian name:** Созвездия
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** particles, lines, sky
- **Role:** Points and lines: stars on dark, a printed star atlas on light.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `55` | Density |
| `linkDistance` | integer | 60–220 px | `120` | Link distance |
| `interactive` | boolean | — | `true` | React to the pointer. Parallax and links to the pointer |
| `scheme` | choice | `dark`, `light` | `"dark"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Pair

None needed: the effect draws both schemes.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
