# Guilloche (`guilloche`)

Security-paper engraving: rosettes and bands of fine curves whose phase shifts slowly.

- **Russian name:** Гильош
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** dashboard, product, sign-in
- **Tags:** lines, print
- **Role:** Guilloche: security paper on light, an engraving on a dark banknote on dark.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 18–72 | `36` | Lines |
| `intensity` | integer | 0–100 % | `50` | Strength |
| `pattern` | choice | `rosettes`, `bands`, `mesh` | `"mesh"` | Pattern |
| `tone` | choice | `primary`, `secondary`, `tertiary`, `ink` | `"primary"` | Colour |
| `interactive` | boolean | — | `true` | React to the pointer |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Pair

None needed: the effect draws both schemes.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
