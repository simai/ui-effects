# Abyss caustics (`abyss-caustics`)

A web of underwater caustics sways in deep water, with soft rays from above.

- **Russian name:** Глубоководные блики
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** water, glow
- **Role:** Caustics in deep water; its light pair is daylight caustics.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `30` | Intensity |
| `scale` | integer | 20–100 % | `50` | Caustic size |
| `rays` | boolean | — | `true` | Light rays |
| `interactive` | boolean | — | `true` | React to the pointer. The light shifts with the pointer |

## Schemes

The manifest declares `"schemes": ["dark"]` and `"pair": "daylight-caustics"`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`, `light`. A fixed `light` shows the pair.

## Pair

[`daylight-caustics`](../daylight-caustics/README.md) (Daylight caustics) draws the light scheme with the same role. In the `auto` theme mode it replaces this effect when the page is light.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
