# Chladni figures (`chladni`)

Sand on a singing plate gathers on the lines that stay still; the note changes, and the figure breaks up and forms a new one.

- **Russian name:** Фигуры Хладни
- **Version:** 0.1.1, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** particles, geometry
- **Role:** From chaos to order: documentation, builds, structure. Light and dark schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `transparency` | integer | 0–95 % | `70` | Sand transparency |
| `density` | integer | 10–100 % | `30` | Density |
| `palette` | choice | `graphite`, `brass`, `lightbox`, `ink` | `"graphite"` | Palette |
| `interactive` | boolean | — | `true` | React to the pointer. The pointer stirs the sand, a click changes the note |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
