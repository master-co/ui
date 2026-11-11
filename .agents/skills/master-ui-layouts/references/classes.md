# The layout classes

Four stylesheets in `packages/ui/layouts/` hold what utilities cannot say. Each has a contract beside it, compiles in `@layer components` after every component, and declares no material: `packages/ui/tests/master.test.ts` fails a layout stylesheet that declares `background`, `background-color`, `background-image`, `box-shadow`, `border-radius`, `corner-shape`, `backdrop-filter` or `filter`.

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

Why it is a class: the preset cannot write custom grid tracks.

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

## Before adding a fifth

1. Write the layout with utilities and existing components.
2. Name the one declaration that cannot be written: a unit the preset lacks, a container threshold, a track list, an order that depends on the room.
3. If there is none, it is not a class. Markup that repeats is copied.
4. If there is one, write `packages/ui/layouts/<slug>.css` and its contract `<slug>.json` with `"tier": "layout"`, import it after the components in `packages/ui/master.css`, and run `bun run build` in `packages/ui` so the README's table follows.
