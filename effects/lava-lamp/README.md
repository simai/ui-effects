# Lava lamp (`lava-lamp`)

The inside of a lava lamp: a dome of wax swells out of the warm pool at the bottom, stretches into a teardrop with a neck and pinches off, rises slowly, cools and rests under the top, then sinks and merges back into the pool. Lit from below, the wax is translucent: thick parts deeper, thin edges and necks glowing. A press sends a heat pulse.

- **Russian name:** Лава-лампа
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, sign-in
- **Tags:** lava, wax, retro
- **Role:** A warm, mesmerising background for a hero or sign-in: the wax drifts mostly on the centre-right and right and is faint over the text on the left. Dark is the home scheme; light shows a pale lit liquid with saturated wax.

## How it works

Like a real lamp, it shows a few big blobs (three by default) rather than many small drops. Blobs are sized by the area's height, which stands for the lamp's height, so a wide page keeps the proportions of a lamp; they keep mostly to the centre-right and right.

Each blob carries a temperature. Heat comes only from the bottom band, strongest over the "bulb" on the centre-right; above it the liquid is cool and coldest under the top. Buoyancy is the temperature minus the neutral point, and the speed follows it with a viscous lag, so the wax never bounces; bigger blobs move more slowly. Warm wax is held by the pool and swells as a dome or a column until it is hot enough to tear off; it rises, cools on the way, slows and flattens a little under the top, then sinks and joins the pool again. A cycle takes tens of seconds, and each blob has its own size, pace and lane, so the motion never repeats. Now and then a neck pinches off a small bead as a blob leaves the pool; the bead sinks back within seconds.

The shape is a metaball field: each blob is an ellipse stretched along its motion, longer behind than in front and slowly wobbling, so a rising blob trails a tail and a neck to the pool; touching blobs fuse smoothly. The field lives on a fine buffer (cells of at most 1.7 CSS px), and the wax surface is drawn from it with an edge anti-aliased to one cell, so the surface stays crisp (about 2 CSS px from 10 % to 90 %). Only the rows the wax can reach are shaded. A coarse buffer (about 38 000 cells) carries the liquid, lit warm from below, and the soft halo the wax casts into it. Both are scaled up with smoothing; if frames stay slow, both get coarser.

The wax is translucent and lit from within: in dark, the thick centres are deep red, a thin band near the edge is hot orange, a bright rim runs along the edge and the underside facing the bulb glows. In light, the wax is a saturated light orange with a lit edge.

A press sends a heat pulse: wax near the point swells at once and starts to rise; with none near, a new blob buds from the pool below the point and later melts back into it.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity: how strongly the wax and its glow show |
| `count` | integer | 1–8 | `3` | Number of blobs: how many big blobs of wax move in the lamp (a real lamp usually has two or three) |
| `size` | integer | 50–150 % | `100` | Blob size, relative to the area's height: at 100 % a blob is about a fifth of the height, as in a real lamp |
| `heat` | integer | 10–100 % | `50` | Heat: the hotter, the more often blobs tear off the pool, the higher they rise and the deeper the pool |
| `palette` | choice | `classic`, `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"classic"` | Palette. `classic` is warm orange wax in a deep violet liquid (dark) or a pale amber one (light); `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the pointer gently warms the wax nearby, so blobs swell and drift up; a press sends a heat pulse: the nearest blob swells and rises, or, with none near, a new one buds from the pool below the point |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **dark** (home, the default) and **light**. Each is designed from its own palette tones, not inverted: in dark, a deep liquid lit warm from below with dim, deep wax whose thin edges and underside glow; in light, a pale lit liquid (like the classic yellow-liquid lamps) with saturated, lighter wax.

The wax comes from the `primary` tones, the dark liquid from `tertiary`, the light liquid from `secondary`. The `classic` palette gives each family its own colour; the named palettes and `custom` give one hue to all three, so the lamp is one colour in a deeper liquid.

Theme modes a placement may choose: `auto`, `dark`, `light`.

While it moves, every mount lays new wax; the reduced-motion still frame is seeded and the same every time, already mid-cycle.

On a right-to-left page (`direction: rtl`) the whole picture is mirrored, so the wax keeps away from the text on the right; pointer and press land under the real pointer.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
