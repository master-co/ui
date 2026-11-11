# Customizing

A change belongs on the lowest step that can express it. Each step up costs more to maintain and gives up more of what the library keeps current for the project.

| Step | Do this | For | Still follows upstream |
| --- | --- | --- | --- |
| 1. Utility | Add a utility to the element: `class="btn w-full"` | One instance | Everything |
| 2. Token | Override a theme token in `@theme`, or on an element for its subtree | Brand color, radius, density, focus, travel, a tone of a surface | Everything |
| 3. Property | Set a public custom property of the component on the element that has the class: a class of the project's own beside it (`class="btn compact-control"`), or a scoped rule that sets only public properties, `.toolbar .btn { --btn-height: 2rem }` | One component's size or spacing, everywhere or in a scope | Everything |
| 4. Theme | Write a theme file: tokens, and a mixin where a recipe needs it | Another material: flat, bordered, tinted | Every component |
| 5. Own | `npx master-ui own <name>`: the stylesheet, the contract and the behavior are copied into `ui/` and the import points at the copy | Structure, parts, states, behavior | The other components; this one on request |

A property the contract gives a default is declared on the component's own class, so a value set on an ancestor does not reach it. Set it on the element itself, as in step 3.

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

- Keep the contract true. If a class is added, renamed or removed, change `ui/<name>.json` too: the checker and every agent read it. Keeping the class names and state attributes means blocks, behaviors and the documentation still fit.
- The copy still reads the theme's tokens and applies its mixins, so it follows the theme.
- `npx master-ui status` says which owned components changed upstream since they were taken; `npx master-ui diff <name>` shows the change against the copy that was taken, kept in `ui/.base/`; after merging what is wanted, `npx master-ui accept <name>` records the new base.
- To give a component back, restore its package stylesheet and behavior imports and remove its entry from `owned` in `master-ui.json`. Delete only working and base files no other owned or added component uses; keep shared helpers and check framework imports before removing a local behavior. Build and exercise the returned component.

## What is not a customization

- A rule in the project's CSS that selects `.btn` (or any library class) and declares anything but its public custom properties: a face, an edge, a shadow, a padding. That is an untracked fork: use a token, a property, or own the component.
- Setting an undocumented component property. Use its contract's properties or separately documented public theme tokens; internal properties can change without notice.
- A new class that restyles a library component from outside (`.my-btn.btn { … }` with material declarations). A project modifier may set public properties and layout; a new material is a new component or an owned one.
