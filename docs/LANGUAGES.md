# Languages of effects.simai.io

How the catalogue site is translated and how a visitor switches language. Other SIMAI sites can follow the same pattern.

## The languages

Eight, in this order (the order of the menu):

| Code | Folder | Name in the menu | Second line |
| --- | --- | --- | --- |
| `en` | `en/` | English | — |
| `ru` | `ru/` | Русский | Russian |
| `es` | `es/` | Español | Spanish |
| `pt-BR` | `pt-br/` | Português (Brasil) | Portuguese (Brazil) |
| `de` | `de/` | Deutsch | German |
| `zh-CN` | `zh-cn/` | 简体中文 | Chinese (Simplified) |
| `fr` | `fr/` | Français | French |
| `ja` | `ja/` | 日本語 | Japanese |

English is the default and the fallback: a string or a catalogue text missing in a language is shown in English.

## The pages

- The site is built once per language, each in its own folder (`scripts/build-site.mjs`, `LOCALES`). Strings live in `site/i18n/<code>.json`, one file per language with the same keys; `lang.name` is the language named in itself, `lang.english` its English name.
- Effect names, descriptions, settings and categories come from the manifests and `catalogue/categories.json`, which carry all eight languages.
- Every page sets `<html lang>` and lists the same page in every language as `<link rel="alternate" hreflang>`.
- The root holds only redirects (the gallery, `authors/`, every `effect/<id>/`, so old links keep working). Each goes to the same page in the language the visitor chose before (kept in `localStorage` as `ui-effects-lang`), else the first browser language the site has (matched by its main subtag too: `pt` → `pt-BR`, `zh` → `zh-CN`), else English. Without scripts it goes to English.

## The switcher: standard SIMAI Framework parts only

There is no dedicated language-switcher component; the switcher is made of three standard parts:

1. **`sf-header-site`**: the switcher sits in its `tools` slot, beside the colour and theme controls.
2. **An icon button** (`sf-icon-button`, size 1/2, link appearance) with the `language` icon, `aria-haspopup="menu"`, named in the page language ("Language", "Язык", …).
3. **`sf-menu-context`** (`popup`), given its `entries` and opened by `toggleFor(button)`. One entry per language:

   ```js
   {id: 'ru', text: 'Русский', caption: 'Russian', lang: 'ru', href: '../ru/', current: false}
   ```

   - `text`: the language named in itself; `lang` tells the browser and screen readers what language that label is in.
   - `caption`: the English name on a second line, left out for English itself.
   - `href`: makes the row a link to the same page in that language.
   - `current`: marks the page's own language.

The wiring is a few lines in `site/assets/common.js`; the entries are written into the page at build time (`languageMenu` in `scripts/build-site.mjs`).
