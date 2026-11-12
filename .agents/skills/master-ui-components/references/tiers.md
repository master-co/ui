# Components, layouts, blocks and pages

The library has four tiers. What separates them is not size, and not whether something "is layout". It is whether there is knowledge worth putting behind a class.

| Tier | What it is | Where it lives | How it is published |
| --- | --- | --- | --- |
| Component | A part with a material, a state, a platform behavior or a geometry its pieces share | `packages/ui/components/<slug>.css`, `site/content/components/<slug>/` | Semantic classes |
| Layout | Where things go in a room, and what scrolls: a stack, tiles, lanes, a reading column | `site/content/components/<slug>/` in the `Layouts` category, and `packages/ui/layouts/<slug>.css` for the layout classes | Markup to copy, written with utilities and a layout class where they cannot say it |
| Block | One stretch of a page with a purpose: a hero, a pricing table, a footer | `site/content/blocks/<slug>/` | Markup to copy: components and utilities |
| Page | A whole screen: its regions and what scrolls | `site/content/pages/<slug>/`, on the frames `page` and `shell` | Markup to copy, filled with blocks and components |

Pages compose the existing layout frames, blocks and components into whole screens; they do not introduce another material or runtime API.

## The test for a class

A thing becomes a semantic class in `@master/ui` when it has at least one of four kinds of knowledge:

1. **A material.** A face, a contour, a shadow or a corner that has to sit on the material ladder.
2. **A state.** Hover, focus, chosen, open, disabled, invalid, read from a native attribute or ARIA.
3. **A platform behavior.** Anchor positioning, a scroll-state query, `::details-content`, an entrance in the top layer: what a utility cannot write.
4. **A geometry its pieces share.** A corner that nests by an inset, a child whose size follows its holder's.

With none of the four it is an arrangement. Write it with utilities and publish the markup.

The threshold is knowledge, not repetition. Markup that appears ten times is copied ten times; a rule that appears once but is easy to get wrong is a class.

## Rules

- **A component does not own the page.** It never sets where it stands, unless standing there is its behavior: a navbar is sticky, a dialog enters the top layer, a toast region is fixed. A component never sets its own outer margin or a width from the viewport.
- **A layout does not own a material.** It decides regions and scrolling. A face, a contour, a shadow or a corner comes from a component standing in the region, or from a utility in the markup. `packages/ui/tests/master.test.ts` fails a layout stylesheet that declares `background`, `background-color`, `background-image`, `box-shadow`, `border-radius`, `corner-shape`, `backdrop-filter` or `filter`.
- **Layouts answer to their own room.** Inside the frame of a page, write `@container(--3xl)` variants on a `container-inline` ancestor, not `@md`. Viewport variants are for the frame itself.
- **A block invents nothing.** Every surface in it is a component, every arrangement is on the [arrangements](/components/arrangements) page. A block that needs a new material is a request for a component or a modifier (`sheet-inverse` came from the call to action).

## Sorting an idea

| The idea | Tier | Why |
| --- | --- | --- |
| The bar that sticks and frosts when content is under it | Component (`navbar`) | Material, state, a scroll-state query |
| The brand, links, a menu and a drawer in that bar | Block (`header`) | A composition of components |
| A sidebar that stays while the page scrolls, and a drawer when narrow | Layout (`app-shell`, class `shell`) | Regions and scrolling; `dvh`, safe area and a container threshold need a class |
| What is in that sidebar | Block (`sidebar`) | A composition |
| Links in columns at the foot of a site | Block (`footer`) | No material, no state |
| Two panes and a handle that resizes them | Component (`splitter`) | The handle has states and a keyboard contract |
| Two panes that do not resize | Layout (`master-detail`) | Utilities and a container |
| A title with balanced lines and a size that follows its container | Component (`heading`) | Typographic knowledge utilities cannot write |
| Rows of a form that stack by the form's own width | Layout class (`form`) | Container thresholds; no material, no state |

## The layout classes

A layout gets a class only for what utilities cannot say or what is easy to get wrong each time: a height in `dvh`, the inset of a phone's home indicator, a sticky column with its own scroll, a container threshold, a grid that counts its own columns, grid lanes, a margin measured in its container, an offset counted from a sibling index. They are in `packages/ui/layouts/`:

| Class | Holds |
| --- | --- |
| `page` | A column at least as tall as the viewport, in `dvh` |
| `shell` and its regions | Sticky columns as tall as the viewport, a fixed mode, thresholds at 48rem and 64rem of shell, the safe-area inset |
| `auto-grid` | `repeat(auto-fill, minmax(min(100%, …), 1fr))` |
| `bento` and its tiles | Four, two or one columns counted from its own width without a query; spans from 28rem of bento; `grid-auto-flow: dense` |
| `masonry`, `masonry-item` | `display: grid-lanes`, and a multi-column fallback whose tiles keep whole |
| `breakout`, `breakout-wide`, `breakout-full` | A track at a measure, and margins measured in `cqi` |
| `sticky-stack`, `sticky-stack-item` | A sticky offset counted with `sibling-index()` |
| `form`, `form-row`, `form-section`, `form-actions` | Thresholds at 24, 28 and 40rem of form |

They follow the component selector contract and compile in `@layer components`, after every component in `master.css`. Before adding another, write the layout with utilities and name the declaration that cannot be written. Write its contract beside it; the tests and the README's table follow from that.

## Utilities a layout can use

The preset has no arbitrary `property:value` syntax. Check a class against the preset before relying on it: an invalid class fails the site build.

- Sizes in parentheses are pixels: `w(280)`, `h(440)`, `max-w(720)`, `gap(4)`, `p(8)`, `top(72)`, `r(12)`.
- Scale tokens: `gap-3xs` … `gap-4xl`, the same for `p`, `px`, `py`, `m`, `mt` and the rest; `text-xs` … `text-7xl`; `font-medium`, `font-semibold`; `leading-md`.
- Flex and grid: `flex`, `flex-col`, `flex-wrap`, `items-*`, `justify-*`, `grow(1)`, `shrink(0)`, `basis(0)`, `grid`, `grid-cols(3)`, `grid-col-span(2)`, `order(1)`.
- Borders: a side's width and style together, `bt(1) bt-solid`, and a color, `b-line-hair`. Use the logical sides `bxs` and `bxe` for columns. `b-solid` alone styles all four sides.
- Viewport variants: `@xs` 48rem, `@sm` 52.125rem, `@md` 64rem, `@lg` 80rem, and `@max-md` and its family.
- Container variants: `@container(--md)` 28rem, `--lg` 32, `--xl` 36, `--2xl` 42, `--3xl` 48, `--4xl` 56, `--5xl` 64rem, and `@container(--max-3xl)` for below. `container-inline` makes the container.
- Not available: `dvh` and `vh` heights, `z-index`, `opacity`, `aspect-ratio`, `text-wrap`, `tabular-nums`, custom grid tracks. When a layout needs one of these, that is the sign it needs a component, a layout class or a custom property on a component.

## Documenting a layout, a block or a page

Each tier has a skill that holds its page pattern, its previews and its verification: [master-ui-layouts](../../master-ui-layouts/SKILL.md) for layouts and pages, and [master-ui-blocks](../../master-ui-blocks/SKILL.md). What they share:

- A layout is `site/content/components/<slug>/{metadata.ts,content.mdx}` with the category `Layouts`, and an entry in `components`; a block or a page is `site/content/<blocks|pages>/<slug>/{metadata.ts,content.mdx}` and an entry in `blocks` or `pages` in `site/components/catalog.ts`. `metadata.ts` carries the category (`Layouts`, `Marketing blocks`, `Application blocks`, `Site pages`, `Application pages`) and an `order`.
- Whatever is about a width is shown with `PagePreview`: a real viewport at a desktop, tablet or phone width, scaled to the column. Its heights are authored, `height`, `tabletHeight`, `phoneHeight` and `touchHeight`, as [preview sizing](previews.md) describes; the frame is never sized from a measurement at runtime.
- A block page and a page's page have neither a sidebar nor a contents rail; a layout reads beside the components' sidebar, and its page previews are drawn at the column's width. Everything but a page preview keeps the text column, 41rem, centred in the window; a page preview leaves the column and runs to the page's own gutters, up to 96rem.
- A layout's or a page's page explains **how it is built**; a block page lists **what is in it**.
- Every example is real content. No lorem ipsum.
- Link the components a page uses with `<ComponentLinks slugs={[…]} />`, layouts included, and neighbors in the other sections with `kind="blocks"` or `kind="pages"`.
- Its cover is `site/components/cover/art/<slug>.astro` for a layout and `art/<blocks|pages>/<slug>.astro` for the others, drawn with `$master-ui-covers`.
