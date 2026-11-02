# Spacetime fabric (`fabric-grid`)

Gravitational waves run through the grid of spacetime, and bodies moving under Newtonian gravity bend it by their mass; a click sends a wave of your own, and a press held grows a star into a black hole that catches passing bodies.

- **Russian name:** Ткань пространства-времени
- **Version:** 0.4.1, simai.effect 1.3.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** lines, geometry
- **Role:** Science and depth: light and dark schemes.

## What happens

- **The fabric.** A grid in perspective covers the whole area. A slow swell moves through it, and every few seconds a gravitational wave rings out in clean circles from a place of its own.
- **Passing bodies.** Now and then a body enters from one side or from below with a velocity that carries it across an empty area: a small planet, a ringed giant, a star, and every fifth time a big heavy one. Each sinks a well as deep as its mass, which travels with it. No more than three are in view at once, and a body is dropped once it is well out of frame and heading away. At the defaults a ringed giant is already on its way at the first frame.
- **Gravity.** Motion is integrated, not drawn on fixed paths: every body attracts every other by Newton's law, with a softened distance (a = G·m / (r² + ε²) toward the mass), in small semi-implicit Euler steps with a clamped time step and a speed cap. Stars and black holes are fixed heavy attractors, a black hole about three and a half times as heavy as the full-grown star it came from. Near them radial motion is gently damped, so a body coming close bends, swings round or settles into an orbit instead of flying through; one that crosses a black hole's horizon is swallowed with a small flash and a wave. While a black hole is in view, the next body enters on its side and heads past it.
- **A click** (a short press, under a quarter second and barely moving) sends a wave from the point, and nothing else.
- **Press and hold** grows a star under the pointer (a drag moves it): it gains mass for about a second and a half, swells and flares, and after about three seconds of holding collapses into a black hole, a dark core in a thin bright ring at the bottom of a deep, narrow well, with a strong wave. Let go before the collapse, and the star fades where it is; after it, the black hole stays when released. Passing bodies are pulled in while it lives; after about eighteen seconds it evaporates, the fabric relaxes and any body in orbit flies off along its last heading. Up to three stars or black holes live at once.
- **Reduced motion** draws one still frame: the fabric with the ringed giant at its seeded place (none with `bodies` off). No star or black hole is ever part of it. The scene is seeded: no `Math.random`, the same first frame on every mount.

Colours are palette tones of the theme (primary, secondary, tertiary and neutral), or of the fixed palette chosen.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `palette` | choice | `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"theme"` | Palette. `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `bodies` | boolean | — | `true` | Passing bodies. Planets and stars of different masses come in from an edge now and then, a big heavy one from time to time; they attract each other, bend the grid and fall into orbit around a heavy star or black hole |
| `frequency` | choice | `rare`, `normal`, `often` | `"normal"` | How often bodies pass: a new one about every 16–26 s, 6–11 s or 3.5–6.5 s (the first soon after a black hole forms), never more than three in view |
| `interactive` | boolean | — | `true` | React to the pointer. A click sends a gravitational wave. Press and hold: a star grows under the pointer, flares and collapses into a black hole that pulls passing bodies into orbit or swallows them, then evaporates |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **dark** (home, the default) and **light**. Each scheme is designed from its own palette tones; it is not an inverted picture.

Theme modes a placement may choose: `auto`, `dark`, `light`.

## Files

- `effect.json`: the manifest (simai.effect 1.3.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
