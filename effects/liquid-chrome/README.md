# Liquid metal (`liquid-chrome`)

Slow folds of dark liquid metal with narrow coloured highlights.

- **Russian name:** Жидкий металл
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, section
- **Tags:** material
- **Role:** A material that light moves over; its light pair is paper facets.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `60` | Reflection brightness |
| `scale` | integer | 1–5 | `3` | Wave size. 1 is broad folds, 5 is fine ripples |
| `interactive` | boolean | — | `true` | React to the pointer. The pointer presses a soft dent |
| `scheme` | choice | `dark` | `"dark"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## Pair

[`paper-facets`](../paper-facets/README.md) (Paper facets) draws the light scheme with the same role. In the `auto` theme mode it replaces this effect when the page is light.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
