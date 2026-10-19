# Abyss caustics (`abyss-caustics`)

A web of underwater caustics sways in deep water, with soft rays from above.

- **Russian name:** Глубоководные блики
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** water, glow
- **Role:** Caustics in deep water; its light pair is daylight caustics.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `55` | Intensity |
| `scale` | integer | 20–100 % | `50` | Caustic size |
| `rays` | boolean | — | `true` | Light rays |
| `interactive` | boolean | — | `true` | React to the pointer. The light shifts with the pointer |
| `scheme` | choice | `dark` | `"dark"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## Pair

[`daylight-caustics`](../daylight-caustics/README.md) (Daylight caustics) draws the light scheme with the same role. In the `auto` theme mode it replaces this effect when the page is light.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
