# Paper hills (`paper-hills`)

Layers of paper hills fade into the distance: in a light haze by day, under a dark sky by night.

- **Russian name:** Бумажные холмы
- **Version:** 2.0.1, simai.effect 1.1.0
- **Surfaces:** sign-in, hero, product
- **Tags:** paper, depth
- **Role:** Depth and space: light and dark schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 3–8 | `6` | Layers |
| `intensity` | integer | 0–100 % | `60` | Strength |
| `mood` | choice | `dawn`, `day`, `mist` | `"day"` | Mood |
| `interactive` | boolean | — | `true` | React to the pointer |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
