# Daylight caustics (`daylight-caustics`)

A web of sunlit caustics, like light through water on a bright pool floor; a soft shader on a 2D canvas.

- **Russian name:** Солнечные блики
- **Version:** 1.2.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, product
- **Tags:** water
- **Role:** Sunlight playing on the bottom.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Light strength |
| `scale` | choice | `fine`, `medium`, `broad` | `"medium"` | Pattern scale |
| `tone` | choice | `primary`, `secondary`, `tertiary`, `ink` | `"primary"` | Colour |
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
