# Aurora curtain (`aurora-curtain`)

Glowing aurora curtains fold slowly over a dark starry sky.

- **Russian name:** Полярное сияние
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** glow, sky
- **Role:** A night sky with glowing curtains. The glow needs the dark; no light effect plays the same role, so it has no pair.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `40` | Intensity |
| `curtains` | integer | 1–4 | `3` | Curtains |
| `interactive` | boolean | — | `true` | React to the pointer. Curtains lean towards the pointer |
| `scheme` | choice | `dark` | `"dark"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## Pair

None. In the `auto` theme mode on a light page the effect stays dark, and its area keeps `theme-dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
