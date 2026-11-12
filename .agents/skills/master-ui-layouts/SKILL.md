---
name: master-ui-layouts
description: Write, review and document Master UI layouts and pages. Layouts arrange the room a region gives (arrangements, auto grid, bento, masonry, breakout, sticky stack, form) and are documented in the Layouts category of site/content/components; pages frame a whole screen, its regions and what scrolls (a page, an app shell, documentation, master-detail, a dashboard), published as markup in site/content/pages. Both rest on the layout classes in packages/ui/layouts. Use when adding or changing a layout, a page or a layout class, when reviewing regions, scrolling, thresholds, landmarks or a page about them, and when deciding whether a layout needs a class at all.
license: MIT
metadata:
  author: master-co
  version: "0.2.0"
---

# Master UI layouts

A layout says where things go and what scrolls. It is markup written with utilities, published on a page to copy, and it owns no material: a face, an edge, a shadow or a corner comes from a component standing in a region. Only what utilities cannot say becomes a layout class.

The site documents the tier in two places, by the size of what is arranged:

- **Layouts** arrange the room a region gives: a stack, tiles, lanes, a reading column. They are listed with the components, in their `Layouts` category, and read beside the components' sidebar: `/components/arrangements`, `/components/bento`.
- **Pages** frame a whole screen: its header, main region, sidebar and footer, and which of them scrolls. They are a section of their own, `/pages`, shown at full width: `/pages/app-shell`, `/pages/dashboard`. The two frames, `page` and `shell`, are layout classes documented on the page of that name and on the app shell.

Use `$master-ui-components` for the tier decision and for any component a region holds, `$master-ui-blocks` for what goes inside a region (a header, a sidebar, a footer), `$master-ui-covers` for the cover and `$master-ui-writing` for the prose of the page. This skill holds how a frame is written and what a layout class is allowed to be.

## Is it a layout

Read [tiers](../master-ui-components/references/tiers.md) first.

- It decides regions and scrolling, and has no material, no state and no content of its own: a **layout**.
- It is what stands in a region, with a purpose: a **block**.
- Its handle has states and a keyboard contract (a splitter), or it takes its material when something is under it (a navbar): a **component**.

A layout that seems to need a surface needs a component in that region. Never give a layout class a background to make an example look finished.

## Files

| File | Role |
| --- | --- |
| `site/content/components/<slug>/content.mdx` and `metadata.ts` | A layout's page, with `category: 'Layouts'` and an `order` |
| `site/content/pages/<slug>/content.mdx` and `metadata.ts` | A page's page: the frame as a real page, and how it is built. `category` is `Site pages` or `Application pages` |
| `site/components/catalog.ts` | A layout in `components` under `Layouts`; a page in `pages`; each list in reading order. `pageOfContract()` says where a contract's reader page is |
| `site/components/cover/art/<slug>.astro`, `art/pages/<slug>.astro` | The cover of a layout, drawn at real size where it can be, and of a page, a plan, both with `$master-ui-covers` |
| `packages/ui/layouts/<slug>.css` and `<slug>.json` | A layout class and its contract, `"tier": "layout"`, `"category": "Layouts"` |
| `packages/ui/master.css` | Imports the layout classes after every component |
| `site/public/_redirects` | Sends the retired `/layouts/<slug>` URLs to `/components/<slug>` or `/pages/<slug>` |

## The frame and the room

Two widths matter and they are not the same thing.

- **The frame** is the page itself. It may answer the viewport: its height is `100dvh`, its sidebar leaves below a width. Only the frame's own classes do this, and `page` and `shell` already do.
- **The room** is what a region gives its content. Everything inside the frame answers the room it is in: write container variants (`@container(--3xl)`) on a `container-inline` ancestor, `flex flex-wrap`, or `auto-grid`. A viewport variant inside a region is wrong the day the sidebar is open.

`shell` and `form` are size containers themselves, named `shell` and `form`; their thresholds are of their own width.

## The classes

[The layout classes](references/classes.md) has what each declares, its properties and its thresholds. In short:

| Class | Use it for | Because utilities cannot write |
| --- | --- | --- |
| `page` | A document that scrolls as a whole: header, main, footer | A `dvh` height |
| `shell` and its regions | An app: a sidebar that stays, an optional header, aside and footer | `dvh`, the safe-area inset, sticky columns with their own scroll, container thresholds |
| `auto-grid` | Equal tiles, as many across as fit | Custom grid tracks |
| `bento` and its tiles | A few tiles of a few sizes, composed once | Columns counted from its own width without a query, spans held by container thresholds, rows with a floor, `grid-auto-flow: dense` |
| `masonry` and its items | Tiles of their own heights, packed into lanes | `display: grid-lanes`, and a multi-column fallback that keeps each tile whole |
| `breakout` and its children | A reading column that a figure, a table or a band may leave | A track at a measure, and margins measured in the room with `cqi` |
| `sticky-stack` and its items | A short sequence that piles up as the page scrolls | A sticky offset counted with `sibling-index()` |
| `form` and its parts | Rows, sections and actions of a form | Container thresholds and an order that reverses |

Everything else is utilities: the arrangements (stack, cluster, split, center, beside), a centered task is `page items-center justify-center`, master-detail is a grid with a `container-inline`, a dashboard is a `shell` with an `auto-grid` in its main region.

A layout class that is meant for a list (`auto-grid`, `bento`, `masonry`, `sticky-stack`) clears the list's margin, indent and markers itself, as `chart` and `tree` do: a project may have no base reset, and a preview has none.

## Regions and scrolling

A layout is right when each region scrolls where the page says it does and nowhere else. The rules that are easy to get wrong:

- **One thing scrolls by default: the document.** Sticky regions, anchor links, find-in-page and scroll restoration all depend on it. Take the viewport (`shell-fixed`) only for an inbox, an editor or a chat, where the page as a whole has no meaning.
- **A region that scrolls by itself needs a bounded height and permission to shrink.** In a flex or grid frame that is `min-h(0)` on the region and `overflow-y-auto` on what scrolls. Without `min-h(0)` the region grows with its content and the frame scrolls instead.
- **A column that holds long words needs `min-w(0)`**, or one long line widens the whole frame.
- **Heights are `dvh`, never `vh`**, so a phone's toolbars neither leave a gap nor hide the foot. The layout classes do this; do not write a viewport height by hand.
- **A sticky region sticks to the nearest scroller.** Put it in the region that scrolls, and give it the room above it (`top(…)`) when a header is already stuck there.
- **Contain the scroll of a region** that is not the page: `overscroll-behavior: contain` is in the shell's columns, so a list's end does not move the page under it.

## Landmarks and order

A layout is the first thing a screen reader's landmark list shows. Write it so the list reads like the page.

- One `<header>` with the site's navigation in a `<nav aria-label>`, one `<main>`, one `<footer>`. A second or third `<nav>` each has its own `aria-label`.
- One landmark to a region. A sidebar that holds several things (a brand, a navigation, an account) is an `<aside>` with a `<nav aria-label>` inside it. A region that holds only a navigation is a `<div class="shell-sidebar">` around the `<nav>`, so the list does not read "complementary, navigation" for one thing. Two `<aside>` elements each need a name.
- **Source order is reading order.** When the visual order differs, as in a holy grail whose main column comes first in the source, say so on the page and say why.
- A whole-page example with navigation before its content starts with a `skip` link that points at the main region, and the main region has `tabindex="-1"`.
- A region that scrolls by itself and holds no focusable element needs `tabindex="0"` and a name, so the keyboard can scroll it.
- A drawer that replaces a sidebar holds the same navigation under a label of its own, in a `dialog dialog-drawer dialog-drawer-start` opened by the `shell-toggle`, with a `dialog-close` button. Its id is unique across the page's previews.
- A table wider than its region stands in a `scroll-area scroll-area-inline`, never a bare `overflow-x-auto`: the edge fades where columns continue.

## Write a layout

1. Draw the regions on paper: what is in each, which one scrolls, what leaves first as the frame narrows.
2. Start from the frame that fits: `page` when the document scrolls as a whole, `shell` when something stays beside it. Do not write a third frame.
3. Write the regions with utilities. Put a real block in each region, with real content, so the layout is judged as a page and not as boxes.
4. Narrow it. Decide what each region does at 768 and at 390: stack, leave, or move into a drawer. Write that as a container variant or let the layout class do it.
5. If a declaration cannot be written, name it, and only then follow [the layout classes](references/classes.md#before-adding-another).

## The page

A layout's page and a page's page both explain how it is built. A layout's reads beside the components' sidebar and its contents rail, so its `PagePreview` is drawn at the text column's width; a page's has neither and its previews run wide. Both follow this order:

1. One paragraph: what the layout is for, and the frame or the room it stands in. Then the default preview, with a caption that tells the reader what to try: scroll, choose Tablet, choose Phone. A layout whose point is a width uses `PagePreview`; a detail of it that does not need a viewport uses `ComponentPreview`.
2. `## How it is built \{#how-it-is-built\}`: one item to a job, naming the class or the utility that does it and why that one. This is the part a reader copies with understanding.
3. A section for each variant, with one preview.
4. A section that says when to use it and when a neighbor is the right one, where that is not obvious.
5. `## Accessibility \{#accessibility\}`: the landmarks, the source order, what the keyboard reaches.
6. For a layout class: `## Classes \{#classes\}` with `<ContractTable name="<slug>" />`, `## Custom properties \{#custom-properties\}` with `show="properties"`, and at the end `## Source \{#source\}` with `<ComponentSource name="<slug>" directory="layouts" />`.
7. `## Related \{#related\}`: `<ComponentLinks slugs={[…]} />` for the components and the layouts in the example, `kind="blocks"` for the blocks in its regions and `kind="pages"` for neighboring pages.

## Previews

Read [preview sizing](../master-ui-components/references/previews.md). For a layout:

- Use `PagePreview`. Its `height` is the viewport's height, and `100dvh` in the markup resolves to it, so a layout built on `page` or `shell` is exactly as tall as the preview. Keep that height deliberate: it is what makes a sticky sidebar or a short page's footer visible.
- Leave the body at its default, `p(0)`: a frame starts at the viewport's edge. Give the frame its own surface (`bg-surface-base` or `bg-surface-tray`) and the page's ink and size (`fg-text-body text-sm`), since the preview's document is transparent.
- A layout that is not a whole page (arrangements, an auto grid, a form, a master-detail panel) is sized like a block: author `height`, `tabletHeight` and `phoneHeight` so all of it shows.
- Where scrolling is the lesson, do not grow the frame until the scroll disappears.
- A layout whose handle is moved by a script (a splitter) passes `behaviors` to `PagePreview`, which attaches `@master/ui/behaviors`. Never write a script into the example by hand.
- Write a caption for anything a reader has to do to see the point.

## Verify

1. `bun run test`: holds every preview to the contracts, and fails a layout stylesheet that draws a material.
2. `bun run type-check` and `bun run build`.
3. Serve the build and open `/components/<slug>.html` or `/pages/<slug>.html`. At Desktop, Tablet and Phone: the regions are where the page says, the right one scrolls, nothing overflows sideways.
4. Scroll each region to its end with the wheel and with the keyboard. Open the drawer, tab through it, close it with <kbd>Esc</kbd>, and check focus returns to the toggle.
5. Read the landmark list (`document.querySelectorAll('header, nav, main, aside, footer')`) and the heading outline against the page's Accessibility section.
6. Look at it in light and in dark, then at the overview, `/components#layouts` or `/pages`, between its neighbors.
7. Report what was measured and what was judged, and name what was not checked: a real phone's toolbars, a screen reader, an engine you could not run.

## Review checklist

- Does the layout draw anything? If it does, which component should?
- Is every reflow inside the frame a container variant, a wrap or an `auto-grid`?
- Does exactly the region the page names scroll, at each of the three widths?
- Are `min-h(0)` and `min-w(0)` where a region must shrink?
- Is there one `<main>`, and do the landmarks and their names read like the page?
- Does the source order match the reading order, or does the page say why not?
- Does a whole-page example begin with a skip link, and does its drawer have a close button?
- Does Related list the components and layouts in the example, the blocks in its regions and the neighboring pages?
- Do the numbers on the page (widths, thresholds, heights) match the stylesheet?
- Does "How it is built" name the class or utility that does each job, as the markup has it now?
