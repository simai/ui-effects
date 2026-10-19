# Daylight caustics (`daylight-caustics`)

A web of sunlit caustics, like light through water on a bright pool floor; a soft shader on a 2D canvas.

- **Russian name:** Солнечные блики
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, product
- **Tags:** water
- **Role:** Sunlit caustics on the floor; its dark pair is abyss caustics.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Light strength |
| `scale` | choice | `fine`, `medium`, `broad` | `"medium"` | Pattern scale |
| `tone` | choice | `primary`, `secondary`, `tertiary`, `ink` | `"primary"` | Colour |
| `interactive` | boolean | — | `true` | React to the pointer |
| `scheme` | choice | `light` | `"light"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## Pair

[`abyss-caustics`](../abyss-caustics/README.md) (Abyss caustics) draws the dark scheme with the same role. In the `auto` theme mode it replaces this effect when the page is dark.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
