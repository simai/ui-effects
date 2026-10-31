# Digital rain (`digital-rain`)

Columns of glyphs run down a dark screen: a bright head with a glow and a fading trail whose glyphs change. Three depths: far ones small and slow, near ones large and out of focus.

- **Russian name:** Цифровой дождь
- **Version:** 0.1.0, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** type, particles
- **Role:** Technology, data, code. Dark scheme only.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `source` | choice | `javascript`, `html`, `terminal`, `easter`, `prose`, `custom`, `letters`, `hex`, `binary`, `digits`, `signs` | `"letters"` | Text |
| `text` | text | up to 600 characters | `""` | Own text. For «Own text»: sentences, or one per line |
| `language` | choice | `auto`, `en`, `ru` | `"auto"` | Words language. For «Words» |
| `palette` | choice | `green`, `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver` | `"green"` | Palette |
| `size` | integer | 10–28 px | `16` | Glyph size |
| `depth` | boolean | — | `true` | Depth. Far and near columns, the near ones out of focus |
| `interactive` | boolean | — | `true` | React to the pointer. Glyphs light up round the pointer; a click lets a sheaf of runs fall |

## Schemes

The manifest declares `"schemes": ["dark"]`, and `"capabilities": ["windows"]`.

Draws in the **dark** scheme only.

Theme modes a placement may choose: `auto`, `dark`.

## On a light page

In the `auto` theme mode the effect stays dark, and its area keeps `theme-dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
