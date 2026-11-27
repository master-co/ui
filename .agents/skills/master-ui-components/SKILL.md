---
name: master-ui-components
description: Author, review and document Master UI components, layouts and blocks, the native HTML and CSS library in packages/ui and its pages in site. Use when adding or changing a component, its classes, tokens, states or sizes, a layout or a block, or a documentation page, when deciding whether something should be a class or utilities, and when reviewing component CSS for selector, material, geometry and accessibility rules.
license: MIT
metadata:
  author: master-co
  version: "0.6.0"
---

# Master UI components

A Master UI component is one native element with the right semantics, one stylesheet in `@layer components.ui`, a contract beside it that says what the stylesheet promises, and markup a reader can copy into any stack. It works without JavaScript wherever the platform has an element for the job, uses the web platform's own feature for that job, and reads the Moonstone / Obsidian theme only through tokens. Where a pattern has no native element, the stylesheet is still complete: it draws every state from ARIA and leaves the behavior to the reader's script.

Use `$master-design` for general design principles and [Master UI’s design guide](https://ui.master.co/guide/design) for its material, hierarchy, geometry and interaction choices. This skill owns the implementation rules, contracts and verification that make components consistent. Executable tokens remain in `packages/ui/theme.css`; do not maintain another token definition in a guideline or the site shell.

For article purpose, prose, evidence and portable output, use [master-ui-writing](../master-ui-writing/SKILL.md). This skill owns the component contract and preview requirements; technical explanation figures use [master-ui-doc-illustrations](../master-ui-doc-illustrations/SKILL.md), while catalog covers use `master-ui-covers`.

## Which tier

Before writing anything, decide what the thing is. Read [tiers](references/tiers.md); in short:

- A **component** has a material, a state, a platform behavior or a geometry its pieces share. It is a semantic class in `packages/ui/components`.
- A **layout** says where things go and what scrolls. It is markup written with utilities, documented in the components' `Layouts` category. It owns no material. Only what utilities cannot say (a `dvh` height, a safe-area inset, a container threshold, a track list) becomes one of the few layout classes in `packages/ui/layouts`.
- A **block** is one stretch of a page with a purpose, composed from components and utilities and published as markup in `site/content/blocks`. It invents no material.
- A **page** is a whole screen on the frame `page` or `shell`, published as markup in `site/content/pages`.
- A component does not own the page: it never positions itself unless standing there is its behavior.

With none of the four kinds of knowledge, do not add a class, however often the markup repeats.

## Before changing a component

Read `packages/ui/theme.css`, the component's stylesheet, a neighboring component of the same kind, its page in `site/content/components/<slug>/`, and `site/content/guide/theme/content.mdx`. Keep the public vocabulary small: a new class or custom property is a public API.

## Platform first

Before writing a class, a wrapper or a script, ask what the browser already does. A component uses the platform feature for its job and treats it as an enhancement over a working baseline. Read [platform](references/platform.md) for the patterns and the traps; in short:

- **Overlays are native.** `<dialog>` with `command` / `commandfor` for modals, the `popover` attribute for floating surfaces, `popover="hint"` with `interestfor` for tooltips. The browser owns the top layer, focus, <kbd>Esc</kbd> and light dismiss.
- **Placement is CSS.** Anchor positioning places popovers, menus, tooltips and the select's list (`@apply --anchored`), and moves a single indicator between options (`anchor-scope`). No positioning script, no measured coordinates.
- **The select is still a `<select>`.** `appearance: base-select` restyles its list; older browsers keep the platform's.
- **Components adapt to context.** `@container` for the space a component is given, `:has()` for a state in a descendant, a custom property for a single inherited value and a style query only when one flag switches several declarations.
- **Fields size and validate themselves.** `field-sizing: content` grows a textarea; `:user-invalid` reports native constraints.
- **Motion in and out is CSS.** `@starting-style` with `transition-behavior: allow-discrete`, and `interpolate-size` for an unknown height.
- **Scroll position is CSS.** Scroll-driven animations read it (edge fades, a slider's fill); `::scroll-button()` and `::scroll-marker` give a carousel its controls.
- **Corners are continuous.** Every radius is drawn with `corner-shape` where the browser has it.
- **Every upgrade has a stated fallback.** Gate it with `@supports` or a forgiving selector, keep the baseline rule first, and write what happens without the feature in the header comment and on the component page.

## Patterns that need a script

A combobox, a command palette, a calendar, a tree with arrow keys, a context menu, an OTP field and a splitter have no native element. Style them anyway, by this division of work:

- **The stylesheet reads ARIA and native attributes, never a state class.** `aria-selected` is the active option, `aria-checked` a chosen one, `aria-expanded` an open branch or list, `aria-current="date"` today, `hidden` a filtered-out option. A class is used only for what ARIA cannot say, such as a day outside the month or the middle of a range.
- **A script moves attributes and nothing else.** It never sets a style, a size or a position. A position or a size that only an event knows, like a pointer's, is passed as a custom property (`--menu-x`, `--splitter-size`) and the stylesheet does the placing, including its limits.
- **Use the native container.** A palette is a `<dialog>`, a picker's calendar sits in a `popover`, a tree without script is nested `<details>`. Compose existing components (`input-group`, `listbox`, `dialog`) instead of drawing a second field or a second list.
- **Derive in CSS what a script would otherwise compute:** an empty state with `:has(.listbox-option:not([hidden]))`, a list's width with `anchor-size()`, a flip with `@position-try`.
- **A rule that sets `display` on a part a script hides must restore `[hidden]`**, since a class in `@layer components.ui` beats the browser's own `[hidden]` rule.
- **The pattern ships a behavior.** `packages/ui/behaviors/<name>.js` is the reference script, named in the contract's `behavior` and specified by its `keyboard` list; read [behaviors](references/behaviors.md). The page's default preview shows the pattern working, written without a framework, and says plainly what works without the script.
- **A pattern that holds state has a component in React, Svelte and Vue.** It renders this markup, attaches the behavior and passes the value; it decides nothing the behavior could. Read [framework components](references/frameworks.md) before adding or changing one, and before deciding that a contract needs one: most do not.

## Selector contract

These rules are enforced by `packages/ui/tests/master.test.ts`.

- **Class selectors only.** Root `.<component>`, parts `.<component>-<part>`, modifiers `.<component>-<modifier>`. Parts are nouns (`segmented-item`, `field-hint`); modifiers are sizes, variants and shapes (`btn-sm`, `btn-primary`, `btn-square`).
- **Never select by element type or child combinator.** No `> svg`, `> input`, `button`, `a`, `label`, `*`. Markup changes (a framework wraps an icon in a `<span>`, an `<img>` replaces an `<svg>`) must not break a component, and a component must not restyle content it does not own.
- **Pass values down with custom properties.** A component sets `--icon-size`, `--icon-offset` or `--spinner-size`; the child's own class reads them. Put `icon` on the icon itself.
- **Nest modifiers as compound selectors** inside the base rule (`&.btn-primary`), so they do not depend on file order.
- **No data attributes for variants.** States use native pseudo-classes, native state attributes and ARIA on the element itself: `:checked`, `:disabled`, `:focus-visible`, `:open`, `:popover-open`, `:user-invalid`, `[open]`, `aria-pressed`, `aria-current`, `aria-selected`, `aria-busy`, `aria-invalid`. A descendant state may be queried by class: `:has(.segmented-input:checked)`.
- **A container may tune a whole component it holds, by class.** `.btn-group .btn` and `.input-group .btn` set that component's custom properties and the corners that meet. This is for joining, never for restyling content.
- **An end is what a container draws, not its first or last node.** A popover a part opens (a date picker's calendar, a split button's menu) or a `hidden` part may follow it in the markup and takes no room in the row. Where an end decides geometry (an inset, a squared corner, a seam), write the `:first-child` / `:last-child` baseline and then `:nth-child(1 of …)` / `:nth-last-child(1 of …)` counting only what is drawn (`.btn:not([hidden])`, `:not([popover], [hidden])`), and measure the composition with a trailing popover in `tests/components/geometry.ts`. An input group keeps its own 12px inset for whatever it holds and pulls only an end button to 4px: moving the inset into the parts would need the same end test for every icon, addon and unclassed child, and would put content no rule names against the edge.
- **An end control lines up by what is seen at rest.** In a holder with a contour (an input group, a floating navbar, a toast, a banner), a button at an end keeps one even inset to the contour on every side it meets, block and inline alike, so its chip is concentric: measure it with the corner, never by its icon. In a bar with no contour (a flush navbar), a quiet button draws only its glyph at rest, so it hangs into the bar's padding by its own and its glyph meets the inset the brand and the page under the bar start on; a button with a face, or one holding an avatar, aligns by that face. `navbar` hangs its own ends; anywhere else a quiet button at an end of an uncontoured header takes `btn-hang-start` / `btn-hang-end`, which read `--btn-hang` (its padding, or for a square button half of its height minus its icon). A part that stands beside a title (a card's action, an alert's button) centers on the title's first line with negative block margins, never on the header's box. A page or a block keeps its bar's `--navbar-padding-x` equal to its content's inline padding at every width, so the bar and the column share one edge on a phone. There is no gutter token: `--navbar-padding-x` is the one knob, since pages set their gutters with spacing utilities and a theme token would duplicate that scale. In a row of a title over a line of help, the start, the words and the end follow one strategy: a check box, a radio or a time at the end stands on the first line (`checklist`); a row led by media centers all of its parts (`list`, `listbox`). Centering is a strategy for a title and one line under it: it is measured against those two lines, and it stops reading as one row once the words are taller than the media. So a part that holds words states how many lines it takes, and a line beyond that is a part of its own that stands under the words and out of the centering (`list-meta`, a grid row after the body, so no size has to be known). Never let a composition add a line to a centered part with utilities; when a pattern needs one, add the part. A hang is a negative margin, and a holder that fits its contents is narrower by it: `max-width: 100%` squeezed a hanging square button, alone in `navbar-end`, by exactly its hang. A hanging button's limit is its holder plus the hang, and a hang is checked by the box's width as well as by where the glyph lands. An action beside a title takes its width from the title's line only; it keeps the description out of its column only when it is taller than that line and reaches under it (a button, a switch in `card-action`), since a badge that claimed both rows narrowed every description beside it.
- **A mark of a place takes no room.** A line or a ring that says where something would land, or which row is current, is drawn out of flow by the item it stands beside (`position: absolute` on a pseudo-element, a ring as `box-shadow`). A mark that is an item of a list that scrolls changes how far the list scrolls even when its margins take its height back: the kanban's end line made the list 2px longer and moved every item under the pointer. Measure `scrollHeight` against `clientHeight` with the mark on. Two targets that reach past their boxes stop halfway where they meet: an invisible target laid over a neighbor answers for the neighbor's edge. Controls packed closer than the reach (a toolbar's tools, a panel's two buttons, a pagination's pages, 2px apart) take `--touch-target-block`, which grows across the row only.
- **A field with guidance is a `div`, not a `label`.** `label.field` around a control is for words and a control alone. A hint or an error inside the label becomes part of the control's name and is read again as its description: write `<div class="field">` with a `<label for>`, and tie the hint with `aria-describedby`.
- **A rule that takes another back is as heavy as the rule it takes back.** A reduced-motion reset, a forced-colors ink, a pressed state and a right-to-left counterpart are written with the whole selector of the rule they answer, state and `:has()` included, or the first rule keeps winning unseen: the tabs' underline went on gliding under reduced motion (`&::after` against `&:has(…)::after`), a quiet button showed no press under the pointer (its hover rule outweighed `:active`), a submenu's chevron kept the theme's ink in forced colors. A counterpart also sets only the longhand it changes: `background:` in a `:dir(rtl)` rule wiped the forced-colors `background-color` under it. When a state has no visible effect, compare the specificities before anything else.
- **What a state shows has its room before the state.** A check, a chevron or a count that is generated only once something is chosen, sorted or open widens its box at that moment: voting on a poll wrapped the answer's last word and grew the row, sorting a column widened it. Generate the mark on every instance, hidden (`visibility: hidden`), and show it with the state.
- **A row aligns on a baseline only if its items export the right one.** A flex or grid box takes the baseline of its first item that has one; a leading icon or a `::before` mark has none, so in `align-items: center` the box hands its row the mark's foot. Give a box that sits in a baseline row `align-items: baseline` and center its mark with `align-self: center` (`stat-delta`). A label that may share a min-content row keeps `overflow-wrap: break-word`: `anywhere` also counts every letter as a break in the min-content width and cuts a word in a narrow column.
- Never use `!important`, IDs or anything that would beat a consumer's utilities: the `utilities` layer must keep winning.
- Every rule is in `@layer components.ui`, the layer inside `components`, so a rule a project writes in `@layer components` wins over a component whatever its specificity and wherever a bundle puts it. Never write a rule in `components` itself or outside a layer, and never rely on that to beat another component: components order among themselves by `master.css`. A test fails a rule outside the layer. An important declaration in an inner layer beats a project's, which is one more reason to write none.
- **A class name must not be a preset utility.** The utility would paint over the component: `list-item` is `display: list-item`. A test checks every class against the preset; the only allowed overlaps are `table`, `table-row` and `table-cell`, whose utilities set the display those parts have. Prefer `-row` over `-item` when in doubt.

## Material and tokens

- **A component writes no color of its own.** No `oklch()`, no hex, no `rgb()`: a test fails one. A value that is not yet a token becomes one in `theme.css`, named for its role, and a recipe of several values becomes a mixin there (`--surface-ink`, `--control-ink`, `--control-tone`, `--surface-thumb`). `themes/paper.css` is the proof that this holds: it retunes every component with tokens alone, so check it after a change to a material.
- Read tokens only: `--color-surface-*`, `--color-line-*`, `--color-text-*`, `--color-focus`, status `--color-info|success|warning|danger`, `--color-brand*`, `--shadow-pressed|flat|raised|raised-hover|lifted|floating|overlay`, `--radius-chip|control-sm|control|control-lg|surface`, `--easing-glide`, `--duration-press|quick|base`, `--lift`, `--font-weight-control`, and the ink, thumb and picture tokens `theme.css` lists. Never raw palette steps in component rules; new public tokens go in `theme.css` `@theme`.
- Monochrome chrome: ink and pearl. Neutral chrome is the default; status hues say how something is, category colors say what data belongs to, content colors show data as it is, and the brand color keeps its one moment. Hue for status always with words; a category through `--category-*` (set by a `category-<name>` class), read only by a component's `-category` modifier and never by chrome, always beside the category's name; the brand color only on `btn-brand`, mixed from `--color-brand` and never written as a palette step. The category tokens are written by `packages/ui/scripts/category.ts` and held to their contrast by `tests/category.test.ts`.
- State is depth, not hue: rest raised → hover lifts 0.5px to raised-hover → press sinks into the well. Disabled drops to a flat well with disabled ink.
- **Edges are soft.** A contour is a half-pixel ring drawn with a zero-blur `box-shadow` (`0 0 0 .5px`, or `inset` for a well), never a 1px border. Use `--color-line-contour` for a surface, `--color-line-strong` for a hovered contour and a small track, `--color-line-mark` for a checkbox and a focused field: a control that must be found at a glance takes a firmer contour than a surface. `--color-line-hair` and `--color-line-divider` are the only 1px rules. A shadow layer blurs by twice its offset and pulls its spread in by the offset, so it fades out and never ends in a line; do not add a hard `inset 0 -1px 0` under a face.
- **Shared recipes are mixins in `theme.css`:** `--surface-sheet` (a raised face), `--focus-ring`, `--anchored` (a popover placed against its invoker) and `--pop` (how a popover enters and leaves), and `--on-ink` (what a surface filled with the inverse color tells the chips, badges and marks it holds).
- **Inline parts take the ink of the place they stand in.** A part that lives inside a sentence (a mention, a shimmer, a citation's tint) is mixed from `currentColor`, so it reads on a page, a card and an ink surface alike. A chip that keeps its own tokens by default (inline code, a keycap, a citation, a badge, a mark) reads `--code-*`, `--kbd-*`, `--citation-*`, `--badge-*` and `--mark-*`, which an ink surface sets with `@apply --on-ink`: the sent message, `sheet-inverse`, the inverse and brand banners, the primary and toned buttons, the tooltip. Never retune the global text tokens on an ink surface: a raised control standing on it reads them too.
- **A surface publishes `--surface-color`.** A ring that cuts a shape out of the surface behind it (a corner badge, stacked avatars, a status dot) reads it, with the base canvas as its fallback.
- `light-dark()` accepts colors only: put it in gradient stops, never around a gradient.

## Geometry and type

See [sizes and geometry](references/geometry.md) for the scale. In short: controls are 32 / 38 / 44px, fields and selects included (an action inside a compact holder, a toast or an alert, is the 28px `btn-xs`), with 8 / 10 / 12px corners from the role tokens, a holder's corner is what it holds plus the inset (sheet 16 → tray 20), icons are 14 / 16 / 18px Master Icons at the stroke their drawing carries, labels use `--font-weight-control` and never change weight between states.

**Every radius is written the same way**, so it turns into a squircle where the browser can draw one:

```css
border-radius: calc(var(--btn-radius) * var(--corner-scale));
corner-shape: var(--corner-shape);
```

The component's own property holds the circular value (a role token, or a derivation from one). `--corner-scale` is 1.6 with squircles and 1 without. A nested radius adds or subtracts its inset after the scale: `calc(var(--item-radius) * var(--corner-scale) + var(--inset))`. Pills, dots, avatars and thumbs set `corner-shape: round`, and an element with `border-radius: inherit` also needs `corner-shape: inherit`.

## States and platforms

Every interactive component covers, in this order of checks: rest, hover, active, focus-visible, selected or checked, disabled, busy or invalid where they apply, and their combinations.

- Gate hover with `@media (hover: hover)`; touch must not stick in a hover state.
- `@media (pointer: coarse)`: the target grows to 44px, never what is drawn. A control keeps its height, radius, padding and type at every pointer; `@apply --touch-target` (or `--touch-target-block` for parts packed edge to edge) on a free pseudo-element reaches past its edge. Only full-width rows of a list grow, and fields use at least 16px text so iOS does not zoom. See [geometry](references/geometry.md#touch).
- `@media (prefers-reduced-motion: reduce)`: remove travel (lift, stretch), keep the state change.
- `@media (forced-colors: active)`: shadows vanish, so draw the edge with a system-color `outline` (never a layout-changing border) and keep checked marks visible with `forced-color-adjust: none` plus system colors.
- Restyled native inputs reset `margin`, `padding` and `border` so host styles cannot distort them.
- A part that holds words (a title, a description, a line of a row) sets `margin: 0`. A page's base stylesheet gives a paragraph a margin, and a component's rhythm is its own: where the content is free text, give it a part (`thread-text`) instead of leaving it to the page.
- Name transitioned properties; never `transition: all`.
- A selected or current state is an ink hairline and one step of depth (`0 0 0 .5px var(--color-text-strong)` with a faint 1px echo), not a heavy outline.
- `mask` and `clip-path` cut an element's own focus ring and outer shadow. When a part is drawn with a mask (a star, a cut-out check), put the focus ring on its container with `:has(:focus-visible)`.
- A row in a list (a menu item, an option) answers the pointer at once, with no fade: the highlight has to keep up with a moving pointer. Keyboard focus on a row adds an ink outline inside it, so focus and hover stay different facts.
- Never transition `background` across a gradient. A gradient cannot interpolate, so it swaps instantly while `background-color` fades from transparent and the control flashes for a frame. Swap faces instantly, ease only depth (`box-shadow`), travel and ink, and put a solid color under every gradient face (`@apply --surface-sheet` does). Solid-to-solid fills, such as a checkbox filling with ink, may fade.

## Documentation previews

For a new or changed preview, including shared iframe rendering, read [preview sizing](references/previews.md). Reserve its height in the server HTML, select responsive heights with CSS, and verify both resting and expanded states; never resize it from a runtime content measurement.

## Add or change a component

1. Write `packages/ui/components/<slug>.css` with a header comment that states its material and geometry.
2. Write its contract, `packages/ui/components/<slug>.json`, following [contracts](references/contracts.md): every class, its states, its public custom properties, when to use it and the smallest correct example. A change to a class, a state or a public property changes the contract in the same commit.
3. Import the stylesheet in `packages/ui/master.css`. Stylesheets that tune another component (`input.css` after `button.css`) come later in the import order.
4. When the pattern has no native element, write its behavior and the behavior's test following [behaviors](references/behaviors.md), and export it from `packages/ui/behaviors/index.js`. When a framework owns something of it (a value, rows from data, ids between parts, a lifetime), write its component in all three frameworks and its scenario following [framework components](references/frameworks.md).
5. Add it to `site/components/catalog.ts` and write `site/content/components/<slug>/{metadata.ts,content.mdx}` following [the documentation pattern](references/documentation.md). The Classes and Custom properties tables are `<ContractTable name="<slug>" />`, never written by hand.
6. Run `bun run build` in `packages/ui`: it rewrites the README's table of classes from the contracts.
7. Draw its cover in `site/components/cover/art/<slug>.astro` with `$master-ui-covers`.
8. Verify as in [verification](references/verification.md).

## Add or change a layout or a block

Each has a skill of its own, which holds its rules, its page pattern and its verification:

- A layout, or a layout class in `packages/ui/layouts`: [master-ui-layouts](../master-ui-layouts/SKILL.md).
- A block: [master-ui-blocks](../master-ui-blocks/SKILL.md).

This skill stays the owner of the tier decision ([tiers](references/tiers.md)) and of every component a layout's region or a block holds. If a block needs a material no component has, add the component or the modifier here first.
