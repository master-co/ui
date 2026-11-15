# React, Svelte and Vue

A Master UI component is a class on a native element, so in a framework most of the library is the same markup written in that framework's syntax. A framework component exists only where the framework owns something.

## Markup stays markup

| In HTML | In JSX | In Svelte and Vue |
| --- | --- | --- |
| `class="btn btn-primary"` | `className="btn btn-primary"` | `class="btn btn-primary"` |
| `for="email"` | `htmlFor="email"` | `for="email"` |
| `tabindex="-1"`, `popovertarget="menu"` | `tabIndex={-1}`, `popoverTarget="menu"` | unchanged |
| `commandfor="confirm" command="show-modal"`, `interestfor="tip"` | spread them: `{...{ commandfor: 'confirm', command: 'show-modal' }}` | unchanged |

- Keep the contract's classes as literal strings on native elements. The checker reads them in `.jsx`, `.tsx`, `.svelte`, `.vue` and `.astro` files; it cannot read a class that only exists as a prop of a wrapper.
- Do not add `Button`, `Badge`, `Card` or any component whose only job is to turn props into classes. When the project already has such a component, use it and leave the classes inside it literal.
- A state is still an attribute: `disabled`, `aria-pressed={pressed}`, `open`.

## The components

These hold a value, render rows from data, join parts by id or have a lifetime, so each has a component:

| Component | Renders the contract of | The framework owns |
| --- | --- | --- |
| `avatar` | avatar | Which of the photo and its fallback shows, as the photo loads or fails |
| `calendar` | calendar | The value, the month it draws |
| `carousel` | carousel | The current slide, the slides, the ids that join each dot to its slide |
| `chart` | chart | The series it is drawn from, and which of them are hidden |
| `color-picker` | color-picker | The color, the format it is written in |
| `combobox` | combobox | The value, the options |
| `command` | command | Whether it is open, the commands |
| `compare` | compare | The position |
| `cropper` | cropper | The crop, and the zoom |
| `dial` | dial | The value |
| `dialog` | dialog | Whether it is open, the id its trigger names |
| `editable` | editable | The saved value, the ids that name the preview |
| `field` | input (`field`) | The ids that join the label, the control, the hint and the error |
| `gantt` | gantt | The ranges, the rows |
| `gradient` | gradient | The gradient: its type, its angle or centre, and its stops |
| `kanban` | kanban | The arrangement: which items each column holds and in what order; the columns, the items, the ids that join a column to its title and a move button to the mover |
| `listbox` | listbox | The value, the options |
| `log` | scroll-area | Whether it follows the end, the lifetime of its behavior |
| `menu` | menu | The items, the id its trigger names, the target of a context menu |
| `otp` | otp | The code, the number of slots |
| `panel` | panel | Whether it is open, its place, its size and whether it is minimized |
| `player` | player | The time, whether it plays, the tracks |
| `popover` | popover | Whether it is open, the id its trigger names |
| `schedule` | schedule | The day and the view on show, the events |
| `signature` | signature | The strokes |
| `sortable` | sortable | The order, the items |
| `splitter` | splitter | The size |
| `stepper` | stepper | The number |
| `tabs` | tabs (a tablist) | The selected tab, the ids that join tabs and panels |
| `tags` | tags | The values, their chips |
| `toast` | toast | The queue: `toast()` and the region that shows it |
| `toolbar` | toolbar | The lifetime of its behavior |
| `tooltip` | tooltip | The id that joins the control and its label |
| `tour` | coachmark | The step, the steps, the ids that join each to its target |
| `transcript` | transcript | The cues |
| `tree` | tree | The selected row, the rows |
| `wheel` | wheel | The value of each column, the options |

Get one with the command line, which copies it into the project's `ui/` directory with the small helper it imports:

```bash
npx master-ui add combobox --framework=react   # the framework is remembered after the first time
npx master-ui add                              # lists the components
npx master-ui status                           # which copies changed upstream since they were taken
```

Before adding one, look in `ui/`: a copy that is already there is the project's, and may have been edited. Use it as it is.

## How a component is built, and how to edit one

- It renders the markup of the contract. Read the contract (`npx master-ui contract combobox`) to know the classes and the attributes it must keep.
- It attaches the behavior from `@master/ui/behaviors/<name>.js`. The keys, the focus and the state attributes are decided there, once, for every framework. To change them, own the behavior (`npx master-ui own <name>`), not the component.
- The value goes in and out through the behavior: its `value`, and the `input` and `change` events that bubble to the root.

| | Value in and out | Open | Markup of the page's |
| --- | --- | --- | --- |
| React | `value`, `defaultValue`, `onValueChange` | `open`, `onOpenChange` | A function prop: `trigger={attributes => <button className="btn" {...attributes}>Open</button>}` |
| Svelte | `bind:value`, `onValueChange` | `bind:open`, `onOpenChange` | A snippet: `{#snippet trigger(attributes)}<button class="btn" {...attributes}>Open</button>{/snippet}` |
| Vue | `v-model` | `v-model:open` | A slot: `<template #trigger="attributes"><button class="btn" v-bind="attributes">Open</button></template>` |

- A trigger is the page's own button. Spread the attributes the component gives it; they name the dialog, the popover, the menu or the tooltip, and the browser opens it.
- What a component does not take as a prop, change in the copy. It is the project's file.

## Check

`npx master-ui check` reads the components in `ui/` and the files that use them. Run it after editing either.
