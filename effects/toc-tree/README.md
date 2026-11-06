# Contents tree (`toc-tree`)

A thin table-of-contents tree, as in documentation navigation, rests on the right; its branches slowly open and close.

- **Russian name:** Оглавление
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** docs, navigation, tree
- **Role:** A calm background for documentation and reference sections: the tree keeps to the right and stays faint, text on the left reads easily. Works in both schemes.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity of the drawing |
| `depth` | integer | 2–4 | `3` | Depth: nesting levels of the tree |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the item nearest the pointer lights up with its path from the root and its branch opens; a click opens or closes the nearest branch |

## Schemes

The manifest declares `"schemes": ["light", "dark"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
