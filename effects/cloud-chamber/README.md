# Cloud chamber (`cloud-chamber`)

Particle tracks in mist: short thick alpha tracks, long curling electrons, a rare muon right across; each track flashes in and melts away.

- **Russian name:** Камера Вильсона
- **Version:** 0.1.1, simai.effect 1.1.0
- **Surfaces:** hero, section, dashboard, sign-in
- **Tags:** lines, particles
- **Role:** Science, precision, connections: a minimal dark background. Dark scheme only.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 10–100 % | `70` | Intensity |
| `density` | integer | 10–100 % | `50` | Density |
| `field` | boolean | — | `true` | Magnetic field. Electrons curl into spirals |
| `interactive` | boolean | — | `true` | React to the pointer. The pointer is a radioactive sample, a click is a particle shower |

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
