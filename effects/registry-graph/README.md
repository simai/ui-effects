# Registry galaxy (`registry-graph`)

The parts of SIMAI Framework as the stars of a spiral galaxy. The more a part is used, the nearer the centre; the more links it has, the bigger its star; its family gives its colour. Hover a star and only its name and its links appear; a click opens the part's docs page in the page language; press and hold zooms in.

- **Russian name:** Галактика реестра
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section
- **Tags:** registry, graph, sky
- **Role:** The docs home hero (owner decisions C375 and C377, 2026-11-19). A night panel in both themes: the glow of a galaxy needs darkness.

## Data

The effect asks the network for nothing (the catalogue rule): it reads the registry from the page. The page holds the pair's registry export in a JSON script, and the `source` setting names its id:

```html
<script type="application/json" id="registry-graph">{"schema": "simai.registry-graph", "version": 1, ...}</script>
<sf-effect effect="registry-graph" source="registry-graph">…</sf-effect>
```

The export (`simai.registry-graph`, version 1):

| Field | Meaning |
|:---|:---|
| `pair` | The pair the registry was read from, `ui-<12 hex>` |
| `families` | `["core", "utility", "component", "smart"]` |
| `nodes[]` | `{name, family, docs, langs}`; `docs` is the part's docs path without a language (`smart/navigation/menu/`); `langs` lists the languages that have the page, the first being the fallback (`["ru", "en"]`, default `["ru"]`) |
| `edges[]` | `[user, used]`: indexes into `nodes`; the part `user` uses the part `used` |

Nothing else is counted in the data: how often a part is used and how many links it has come from `edges`. The core is placed in the bulge as used by every part, without edges. Until the pair publishes the export, the catalogue page embeds a copy of the prototype's data (pair ui-dc9fc39aeb26: 395 parts, 640 links; `site/data/registry-graph.json`, written into the page by `scripts/build-site.mjs`). Without data the effect draws the sky and the bulge only.

After the source script the effect writes a visually hidden list of links to the parts (most used first), for screen readers; a link that takes keyboard focus lights its star with its links, and on a focused link `+`, `−`, `0` and the arrows zoom and pan. Several placements on one source share one list.

## How it works

- **Place:** parts are sorted by how often they are used (`radiusBy`), the core first; the rank sets the radius (`0.12 + 0.86·t^0.9`, with a little jitter). Each part lies on one of two main and two weak logarithmic arms (pitch 16°) chosen from a hash of its name, so the picture is stable; Smart and component parts sit on the arm crest, utilities spread wider.
- **Size:** `1.2 + 1.15·√(links)` px, at most 9 (`sizeBy`).
- **Colour:** star temperature by family from the palette: core amber (the bulge), Smart blue-white, components pale cyan, utilities red-orange dust.
- **Sky:** a bulge glow, nebulae along the arms tinted by the families nearby, dust lanes on the inner edge of the main arms, three parallax layers of distant stars and a light twinkle on a few of them. Nebulae and dust are drawn once into three rings of the galaxy plane, and each ring turns with its mean speed.
- **Cache:** the sky gradient, the three field layers and the three nebula rings are composed into one backdrop at device resolution and redrawn only when the parallax, the view or a ring's turn moves (a ring turns in steps of 1.5 device pixels at its rim, invisible in the soft nebulae); other frames copy it once.
- **Turn:** one turn in `rotation` seconds (360 by default); the middle runs ahead and falls back within a bound, so the arms never wind up.
- **Crisp stars:** each core is a disc cached at device resolution per family and quarter-pixel radius and copied 1:1 onto whole device pixels; a tight halo (at most 4.5 core radii, 5.5 when lit) from a 64 px sprite that is only ever drawn smaller; the eight most linked parts get diffraction rays one device pixel wide. Zoom redraws the cores at their new radius.
- **Hover:** hover, keyboard focus or the first touch tap shows only the part's name and draws that star's links: thin lines that fade in, with light running from the used part to the part that uses it; the rest dims. Leaving takes it all away. Past ×2.2 the biggest visible stars get their names (40 at most, none over the text side). Nothing in the scene is a number.
- **Click:** opens `/<lang>/<docs>` in the page language (`lang` of the nearest element) when the part lists it in `langs`, else in the first of `langs`; one export and one banner serve every language, and once the docs site falls back to Russian by itself the pair may list every language, at `hrefPattern` with `{path}` replaced. The effect first sends `registry-graph-open` (bubbles, cancelable, `detail: {name, url}`) from its host; a page that cancels it opens the page itself. On touch the second tap on the same star opens.
- **Zoom:** press and hold (260 ms mouse, 380 ms touch) zooms smoothly toward the pointer, which steers; release eases back. Ctrl or ⌘ + wheel and a pinch zoom, a drag pans a zoomed view, a double-click resets.

The galaxy sits right of centre in a wide area (the text side stays calm), lower and centred in a narrow one; on a right-to-left page it moves to the left. The host takes no pointer events: the effect listens on the window and ignores presses on links, buttons and fields. Reduced motion draws one still frame; frames stop off screen and on a hidden tab; the canvas is at most twice the CSS size.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `source` | string | up to 120 | `"registry-graph"` | Data source: the id of the page's JSON script with the registry export |
| `layout` | choice | `galaxy`, `constellation` | `"galaxy"` | Layout: a spiral galaxy, or rings by the same radius without arms and dust |
| `arms` | choice | `2+2`, `2`, `4` | `"2+2"` | Arms, while `layout` is `galaxy`: two main and two weak, two, or four equal |
| `pitch` | integer | 8–30 ° | `16` | Arm pitch, while `layout` is `galaxy` |
| `radiusBy` | choice | `usedBy`, `degree` | `"usedBy"` | Nearer the centre: the more it is used, or the more links |
| `sizeBy` | choice | `degree`, `usedBy` | `"degree"` | Bigger: the more links, or the more it is used |
| `colourBy` | choice | `family`, `theme` | `"family"` | Star colour: by family, or the theme colour for all |
| `layers` | string | up to 120 | `"bulge nebula dust field twinkle bloom spikes names"` | Layers, space-separated; leave one out to turn it off |
| `rotation` | integer | 0–1200 s | `360` | One turn; 0 stops the turn |
| `interactive` | string | up to 40 | `"hover click hold"` | Response: `hover` name and links, `click` the docs page, `hold` zoom (with wheel, pinch, keys) |
| `hrefPattern` | string | up to 200 | `"https://ui.simai.io{path}"` | Page address; `{path}` is the part's docs path in the page language |
| `intensity` | integer | 20–150 % | `80` | Nebula brightness |

## Schemes

The manifest declares `"schemes": ["dark"]` and `"capabilities": ["windows"]`. Draws in the **dark** scheme only: on a light page, in the `auto` theme mode, the effect stays dark and its area keeps `theme-dark` (the night panel in both themes). A day «atlas» sky was prototyped and is not built.

Theme modes a placement may choose: `auto`, `dark`.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
