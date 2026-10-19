# Light conduits (`hex-conduits`)

Pulses of light run along the edges of a hexagonal grid and leave fading trails.

- **Russian name:** Световоды
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, section, dashboard
- **Tags:** geometry, lines
- **Role:** A grid with running pulses: light conduits on dark, a circuit drawing on light.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `density` | integer | 10–100 % | `50` | Density. How many pulses run |
| `cell` | integer | 24–96 px | `44` | Cell size |
| `interactive` | boolean | — | `true` | React to the pointer. Pulses drift towards the pointer |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
