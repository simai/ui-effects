# Drone show (`drone-show`)

A drone light show in the night sky: about a thousand lights take off from the ground and form 3D figures: a bird, a whale, a jellyfish, a flower, the Earth, a ringed planet, a galaxy and a heart. Each figure lives (flaps, swims, pulses, blooms, spins, beats) and turns as one whole in perspective while colour waves run across it; then the swarm flows into the next figure, each drone to a near target. The pointer tilts the figure, a drag rotates it, a click scatters the drones.

- **Russian name:** Шоу дронов
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, sign-in
- **Tags:** drones, light-show, sky
- **Role:** A spectacular dark background for a hero, a section or sign-in: the figure stays on the right, and the lights are faint over the text on the left. Dark only: this is emitted light.

## How it works

Each drone is a small glowing point (a pre-rendered glow sprite per colour step, drawn with `drawImage`). The figures are 3D point sets from parametric formulas, sampled evenly, and drawn in perspective: nearer drones are larger and brighter, farther ones smaller and dimmer, and the far ones are drawn first. A sphere (the Earth, the planet) is shaded and hides or dims its far side. Every drone hovers very slightly.

The figures and their life:

- **Bird:** a gull glides, then flaps; its swept wings bend more at the tips, the body bobs.
- **Whale:** a humpback swims; its body waves down to the flukes, its long pectoral fins spread.
- **Jellyfish:** the bell pulses and rises; frilly arms and long tentacles trail and sway.
- **Flower:** two layers of petals open out of a bud around amber stamens, on a stem with a leaf.
- **Earth:** a dotted globe spins on its tilted axis; land is bright, the ocean faint; no borders.
- **Planet:** a banded planet in a tilted ring with a gap; the ring particles orbit, inner ones faster.
- **Galaxy:** a warm core and two spiral arms turn, inner stars faster.
- **Heart:** beats (lub, dub, rest) and turns to show its round depth.

Each figure also turns or swings as one whole, so its depth reads. The order is seeded and never shows the same figure twice in a row.

A cycle opens as a real show does: the drones rise in a staggered line from below into the first figure. Each figure then holds for about 7.5 s and the swarm flies on for about 4 s. As in real shows, which assign drones to targets by minimal distance, each drone takes a near target: both the drones and the next figure's points are ordered by height in bands, each band by x, and drone k takes target k. Departures are staggered from the top, paths are eased and lift a little and step aside in depth, so the swarm flows instead of scrambling.

The figure sits centre-right in a wide area, so the left part stays calm for a heading; drones that cross it are faint. In a tall area the figure is smaller, in the upper right. On a right-to-left page (`direction: rtl`) the whole picture is mirrored; pointer, drag and click land under the real pointer.

While it moves, every mount shows a new order of figures; the reduced-motion still frame is seeded and the same every time: the ringed planet (the whale when only nature is chosen), whole.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `80` | Intensity: how bright the drones are |
| `drones` | integer | 30–150 % | `100` | Number of drones: 100 % is about a thousand (300 to 1500) |
| `size` | integer | 50–150 % | `100` | Figure size |
| `figures` | choice | `all`, `nature`, `space` | `"all"` | Figures: all; nature (bird, whale, jellyfish, flower, heart); space (Earth, planet, galaxy) |
| `palette` | choice | `show`, `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"show"` | Palette. `show` is a real show's: ice cyan and white with warm amber and rose accents; `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: the figure turns gently towards the pointer; press and drag to rotate it; a click scatters the drones from the point, and they gather again |

## Schemes

The manifest declares `"schemes": ["dark"]` and `"capabilities": ["windows"]`.

Dark only: the drones are emitted light on a deep night-sky gradient with a very faint field of stars. Colours come from palette tones: the sky from `neutral` and `primary`, the drones from a ramp of `primary` (cyan and white), `secondary` (amber) and `tertiary` (rose). The named palettes and `custom` give one hue to all three, so the show is one colour.

Theme modes a placement may choose: `auto`, `dark`. On a light page in `auto` the area stays dark and takes `theme-dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
