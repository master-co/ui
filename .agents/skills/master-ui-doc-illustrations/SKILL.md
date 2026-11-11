---
name: master-ui-doc-illustrations
description: Create or refine explanatory figures in Master UI documentation when a relationship, mechanism or comparison is clearer spatially. Covers source-accurate diagrams, article integration and visual verification; component specimens and catalog covers keep their existing workflows.
license: MIT
metadata:
  author: master-co
  version: "0.1.0"
---

# Master UI documentation illustrations

An explanatory figure helps a reader infer something: which layer owns a decision, how regions relate, what changes between states, or why a visual result follows from a rule. Choose a figure when that inference benefits from spatial arrangement. A short explanation, table or working specimen may already do the job; there is no figure quota for an article.

Use [master-ui-writing](../master-ui-writing/SKILL.md) for the article's purpose, order and wording, and [master-design](../master-design/SKILL.md) for visual craft. This skill owns the explanation drawn inside the article.

## Choose the right form

- **Working appearance or behavior:** use `site/components/ComponentPreview.astro` or `PagePreview.astro`, following [master-ui-components](../master-ui-components/SKILL.md). Keep the published markup and its Code view as the specimen. An illustration may explain the specimen, but does not replace proof that the actual component works.
- **Recognition on an overview or page head:** use [master-ui-covers](../master-ui-covers/SKILL.md) and its existing drawing vocabulary. Covers use text bars and a fixed stage for recognition; explanatory figures can need readable labels and a different composition.
- **A relationship or mechanism:** use a small labeled diagram, annotated specimen or controlled comparison. Prefer native HTML/CSS for flowing labels and inline SVG for precise paths and geometry. Use an existing image when its appearance is the evidence. Introduce a drawing dependency or shared abstraction only when the actual work benefits from it.

## Establish what the drawing claims

Write the intended inference in one sentence before composing the figure. Check each meaningful label, arrow, boundary and state against the relevant source: a contract, stylesheet, behavior, framework component or build script. Read those sources rather than deriving mechanics from an existing illustration or its caption.

An arrow can imply time, inheritance, dependency or transfer; name the relationship where it could be ambiguous. Nested boxes imply ownership or containment. Distinguish schematic depth from DOM nesting, CSS cascade from import order, and a default value from a rule consumers must follow. Do not turn a conditional enhancement into a universal behavior. Identify a schematic or magnified detail when its proportions are not literal.

For a comparison, hold the surrounding markup and unrelated variables constant. A theme comparison uses the same component specimen; a corner comparison keeps its bounds and explains any scale adjustment. Show the difference the reader is meant to judge, without introducing another difference that could explain it.

## Compose for the article

Place the figure beside the paragraph that needs it. Let the explanation determine the number of panels and aspect ratio; use the article's actual available width rather than a fixed canvas size. Group by the relationship being taught, keep labels near their subject, and leave connectors a clear route. Prefer direct labels over a legend the reader must repeatedly decode.

Use the site's typography and semantic tokens for drawing chrome. Read `site/styles/globals.css` and a nearby implementation before adding styles; component previews compile the library independently, so do not assume their classes or tokens are available in ordinary article markup. Use plain space behind words. Keep hierarchy quiet enough that the emphasized relationship is easy to find.

Light and dark must preserve the same distinctions. A diagram about material uses the actual material being explained; a conceptual diagram need not imitate a stack of raised cards. Color may carry subject data, but labels, shapes or line styles must carry its meaning too. Avoid baking technical labels into a bitmap when live text can stay readable and searchable.

At narrow widths, reflow panels and labels or simplify the composition before shrinking text. Reserve image dimensions or an appropriate aspect ratio to avoid layout shifts. Check strokes, arrowheads, text wrapping and overlap at the rendered size, not only on a large source canvas.

## Integrate with all reading surfaces

Keep the conclusion and any essential distinctions in ordinary MDX prose, a list or a table beside the figure. A caption explains why the figure is there. An image's alternative text conveys the meaningful visual information not already supplied nearby; a fully redundant drawing can be hidden from assistive technology. For an informative inline SVG, give it an accessible name and useful description, with unique IDs when repeated. A visual label inside an imported component is not a substitute for article text.

The current export paths have specific limits:

- `site/scripts/prepare.ts` builds search with `generateSearchPages` from `@master/internal-site`. It reads MDX syntax, not a rendered Astro page; imported component internals, image alt attributes and prop strings do not become searchable explanation automatically.
- `site/scripts/exports.ts` converts guide, layout and block MDX with `mdxMarkdown`. It handles known previews and source components explicitly; it does not render arbitrary Astro components. A new figure component needs an intentional Markdown representation or omission, with the complete explanation preserved alongside it. If conversion needs a change, make the smallest targeted change and check its output.
- Component Markdown is generated from contracts, not the component's MDX article. A figure can explain an existing contract, but a new public rule belongs in the contract and its documentation, following `master-ui-components`.
- `site/public/<section>/<slug>.md`, `site/public/search/en.json` and `site/public/llms.txt` are generated. Change their sources, never their generated output.

Keep source assets editable and with the site. Existing static specimen images live in `site/public/demo/`; existing drawings are Astro components under `site/components/cover/`. Choose a suitable location for new explanatory art without adding it to the cover catalog merely to reuse its renderer. A single figure does not require a new diagram framework or an asset-generation pipeline.

## Verify the inference and the rendering

Read the finished drawing without its surrounding explanation: do its arrows, grouping and emphasis support the intended inference, and could they imply something false? Then read the article without the image: does the important knowledge survive?

Open the affected page in the site, using `bun run dev` (port 3300) or an existing server. Use the available browser tools; Playwright is already a development dependency in `packages/ui` if a local browser script is useful. Reuse the running server rather than starting a second Astro instance. Capture the figure in its article context in light and dark, at a reading width and a narrow width; wait for fonts and images before judging it. Inspect a real component inside its preview iframe when its rendering is part of the explanation.

Follow the repository's required checks. For figure integration, `bun run --cwd site prepare-site` regenerates the Markdown and search outputs for inspection; `bun run type-check` and `bun run build` catch Astro/MDX and preview integration errors. Verify the generated page contains the explanation and no unresolved figure invocation, and that a meaningful term from the explanation appears in that page's search entry. New conversion logic warrants a focused behavior check; a prose-only caption edit does not need a new test harness.

Report what the figure teaches, where it is integrated and what was checked. Distinguish source-verified semantics from visual judgment, and state any unavailable browser or theme check rather than claiming it passed.
