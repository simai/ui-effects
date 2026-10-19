# Neon horizon (`neon-horizon`)

A neon perspective grid runs to a glowing horizon under sparse stars.

- **Russian name:** Неоновый горизонт
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** geometry, depth
- **Role:** Horizon and depth; its light pair is paper hills.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `50` | Intensity |
| `horizon` | integer | 20–70 % | `42` | Horizon height |
| `interactive` | boolean | — | `true` | React to the pointer. The vanishing point follows the pointer |

## Schemes

The manifest declares `"schemes": ["dark"]` and `"pair": "paper-hills"`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`, `light`. A fixed `light` shows the pair.

## Pair

[`paper-hills`](../paper-hills/README.md) (Paper hills) draws the light scheme with the same role. In the `auto` theme mode it replaces this effect when the page is light.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
