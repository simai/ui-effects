# Arrow field (`arrow-field`)

The surface is a grid of one glyph (an arrow, a cross, a plus, a dash, a chevron, a triangle or a compass needle). The glyphs turn toward the pointer like compass needles, with a little overshoot, near ones first and far ones later, so a turn spreads as a wave; near the pointer they grow and brighten as under a lens. Without a pointer the field drifts in a slow wind and follows an unseen wanderer. A press sends a ring wave, and every glyph it passes makes a full turn.

- **Russian name:** Поле стрелок
- **Version:** 0.2.0, simai.effect 1.4.0
- **Surfaces:** hero, section, sign-in, dashboard
- **Tags:** arrows, field, pointer
- **Role:** A calm, playful background that answers the pointer, for a hero, a section or a sign-in: the glyphs are full on the centre-right and right and faint over the text on the left. Dark is the home scheme; light prints the glyphs in deeper ink on a pale ground.

## How it works

The glyphs sit on a square or staggered grid; the cell is about 34 CSS px at 100 % and never so small that the grid passes about 2400 glyphs.

Each glyph has an angle and an angular speed and turns on a damped spring (damping ratio 0.3), so it swings past its target a little and settles, like a compass needle. Its target blends two directions by the glyph's nearness to an attractor (a Gaussian falloff over about a third of the diagonal, never below 14 %):

- **the wind:** a smooth, slowly moving two-octave noise field of angles, so the idle field drifts in broad, calm currents;
- **the attractor**, by the chosen behaviour: toward it, away from it, across it (a whirlpool), or along the field lines of a magnetic dipole at the attractor whose axis turns slowly.

The behaviour `curie` replaces both with magnetic domains. Each glyph carries a spin, one of four directions, on the glyph lattice (periodic edges): the four-state Potts model, updated by heat-bath steps (about six sweeps a second). The magnet is heated and cooled on a slow loop (about 70 s) around the critical temperature 1/ln 3. Cold, domains grow and merge into a few large ones; at the Curie point they split into areas of every size, with the power-law spread of a critical system; a little above it they melt into ripple. The pointer heats the magnet locally and a press sends a heat burst that melts the domains around it, so they re-form as it cools. Glyphs follow their spin on the same spring, with a breath of the wind, so domain walls ripple as spins flip. The still frame is the lattice settled at the critical point.

The spring is stiffer near the attractor, so near glyphs turn first and the turn spreads outward as a wave. The attractor is the pointer while it is over the area; when it leaves, the attractor glides back to an unseen wanderer on a slow Lissajous path over the centre-right and right, with a weaker pull. Touch does not steer the field.

Near the pointer, glyphs grow by up to 45 % and brighten, and a faint glow lies under it. A press sends a ring that crosses the area in about two seconds; every glyph it passes makes one full eased turn on top of its own motion.

With **colour by direction** on, a glyph's colour follows its angle through the three families (`primary`, `tertiary`, `secondary`), so glyphs turned the same way share a shade and patches of colour drift over the field; off, all glyphs take one colour. Each colour step is a pre-drawn sprite at the lens's largest scale; every glyph is one `drawImage` under its own transform.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity: how strongly the glyphs show |
| `glyph` | choice | `arrow`, `cross`, `plus`, `dash`, `chevron`, `triangle`, `needle` | `"arrow"` | Glyph: the one sign the grid is made of |
| `mode` | choice | `face`, `away`, `orbit`, `magnet`, `curie` | `"face"` | Behaviour: how the glyphs turn: toward the pointer, away from it, across it as a whirlpool, along a magnet's field lines, or as magnetic domains at the Curie point (the magnet slowly heats and cools; the pointer and a press heat it) |
| `size` | integer | 50–200 % | `100` | Glyph size: larger glyphs make a sparser grid |
| `grid` | choice | `square`, `offset` | `"square"` | Grid: square or staggered |
| `hues` | boolean | | `true` | Colour by direction: glyphs turned the same way share a shade, so patches of colour drift across the field; off, one colour |
| `palette` | choice | `spectrum`, `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"spectrum"` | Palette. `spectrum` gives blue, teal and violet; `theme` follows the theme colour; the others give one hue in several shades |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the glyphs turn by the chosen behaviour and grow larger and brighter near the pointer, as under a lens; a press sends a wave, and every glyph it passes makes a full turn. Without a pointer the field drifts in a slow wind and follows an unseen wanderer |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **dark** (home, the default) and **light**. Each is designed from its own palette tones, not inverted: in dark, light glyphs (tones 60–80) on a deep ground from `neutral-5` toward `primary-10`; in light, deeper ink (tones 40–50) on a pale ground from `neutral-98` toward `primary-95`.

Theme modes a placement may choose: `auto`, `dark`, `light`.

While it moves, every mount lays a new wind; the reduced-motion still frame is seeded and the same every time, with the field turned toward the wanderer.

On a right-to-left page (`direction: rtl`) the whole picture is mirrored, so the quiet side stays under the text on the right; the glyphs still turn toward the real pointer.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
