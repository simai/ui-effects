# Data flow (`data-flow`)

The same data in any form: one set of records calmly regroups from a table to a board, a calendar, cards and back to the table. In flight a record is a softly glowing dot; landed, it becomes a row, a task card, an event or a tile, and the view's frame fades in behind it: the header, the columns, the grid of days. Records near the pointer move aside, and a click switches the view at once.

- **Russian name:** Поток данных
- **Version:** 0.1.0, simai.effect 1.4.0
- **Surfaces:** hero, section, sign-in
- **Tags:** data, views, table, board, calendar
- **Role:** A hero background for a product about data and view sets: the records live on the right, and the text on the left stays on a calm ground. Dark is the home scheme; light shows a pale ground with saturated records. On a phone the stage is larger, below the text.

## How it works

One data set: every record has a status (one of four), a day in a five-week month and an order. Each view lays the same records out its own way: the table as rows (two panes when the rows would get shorter than 30 px), the board as four status columns, the calendar as events on their days, the cards as a grid of tiles.

A view holds for about six seconds; then the records leave in a wave from the top left, each on its own curved path, shrink into glowing dots with a short soft tail, and land in the next view as its items. The frame of the view they leave fades out as they lift off; the next frame fades in as they land. With all four views a loop takes about 37 seconds at 100 % speed.

The stage sits on the right of a wide area (the left ~46 % is the text's and stays a calm gradient), at most as tall as it is wide, so in a tall area it stays smaller in the top right. On a phone it takes most of the width, low, under the text. The ground and the glows are drawn once per size, so a frame costs only the records and the frame lines.

## Settings

| Key | Type | Range or options | Default | Meaning |
|:---|:---|:---|:---|:---|
| `speed` | integer | 10–300 % | `100` | Speed |
| `intensity` | integer | 20–100 % | `100` | Intensity: how strongly the records, the views' frames and the light behind them show |
| `records` | integer | 8–40 | `20` | Records: how many records move from view to view; a long table splits into two panes so its rows stay tall |
| `views` | choice | `all`, `no-calendar`, `table-board`, `board-calendar` | `"all"` | Views that take turns: all four, table/board/cards, table and board, or board and calendar |
| `palette` | choice | `classic`, `theme`, `turquoise`, `ocean`, `violet`, `rose`, `emerald`, `sunset`, `gold`, `silver`, `custom` | `"classic"` | Palette. `classic` is the effect's own: indigo, teal and coral statuses with a neutral fourth on a deep indigo ground (dark) or a pale one (light); `theme` follows the theme colour; the others stay as they are |
| `colour` | color | hex | `"#3b82f6"` | Colour, read only while `palette` is `custom`: the effect builds every tone from it |
| `interactive` | boolean | | `true` | React to the pointer: records near the pointer move aside; a click switches to the next view at once |

## Schemes

The manifest declares `"schemes": ["dark", "light"]`, and `"capabilities": ["windows"]`.

Draws in both schemes: **dark** (home, the default) and **light**. Each is designed from its own palette tones, not inverted: in dark, a deep indigo ground with a soft light behind the stage, light items and bright dots in flight; in light, a pale ground with saturated items and darker dots in a coloured haze.

The statuses come from the `primary`, `secondary` and `tertiary` tones, the frames and the item details from a `primary` ink. The named palettes and `custom` give one hue to all three families, so the statuses differ by tone only.

Theme modes a placement may choose: `auto`, `dark`, `light`.

While it moves, every mount makes new records; the reduced-motion still frame is seeded and the same every time: a complete board (or the first view taking part, when the board does not).

On a right-to-left page (`direction: rtl`) the whole picture is mirrored, so the stage keeps away from the text on the right; the pointer reacts under the real pointer.

## Files

- `effect.json`: the manifest (simai.effect 1.4.0).
- `index.js`: the module, `mount(host, settings, context)`.
- `preview.png`: a still of the home scheme, 640×360.

SHA-256 values of these files are in [`catalogue/index.json`](../../catalogue/index.json).
