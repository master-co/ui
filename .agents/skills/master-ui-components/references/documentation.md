# Documentation pattern

Each page lives in `site/content/components/<slug>/` with `metadata.ts` (`define()` with title, description and category) and `content.mdx`.

1. One opening paragraph: what the component is in material terms and which native element carries it. Then a default `ComponentPreview`.
2. Sections for variants, sizes, states and composition, each with a short reason to choose it and one preview. Use the component's own classes; utilities only lay out the specimen.
3. An Accessibility section when the component has semantics a reader could get wrong.
4. When the component uses a platform feature as an enhancement, say which one, what it replaces and what a browser without it shows. Name engines only for a feature that is not yet in all of them.
5. A Classes table, then a Custom properties table when the component exposes any.
6. `## Source \{#source\}` with `<ComponentSource name="<slug>" />`, which shows the stylesheet clamped under a fade with an Expand control (`ExpandContent`). Long code that is reference material always uses this clamp, never a full open listing or a closed disclosure.

Previews follow the site theme. Pass `theme` only when the example is about color schemes. Invalid utility classes fail the build, so keep examples on documented preset utilities; a bare number in parentheses is pixels (`w(280)`, `min-h(320)`). Headings carry explicit ids: `## Sizes \{#sizes\}`.

A preview is an iframe sized to its content, and the top layer cannot leave it. Give an example that opens a dialog, a popover, a menu, a tooltip or a select list room to open in with a minimum height on the body: `bodyClass="flex items-start justify-center p-lg min-h(320)"`. Pass `responsive` when the example is about a container query, so the reader can narrow it.

Images in examples come from `site/public/demo/` (`/demo/moonstone.svg`, `/demo/portrait-1.svg`), never from another host.

Write in plain, present-tense English. State facts and the reason for a choice; avoid marketing words.
