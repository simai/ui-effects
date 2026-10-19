# Paper facets (`paper-facets`)

A crumpled sheet of triangular facets; light circles it slowly, and the folds catch and lose it.

- **Russian name:** Бумажные грани
- **Version:** 1.1.0, simai.effect 1.1.0
- **Surfaces:** hero, product, sign-in
- **Tags:** paper, geometry
- **Role:** Crumpled paper with light moving round the facets; its dark pair is liquid metal.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `intensity` | integer | 0–100 % | `50` | Relief depth |
| `facet` | choice | `large`, `medium`, `small` | `"medium"` | Facet size |
| `tint` | choice | `paper`, `primary` | `"paper"` | Paper |
| `interactive` | boolean | — | `true` | React to the pointer |

## Schemes

The manifest declares `"schemes": ["light"]` and `"pair": "liquid-chrome"`, and `"capabilities": ["windows"]`. The module reads the scheme it draws in from `context.scheme`; a switch arrives as `update(settings, context)`.

Draws in the **light** scheme only.

Theme modes a placement may choose: `auto`, `light`.

## Pair

[`liquid-chrome`](../liquid-chrome/README.md) (Liquid metal) draws the dark scheme with the same role. In the `auto` theme mode it replaces this effect when the page is dark.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
