# Behaviors

A few patterns have no native element: a combobox, a listbox, a command palette, a calendar, a tree walked with the arrow keys, a menu with arrow keys and a context menu, a one-time-code field, a splitter, a stepper, a wheel, a comparison. Their stylesheets draw every state from ARIA; a behavior is the reference script that moves those attributes. It lives in `packages/ui/behaviors/<name>.js`, the contract names it in `behavior`, and the registry copies it into a project, where it is the project's to keep or replace.

## The shape of a behavior

```js
import { combobox } from '@master/ui/behaviors/combobox.js'

const detach = combobox(document.querySelector('.combobox'))
```

- One file, one named export with the name of the pattern, one argument that is the root element (the element with the root class), an optional second argument of options. It returns a function that removes everything it added.
- Plain ES modules with JSDoc types. No dependency, no framework, no build step, no global. It must read as something a developer can paste and own.
- Listeners are added with one `AbortController`'s signal; `detach` aborts it. Attaching twice to one root is safe: the second call detaches the first (keep the controller in a module `WeakMap`).
- `packages/ui/behaviors/index.js` exports every behavior and `attach(root = document)`, which finds each pattern by its root class and attaches it.

## What a behavior may do

- Set and remove ARIA and native attributes: `aria-selected`, `aria-checked`, `aria-expanded`, `aria-activedescendant`, `aria-valuenow`, `hidden`, `tabindex`, `open`, a field's `value`. Give an element an `id` when another must point at it.
- Give focus after a pointer finishes a gesture without asking for a ring: `focus({ preventScroll: true, focusVisible: false })`. A press whose default was prevented never told the browser the pointer is in use, so a plain `focus()` after the first drag on a page draws the ring the keys would. Focus given after a key keeps the plain call.
- Hand a change of arrangement to the platform to draw. Where `Element.prototype.startViewTransition` exists and motion is wanted, the behavior starts a transition scoped to its root around the one call that moves the nodes, and the stylesheet names the parts (`view-transition-name: match-element`, kept inside with `view-transition-scope: all`); elsewhere the same call runs at once. The behavior still writes no geometry. A part that clips its children (a list that scrolls) is named too, with `view-transition-group: contain` and `overflow: clip` on its `::view-transition-group-children`, or children past its edge are drawn outside it for the length of the move. The commit then finishes a frame later: whatever returned a value at once returns a promise, and every caller already has to take both.
- Move focus, and call the platform: `showPopover()`, `hidePopover()`, `showModal()`, `close()`, `stepUp()`, `scrollIntoView({ block: 'nearest' })`.
- Pass what only an event knows as a custom property the contract publishes (`--menu-x`, `--splitter-size`); the stylesheet does the placing and the limits.
- Create the rows a pattern repeats when they are data, not design: the weeks of a month in a calendar. Use the contract's classes and nothing else. Such a behavior also steps aside for a renderer that writes the rows itself: it exports the rows as data (`calendarMonth()`), takes an option that hands the writing over (`draw`), and finds the rows it did not write by a native attribute (a day's `value`).
- Dispatch `input` and `change` (bubbling) from the element whose value changed, so a form and a framework hear it the way they hear a native control. Write a field's value through the setter of its prototype (`write()` in `internal.js`): React shadows `value` on an input and ignores an event for a value it has already seen.

## The value

Where a pattern has a value that no single native control holds, the function the behavior returns has a `value` accessor. Reading it says what is chosen; setting it marks the pattern and dispatches nothing, as setting the `value` of a native input does. Setting the value it already has changes nothing. This is the one way a renderer passes a value in, so every behavior with a value has it, and it is tested in `tests/behaviors/value.test.ts`.

- An option, a tab and a row stand for their `data-value`, or for their text when they have none.
- A behavior reads the document each time it answers an event and keeps no list of elements, so a renderer may replace the options or the rows under it.
- A behavior that filters takes `filter: false` for a page that writes the matches itself, and gives an active option to options that arrive later.

## What it never does

- Trust that a gesture ends. A press may never get its release (a menu opened over it, the window lost the pointer), an owner's callback may throw, and a landing may be interrupted by the next press. Every flag a gesture sets (`moving`, a pressed handle, a frame it waits for) has one place that clears it on each of those ways out, and a test for each. A test that starts a drag ends it or detaches, or its frame keeps the runner alive.

- Set a style, a class for state, a size or a position. Never measure to place something. The one exception is `kanban`, recorded in the root `AGENTS.md`: it measures where the pointer is among columns that scroll, scrolls them near their ends and writes the three geometry properties its contract lists. It is not a precedent for another behavior.
- Reimplement what the platform does: opening and closing a popover or a dialog, light dismiss, focus trapping, <kbd>Esc</kbd> on a modal.
- Read anything but the contract: it finds parts by the contract's classes and roles, skips `hidden` items and those with `disabled` or `aria-disabled="true"`, and reads direction from `getComputedStyle(root).direction` for the horizontal arrow keys.

## Keys

The contract's `keyboard` list is the specification, and it follows the WAI-ARIA Authoring Practices for the pattern. A key the behavior handles calls `preventDefault()`; a key it does not handle is left alone. Wrapping, `Home` and `End`, typeahead where the pattern has it, and skipping disabled items are part of the pattern, not extras.

## Tests

Each behavior has `packages/ui/tests/behaviors/<name>.test.ts`, written with `node:test` and the `dom()` helper in `tests/behaviors/dom.ts` (a happy-dom document with the popover methods added). A test builds the contract's markup, attaches the behavior, presses keys and asserts attributes. Cover every row of the contract's `keyboard` list, disabled items, and that `detach` removes the listeners. Then try it in a real browser on the component page: happy-dom has no layout, no top layer and no real focus order.
