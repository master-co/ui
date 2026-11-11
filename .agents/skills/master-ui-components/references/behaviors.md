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
- Move focus, and call the platform: `showPopover()`, `hidePopover()`, `showModal()`, `close()`, `stepUp()`, `scrollIntoView({ block: 'nearest' })`.
- Pass what only an event knows as a custom property the contract publishes (`--menu-x`, `--splitter-size`); the stylesheet does the placing and the limits.
- Create the rows a pattern repeats when they are data, not design: the weeks of a month in a calendar. Use the contract's classes and nothing else.
- Dispatch `input` and `change` (bubbling) from the element whose value changed, so a form and a framework hear it the way they hear a native control.

## What it never does

- Set a style, a class for state, a size or a position. Never measure to place something.
- Reimplement what the platform does: opening and closing a popover or a dialog, light dismiss, focus trapping, <kbd>Esc</kbd> on a modal.
- Read anything but the contract: it finds parts by the contract's classes and roles, skips `hidden` items and those with `disabled` or `aria-disabled="true"`, and reads direction from `getComputedStyle(root).direction` for the horizontal arrow keys.

## Keys

The contract's `keyboard` list is the specification, and it follows the WAI-ARIA Authoring Practices for the pattern. A key the behavior handles calls `preventDefault()`; a key it does not handle is left alone. Wrapping, `Home` and `End`, typeahead where the pattern has it, and skipping disabled items are part of the pattern, not extras.

## Tests

Each behavior has `packages/ui/tests/behaviors/<name>.test.ts`, written with `node:test` and the `dom()` helper in `tests/behaviors/dom.ts` (a happy-dom document with the popover methods added). A test builds the contract's markup, attaches the behavior, presses keys and asserts attributes. Cover every row of the contract's `keyboard` list, disabled items, and that `detach` removes the listeners. Then try it in a real browser on the component page: happy-dom has no layout, no top layer and no real focus order.
