# Customizing

A change belongs on the lowest step that can express it. Each step up costs more to maintain and gives up more of what the library keeps current for the project.

| Step | Do this | For | Still follows upstream |
| --- | --- | --- | --- |
| 1. Utility | Add a utility to the element: `class="btn w-full"` | One instance | Everything |
| 2. Token | Override a theme token in `@theme`, or on an element for its subtree | Brand color, radius, density, focus, travel, a tone of a surface, the type sizes, the face of figures | Everything |
| 3. Property | Set a public custom property of the component on the element that has the class: a class of the project's own beside it (`class="btn compact-control"`), or a scoped rule that sets only public properties, `.toolbar .btn { --btn-height: 2rem }` | One component's size or spacing, everywhere or in a scope | Everything |
| 4. Theme | Write a theme file: tokens, and a mixin where a recipe needs it | Another material: flat, bordered, tinted | Every component |
| 5. Own | `npx master-ui own <name>`: the stylesheet, the contract and the behavior are copied into `ui/` and the import points at the copy | Structure, parts, states, behavior | The other components; this one on request |

A property the contract gives a default is declared on the component's own class, so a value set on an ancestor does not reach it. Set it on the element itself, as in step 3.

## A project's own material

These are the needs a project with its own material (a paper, a brand's surfaces, its own type) meets most often, and the step for each. Read the installed contract for the exact properties: a version older than these hooks does not have them.

| The project needs | Do this |
| --- | --- |
| Its own type sizes, such as 13px for small CJK text | Set the size tokens in the theme: `--font-size-micro`, `-label`, `-caption`, `-meta`, `-secondary`, `-control`, `-body`, `-title`. Every component sets its text in one of these roles |
| Figures that line up in a font with no tabular figures (DM Sans) | Set `--font-family-figures` in the theme to a face that has them, such as an `@font-face` holding only the digits of another font. Every part that lines up figures takes it; the rest of the text keeps its font |
| A larger result figure | `--stat-size` on the stat, or `--price-size`, `--countdown-size` |
| The current option of a segmented control in another face, such as ink | On the track, set the tokens the thumb is drawn from (`--color-surface-raised`, `--color-surface-raised-low`, `--shadow-raised`) and `--segmented-current-color` for its label; `--segmented-inset`, `--segmented-item-radius`, `--segmented-item-height` and `--segmented-font-size` set its geometry. The thumb keeps gliding |
| A dropzone that answers a file dragged over it | No attribute of the platform says so, so the project marks it (`data-over` from `dragenter` and `dragleave`) and a rule on that mark sets `--dropzone-contour` and `--dropzone-background` |
| A placeholder in the shape of what it stands for | `--skeleton-radius` on the skeleton; its color is the `--color-surface-chip` token, set on the element |
| The hover of `btn-brand` in an exact hue | A theme recipe: redefine `@mixin --control-tone-hover`, mixing from `--tone`, so a destructive confirmation (`btn-primary btn-danger`) follows too |
| A board, a stage or a result area inside a tray | The tray's 4px inset is the gap around the sheets it holds, and its corner is theirs plus that inset. Room for content that is not a sheet goes on a wrapper inside the tray, never on the tray's padding |
| A toggle that turns the brand color when it is on, or a button drawn as a line | Not in the library's language: a state is depth (an on toggle is `btn-quiet` with `aria-pressed="true"`, sunk), the brand is one moment per view, and an edge is soft. Use the pressed quiet button, or own the button if the material needs another |

## Where a project rule stands

Every rule of the library is in `components.ui`, a layer inside `components`. Write a project rule in `@layer components`: it stands outside that inner layer, so it wins over the component whatever the two selectors' specificity is and wherever a bundle puts the two stylesheets, and utilities still win over it. A rule outside any layer wins too, over utilities as well. Never double a class, lengthen a selector or add `!important` to win.

```css
@layer components {
  .compact-control { --btn-height: 2rem; --btn-padding-x: .75rem; }
}
```

What follows from the layer:

- A component's states lose to the project rule too. Specificity is compared only inside one layer, so a property the rule declares also beats what the component declares for it under `:hover`, `:focus-visible`, `:disabled` or an attribute such as `[aria-pressed="true"]`. Read the stylesheet for the states that set the same property, and restate the ones the project still wants. A project in an older version of the library, where a state used to win by specificity, must check this after upgrading.
- `!important` runs the other way: among important declarations the inner layer wins, so a project's `!important` does not beat one in `components.ui`. The library writes none; the project needs none.
- Components still order among themselves by the order of their stylesheets. The whole library fixes it; with module imports do not rely on it.
- A component the project owns keeps `@layer components.ui` in its copy, and so stands with the others. A component the project writes itself goes in `@layer components`.

Keep project class names outside the library's class families: `btn-compact` would be reported as an unknown component class. Upstream changes arrive when the installed package is upgraded; overrides keep replacing their chosen values.

## When to own a component

Own it when any one of these is true. Until then, stay on steps 1 to 4.

- The change needs a selector the stylesheet does not have: another part, another nesting, another element.
- The desired state treatment cannot be expressed by theme tokens or the component's public properties.
- The change is to behavior: keys, focus, what selecting means.
- The project needs to maintain this component's implementation independently. A copy still reads theme tokens, so owning the component alone does not freeze its appearance.

Own more source when maintaining a consistent implementation becomes easier than coordinating local copies with package styles, not when a fixed fraction of the library has been copied. The tokens, contracts, checker and this skill still apply.

## How to own one

```sh
npx master-ui init      # once: writes ui/index.css with one @import per stylesheet
npx master-ui own menu  # copies ui/menu.css, ui/menu.json and its behavior; repoints the import
```

- `ui/index.css` takes the place of `@import '@master/ui'` and is then the project's one source of the library: no other stylesheet imports one of its stylesheets, and no module does. Owning this way is for a project that loads the whole library; a project that imports per stylesheet from its modules points those module imports at its copy instead.
- Keep the contract true. If a class is added, renamed or removed, change `ui/<name>.json` too: the checker and every agent read it. Keeping the class names and state attributes means blocks, behaviors and the documentation still fit.
- The copy still reads the theme's tokens and applies its mixins, so it follows the theme.
- `npx master-ui status` says which owned components changed upstream since they were taken; `npx master-ui diff <name>` shows the change against the copy that was taken, kept in `ui/.base/`; after merging what is wanted, `npx master-ui accept <name>` records the new base.
- To give a component back, restore its package stylesheet and behavior imports and remove its entry from `owned` in `master-ui.json`. Delete only working and base files no other owned or added component uses; keep shared helpers and check framework imports before removing a local behavior. Build and exercise the returned component.

## What is not a customization

- A rule in the project's CSS that selects `.btn` (or any library class) and declares anything but its public custom properties: a face, an edge, a shadow, a padding. That is an untracked fork: use a token, a property, or own the component.
- Setting an undocumented component property. Use its contract's properties or separately documented public theme tokens; internal properties can change without notice.
- A new class that restyles a library component from outside (`.my-btn.btn { … }` with material declarations). A project modifier may set public properties and layout; a new material is a new component or an owned one.
- A box painted by hand with the theme's surface tokens and an edge or a corner of its own: a sheet, a tray or a well that has lost its contract. Use the component, or write one with a contract.

`npx master-ui check` reports the first three as `material-override`: a warning, and an error with `--strict`. It reports the last as `hand-made-material`, a warning. A rule may still set a component's public properties, tokens and where it stands: margin, position, size, the grid or flex it sits in.
