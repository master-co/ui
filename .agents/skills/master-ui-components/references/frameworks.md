# Framework components

`packages/ui/frameworks/<react|svelte|vue>/` holds the framework components. They are source a project copies with `master-ui add` or from the registry. They are not import paths of the package and there is no bindings package.

## Whether a component exists

A framework component exists when the framework owns at least one of four things:

1. **A value the application reads or sets**: what is chosen, whether something is open.
2. **Rows rendered from data**: options, days, items.
3. **Ids that join parts**: a label and its control, a trigger and its popover, a tab and its panel.
4. **A lifetime**: a behavior to attach and detach, a platform call to make when state changes.

A contract with none of the four stays markup in every framework. Do not add `Button`, `Badge`, `Card` or anything that only turns props into classes: it hides the class from the checker and gives a reader a second vocabulary. The bar is state, not markup that repeats. `frameworks/manifest.json` lists the components and the contract each renders; add a line there when one is added.

## What a component may do

- Render the markup of the contract: the same elements, classes, roles and attributes in all three frameworks, with class names as literal strings so the checker reads them.
- Attach the behavior and give it its options. Attach again when an option changes, never when the value does.
- Pass the value: write the behavior's `value` when the prop differs from it, and on every `input` and `change` that bubbles to the root read `value` and report it once.
- Draw the first value's state attributes into the first render, so the HTML a server sends is right. After that the behavior moves them; the component does not bind them to state.
- Wire ids with the framework's own id (`useId`, `$props.id()`).
- Take the page's own markup where it belongs to the page: a trigger, panes, pictures, a control. It hands the trigger the attributes to spread; it does not render a button of its own.

## What it never does

- Decide a key, a focus move, a filter or a state attribute. If all three frameworks would have to decide it, it goes into the behavior, written once and tested once. Tabs had no behavior until they needed a component; the behavior was written first.
- Set a style or a state class, or measure anything.
- Depend on a headless library, or on anything but the framework and `@master/ui/behaviors`.
- Reimplement what the platform does: the component opens a dialog with `showModal()` when `open` says so and otherwise leaves it to `command` and `commandfor`.

## Idiom

Each framework's files are written in its own idiom, not translated from another's.

| | React | Svelte | Vue |
| --- | --- | --- | --- |
| File | `combobox.tsx`, a named export | `Combobox.svelte` | `Combobox.vue` |
| Value | `value`, `defaultValue`, `onValueChange` | `value = $bindable()`, `onValueChange` | `defineModel()` |
| Open | `open`, `onOpenChange` | `open = $bindable()`, `onOpenChange` | `defineModel('open')` |
| Other outputs | `onComplete`, `onValueCommit`, `onSearch` | the same callback props | emits `complete`, `valueCommit`, `search` |
| The page's markup | function props: `trigger(attributes)`, `children` | snippets | slots |
| The adapter | `use-behavior.ts` | `behavior.svelte.ts` | `use-behavior.ts` |

Props that are not the component's own go to the element a reader would expect: the field of a combobox, the dialog of a dialog, the root of a listbox.

## Tests

`packages/ui/tests/frameworks/scenarios.ts` has one scenario per component, written without a framework: mount, check the rendered markup against the contracts, press keys, read the value that came out, set a value, unmount. `react.test.ts`, `svelte.test.ts` and `vue.test.ts` each supply a driver and run every scenario. The fixtures a driver mounts (`tests/frameworks/<framework>/`) are usage examples: where a component takes markup of the page's, the fixture supplies it.

- A change to a component changes it in all three frameworks and, when it changes what a reader can observe, its scenario.
- A scenario that cannot hold in one framework is a sign that the logic belongs in the behavior, or that the scenario tests an idiom. An idiom is tested in that framework's own file (React's controlled value that is put back, its server render and hydration).
- `tests/frameworks/sources.test.ts` holds every component's source to the contracts with the checker, and every component to the manifest.
- happy-dom has no layout, no top layer, no scrolling and no frames, so the scenarios cannot see a dialog its trigger opens, a popover placed against its button, a tooltip that shows, a wheel that turns or a toast that leaves. `tests/frameworks/browser.test.ts` works every fixture of each framework in Chromium, with a real pointer and real keys: run `bun run --cwd packages/ui test:browser` after a change to a component, a behavior or a stylesheet one of them draws (`npx playwright install chromium` once). It is not part of `bun run test`, which needs no browser.
- The same page is there to look at: `bun run --cwd packages/ui playground` serves every fixture on the compiled stylesheet at `localhost:4320`, with `?only=react` for one framework and `&scheme=dark` for the dark theme. Build the package first; the page reads `dist/standalone.css`.
- An order is part of what a component promises: what it says last (`onComplete`, `onValueCommit`) is said after the value has come out, so an owner that reads its state in that handler reads the new one. The scenarios assert it.
