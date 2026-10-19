# Glyph tide (`glyph-tide`)

A field of monospaced glyphs that a slow wave of light passes over.

- **Russian name:** Знаковый прилив
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** type
- **Role:** A field of glyphs with a wave: glyphs light up on dark and print darker on light.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `55` | Density. Share of filled cells |
| `charset` | choice | `hex`, `binary`, `digits`, `symbols` | `"hex"` | Characters |
| `size` | integer | 10–24 px | `14` | Glyph size |
| `interactive` | boolean | — | `true` | React to the pointer. Glyphs light up near the pointer |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Pair

None needed: the effect draws both schemes.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
