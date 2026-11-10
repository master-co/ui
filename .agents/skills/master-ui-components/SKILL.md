---
name: master-ui-components
description: Author, review and document Master UI components, the native HTML and CSS stylesheets in packages/ui. Use when adding or changing a component, its classes, tokens, states or sizes, or its documentation page, and when reviewing component CSS for selector, material, geometry and accessibility rules.
license: MIT
metadata:
  author: master-co
  version: "0.1.0"
---

# Master UI components

A Master UI component is one native element with the right semantics, one stylesheet in `@layer components`, and markup a reader can copy into any stack. It must work without JavaScript and read the Moonstone / Obsidian theme only through tokens.

Use `$master-design` for craft judgment (surfaces, geometry, type, states, motion). This skill supplies the contracts that make components consistent with each other.

## Before changing a component

Read `packages/ui/theme.css`, the component's stylesheet, a neighboring component of the same kind, its page in `site/content/components/<slug>/`, and `site/content/guide/theme/content.mdx`. Keep the public vocabulary small: a new class or custom property is a public API.

## Selector contract

These rules are enforced by `packages/ui/tests/master.test.ts`.

- **Class selectors only.** Root `.<component>`, parts `.<component>-<part>`, modifiers `.<component>-<modifier>`. Parts are nouns (`segmented-item`, `field-hint`); modifiers are sizes, variants and shapes (`btn-sm`, `btn-primary`, `btn-square`).
- **Never select by element type or child combinator.** No `> svg`, `> input`, `button`, `a`, `label`, `*`. Markup changes (a framework wraps an icon in a `<span>`, an `<img>` replaces an `<svg>`) must not break a component, and a component must not restyle content it does not own.
- **Pass values down with custom properties.** A component sets `--icon-size`, `--icon-offset` or `--spinner-size`; the child's own class reads them. Put `icon` on the icon itself.
- **Nest modifiers as compound selectors** inside the base rule (`&.btn-primary`), so they do not depend on file order.
- **No data attributes for variants.** States use native pseudo-classes and ARIA on the element itself: `:checked`, `:disabled`, `:focus-visible`, `aria-pressed`, `aria-current`, `aria-selected`, `aria-busy`, `aria-invalid`. A descendant state may be queried by class: `:has(.segmented-input:checked)`.
- Never use `!important`, IDs or anything that would beat a consumer's utilities: the `utilities` layer must keep winning.

## Material and tokens

- Read tokens only: `--color-surface-*`, `--color-line-*`, `--color-text-*`, `--color-focus`, status `--color-info|success|warning|danger`, `--shadow-pressed|flat|raised|raised-hover|lifted|floating|overlay`, `--radius-*`, `--easing-glide`, `--duration-press|quick|base`, `--font-weight-control`. Never raw palette steps in component rules; new public tokens go in `theme.css` `@theme`.
- Monochrome chrome: ink and pearl. Hue only for status, always with words; gold only on `btn-gold`.
- State is depth, not hue: rest raised → hover lifts 0.5px to raised-hover → press sinks into the well. Disabled drops to a flat well with disabled ink.
- `light-dark()` accepts colors only: put it in gradient stops, never around a gradient.

## Geometry and type

See [sizes and geometry](references/geometry.md) for the scale. In short: controls are 32 / 38 / 44px (fields 40px), radii nest by the inset between surfaces, icons are 14 / 16 / 18px at a 1.5 stroke, labels use `--font-weight-control` and never change weight between states.

## States and platforms

Every interactive component covers, in this order of checks: rest, hover, active, focus-visible, selected or checked, disabled, busy or invalid where they apply, and their combinations.

- Gate hover with `@media (hover: hover)`; touch must not stick in a hover state.
- `@media (pointer: coarse)`: targets grow to 44px; fields use at least 16px text so iOS does not zoom.
- `@media (prefers-reduced-motion: reduce)`: remove travel (lift, stretch), keep the state change.
- `@media (forced-colors: active)`: shadows vanish, so draw the edge with a system-color `outline` (never a layout-changing border) and keep checked marks visible with `forced-color-adjust: none` plus system colors.
- Restyled native inputs reset `margin`, `padding` and `border` so host styles cannot distort them.
- Name transitioned properties; never `transition: all`.
- Never transition `background` across a gradient. A gradient cannot interpolate, so it swaps instantly while `background-color` fades from transparent and the control flashes for a frame. Swap faces instantly, ease only depth (`box-shadow`), travel and ink, and put a solid color under every gradient face (`@apply --surface-sheet` does). Solid-to-solid fills, such as a checkbox filling with ink, may fade.

## Add or change a component

1. Write `packages/ui/components/<slug>.css` with a header comment that states its material and geometry.
2. Import it in `packages/ui/master.css` and add its classes to the native-class list in `packages/ui/tests/master.test.ts`.
3. Add it to `site/components/catalog.ts` and write `site/content/components/<slug>/{metadata.ts,content.mdx}` following [the documentation pattern](references/documentation.md).
4. Update the class table in `packages/ui/README.md`.
5. Verify as in [verification](references/verification.md).
