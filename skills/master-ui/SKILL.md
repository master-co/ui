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

- How the library arrives, which is one route and never two (see [Load the stylesheets one way](#load-the-stylesheets-one-way)): all of it from one stylesheet, `@import '@master/ui'` after `@import '@master/css'` or the project's own entry `ui/index.css` (written by `master-ui init`) in its place; one module import per stylesheet, `import '@master/ui/components/<name>.css'`; or the compiled `standalone.css` in a project without Master CSS. With the compiled file there are no utilities: lay out with the project's own CSS.
- What the project owns: `master-ui.json` lists the owned components (`owned`) and the framework components it added (`components`); their source and contracts are in its `directory` (`ui/` by default), and `contracts` may name more of the project's own contracts. An owned contract replaces the library's. Read it before using that component.
- The theme: a file imported after the library, or `@theme` overrides in the app stylesheet. Read it before choosing a token.
- The viewport: fields keep their 14px type on touch screens, so the page caps its scale on iOS, where a reader can still pinch to zoom, to stop iOS zooming onto a focused field. If the head lacks the short script of `https://ui.master.co/guide/installation#set-the-viewport`, add it after the viewport tag. Do not raise a field's type to 16px instead.
- The project's own instructions and nearby components come first. Match what is already there.
- The version: Master UI is experimental, and any 0.x release may rename or remove a class, a token or an export. Read contracts from the installed package (`npx master-ui contract` does), not from memory. After an upgrade run `npx master-ui check` and `npx master-ui status`, and fix what they report.

## Load the stylesheets one way

A CSS `@import` is an include, not a module: a stylesheet that two files import, or that arrives with the whole library and again on its own, is written into the output twice, and which copy comes last changes from page to page. A bundler loads a module import once, however many modules name it. So a project takes one route and keeps to it.

- **An application: the whole library, once.** One line, `@import '@master/ui';`, in one stylesheet, and nothing else in the project imports a stylesheet of the library. A project that ran `master-ui init` has `ui/index.css` in place of that line; it is then the one source, and the only stylesheet that imports the others.
- **An application that loads on demand: one module import per stylesheet.** `import '@master/ui/components/<name>.css'` (or `layouts/<name>.css`) in the module that renders the component, for every class its markup uses. The theme, `@import '@master/ui/theme.css'`, stays in the app stylesheet after the preset.
- **Never both.** Do not add a module import of one stylesheet to a project that imports the whole library, or the whole library to a project that imports stylesheets one by one.
- **Never a CSS `@import` of one component.** No stylesheet of the project writes `@import '@master/ui/components/<name>.css'`, in a `.css` file or in a `<style>` block. Only the entry does: the package's own, or `ui/index.css`.
- **A library built on Master UI imports per stylesheet, from its modules.** An application that uses such a library is therefore on that route too: it imports each stylesheet it uses from its own modules and does not write `@import '@master/ui'`. Before adding either import, look at what the project's dependencies already import.
- **A rule of the project does not depend on the order of the bundle.** A build does not promise that the order of module imports is the order of the CSS, and it does not have to: every rule of the library is in `components.ui`, a layer inside `components`, so a project rule in `@layer components` wins over a component wherever its stylesheet lands and whatever the two specificities are. Never double a class or lengthen a selector to win. [Customizing](references/customizing.md) says what such a rule may declare and what follows from the layer.

`npx master-ui check` reports the three ways this goes wrong: `stylesheet-import`, `mixed-imports` and `repeated-import`.

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

- Most of the library is the same markup, in the framework's syntax: `className`, `htmlFor`, `tabIndex` and `popoverTarget` in JSX, and the invoker attributes spread as the [frameworks](references/frameworks.md) table shows; nothing else changes. Do not wrap a class in a component to rename it: `<Button variant="primary">` hides `btn btn-primary` from the checker and from the next reader. Wrap markup only when the project already does, and keep the contract's classes as literal strings.
- Thirty-seven patterns hold state and have a component to copy: avatar, calendar, carousel, chart, color-picker, combobox, command, compare, cropper, dial, dialog, editable, field, gantt, gradient, kanban, listbox, log, menu, otp, panel, player, popover, schedule, signature, sortable, splitter, stepper, tabs, tags, toast, toolbar, tooltip, tour, transcript, tree, wheel. `npx master-ui add <name>` copies it into `ui/`; `npx master-ui add` lists them. Look in `ui/` first: the project may already have it, edited.
- Never write the keys, the focus or the state attributes of one of those patterns in a component. They are in `@master/ui/behaviors`; the component gives the behavior a root and passes the value.

## Choose the component

Read [choosing](references/choosing.md) when more than one component could do the job: an overlay, a message, a choice among options, a number, navigation, a set of records. Each contract's `use` and `instead` say the same for one component.

Read [charts](references/charts.md) before drawing numbers: which form does the job, how a chart is written from its series, and how its colors are given.

A block or a page is markup, not a class: copy it from `https://ui.master.co/blocks/<slug>.md` or `/pages/<slug>.md` and edit the copy. A layout class (`auto-grid`, `bento`, `masonry`, `breakout`, `sticky-stack`, `form`, and the frames `page` and `shell`) has a contract like a component's: read `https://ui.master.co/components/<name>.md`, or `/pages/page.md` and `/pages/app-shell.md` for the frames.

## Change how something looks

Read [customizing](references/customizing.md) before overriding anything. In short, take the lowest step that works:

1. A utility on the one element.
2. A theme token, for everything that reads it.
3. A public custom property of the component, set on the element that has the class.
4. A theme file, for another material.
5. Own the component's source, when the change is to its structure, its states or its behavior.

Color has four jobs, and chrome is neutral by default. A status (done, failing) is a tone such as `badge-success`, always with words. A category of data (a project, a calendar, a label) is a `category-<name>` class on the row, card or event, read only by `badge-category`, `chip-category`, `schedule-event-category`, `icon-frame-category` and the marks of a `chart`, and always beside the category's name. A color that is the data itself goes in a `swatch`. The brand color stays on `btn-brand`, once per view. Never tint a button, a field or a dialog with a category, and never use `category-red` for a danger.

A project rule may select a library class only to set its public custom properties. Never write one that redeclares or undoes what the stylesheet declares, never raise specificity or use `!important` to win (a rule in `@layer components` already wins over the library's `components.ui`, and an `!important` there loses to one in the inner layer), and never restyle a component by its private custom properties.

## Add what the library does not have

First check that it is not there under another name: `master-ui list`. Then decide what it is. Something with a material, a state, a platform behavior or a geometry its pieces share is a component: write one stylesheet in `@layer components` with class selectors only, tokens only, states from attributes, and write its contract beside it in the project's `ui/` directory so the checker and the next agent know it. Anything else is an arrangement: write it with utilities and existing components, and add no class.

Use the `master-design` skill, when it is installed, for design judgment. [Master UI’s design guide](https://ui.master.co/guide/design) explains the default design choices; the installed UI contracts and theme remain the source for exact classes, behavior and token values.

## Verify

- `npx master-ui check` reports markup that breaks a contract: a modifier without its base, a part outside its root, two classes of one group on an element (two sizes), a class on the wrong element, a missing attribute or name, a class that looks like one of the library's but is in no contract. It also reads the project's stylesheets and modules for how they load the library: a CSS `@import` of one component (`stylesheet-import`), the whole library beside a module import of one stylesheet (`mixed-imports`), and the whole library imported in two places (`repeated-import`, a warning: two imports that never reach the same page are fine). Fix every error; read each warning.
- Run the project's Master CSS lint for utilities.
- In a browser, check each state the change touches (rest, hover, focus-visible, pressed, disabled, invalid, open), in light and dark, at a narrow width, and with the keyboard alone for anything interactive.
- Report what was checked and what was not.
