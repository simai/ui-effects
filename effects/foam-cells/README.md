# Foam cells (`foam-cells`)

A cellular pattern with soft walls, like soap foam or living tissue; the cell centres wander.

- **Russian name:** Пена
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** hero, sign-in, product
- **Tags:** organic
- **Role:** Soap foam on light. It has no dark pair, so it is not shown on a dark page.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 40–160 px | `80` | Cell size, px |
| `intensity` | integer | 0–100 % | `50` | Strength |
| `style` | choice | `membranes`, `pebbles`, `both` | `"both"` | Style |
| `tone` | choice | `primary`, `secondary`, `tertiary`, `ink` | `"primary"` | Colour |
| `interactive` | boolean | — | `true` | React to the pointer |

## Schemes

The manifest declares `"schemes": ["light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## Pair

None. In the `auto` theme mode on a dark page the effect is not shown; its area is a plain dark surface.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
