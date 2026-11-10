---
name: master-ui-components
description: Author, review and document Master UI components, layouts and blocks, the native HTML and CSS library in packages/ui and its pages in site. Use when adding or changing a component, its classes, tokens, states or sizes, a layout or a block, or a documentation page, when deciding whether something should be a class or utilities, and when reviewing component CSS for selector, material, geometry and accessibility rules.
license: MIT
metadata:
  author: master-co
  version: "0.5.0"
---

# Master UI components

A Master UI component is one native element with the right semantics, one stylesheet in `@layer components`, and markup a reader can copy into any stack. It works without JavaScript wherever the platform has an element for the job, uses the web platform's own feature for that job, and reads the Moonstone / Obsidian theme only through tokens. Where a pattern has no native element, the stylesheet is still complete: it draws every state from ARIA and leaves the behavior to the reader's script.

Use `$master-design` for craft judgment (surfaces, geometry, type, states, motion). This skill supplies the contracts that make components consistent with each other.

## Which tier

Before writing anything, decide what the thing is. Read [tiers](references/tiers.md); in short:

- A **component** has a material, a state, a platform behavior or a geometry its pieces share. It is a semantic class in `packages/ui/components`.
- A **layout** says where the regions of a page go and what scrolls. It is markup written with utilities, published on a page in `site/content/layouts`. It owns no material. Only what utilities cannot say (a `dvh` height, a safe-area inset, a container threshold) becomes one of the few layout classes in `packages/ui/layouts`.
- A **block** is one stretch of a page with a purpose, composed from components and utilities and published as markup in `site/content/blocks`. It invents no material.
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
- **A rule that sets `display` on a part a script hides must restore `[hidden]`**, since a class in `@layer components` beats the browser's own `[hidden]` rule.
- **The page shows the smallest script that drives the component**, in the default preview, written without a framework. Say plainly what works without it.

## Selector contract

These rules are enforced by `packages/ui/tests/master.test.ts`.

- **Class selectors only.** Root `.<component>`, parts `.<component>-<part>`, modifiers `.<component>-<modifier>`. Parts are nouns (`segmented-item`, `field-hint`); modifiers are sizes, variants and shapes (`btn-sm`, `btn-primary`, `btn-square`).
- **Never select by element type or child combinator.** No `> svg`, `> input`, `button`, `a`, `label`, `*`. Markup changes (a framework wraps an icon in a `<span>`, an `<img>` replaces an `<svg>`) must not break a component, and a component must not restyle content it does not own.
- **Pass values down with custom properties.** A component sets `--icon-size`, `--icon-offset` or `--spinner-size`; the child's own class reads them. Put `icon` on the icon itself.
- **Nest modifiers as compound selectors** inside the base rule (`&.btn-primary`), so they do not depend on file order.
- **No data attributes for variants.** States use native pseudo-classes, native state attributes and ARIA on the element itself: `:checked`, `:disabled`, `:focus-visible`, `:open`, `:popover-open`, `:user-invalid`, `[open]`, `aria-pressed`, `aria-current`, `aria-selected`, `aria-busy`, `aria-invalid`. A descendant state may be queried by class: `:has(.segmented-input:checked)`.
- **A container may tune a whole component it holds, by class.** `.btn-group .btn` and `.input-group .btn` set that component's custom properties and the corners that meet. This is for joining, never for restyling content.
- Never use `!important`, IDs or anything that would beat a consumer's utilities: the `utilities` layer must keep winning.
- **A class name must not be a preset utility.** The utility would paint over the component: `list-item` is `display: list-item`. A test checks every class against the preset; the only allowed overlaps are `table`, `table-row` and `table-cell`, whose utilities set the display those parts have. Prefer `-row` over `-item` when in doubt.

## Material and tokens

- Read tokens only: `--color-surface-*`, `--color-line-*`, `--color-text-*`, `--color-focus`, status `--color-info|success|warning|danger`, `--color-brand*`, `--shadow-pressed|flat|raised|raised-hover|lifted|floating|overlay`, `--radius-chip|control-sm|control|control-lg|surface`, `--easing-glide`, `--duration-press|quick|base`, `--font-weight-control`. Never raw palette steps in component rules; new public tokens go in `theme.css` `@theme`.
- Monochrome chrome: ink and pearl. Hue only for status, always with words; the brand color only on `btn-brand`, mixed from `--color-brand` and never written as a palette step.
- State is depth, not hue: rest raised → hover lifts 0.5px to raised-hover → press sinks into the well. Disabled drops to a flat well with disabled ink.
- **Edges are soft.** A contour is a half-pixel ring drawn with a zero-blur `box-shadow` (`0 0 0 .5px`, or `inset` for a well), never a 1px border. Use `--color-line-contour` for a surface, `--color-line-strong` for a hovered contour and a small track, `--color-line-mark` for a checkbox and a focused field: a control that must be found at a glance takes a firmer contour than a surface. `--color-line-hair` and `--color-line-divider` are the only 1px rules. A shadow layer blurs by twice its offset and pulls its spread in by the offset, so it fades out and never ends in a line; do not add a hard `inset 0 -1px 0` under a face.
- **Shared recipes are mixins in `theme.css`:** `--surface-sheet` (a raised face), `--focus-ring`, `--anchored` (a popover placed against its invoker) and `--pop` (how a popover enters and leaves).
- **A surface publishes `--surface-color`.** A ring that cuts a shape out of the surface behind it (a corner badge, stacked avatars, a status dot) reads it, with the base canvas as its fallback.
- `light-dark()` accepts colors only: put it in gradient stops, never around a gradient.

## Geometry and type

See [sizes and geometry](references/geometry.md) for the scale. In short: controls are 32 / 38 / 44px (fields 40px) with 8 / 10 / 12px corners from the role tokens, a holder's corner is what it holds plus the inset (sheet 16 → tray 20), icons are 14 / 16 / 18px at a 1.5 stroke, labels use `--font-weight-control` and never change weight between states.

**Every radius is written the same way**, so it turns into a squircle where the browser can draw one:

```css
border-radius: calc(var(--btn-radius) * var(--corner-scale));
corner-shape: var(--corner-shape);
```

The component's own property holds the circular value (a role token, or a derivation from one). `--corner-scale` is 1.6 with squircles and 1 without. A nested radius adds or subtracts its inset after the scale: `calc(var(--item-radius) * var(--corner-scale) + var(--inset))`. Pills, dots, avatars and thumbs set `corner-shape: round`, and an element with `border-radius: inherit` also needs `corner-shape: inherit`.

## States and platforms

Every interactive component covers, in this order of checks: rest, hover, active, focus-visible, selected or checked, disabled, busy or invalid where they apply, and their combinations.

- Gate hover with `@media (hover: hover)`; touch must not stick in a hover state.
- `@media (pointer: coarse)`: targets grow to 44px; fields use at least 16px text so iOS does not zoom.
- `@media (prefers-reduced-motion: reduce)`: remove travel (lift, stretch), keep the state change.
- `@media (forced-colors: active)`: shadows vanish, so draw the edge with a system-color `outline` (never a layout-changing border) and keep checked marks visible with `forced-color-adjust: none` plus system colors.
- Restyled native inputs reset `margin`, `padding` and `border` so host styles cannot distort them.
- Name transitioned properties; never `transition: all`.
- A selected or current state is an ink hairline and one step of depth (`0 0 0 .5px var(--color-text-strong)` with a faint 1px echo), not a heavy outline.
- `mask` and `clip-path` cut an element's own focus ring and outer shadow. When a part is drawn with a mask (a star, a cut-out check), put the focus ring on its container with `:has(:focus-visible)`.
- A row in a list (a menu item, an option) answers the pointer at once, with no fade: the highlight has to keep up with a moving pointer. Keyboard focus on a row adds an ink outline inside it, so focus and hover stay different facts.
- Never transition `background` across a gradient. A gradient cannot interpolate, so it swaps instantly while `background-color` fades from transparent and the control flashes for a frame. Swap faces instantly, ease only depth (`box-shadow`), travel and ink, and put a solid color under every gradient face (`@apply --surface-sheet` does). Solid-to-solid fills, such as a checkbox filling with ink, may fade.

## Add or change a component

1. Write `packages/ui/components/<slug>.css` with a header comment that states its material and geometry.
2. Import it in `packages/ui/master.css` and add its classes to the native-class list in `packages/ui/tests/master.test.ts`. Stylesheets that tune another component (`input.css` after `button.css`) come later in the import order.
3. Add it to `site/components/catalog.ts` and write `site/content/components/<slug>/{metadata.ts,content.mdx}` following [the documentation pattern](references/documentation.md).
4. Update the class table in `packages/ui/README.md`.
5. Draw its cover in `site/components/cover/art/<slug>.astro` with `$master-ui-covers`.
6. Verify as in [verification](references/verification.md).

## Add or change a layout or a block

1. Write the markup with utilities and existing components, and check it at a desktop, a tablet and a phone width, in light and in dark.
2. Add it to `layouts` or `blocks` in `site/components/catalog.ts` and write `site/content/<layouts|blocks>/<slug>/{metadata.ts,content.mdx}` with `PagePreview`, as [tiers](references/tiers.md) describes.
3. If a layout cannot be written with utilities, name the declaration that cannot, and only then add a class in `packages/ui/layouts/<slug>.css`: import it after the components in `master.css`, add it to the tests' class list and to the README's layout table.
4. If a block needs a material no component has, add the component or the modifier first.
5. Draw its cover in `site/components/cover/art/<layouts|blocks>/<slug>.astro`.
6. Verify as in [verification](references/verification.md).
