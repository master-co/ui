# Customizing

A change belongs on the lowest step that can express it. Each step up costs more to maintain and gives up more of what the library keeps current for the project.

| Step | Do this | For | Still follows upstream |
| --- | --- | --- | --- |
| 1. Utility | Add a utility to the element: `class="btn w-full"` | One instance | Everything |
| 2. Token | Override a theme token in `@theme`, or on an element for its subtree | Brand color, radius, density, focus, travel, a tone of a surface | Everything |
| 3. Property | Set a public custom property of the component on the element that has the class: a modifier class of the project's own beside it (`class="btn btn-compact"`), or a scoped rule that sets only public properties, `.toolbar .btn { --btn-height: 2rem }` | One component's size or spacing, everywhere or in a scope | Everything |
| 4. Theme | Write a theme file: tokens, and a mixin where a recipe needs it | Another material: flat, bordered, tinted | Every component |
| 5. Own | `npx master-ui own <name>`: the stylesheet, the contract and the behavior are copied into `ui/` and the import points at the copy | Structure, parts, states, behavior | The other components; this one on request |

A property the contract gives a default is declared on the component's own class, so a value set on an ancestor does not reach it. Set it on the element itself, as in step 3.

## When to own a component

Own it when any one of these is true. Until then, stay on steps 1 to 4.

- The change needs a selector the stylesheet does not have: another part, another nesting, another element.
- The same component needs an override in three or more of its states (rest, hover, pressed, focus, checked, disabled), or needs to undo what the stylesheet declares rather than add to it.
- A declaration other than a public custom property has to beat the stylesheet's own to take effect, by specificity, a later layer or `!important`.
- The change is to behavior: keys, focus, what selecting means.
- The project does not want this component's future visual changes.

When about a third of the library is owned, consider owning all of it: the tokens, the contracts, the checker and this skill still apply.

## How to own one

```sh
npx master-ui init      # once: writes ui/index.css with one @import per stylesheet
npx master-ui own menu  # copies ui/menu.css, ui/menu.json and its behavior; repoints the import
```

- Keep the contract true. If a class is added, renamed or removed, change `ui/<name>.json` too: the checker and every agent read it. Keeping the class names and state attributes means blocks, behaviors and the documentation still fit.
- The copy still reads the theme's tokens and applies its mixins, so it follows the theme.
- `npx master-ui status` says which owned components changed upstream since they were taken; `npx master-ui diff <name>` shows the change against the copy that was taken, kept in `ui/.base/`; after merging what is wanted, `npx master-ui accept <name>` records the new base.
- To give a component back, delete the copies and point the import at `@master/ui` again.

## What is not a customization

- A rule in the project's CSS that selects `.btn` (or any library class) and declares anything but its public custom properties: a face, an edge, a shadow, a padding. That is an untracked fork: use a token, a property, or own the component.
- Setting a custom property the contract does not list. Private properties change without notice.
- A new class that restyles a library component from outside (`.my-btn.btn { … }` with material declarations). A project modifier may set public properties and layout; a new material is a new component or an owned one.
