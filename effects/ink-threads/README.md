# Ink threads (`ink-threads`)

Fine threads of ink drift on a slow flow field and draw fading tails.

- **Russian name:** Чернильные нити
- **Version:** 1.0.0, simai.effect 1.0.0
- **Surfaces:** docs, sign-in, hero
- **Tags:** flow, lines
- **Role:** Threads in a flow field: ink on light, glowing fibres on dark.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–200 % | `100` | Speed, % |
| `density` | integer | 100–1200 | `450` | Threads |
| `intensity` | integer | 0–100 % | `50` | Ink strength |
| `trail` | integer | 8–40 | `22` | Tail length |
| `tone` | choice | `primary`, `secondary`, `tertiary`, `ink` | `"primary"` | Colour |
| `interactive` | boolean | — | `true` | React to the pointer |
| `scheme` | choice | `light`, `dark` | `"light"` | The scheme the effect is drawn in. Set by the placement, not by the user (see «Schemes»). |

## Schemes

Draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Pair

None needed: the effect draws both schemes.

## Files

- `effect.json`: the manifest (simai.effect 1.0.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
