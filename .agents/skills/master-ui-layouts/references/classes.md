# The layout classes

Eight stylesheets in `packages/ui/layouts/` hold what utilities cannot say: two frames, `page` and `shell`, documented with the pages, and six that arrange a room, documented in the components' `Layouts` category. Each has a contract beside it, compiles in `@layer components` after every component, and declares no material: `packages/ui/tests/master.test.ts` fails a layout stylesheet that declares `background`, `background-color`, `background-image`, `box-shadow`, `border-radius`, `corner-shape`, `backdrop-filter` or `filter`.

Read the stylesheet before writing about a class. The numbers below are the ones a page most often gets wrong.

## `page`

A flex column at least as tall as the viewport: `min-height: 100vh`, then `100dvh` where the unit is known. Nothing else.

- The main region takes `grow(1)`, which keeps a footer at the foot of a short page.
- The document scrolls. A sticky header inside it is a `navbar`, not something `page` does.
- Why it is a class: the preset has no `dvh` height.

## `shell` and its regions

A grid of three rows (header, columns, footer) and three columns (sidebar, main, aside), and a size container named `shell`.

| Class | Does |
| --- | --- |
| `shell` | The grid. The document scrolls; the columns' row is at least the viewport under the header |
| `shell-fixed` | The shell is the viewport, `100dvh` with `overflow: hidden`: the page never moves and `shell-main` scrolls by itself |
| `shell-header` | Spans the shell in the first row. Its presence sets `--shell-top` to `--shell-header`, through `:has()` |
| `shell-sidebar`, `shell-aside` | Sticky under the header, `--shell-room` tall, each with a scroll of its own, `overscroll-behavior: contain` and a foot clear of the home indicator |
| `shell-main` | The column that is left, `min-width: 0` |
| `shell-footer` | Spans the shell under the columns |
| `shell-toggle` | Shown only while the sidebar is away |

| Property | Default | Is |
| --- | --- | --- |
| `--shell-sidebar` | `16rem` | Width of the sidebar |
| `--shell-aside` | `14rem` | Width of the aside |
| `--shell-header` | `3.5rem` | The room the header takes; the sticky regions start under it |

Thresholds are of the shell's own width, not the viewport's:

- Below **64rem** the aside leaves.
- Below **48rem** the sidebar leaves and `shell-toggle` appears. The shell does not make a drawer: put the same navigation in a `dialog dialog-drawer dialog-drawer-start` that the toggle opens.

Why it is a class: `dvh` heights, the safe-area inset, sticky columns with their own scroll, and two container thresholds.

## `auto-grid`

`repeat(auto-fill, minmax(min(100%, var(--auto-grid-min)), 1fr))` with a `1rem` gap.

- `--auto-grid-min` is `16rem`: no column is narrower, and none is wider than the grid, which is what keeps a phone from overflowing.
- `auto-grid-fit` uses `auto-fit`: the tiles that exist share the row. Without it empty columns keep their place, so a lone tile stays a tile.
- It needs no query and no container.
- It clears a list's margin, indent and markers, so `<ul class="auto-grid">` needs nothing else.

Why it is a class: the preset cannot write custom grid tracks.

## `bento` and its tiles

A grid of four columns from **48rem** of its own width, two from **28rem**, one below, with rows at least `--bento-row` (`10rem`) tall and a `--bento-gap` (`1rem`) between tiles. A size container named `bento`.

- The columns are counted without a query on the bento itself, which a container cannot make: `repeat(auto-fill, minmax(…, 1fr))` whose narrowest track is a quarter, a half or the whole of the width at the two thresholds, chosen with nested `clamp()` and less a pixel so rounding never costs a column. Never three columns.
- `bento-wide` (two columns), `bento-tall` (two rows) and `bento-large` (both) span only from 28rem of bento, through `@container bento`; `bento-full` spans the row at every width.
- Tiles are placed in source order. `bento-dense` sets `grid-auto-flow: row dense`, for sets whose order means nothing.
- `--bento-gap` is a property and not a gap utility because the columns are counted with it.

Why it is a class: the track list, two thresholds a container cannot query on itself, and `grid-auto-flow`, which the preset cannot write.

## `masonry` and its items

As many lanes as fit at `--masonry-min` (`14rem`) or wider, `--masonry-gap` (`1rem`) apart.

- Where `display: grid-lanes` is supported (`@supports`), the lanes are grid columns and tiles go in source order to the lane that ends highest.
- Elsewhere the masonry is a multi-column box, `columns: var(--masonry-min)`: the same packing, filled down each column. The order seen differs; say so on any page that uses it.
- `masonry-item` is required on every tile: `break-inside: avoid`, and the gap above it as a margin (`& + &`) that a column's top truncates. Under grid lanes the margin is dropped for the grid's gap.

Why it is a class: `display: grid-lanes`, the multi-column fallback and the tile that keeps whole.

## `breakout` and its children

A grid of one track, `min(--breakout-measure, 100% - 2 × --breakout-gutter)` (`40rem`, `1.5rem`), centred, with a `1.25rem` row gap. An inline-size container.

- Every child lands in the track without a class.
- `breakout-wide` and `breakout-full` leave it with negative margins in `cqi`: in a child, `100cqi` is the breakout and `100%` is the track. Wide reaches up to `--breakout-wide` (`8rem`) a side and never into the gutter; full reaches both edges.
- A full child that is also a `breakout` sets its own children at the same measure: a band whose words line up with the column.

Why it is a class: a track list at a measure, and margins measured in the container.

## `sticky-stack` and its items

A grid column of panels, `1.5rem` apart. Each `sticky-stack-item` is `position: sticky` at `--sticky-stack-top` (`1rem`) plus `--sticky-stack-peek` (`.75rem`) for every item before it, counted with `sibling-index()` inside `@supports`; without it every item sticks on the same line.

- Items are the stack's own children: a sticky box moves only inside its parent.
- Nothing between the stack and the scroller may clip (`overflow: hidden` makes a scroller).
- The panel's face is a component inside the item, so the card keeps its own `position`.

Why it is a class: an offset counted from a sibling index, which no utility can write.

## `form` and its parts

A grid with a `1.25rem` gap (`--form-gap`), and a size container named `form`. It holds no state and draws no surface; a section's hairline is the one line it owns.

| Class | Does |
| --- | --- |
| `form` | Fields stack at `--form-gap` |
| `form-row` | Short fields side by side from **28rem** of form; stacked below |
| `form-section` | A heading beside its fields from **40rem** of form, one third to two thirds; sections are parted by a hairline |
| `form-heading`, `form-title`, `form-description` | The section's heading group |
| `form-fields` | The section's fields, at `--form-gap` |
| `form-actions` | Buttons at the end, the confirming one last; below **24rem** of form they stack at full width with the confirming one first |

The form's width must come from its context: inside a shrink-to-fit box a size container collapses.

Why it is a class: three container thresholds, and an order of buttons that reverses.

## Before adding another

1. Write the layout with utilities and existing components.
2. Name the one declaration that cannot be written: a unit the preset lacks, a container threshold, a track list, an order that depends on the room.
3. If there is none, it is not a class. Markup that repeats is copied.
4. If there is one, write `packages/ui/layouts/<slug>.css` and its contract `<slug>.json` with `"tier": "layout"`, import it after the components in `packages/ui/master.css`, and run `bun run build` in `packages/ui` so the README's table follows.
