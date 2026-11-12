---
name: master-ui
description: Build, edit, review and customize interfaces with Master UI, the native HTML and CSS component library for Master CSS. Use in a project that imports @master/ui or links its stylesheet, when choosing a component, writing its markup, theming, deciding whether to override or own a component, or adding a component the library does not have. Do not introduce Master UI into a project that uses another component library without a request.
license: MIT
metadata:
  author: master-co
  version: "1.0"
  compatibility: "@master/ui with contracts (contract.schema.json); Master CSS 2.1 or later, or the standalone stylesheet."
---

# Master UI

Master UI is a contract and a default implementation of it. The contract of a component is its classes, the element each goes on, the states its stylesheet draws from native and ARIA attributes, its public custom properties and the smallest correct markup. The implementation is one stylesheet in the Moonstone / Obsidian theme. Write to the contract; change the implementation only through the steps in [customizing](references/customizing.md).

## Establish the project

- How the library arrives: `@import '@master/ui'` after `@import '@master/css'`, one import per stylesheet in `ui/index.css` (written by `master-ui init`), or the compiled `standalone.css` in a project without Master CSS. With the compiled file there are no utilities: lay out with the project's own CSS.
- What the project owns: `master-ui.json` lists owned components; their source and contracts are in its `directory` (`ui/` by default). An owned contract replaces the library's. Read it before using that component.
- The theme: a file imported after the library, or `@theme` overrides in the app stylesheet. Read it before choosing a token.
- The project's own instructions and nearby components come first. Match what is already there.
- The version: Master UI is experimental, and any 0.x release may rename or remove a class, a token or an export. Read contracts from the installed package (`npx master-ui contract` does), not from memory. After an upgrade run `npx master-ui check` and `npx master-ui status`, and fix what they report.

## Read the contract before writing markup

Never write a component's markup from memory, and never invent a class.

- `npx master-ui contract <name>` prints one contract; a class name works as the name (`master-ui contract btn-primary`). `npx master-ui list` prints every contract in one line each.
- Without a shell: `https://ui.master.co/components/<name>.md`, and the index at `https://ui.master.co/llms.txt`.
- With the Master CSS MCP server, use its contract tools when `tools/list` shows them.

Then:

- Put each class on the element the contract names. A component is a class on a native element: a button is a `<button>`, a dialog is a `<dialog>`, a switch is `<input type="checkbox" role="switch">`.
- A modifier goes with its base on the same element; a part goes inside its root.
- Mark a state with the attribute the contract lists (`disabled`, `aria-pressed="true"`, `aria-selected="true"`, `open`). Never add a class for a state.
- Give every control an accessible name. An icon-only button needs `aria-label`.
- Lay out with Master CSS utilities in the markup. Utilities win over component classes, so one instance needs no override.
- Overlays use the platform: `<dialog>` opened with `command="show-modal"` and `commandfor`, a `popover` opened with `popovertarget`, a tooltip with `popover="hint"` and `interestfor`. Add no positioning, dismissal or focus-trapping script.
- When the contract says `"script": "required"` or names a `behavior`, attach the reference script: `import { combobox } from '@master/ui/behaviors/combobox.js'`, then `combobox(element)`. `attach()` from `@master/ui/behaviors` attaches every pattern in a document. In React, Svelte or Vue, use the framework component instead, as below.

## In React, Svelte or Vue

Read [frameworks](references/frameworks.md) before writing a component in one of them. In short:

- Most of the library is the same markup, in the framework's syntax: `className` and `htmlFor` in JSX, nothing else changes. Do not wrap a class in a component to rename it: `<Button variant="primary">` hides `btn btn-primary` from the checker and from the next reader. Wrap markup only when the project already does, and keep the contract's classes as literal strings.
- Seventeen patterns hold state and have a component to copy: calendar, combobox, command, compare, dialog, field, listbox, menu, otp, popover, splitter, stepper, tabs, toast, tooltip, tree, wheel. `npx master-ui add <name>` copies it into `ui/`; `npx master-ui add` lists them. Look in `ui/` first: the project may already have it, edited.
- Never write the keys, the focus or the state attributes of one of those patterns in a component. They are in `@master/ui/behaviors`; the component gives the behavior a root and passes the value.

## Choose the component

Read [choosing](references/choosing.md) when more than one component could do the job: an overlay, a message, a choice among options, a number, navigation, a set of records. Each contract's `use` and `instead` say the same for one component.

A block or a page is markup, not a class: copy it from `https://ui.master.co/blocks/<slug>.md` or `/pages/<slug>.md` and edit the copy. A layout class (`auto-grid`, `bento`, `masonry`, `breakout`, `sticky-stack`, `form`, and the frames `page` and `shell`) has a contract like a component's: read `https://ui.master.co/components/<name>.md`, or `/pages/page.md` and `/pages/app-shell.md` for the frames.

## Change how something looks

Read [customizing](references/customizing.md) before overriding anything. In short, take the lowest step that works:

1. A utility on the one element.
2. A theme token, for everything that reads it.
3. A public custom property of the component, set on the element that has the class.
4. A theme file, for another material.
5. Own the component's source, when the change is to its structure, its states or its behavior.

A project rule may select a library class only to set its public custom properties. Never write one that redeclares or undoes what the stylesheet declares, never raise specificity or use `!important` to win, and never restyle a component by its private custom properties.

## Add what the library does not have

First check that it is not there under another name: `master-ui list`. Then decide what it is. Something with a material, a state, a platform behavior or a geometry its pieces share is a component: write one stylesheet in `@layer components` with class selectors only, tokens only, states from attributes, and write its contract beside it in the project's `ui/` directory so the checker and the next agent know it. Anything else is an arrangement: write it with utilities and existing components, and add no class.

Use the `master-design` skill, when it is installed, for design judgment. [Master UI’s design guide](https://ui.master.co/guide/design) explains the default design choices; the installed UI contracts and theme remain the source for exact classes, behavior and token values.

## Verify

- `npx master-ui check` reports markup that breaks a contract: a modifier without its base, a part outside its root, a class on the wrong element, a missing attribute or name, a class that is in no contract. Fix every error; read each warning.
- Run the project's Master CSS lint for utilities.
- In a browser, check each state the change touches (rest, hover, focus-visible, pressed, disabled, invalid, open), in light and dark, at a narrow width, and with the keyboard alone for anything interactive.
- Report what was checked and what was not.
