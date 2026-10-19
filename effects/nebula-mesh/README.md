# Nebula mesh (`nebula-mesh`)

Large patches of theme colour drift slowly over a near-black ground with fine grain.

- **Russian name:** Глубинный градиент
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** gradient
- **Role:** A deep mesh gradient; its light pair is morning mist.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `60` | Intensity |
| `blobs` | integer | 3–7 | `5` | Blobs |
| `grain` | integer | 0–100 % | `35` | Grain |
| `interactive` | boolean | — | `true` | React to the pointer. A soft glow follows the pointer |

## Schemes

The manifest declares `"schemes": ["dark"]` and `"pair": "mist-gradient"`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## Pair

[`mist-gradient`](../mist-gradient/README.md) (Morning mist) draws the light scheme with the same role. In the `auto` theme mode it replaces this effect when the page is light.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
