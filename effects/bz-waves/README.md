# Chemical waves (`bz-waves`)

The Belousov–Zhabotinsky reaction: rings run through a dish and spirals keep turning; waves that meet wipe each other out.

- **Russian name:** Химические волны
- **Version:** 0.2.0, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** geometry, gradient
- **Role:** A calm living pattern: light and dark schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `interactive` | boolean | — | `true` | React to the pointer. A click starts a ring; a press-drag breaks the waves, and spirals are born there |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
