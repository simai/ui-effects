# Spacetime fabric (`fabric-grid`)

Gravitational waves run through the grid of spacetime, and bodies passing over it bend it by their mass; a click sends a wave of your own, and a star you set down ends as a black hole.

- **Russian name:** Ткань пространства-времени
- **Version:** 0.3.1, simai.effect 1.3.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** lines, geometry
- **Role:** Science and depth: light and dark schemes.

## What happens

- **The fabric.** A grid in perspective covers the whole area. A slow swell moves through it, and every few seconds a gravitational wave rings out in clean circles from a place of its own.
- **Passing bodies.** Now and then a body crosses the area along a curved path, from one side or from below to the other: a small planet, a ringed giant, a star, and every fifth time a big heavy one. Each sinks a well as deep as its mass, which travels with it. No more than two are in view at once. At the defaults a ringed giant is already on its way at the first frame.
- **A click** sends a wave from the point.
- **A press** sets a star down; the longer it is held, the heavier the star (a drag moves it). Let go, and the star lives on by itself: it grows for a few seconds, swells and flares once, then collapses into a black hole, a dark core in a thin bright ring at the bottom of a deep, narrow well, and the collapse rings out a strong wave. After about seven seconds the black hole evaporates, and the fabric relaxes. A few stars may live at once.
- **Reduced motion** draws one still frame: the fabric with the ringed giant at its seeded place (none with `bodies` off). No black hole is ever part of it.

Colours are palette tones of the theme (primary, secondary, tertiary and neutral), or of the fixed palette chosen.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `bodies` | boolean | — | `true` | Passing bodies. Planets and stars of different masses pass along an arc now and then, a big heavy one from time to time; each bends the grid |
| `frequency` | choice | `rare`, `normal`, `often` | `"normal"` | How often bodies pass: a new one about every 16–26 s, 6–11 s or 3.5–6.5 s, never more than two in view |
| `interactive` | boolean | — | `true` | React to the pointer. A click sends a gravitational wave. A press sets down a star that grows heavier while held; let go, and it grows, flares, collapses into a black hole and evaporates a few seconds later |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.3.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
