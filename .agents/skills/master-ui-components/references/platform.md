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

## Checking support

Record the engine and version you verified in. For a feature you could not see running, say so. A `@supports` test proves the parser accepts a declaration, not that the result paints as intended.
