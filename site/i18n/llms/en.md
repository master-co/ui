> Native HTML and CSS interface components for Master CSS, with a contract for each: the classes, where they go, the states the stylesheet draws, the public custom properties and the smallest correct markup. Blocks and pages are markup to copy.

Rules for writing Master UI markup:

- A component is a class on a native element: `<button class="btn btn-primary">`, `<dialog class="dialog">`, `<input type="checkbox" role="switch" class="switch">`. Use the element the contract names.
- A modifier goes with its base on the same element (`btn btn-sm`, never `btn-sm` alone). A part goes inside its root (`dialog-title` inside `dialog`).
- Mark a state with the native or ARIA attribute the contract lists (`disabled`, `aria-pressed="true"`, `aria-selected="true"`, `open`). Never add a class for a state, and never write a class that is not in a contract: there is no `btn-secondary` or `btn-outline`.
- Lay out with Master CSS utilities in the markup (`flex gap-md p-lg`). Do not write CSS for a component's face, edge or shadow; set a theme token or a public custom property instead.
- Overlays use the platform: `<dialog>` with `command="show-modal"` and `commandfor`, the `popover` attribute with `popovertarget`. Do not add a positioning or focus-trapping script.
- A pattern whose contract says `"script": "required"` needs its reference script from `@master/ui/behaviors`.
- In React, Svelte or Vue the markup is the same, in the framework's syntax. Do not wrap a class in a component to rename it (`<Button variant="primary">`). Only the patterns that hold state have a component, copied into the project with `npx master-ui add <name>`: {frameworkComponents}.
- Check the result: `npx master-ui check` reports markup that breaks a contract.
- To change how something looks, take the lowest step that works: a utility on the element, a theme token, a public custom property, a theme file, and only then own the component's source (`npx master-ui own <name>`). See the customization guide.

[Licensing]({origin}/license.txt): the library and reusable code examples are MIT licensed.

Data: [every contract]({origin}/contracts.json), [the contract schema]({origin}/contract.schema.json), [the theme's tokens]({origin}/theme.json), [the registry]({origin}/r/registry.json), [the library as plain CSS]({origin}/standalone.css).
