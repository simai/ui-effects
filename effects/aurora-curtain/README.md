# Aurora curtain (`aurora-curtain`)

Glowing aurora curtains fold slowly over a dark starry sky.

- **Russian name:** Полярное сияние
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** glow, sky
- **Role:** A night sky with glowing curtains. The glow needs the dark, so it draws the dark scheme only.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `40` | Intensity |
| `curtains` | integer | 1–4 | `3` | Curtains |
| `interactive` | boolean | — | `true` | React to the pointer. Curtains lean towards the pointer |

## Schemes

The manifest declares `"schemes": ["dark"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## On a light page

In the `auto` theme mode the effect stays dark, and its area keeps `theme-dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
