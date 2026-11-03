# sf-effect

An animated background drawn under its own content: the one element of the
component set `effects`.

```html
<script src="https://cdn.jsdelivr.net/npm/@simai-studio/ui@<v>/distr/core/js/core.min.js" data-sf-sets="effects"></script>
<sf-effect effect="aurora-curtain" speed="40">
  <h1>Content stays above the effect</h1>
</sf-effect>
```

| Attribute | Values | Default |
|---|---|---|
| `effect` | a catalogue id, or the https address of an `effect.json` (runs only in a sandbox) | none |
| `theme` | `auto`, `dark`, `light` | `auto`, follows the page |
| `windows` | present, or a selector for the cards | off; cards are `[data-sf-effect-window]` children |
| `paused` | present | off |
| `about` | `false` turns the about menu off | on |
| `settings` | a JSON object of settings; single attributes win | `{}` |
| `<setting>` | each manifest key in kebab-case, for example `link-distance` | the manifest's default |
| `setting-<key>` | any setting, also one whose name is a global or reserved attribute | |

Events: `sf-effect-ready` `{effect, version, scheme, resolution, sandboxed,
invalid}`, `sf-effect-failed` `{effect, kind, reason, ...}`,
`sf-effect-motion` `{paused, source}`.

Methods and properties: `pause()`, `resume()`, `update(settings)`, `ready`,
`manifest`, `placement`.

Scripts read the engine with `await SF.package('effects')`: the same functions
SIMAI Framework Core's `SF.Effects` held (`mountEffect`, `loadEffect`,
`placeEffect`, `checkEffectManifest`, ...).

A person who asked for less motion sees one still frame; nothing is drawn in a
hidden tab; the layer is out of the accessibility tree and the pointer's way.
