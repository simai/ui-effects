# Assembly (`assembly`)

Dots fall from above, join with lines and build a button or a page, a house or a rocket; the shape comes alive for a moment and flows into the next.

- **Russian name:** Сборка
- **Version:** 0.2.0, simai.effect 1.1.0
- **Surfaces:** hero, section, docs
- **Tags:** geometry, interface
- **Role:** A banner about building an interface from small parts, for documentation and the story of a component system. It has a light and a dark scheme.

One shape at a time gathers in the right part of a wide area, so the left part stays calm for a heading. In a tall area the shape is smaller and softer, in the upper right corner. On a right-to-left page (`dir="rtl"` on the area or above it) the shape takes the left side instead and reads the other way (the SIMAI mark stays as it is), so it never sits under the text.

Each cycle runs in five steps:

1. The atoms (dots in the theme's colours, larger at corners and joints) take their places. The first shape's atoms fall in from above; later ones glide over from the shape before, those it needs more of fall in, and those left over drop away. Each atom clicks into place with a small ring.
2. Lines draw themselves between them.
3. The shape comes alive for a moment: a switch flips, a button is pressed, a field is typed into, the bars of a chart grow, a form gets its ticks, a page scrolls, a profile nods, the card's sun rises; a heart beats, a cat moves its ears and blinks, a rocket lifts off with a flickering flame, a bulb and a star glow, a tree sways, a boat rocks, the house lights its window and smokes; the SIMAI mark pulses.
4. The shape holds, breathing a little.
5. The lines fade, and the atoms move on to the next shape.

The shapes come in a seeded order:

- **Interface parts:** a card, a button, a chart, a switch, a form, a field, a page, a profile.
- **Pictures:** a house, a tree, a rocket, a bulb, a boat, a heart, a cat, a star.
- **The SIMAI mark:** every seventh shape.

The still frame for reduced motion is the first shape, whole: a card, or a house when only pictures are chosen.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `80` | Intensity |
| `size` | integer | 40–140 % | `100` | Shape size |
| `shapes` | choice | `mix`, `interface`, `objects` | `"mix"` | What is built: interface parts and pictures, interface only, or pictures only |
| `interactive` | boolean | — | `true` | React to the pointer. The dots lean towards it; a click knocks them apart, and they spring back |

## Schemes

The manifest declares `"schemes": ["light", "dark"]` and `"capabilities": ["windows"]`.

The effect draws in both schemes: **light** (home, the default) and **dark**. Each scheme is designed from its own palette tones; it is not an inverted picture.

A placement may choose the theme mode `auto`, `light` or `dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.1.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

The SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
