# Particle text (`particle-shapes`)

Particles in Brownian motion write a text and dissolve into gas again.

- **Russian name:** Узор частиц
- **Version:** 0.1.0, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** particles, type
- **Role:** A background that spells a product name: light or dark.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `size` | integer | 30–100 % | `100` | Text size. 100 % fits the text to the area |
| `text` | text | up to 80 characters | `"SIMAI"` | Text. Up to four lines |
| `style` | choice | `brownian`, `wind`, `swirl`, `snow` | `"brownian"` | Motion |
| `interactive` | boolean | — | `true` | React to the pointer. A click heats the particles round it, holding keeps heating |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
