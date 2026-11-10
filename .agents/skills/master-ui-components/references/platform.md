# Platform first

Use what the browser already does before writing a class, a wrapper or a script for it. Every feature below is an enhancement: decide what the component looks like without it, make that state work, then gate the upgrade with `@supports` or a forgiving selector. State the fallback in the stylesheet's header comment and in the component page.

| Job | Use | Without it |
| --- | --- | --- |
| Open and close a modal | `<dialog>`, `command="show-modal"` / `"close"` with `commandfor`, `closedby` | `showModal()` from a handler |
| Open and close a floating surface | `popover`, `popovertarget` or `command="toggle-popover"` | `showPopover()` from a handler |
| A label on hover and focus | `popover="hint"` with `interestfor` | The control keeps its accessible name |
| Place a floating surface | Anchor positioning through `@apply --anchored` | Centered, as the browser places a popover |
| One indicator that moves between options | `anchor-name` on the current option, `anchor-scope` on the container, transitioned insets | Each option draws its own state |
| The option list of a select | `appearance: base-select`, `::picker(select)`, `::picker-icon`, `::checkmark` | The platform's list |
| Layout that follows the space given | `@container` on the component | Baseline everywhere |
| A parent that reads a child's state | `:has()` | Baseline everywhere |
| A textarea that grows | `field-sizing: content` | A resize handle |
| Motion in and out of `display: none` and the top layer | `@starting-style`, `transition-behavior: allow-discrete`, `overlay` | It appears and leaves at once |
| Open to an unknown height | `interpolate-size: allow-keywords`, `::details-content` | It opens at once |
| Validation states | `:user-invalid` beside `aria-invalid` | `aria-invalid` alone |
| A value read from scroll or position | Scroll-driven animations with a registered custom property | The plain state |
| Buttons and dots for a scroller | `::scroll-button()`, `::scroll-marker`, `::scroll-marker-group`, `:target-current` | A scrollable, snapping row |
| A message that leaves by itself | A keyframe animation that ends in `display: none`, paused on `:hover` and `:focus-within` | It stays until dismissed |
| A softer corner | `corner-shape: squircle` through `--corner-shape` and `--corner-scale` | A circular corner |
| Counting and ordering | CSS counters; `:has(~ .item[aria-current])` for "everything before the current one" | Baseline everywhere |
| A list as wide as the field that opens it | `anchor-scope` on the wrapper, `min-inline-size: anchor-size(--name inline)` | Its own width |
| A surface at a point a script supplies | `inset` from custom properties, `@position-try` rules that mirror it | It opens one way |
| Rows that share columns without a table | `grid-template-columns: subgrid` | Baseline everywhere |
| A measurement with thresholds | `<meter>` and its `::-webkit-meter-*` / `::-moz-meter-bar` parts | The platform's meter |
| A drawing that reads a value from an attribute | Typed `attr()` into a registered custom property, inside `@supports (x: attr(x type(*)))` | The same custom property set in `style` |
| Material only while a sticky element is stuck | `container-type: scroll-state`, `@container scroll-state(stuck: top)` on a pseudo-element of the container | The material is always drawn |
| The link of the section in view | `scroll-target-group: auto` on the list, `:target-current` on the link, beside `[aria-current]` | `aria-current` from a script |
| A closed state that is a preview | `::details-content` with `content-visibility: visible` and a block size in `lh` | Hidden while closed |
| Progress of the page | `animation-timeline: scroll(root block)`, longhands only | Not drawn |
| A delay by position among siblings | `sibling-index()` inside `@supports` | No delay |
| A color the page supplies | A custom property (`--swatch`) read by `background` | Baseline everywhere |
| A number the page supplies | A custom property on the item (`--value`) and one on the container for the scale (`--chart-max`); lengths derived with `calc()` | Baseline everywhere |
| An item that reads its own place in a scroller | `animation-timeline: view(block)` on the item, `animation-range: cover`, longhands only | The item is drawn flat; a script marks the chosen one |
| A corner cut straight | `corner-start-end-shape: bevel` with that corner's radius as the size of the cut, inside `@supports (corner-shape: bevel)` | A round corner |
| A band across one line of a `<pre>` | `display: grid` on the block when it `:has()` line elements | Lines without bands |
| Text with light passing over it | A gradient with `background-clip: text` over a solid layer of the resting ink, `color: transparent` | Plain text under reduced motion and forced colors |

Do not add a dependency or a script for placement, focus trapping, dismissal, auto-growing fields, or enter and exit animation.

## Overlays

- **Never set `display` on a closed overlay.** The browser hides a closed `<dialog>` and popover with `display: none`; a `display` in `@layer components` would beat it and show the element. Set layout properties (`flex-direction`, `gap`) on the base rule and `display` only under `&[open]` or `&:popover-open`.
- **The base rule is where it leaves to.** Write the closed state (`opacity: 0`, a smaller `scale`) on the base rule with the exit duration, the open state under `[open]` / `:popover-open` with the entrance duration, and the first frame in `@starting-style` inside the open rule. List `overlay` and `display` in `transition-property` and set `transition-behavior: allow-discrete`. Popovers get all of this from `@apply --pop`.
- **An exit is shorter than its entrance** and travels less. With reduced motion remove `scale` and `translate` in every state, including inside `@starting-style`, and keep the fade.
- **`::backdrop` takes its own transition.** Write its starting style as a nested rule with a selector, `@starting-style { &[open]::backdrop { … } }`, not as bare declarations inside a rule whose selector ends in a pseudo-element.
- A modal dialog locks page scroll with `:root:has(.dialog:modal)`. That is the one place a component reaches the root.
- A popover of buttons and links is complete without ARIA menu roles. `role="menu"` promises arrow keys; add it only with the script that provides them.

## Anchor positioning

- A popover opened by `popovertarget`, `commandfor` or `interestfor` has an implicit anchor: write no `anchor-name` and no `position-anchor`. `@apply --anchored` resets `inset`, sets `position-area` from `--anchored-block` and `--anchored-inline`, adds the gap as a block margin and lists the flip fallbacks. Modifiers set those two properties only.
- `transform-origin` cannot follow a flip. Keep the entrance scale small (`.97`) so a flipped popover does not visibly grow from the wrong edge.
- For an indicator inside a component, scope the anchor name on the container with `anchor-scope`, so two instances on a page do not share an anchor. Draw the indicator as one pseudo-element of the container with `inset: anchor(top) anchor(right) anchor(bottom) anchor(left)` and transition `top, right, bottom, left`. Render it only while a current option exists (`&:has(…)::before`), because without an anchor the box collapses to a dot that still paints its shadow.
- `:has()` cannot contain `:has()`. Ask the container for the state directly: `&:has(.segmented-item[aria-pressed="true"], .segmented-input:checked)`.
- Keep the fallback rule first (the current option draws its own sheet or underline) and undo it inside `@supports (anchor-scope: --name)`.

## Customizable select

- Everything goes inside `@supports (appearance: base-select)`; option styles too, since Firefox applies some option properties to its own list.
- `::picker(select)` is the only place an element name appears in a selector, as the pseudo-element's argument. The selector test allows exactly that.
- The Master CSS compiler rejects a pseudo-class after a pseudo-element, so write the open state as `&:open::picker(select)`, not `&::picker(select):popover-open`.
- Options are reached by class like every other part: `select-option` on each `<option>`.

## Container and style queries

- A container cannot be styled by its own query. Make the component the container and let its parts respond. When the component's own layout must change, place a part against the container's edge and let the other parts make room (see `card-split`).
- Queries measure the container's content box. State thresholds as content widths and say so in the comment.
- `container-type: inline-size` contains inline size: in a shrink-to-fit context the component collapses. Document that the width must come from the context.
- Use a style query only when one inherited flag has to switch several declarations. For a single value, pass a custom property: surfaces publish `--surface-color`, and a cut-out ring reads it.

## Fields

- `field-sizing: content` goes on an opt-in modifier with a minimum and a maximum in `lh` units, and removes the resize handle only where it is supported.
- `:user-invalid` always sits next to `[aria-invalid="true"]` inside `:is()`, which is forgiving. Inside `:has()`, which is not, an unsupported pseudo-class drops the whole rule: check that the dropped rule is the safe direction (an error stays visible).
- A wrapper that draws a field's states reads them with `:has(.part:focus)`, not `:focus-within`, so a button inside the wrapper does not light the field.

## Compiler notes

- A rule that contains `@apply` is flattened by the compiler; a rule without it passes through as native nesting. In native nesting `&` cannot stand for a pseudo-element, so states of a pseudo-element are written from the element: `&:open::picker(select)`, `&[open]::details-content`.
- The compiler folds `animation-timeline` into the `animation` shorthand and writes a value no browser reads. For a scroll-driven animation use longhands only: `animation-name`, `animation-timing-function`, `animation-fill-mode`, `animation-timeline`, `animation-range`.
- `@property` and `@keyframes` go outside `@layer components`, at the top level of the file.
- The compiler unwraps a single-argument `:is()`, so `:not(:is(:open))` is written out as `:not(:open)` and loses its forgiveness. Do not exclude a newer pseudo-class from a baseline rule; let a later rule of equal weight, with the pseudo-class inside a multi-argument `:is()`, override it (see the hover and open states in `select.css`).
- Diagnostics for new properties are reported as `information` ("Unverified CSS value"). The tests fail on warnings and errors only.

## Scroll

- A scroll-driven fade is a mask whose stops are registered `<length>` properties, each driven by its own animation on `scroll(self)` with an `animation-range` at one end of the scroll range. An inactive timeline (nothing overflows) leaves the properties at their initial value, so the edges stay clean without a query.
- A view timeline needs a scroll container around its subject. For a range input the input itself becomes one (`overflow: hidden`), with padding and a negative margin as bleed so the thumb's shadow and focus ring are not cut, and `view-timeline-inset` equal to that bleed.
- Generated carousel controls are positioned with anchor positioning against their scroller. Give the scroller both `anchor-name` and `anchor-scope`, or the controls of every carousel land on the last one.
- `::scroll-button()` and `::scroll-marker` take `content` with an alternative text: `content: '' / 'Next slide'`. Draw their glyph as a background image, since a mask would cut the surface and the shadow.

## Elements that open themselves

- A non-modal `<dialog open>` is shown at load and closes with `<form method="dialog">` or `command="close"`. That makes a dismissible message with no script. It is not in the top layer, so it needs a `z-index`.
- `display` can end a keyframe animation: the element is shown for the whole run and `display: none` applies at the end with `animation-fill-mode: forwards`. Add `visibility: hidden` in the same keyframe for engines that do not animate `display`.

## Native parts with engine quirks

- `<meter>`: Chromium draws it from `::-webkit-meter-bar` and the three `-value` parts, inside `::-webkit-meter-inner-element`, which it lays out itself. Style the bar and the values only: a `display` on the inner element shifts the bar off the track by a couple of pixels, which a screenshot at normal size hides. Firefox paints the platform meter until `appearance: none`, so set that inside `@supports (-moz-appearance: none)`. Safari keeps its own meter. Compare variants of a native part side by side on a static page at high zoom; `getComputedStyle()` with these pseudo-elements returns the host's values, not the part's.
- A context menu has no implicit anchor. Reset what `--anchored` sets (`position-area: none`, `margin: 0`) and place it with `inset` from `--menu-x` / `--menu-y`; each `@position-try` rule swaps one or both insets for the opposite edge measured with `100vw` / `100vh`.
- A submenu is a popover nested in its parent menu, right after the item that opens it: the item is its implicit anchor, `position-area: inline-end span-block-end` puts it beside the item, and `:has(+ .menu:popover-open)` keeps the item lit.

## Glass and scroll state

- A pane of glass is a pseudo-element of the bar, not the bar: the bar's content must not fade when the pane does, and a container cannot be styled by its own scroll-state query while its pseudo-elements can.
- Write `backdrop-filter` without a prefix, once. With both spellings in one rule the compiler keeps only the prefixed one.
- A glass tint is `color-mix()` of the surface behind it with `transparent`; publish that surface as a custom property (`--navbar-color`) so a bar over a tray is tinted with the tray. Remove the blur under `prefers-reduced-transparency: reduce`.
- Relative color syntax (`oklch(from …)`) is rejected by the compiler's validator. Derive tones with `color-mix()`.
- The validator also rejects `clamp()` written directly as a grid track. Put the expression in a custom property and use that as the track.

## Elements that are both native and optional

- When a component works as a plain element and, for a no-script upgrade, as a `<dialog open>` (a banner), reset what the dialog brings (`position`, `inset`, `width`, `height`, `margin`, `border`) on the base rule, keep `display` there, and write the closed state under the modifier that asks for the dialog: `&.banner-dismissible:not([open]) { display: none; … }`. A bare `:not([open])` would hide the plain element.
- A `<details>` can be a flex column, so its summary can be drawn after its content with `order`. The summary stays first in the markup.

## Lessons from the wheel, the chart and the native fields

- `scrollsnapchange` reports the wrong target after a scroll made from script (`scrollIntoView`, `scrollTop`). A wheel's script reads the chosen option from `scrollTop` divided by a row's height on `scroll`, which is also what works without the event.
- A grid item's pseudo-element and its children are auto-placed like any other items. When a bar (`::before`), a name and a value share one column, give each an explicit `grid-column`, or the third lands in a second column and squeezes the first to nothing.
- Subgrid carries rows from the chart to each item (`grid-row: 1 / span 2; grid-template-rows: subgrid`), so the plot and the names line up across items without a wrapper.
- A percentage margin resolves against the inline size. To place a value over a bar of unknown height, give the plot an explicit height (`--chart-height`) and compute both the bar and the offset from it.
- Mix a tint with the surface behind it (`color-mix(in oklab, var(--chart-color) 15%, var(--surface-color, …))`) when something drawn underneath must not show through; a transparent tint or `opacity` lets a scale line cross the bar.
- `background-clip: text` paints the element's whole box. On a block, set `width: fit-content` so the light crosses the words and not the empty line beside them.
- `::-webkit-calendar-picker-indicator` needs `box-sizing: border-box` with an explicit size, or the engine's own padding makes the field taller. The parts of a date are padded by a pixel each: `::-webkit-datetime-edit { margin-block: -1px }` brings a date field back to the height of a text field.
- `::-webkit-inner-spin-button` with `appearance: none` keeps stepping and can be drawn with a `mask`; it is as tall as the line, the upper half steps up. The Browser pane scales pointer coordinates, so which half was hit cannot be verified there, for a restyled or a native spin button alike: check it in a real window.
- A whitespace-only text node between block children of a `<pre>` renders as an empty line; between grid items it is not rendered at all. That is why a block with line elements becomes a grid.
- A transition that starts from `@starting-style` advances only when frames are produced. In the Browser pane each screenshot is a frame, so bars look half risen in the first one: take two before judging a height.

## Lessons from the range, the compare and the checklist

- A view timeline on a range input's thumb can be read two levels up. `timeline-scope` on a wrapper takes the names of both thumbs of a range (`--range-start, --range-end`), and the wrapper runs one animation per name. Turn the slider's own scope and animation off inside the wrapper (`timeline-scope: none; animation-name: none`), or the nearer scope keeps the timeline.
- Two readings need no order: paint from `min()` of the two to `max()`, and crossed thumbs still fill between them. That removes the script that would keep one thumb before the other.
- Two inputs stacked in one grid cell take the pointer only on their thumbs: `pointer-events: none` on the input, `auto` on `::-webkit-slider-thumb` and `::-moz-range-thumb`. A pseudo-element track on the wrapper is positioned, so position the inputs too or the track paints over the thumbs.
- For a handle whose middle must reach both edges of a frame, make the input one thumb wider than the frame with a negative inline inset; `animation-range: contain` then maps the thumb's travel to 0% and 100% exactly.
- CSS counters count state: `counter-increment` on every item and a second counter on `:has(:checked)`. An element can print them only after the last item in document order, so the count is written last in the markup.
- An atomic inline (`inline-flex`, `inline-block`) may start a line apart from the word before it. A mark that must stay with its word, such as a citation, is a plain `inline` with padding.
- A stroke through text that should run on across wrapped lines is a background on an inline element, grown with `background-size`; `text-decoration` cannot be eased from one end.
- A mask over a native bar (`<progress>`, `<meter>`) cuts the well and the fill together, which is how a segmented track stays in step with its value. The mask also removes the round ends, so the track takes a small square corner.

## Checking support

Record the engine and version you verified in. For a feature you could not see running, say so. A `@supports` test proves the parser accepts a declaration, not that the result paints as intended.
