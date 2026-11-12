# Documentation pattern

This is the pattern for a component page. Layout and block pages follow [tiers](tiers.md). Use [master-ui-writing](../../master-ui-writing/SKILL.md) for reader tasks, prose, technical evidence, navigation and search/Markdown verification. Guide articles follow that writing workflow rather than the component-page template below.

Each page lives in `site/content/components/<slug>/` with `metadata.ts` (`define()` with title, description and category) and `content.mdx`.

1. One opening paragraph: what the component is in material terms and which native element carries it. Then a default `ComponentPreview`.
2. Sections for variants, sizes, states and composition, each with a short reason to choose it and one preview. Use the component's own classes; utilities only lay out the specimen.
3. An Accessibility section when the component has semantics a reader could get wrong.
4. When the component uses a platform feature as an enhancement, say which one, what it replaces and what a browser without it shows. Name engines only for a feature that is not yet in all of them.
5. `## Classes \{#classes\}` with `<ContractTable name="<slug>" />`, then `## Custom properties \{#custom-properties\}` with `<ContractTable name="<slug>" show="properties" />` when the contract publishes any. Both are written from the contract; `show="states"` and `show="keyboard"` are there for a page that wants them. Do not write these tables by hand.
6. `## Source \{#source\}` with `<ComponentSource name="<slug>" />`, which shows the stylesheet clamped under a fade with an Expand control (`ExpandContent`). Long code that is reference material always uses this clamp, never a full open listing or a closed disclosure.

Every preview is one tray with two views, chosen by a segmented control in its head: Preview, the default, and Code, the markup a reader copies. The preview adapters use shared `Demo sourceMode="replace"` and `DocumentPreviewSwitch.astro`; the choice is a pair of native radios read by the stylesheet, so no script is involved. Do not repeat a preview's markup in a fenced block under it.

A preview that scrolls is guarded (`site/components/PreviewGuard.astro`): a reader scrolling the page passes over it, a pill says "Click to interact", and one click makes it live until the pointer leaves, Escape, or a press elsewhere. It applies by itself to a preview whose document is taller than its viewport, or that holds a scrolling region at least half its size or 320px tall; a small scroller inside a specimen is left alone, and the keyboard is never guarded. Prefer a preview that does not need it: size the example so it fits, and keep scrolling for examples about scrolling.

A preview's document is transparent, so the specimen stands on the tray's stage. `ComponentPreview` takes `background`: `dots`, the default, is a field an object is seen against, so the edge of a well, a tray or a quiet control is found where a flat tone would swallow it; `plain` is for running text (headings, quotes, links, code), which a pattern only makes harder to read; `stripes` is for a specimen about empty room. Both are the library's own `texture`, drawn in the hairline's ink so the stage stays quieter than anything standing on it. Do not paint a background on the preview's body to separate a specimen from the stage: choose the material.

Previews follow the site theme. Pass `theme` only when the example is about color schemes. Invalid utility classes fail the build, so keep examples on documented preset utilities; a bare number in parentheses is pixels (`w(280)`, `min-h(320)`). Headings carry explicit ids: `## Sizes \{#sizes\}`.

A preview may hold a `<script>` when the component needs one to be seen working. Keep it to the pattern itself, without a framework, template literals or backticks (the markup sits in a template literal), and scope it to ids that are unique on the page. The same script is what the page tells the reader to write.

Every preview reserves an authored, fixed iframe height before loading. Follow [preview sizing](previews.md) for the height props, responsive and touch overrides, alignment, interaction space and acceptance checks. Read it when adding a preview or changing its content or shared rendering. Pass `responsive` when the example is about a container query, so the reader can narrow it.

Images in examples come from `site/public/demo/` (`/demo/moonstone.svg`, `/demo/portrait-1.svg`), never from another host.

Use [master-ui-doc-illustrations](../../master-ui-doc-illustrations/SKILL.md) when the explanation needs a relationship diagram alongside its specimen. A preview demonstrates the real component; an explanatory figure and a catalog cover have different jobs.

## The stage of a preview

`background` picks the stage a specimen is seen against. The rule is one sentence: words never stand on dots.

- `dots`, the default, is for a specimen that is a face: a button, a card, a field without a label, anything with its own edge.
- `plain` is for a preview in which any text stands directly on the stage: a label over a field, rows of a list, a sentence, a quiet button's label, a hairline. The pattern runs through the letters and makes them harder to read.
- When half or more of a page's previews need `plain`, set it on all of them, so the stage does not change from one example to the next. Typography pages are always plain.
- A specimen that has no surface of its own and is shown in a card (a stat, a chart, a checklist) stands on a face, so dots are right.
