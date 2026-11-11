---
name: master-ui-blocks
description: Compose, review and document Master UI blocks, the stretches of a page (a hero, a pricing table, a footer, a sign-in card) published as markup to copy in site/content/blocks. Use when adding a block or a variant of one, when reviewing a block's markup, copy, previews or page, when a block is redone with a component that did not exist before, and when deciding whether something is a block, a layout or a component.
license: MIT
metadata:
  author: master-co
  version: "0.1.0"
---

# Master UI blocks

A block is one stretch of a page with a purpose: the first screen, the plans, the questions people ask, the foot of a site. It is published as markup to copy, composed from components and utilities, and it invents nothing. A reader takes the markup, changes the words, and has a section that already sits on the material ladder, reflows by its own width and reads correctly to a screen reader.

Use `$master-ui-components` for the tier decision and for any component a block needs, `$master-ui-layouts` when the question is where regions go and what scrolls, `$master-design` for craft judgment, `$master-ui-covers` for the cover and `$master-ui-writing` for the prose of the page. This skill holds what makes blocks consistent with each other.

## Is it a block

Read [tiers](../master-ui-components/references/tiers.md) first. A block is right when the thing is a composition with a purpose and needs no knowledge of its own.

- It needs a face, a contour, a shadow or a corner no component has: that is a request for a **component** or a modifier. Add it first, then write the block. `sheet-inverse` came from the call to action, `price` and `bullets` from the pricing block.
- It says where the regions of a whole page go and what scrolls: that is a **layout**.
- It is a whole page: a template, which does not exist yet. Do not add one.

## Files

| File | Role |
| --- | --- |
| `site/content/blocks/<slug>/content.mdx` | The page: the block, its variants and what is in it |
| `site/content/blocks/<slug>/metadata.ts` | `title`, `description`, `category` (`Marketing blocks` or `Application blocks`) and `order` |
| `site/components/catalog.ts` | The `blocks` list, in reading order; the description is the same sentence as the metadata's |
| `site/components/cover/art/blocks/<slug>.astro` | The cover, drawn with `$master-ui-covers` |
| `site/components/PagePreview.astro` | The preview: a real viewport at a desktop, tablet or phone width |

## The rules of a block

1. **It invents no material.** Every face is a component: `sheet`, `card`, `well`, `tray`, `badge`, `window`. Utilities lay things out and set type; they never draw a surface, a ring or a shadow. A hairline between two regions (`bt(1) bt-solid b-line-hair`) is the one line utilities draw.
2. **It starts at its own element** and that element is a size container: `<section class="container-inline …">`, `<header>`, `<footer>`, `<aside>`. A `<section>` is named with `aria-labelledby` pointing at its heading.
3. **It answers to its own width.** Reflow is written with container variants on the block (`grid-cols(3)@container(--4xl)`), with `flex flex-wrap`, or with `auto-grid`. Never a viewport variant: a block does not know how wide the column it is dropped in will be.
4. **It takes the page's ink and size.** A block sets no text color or font size on its root. The previews set `fg-text-body text-sm` on the body, and the page says so. A footer is the one exception: it is quieter than the page on purpose, sets `fg-text-muted` on its `<footer>`, and its page says why.
5. **A component does the job when one exists.** Before writing a row of utilities, look for the contract: a price is `price`, what a plan includes is `bullets bullets-check`, a figure is `stat`, a quotation is `quote`, a person is `avatar`, a status is `badge`, facts are a `data-list`, questions are an `accordion`. An inline SVG repeated in every row is the sign a component was missed. See [anatomy](references/anatomy.md) for the table.
6. **The content is real.** One product, Atlas, a deployment platform; names, numbers and sentences a product could ship; figures that add up. No lorem ipsum and no "Feature one".
7. **One hue at most.** `btn-brand` is the system's one hued control. A block that uses it uses it once, and nothing else on the same screen is hued except a status.
8. **What leaves keeps a way in.** A block that hides part of itself in a narrow room (a header's links, a sidebar) shows a toggle that opens the same links in a `dialog dialog-drawer`, and the drawer has a `dialog-close` button. A block that only disappears strands a phone.
9. **The example agrees with itself.** The rows are in the order the sort names, the filters that are on match the rows that show, the count in the title is the count in the footer, the picture is what its `alt` says.

## Write a block

1. Say in one sentence what the block is for and what a visitor does next. If there is nothing to do next, question whether it is a block.
2. List the pieces and name the component for each, reading its contract's `use` and `instead` (`packages/ui/components/<name>.json`). Anything without a component is either an arrangement, written with utilities, or a missing component.
3. Write the default with the frame, the measure and the heading group that [anatomy](references/anatomy.md) gives, so the block lines up with its neighbors when a page stacks several.
4. Add a variant only when it answers a different situation, and say which: a hero with a picture, a footer of one line, a sign-up beside a sign-in. Two or three previews are a page; six are a catalog nobody reads.
5. Give every id the block's prefix (`pricing-title`, `features-depth-title`). Ids are unique across all the previews of one page and do not collide with another block's, since a reader copies several into one document.
6. Check it at Desktop, Tablet and Phone, in light and in dark, with a fine and a coarse pointer.

## The page

A block's page lists what is in it. It follows this order:

1. One paragraph: what the block is for and which component carries it. Then the default `PagePreview`.
2. The standing paragraph: blocks are markup to copy, they take the page's ink and size, and each is a size container.
3. `## What is in it \{#anatomy\}`: a list, one item to a decision, each starting with the decision in bold and naming the class or utility that makes it. Say why, not only what.
4. A section for each variant, with the situation it is for and one preview.
5. `## Accessibility \{#accessibility\}`: the landmark, the heading level, what a link is and what a button is, what carries a meaning that depth or position would otherwise carry alone.
6. `## Related \{#related\}`: `<ComponentLinks slugs={[…]} />` with every component the markup uses, then `<ComponentLinks kind="blocks" slugs={[…]} />` with the blocks that stand before and after it on a page.

A block's page has no sidebar and no contents rail. Its words keep the text column; only the previews leave it.

## Previews

Read [preview sizing](../master-ui-components/references/previews.md). For a block:

- Use `PagePreview`, whose document is laid out at 1280, 768 and 390px. `ComponentPreview` is only for a specimen that does not depend on width.
- A marketing block's body is `p(0) bg-surface-base fg-text-body text-sm`; the block brings its own padding. An application block that stands inside a page's main region takes `p-lg` on the body instead. A block that is a card on a canvas (sign in) centers it on `bg-surface-tray` and sets `min-h(…)` to the preview's height.
- Author `height`, `tabletHeight` and `phoneHeight` so the whole block shows at each width and nothing scrolls, unless scrolling is the subject (a sticky header). Add `touchHeight` where 44px targets make the block taller.
- A block shown as a whole page (a header over a page, a sidebar in a shell) starts with a `skip` link to a `<main>` that has an `id` and `tabindex="-1"`, as a real page would.
- A block that holds a component whose behavior is a script (an OTP field, a combobox) passes `behaviors` to `PagePreview`, which attaches `@master/ui/behaviors` in the preview and shows the import in the code. Say on the page what works without it.
- The pictures in `site/public/demo/` are atmosphere, not product shots: give them `alt=""`, and say on the page that a product shot gets a description.
- Measure, do not guess: [anatomy](references/anatomy.md#measuring) has the snippet that reads each frame against its content at the three widths.

## Verify

1. `bun run test`: every preview is held to the contracts, so a part outside its root or an unknown class fails here.
2. `bun run type-check` and `bun run build`: an invalid utility fails the build.
3. Serve the build (`site-out` in `.claude/launch.json`) and open `/blocks/<slug>.html`. At each of the three widths the frame's height equals the document's and there is no horizontal overflow.
4. Look at it in light and in dark at 1:1, then at the overview `/blocks` between its neighbors.
5. Operate what can be operated: a menu, a drawer, an accordion, a form's validation. An overlay must fit inside the frame.
6. Report what was measured and what was judged, and name what was not checked.

## Review checklist

- Does every surface come from a component, with no ring, shadow or corner written in utilities?
- Is there a component for anything written by hand: prices, lists with checks, figures, quotations, people, statuses?
- Does the block start at its own element, as a size container, with a name?
- Is every reflow a container variant, a wrap or an `auto-grid`, and none a viewport variant?
- Is there one `<h1>` at most on the page the block implies, and do the headings step down without a gap?
- Are links links and buttons buttons? Does every icon-only control have a name?
- Does every `<section>` have a name, and every drawer a close button? Does anything that leaves in a narrow room leave a way in?
- Does the example agree with itself: sort and order, filters and rows, counts, `alt` and picture?
- Are ids unique across the page's previews?
- Is the copy one product's, with numbers that add up?
- Does "What is in it" describe the markup as it is now, and does Related list what the markup uses?
- Does each preview show the whole block at the three widths, with neither blank room nor a scrollbar?
