# Colour haze (`mist-gradient`)

Soft colour fields drift into one another like haze.

- **Russian name:** Цветная дымка
- **Version:** 2.1.2, simai.effect 1.3.0
- **Surfaces:** sign-in, hero, docs, dashboard, product
- **Tags:** gradient
- **Role:** A calm colour gradient for any theme: light and dark schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Saturation |
| `palette` | choice | `theme`, `warm`, `cool`, `mono`, `custom` | `"theme"` | Palette |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `grain` | boolean | — | `true` | Paper grain |
| `interactive` | boolean | — | `true` | React to the pointer |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.3.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
