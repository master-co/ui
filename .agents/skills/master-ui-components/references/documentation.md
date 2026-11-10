# Documentation pattern

Each page lives in `site/content/components/<slug>/` with `metadata.ts` (`define()` with title, description and category) and `content.mdx`.

1. One opening paragraph: what the component is in material terms and which native element carries it. Then a default `ComponentPreview`.
2. Sections for variants, sizes, states and composition, each with a short reason to choose it and one preview. Use the component's own classes; utilities only lay out the specimen.
3. An Accessibility section when the component has semantics a reader could get wrong.
4. A Classes table, then a Custom properties table when the component exposes any.
5. `## Source \{#source\}` with `<ComponentSource name="<slug>" />`, which shows the stylesheet clamped under a fade with an Expand control (`ExpandContent`). Long code that is reference material always uses this clamp, never a full open listing or a closed disclosure.

Previews follow the site theme. Pass `theme` only when the example is about color schemes. Invalid utility classes fail the build, so keep examples on documented preset utilities. Headings carry explicit ids: `## Sizes \{#sizes\}`.

Write in plain, present-tense English. State facts and the reason for a choice; avoid marketing words.
