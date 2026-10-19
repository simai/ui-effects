# Template effect (`template-dots`)

A minimal effect that follows every rule of simai.effect 1.1.0 and the
ui-effects theme policy. It is not in the catalogue. Copy it to start a new
effect; see [docs/AUTHORING.md](../../docs/AUTHORING.md).

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `50` | Number of dots |
| `size` | integer | 4–60 px | `24` | Largest dot radius |
| `interactive` | boolean | — | `true` | The dots lean towards the pointer |

## Schemes

Draws in both schemes: **dark** (home) and **light**, each from its own palette tones. The manifest declares `"schemes": ["dark", "light"]` and `"capabilities": ["windows"]`; the module reads the scheme from `context.scheme`, and a switch arrives as `update(settings, context)`.

## Pair

None needed: the effect draws both schemes.

## Files

- `effect.json`: the manifest.
- `index.js`: the module.
- `preview.png`: add a 640×360 still of the home scheme before the effect joins the catalogue.
