# Master UI AI Instructions

Master UI publishes native HTML and CSS components for Master CSS v2, a contract for each of them, and the layouts, blocks and pages built from them. It is a contract and a default implementation: people and coding agents write to the contract; the stylesheet, the theme and the behavior are what a project may retune, replace or own. Keep shared policy here.

## Layout

- `packages/ui` is `@master/ui`. The source is CSS: `master.css` imports `theme.css` first, then every `components/<name>.css`, then the few `layouts/<name>.css`, and consumers import it after `@import '@master/css'`. Beside each stylesheet is its contract, `<name>.json`, following `contract.schema.json`. `themes/` holds other themes (`paper.css`), `behaviors/` the reference scripts for patterns with no native element, `frameworks/<react|svelte|vue>/` the framework components for the patterns that hold state with `frameworks/manifest.json` listing them, `check/` the contract checker and `bin/master-ui.js` the command that reads contracts, checks markup and copies a component's source or a framework component into a project. `bun run build` (in `packages/ui`, and before packing) writes `dist/`: the library compiled to plain CSS (`standalone.css`, `themes/*.css`, `base.css`), `contracts.json`, `theme.json` and the behaviors' types (`behaviors/*.d.ts`, read from their JSDoc), and rewrites the README's table of classes. `dist/` is not committed.
- `skills/master-ui` is the public skill for projects that use Master UI (`npx skills add master-co/ui --skill master-ui`). It is written for a consumer's agent, not for this repository; keep it true to the contracts, the CLI and the customization steps.
- `site` is the documentation site on `@master/internal-site` (Astro 7, Svelte 5, Master CSS 2). Pages live in `site/content/<section>/<slug>/content.mdx` with a sibling `metadata.ts` (`define()` from `@master/internal-site/utils/metadata`). `scripts/prepare.ts` writes one sidebar per section (`.categories/<section>.json`) and the search index before dev, build and type checks, then runs `scripts/exports.ts`, which builds the package and writes what programs read into `public/`: `llms.txt`, every page as Markdown (a component's page is written from its contract), `contracts.json`, `theme.json`, the compiled CSS and a registry in the shadcn format under `r/`. None of that is committed. The guide, components, blocks and pages each have a sidebar of their own; none lists another section's pages.
- The site has three library sections beside the guide: `content/components`, `content/blocks` and `content/pages`, listed in `site/components/catalog.ts` (`components`, `blocks`, `pages`). The components' `Layouts` category holds the layout tier that arranges a room: the arrangements, written with utilities, and the layout classes `auto-grid`, `bento`, `masonry`, `breakout`, `sticky-stack` and `form`. A page is a whole screen on one of the two frames, `page` and `shell`, whose classes are documented on the page of that name and on the app shell; `pageOfContract()` in the catalog says where a contract's page is. The retired `/layouts` URLs are sent to their new homes by `site/public/_redirects`. Component docs use `site/components/ComponentPreview.astro` (isolated preview compiled from the published `@master/ui` source; `stylesheet="paper"` compiles a theme after it), `ComponentSource.astro` and `ContractTable.astro`, which writes the Classes and Custom properties tables from the contract so a page never repeats it; blocks, pages and layouts whose point is a width use `PagePreview.astro`, a real viewport at a desktop, tablet or phone width scaled to the column. Add a new component to the catalog and `packages/ui/master.css`. Every page of the three sections has a cover, `site/components/cover/art/<slug>.astro` for a component, a layout among them, and `art/<blocks|pages>/<slug>.astro` for the others, shown on the `/components`, `/blocks` and `/pages` overviews, which have no sidebar. A block's or a page's own page has no sidebar and no contents rail either; only component pages, layouts among them, read beside a sidebar. Its head, words, tables and pager keep the text column, 41rem, centred in the window as a component's page keeps it; only its page previews leave that column, centred on the same axis and running to the page's gutters, up to 96rem. Every preview, on any page, opens on Preview with its source behind a Code view of the same tray (`Demo sourceMode="replace"` with shared `DocumentPreviewSwitch.astro`). A preview that scrolls lets the pointer through until it is clicked (`PreviewGuard.astro`), so scrolling the page never gets caught in one. A preview's document is transparent and stands on the tray's stage: dots for a component's specimen, `plain` for running text, and a hatched stage around the window of a page preview, so every edge has something to be seen against.

## Skills

Repository skills live in `.agents/skills/` (linked as `.claude/skills/`).

- `master-ui-components` (owned here): the tiers, the component contracts, the contract files, the behaviors, the framework components, size scale, documentation pattern and verification. Use it for any change to `packages/ui/components` or to a component page, and to decide which tier a thing belongs to.
- `master-ui-layouts` (owned here): the frame and the room, the layout classes and what they declare, regions and scrolling, landmarks, the pages and the layout pages and their verification. Use it for any change to `packages/ui/layouts`, to a layout in the components' `Layouts` category or to a page in `site/content/pages`.
- `master-ui-blocks` (owned here): the rules of a block, its frame, measure and heading group, which component does which job, the block page and its verification. Use it for any change to a page in `site/content/blocks`.
- `master-ui-covers` (owned here): the cover drawings in `site/components/cover`: the stage, the drawing rules, the vocabulary and verification. Use it when a component, a layout, a block or a page needs a cover or a cover is redrawn or placed on a page.
- `master-design` (managed by `@master/internal-skills`; run `bun run skills:sync`, never edit it here): craft judgment for surfaces, geometry, type, states and motion.
- `master-writing` (managed by the same package and sync command): shared technical writing, evidence and editing guidance.
- `master-ui-writing` (owned here): reader tasks, Guide organization, technical sources and the documentation/export workflow. Use for writing, restructuring or reviewing guides and library documentation.
- `master-ui-doc-illustrations` (owned here): technical explanation figures, their composition, text equivalents and verification. Use when a relationship benefits from a drawing; a working preview or a concise explanation may already be sufficient.

Select managed skills in `.agents/master-skills.json`, then run `bun run skills:sync` and commit the generated managed files and lock. Keep product-specific extensions in the repository-owned skills rather than editing synchronized copies.

## Documentation

Each guide has one primary reader task. `Design` (`/guide/design`) explains Master UI’s material, geometry and interaction choices; `Customization` helps choose the modification layer; `Default theme` (`/guide/theme`) documents the token roles and values; `Theming` (`/guide/theming`) teaches token overrides, scope, recipes and complete themes. Keep full procedures with their owner and link to them from decision guides. Renaming a title preserves its route and explicit heading anchors and updates its metadata and inbound labels.

Use working previews for material and behavior, code for reproducible instructions, and technical figures for relationships that prose or a specimen cannot explain clearly. Figures have no per-page quota or fixed canvas size. Covers identify catalog entries and follow their separate drawing rules. Essential meaning must remain available in prose, search and portable Markdown; new MDX presentations need their actual export paths checked. `master-ui-writing` and `master-ui-doc-illustrations` hold the workflow, while `master-ui-components` owns contract and preview requirements.

## Tiers

What separates the tiers is whether there is knowledge worth a class, not size. `master-ui-components` holds the full rules in `references/tiers.md`.

- **Component**: has a material, a state, a platform behavior or a geometry its pieces share. Semantic classes in `packages/ui/components`.
- **Layout**: where regions go and what scrolls. Markup written with utilities, documented in the components' `Layouts` category, `site/content/components/<slug>`. A layout owns no material; a test fails a layout stylesheet that draws one. Only what utilities cannot say (a `dvh` height, a safe-area inset, a container threshold, a track list, grid lanes, a count of siblings) is a layout class in `packages/ui/layouts`: the frames `page` and `shell`, and `auto-grid`, `bento`, `masonry`, `breakout`, `sticky-stack`, `form`.
- **Block**: one stretch of a page with a purpose, composed from components and utilities, on a page in `site/content/blocks`. A block invents no material: if it needs one, add the component or the modifier.
- **Page**: a whole screen, its regions and what scrolls, on one of the two frames, in `site/content/pages`: markup to copy, filled with blocks and components.
- A component does not own the page: it never positions itself unless standing there is its behavior (a sticky navbar, a dialog in the top layer).
- With none of the four kinds of knowledge, do not add a class, however often the markup repeats. A page is a frame and its regions; templates with a product's content in every region are not built yet.

## Component Contracts

Master Design owns general design principles and guidance at `https://design.master.co`; Master UI owns its design language at `/guide/design` and its executable theme, components, behaviors and contracts. `site/content/guide/theme` documents the default Moonstone / Obsidian token roles and values, while `master-ui-components` holds implementation rules. The documentation shell and site compositions belong to `@master/internal-site`, which consumes UI; published UI source must never import it. The essentials:

- Native element and semantics first; components work without JavaScript wherever the platform has an element for the job. For a pattern with no native element (combobox, command palette, calendar, tree, context menu), the stylesheet draws every state from ARIA and native attributes, a script only moves those attributes, and the page shows the smallest script that drives it.
- Platform before script. Overlays are `<dialog>` and `popover` opened by `command` / `commandfor` / `popovertarget`; tooltips are `popover="hint"` with `interestfor`; placement is CSS anchor positioning; a select's list is `appearance: base-select`; layout follows `@container` and `:has()`; textareas grow with `field-sizing: content`; scroll-driven animations read scroll position; carousels use `::scroll-button()` and `::scroll-marker`; motion in and out uses `@starting-style` and `transition-behavior: allow-discrete`. Each is an enhancement gated by `@supports` over a working baseline, with the fallback stated in the stylesheet and on the component page.
- A class name must not be a preset utility (`list-item` is `display: list-item`); a test enforces it.
- Class selectors only: `.<component>`, parts `.<component>-<part>`, modifiers `.<component>-<modifier>` nested as `&.<component>-<modifier>`. Never element types or child combinators (`> svg`); pass values to children through custom properties such as `--icon-size`. No data attributes for variants. Tests enforce this.
- Tokens only, monochrome chrome, state as depth (raised → hover lift → pressed well), controls 32 / 38 / 44px. A component stylesheet writes no color of its own: every literal lives in `theme.css` as a token or in a mixin, and a test fails one in a component. `themes/paper.css` must keep working with no component override; if a theme cannot reach something, add the token.
- Every stylesheet has a contract and the two change together: a class, a state or a public custom property added to one is added to the other. `tests/contracts.test.ts` holds them to each other, `tests/site.test.ts` holds every preview on the site to the contracts, and a rule the checker enforces (`elements`, `attributes`, `label`, `exclusive`) is added only when the stylesheet or the platform requires it.
- A behavior moves ARIA and native attributes and nothing else: no style, no state class, no measuring to place. Its contract's `keyboard` list is its specification, and it has a test. Where the pattern has a value no native control holds, the function it returns has a `value` to read and to set.
- Soft edges: a contour is a half-pixel `box-shadow` ring, never a 1px border; shadows fade out instead of ending in a line; radii come from role tokens (`--radius-chip`, `--radius-control*`, `--radius-surface`) and a holder's corner is what it holds plus the inset.
- Continuous corners: every radius is `calc(<radius> * var(--corner-scale))` with `corner-shape: var(--corner-shape)`, a squircle where supported and a circle elsewhere. Pills, dots, avatars and thumbs set `corner-shape: round`.
- Gate hover with `(hover: hover)`, grow targets on `(pointer: coarse)`, remove travel under reduced motion, draw system-color outlines in forced colors.
- Never `!important`; the `utilities` layer must keep winning.
- The registry is generated from the package; do not hand-write an item.

## Framework Components

React, Svelte and Vue get no bindings package and no wrapper for a class. `master-ui-components` holds the rules in `references/frameworks.md`. The essentials:

- A framework component exists only where the framework owns something: a value the application reads or sets, rows rendered from data, ids that join parts, or a lifetime. A contract with none of the four stays markup in every framework: do not add `Button`, `Badge` or `Card`. The bar is state, not markup that repeats.
- A component renders the contract's markup with literal class names, attaches the behavior and passes the value in and out through the behavior's `value` and its `input` and `change` events. It decides no key, no focus and no state attribute: whatever all three frameworks would have to decide goes into the behavior, written once. It draws the first value into the first render, so server HTML is right, and leaves the attributes to the behavior after that.
- The three are written in each framework's own idiom, not translated from one another, and held together by `tests/frameworks/scenarios.ts`: one scenario per component, run by a driver for each framework. A change to a component changes all three and its scenario.
- They ship as source in `packages/ui/frameworks`, copied by `master-ui add` and by the registry. They are not import paths of the package, and they take no dependency on a headless library (Base UI, Radix, React Aria, Reka, Bits): the platform and the behaviors do that work.

## Validation

Run `bun run test` (compiles every stylesheet against the preset, checks selectors, holds each stylesheet to its contract and every site preview to the contracts, runs the checker's and the behaviors' tests, and runs the framework scenarios in React, Svelte and Vue), `bun run skills:check`, `bun run type-check` (the site, then the framework components with `tsc`, `svelte-check` and `vue-tsc`) and `bun run build`. After a change to a framework component, a behavior or a stylesheet one of them draws, also run `bun run --cwd packages/ui test:browser`: it works the components in Chromium, where the top layer, anchor positioning, scrolling and animation exist. Preview markup is validated during the build: an invalid utility class fails it. After a change to tokens or mixins that should not change a pixel, compare `node --import tsx scripts/resolved.ts` (in `packages/ui`) before and after: it prints every declaration with its tokens resolved. Check visual changes in light and dark previews, and a theme change in the Paper preview on `/guide/theming` too.

## Documentation package identity

Other repositories pin the published UI version exactly. This repository's own site intentionally uses `@master/ui: workspace:*`: previews resolve that package, while portable exports are generated from `packages/ui`. Pinning a second registry copy would split those sources and prevent pre-publication CI from checking new components. Site preparation checks that the site and shared shell resolve the same physical workspace package. Registry verification compares every authored CSS, contract, behavior, framework, checker, CLI and package README/license file against the published archive, excluding generated `dist` and injected version metadata. A new release's deployment waits for this check and registry signatures/provenance. Site-only deployments must preserve the already released package sources.

## Versions and Releases

`@master/ui` is experimental and its versions are 0.x. The owner decided that a breaking change may ship in any 0.x release:

- A change may rename or remove any public name on `/guide/stability`. Do not add a deprecation period, an alias, a compatibility shim or a migration guide for it, and do not stop to ask how to release it: commit it with the type that describes it (`Drop` for a removal, `Improve` for a change, `Feat` for something new), which releases a patch. This replaces the generated policy's instruction to stop and ask about a breaking change for as long as the version is 0.x; a `BREAKING CHANGE:` footer is still rejected.
- Change the contract, the site and the README in the same commit as the code, so every release documents itself.
- Versions come from `v*` tags. `v0.0.0` is the baseline and was never published. Each push to `main` that carries a release commit releases the next patch (0.0.x); only the owner writes `Bump(Minor)` (the next 0.x) or `Bump(Major)` (1.0, which ends the experimental phase and needs this section rewritten).
- `main` is the only branch that releases; there are no prerelease branches. `.github/workflows/release.yml` runs on every push to `main`: CI (`ci.yml`, reused), `aronrepo release` (npm with provenance through trusted publishing, the version tag and the GitHub release), a check that the registry serves the version with provenance (`scripts/verify-package.mjs`), and the site deployment with that version in its header. Rerun the failed job to finish an interrupted release. npm trusts `master-co/ui` with the workflow file `release.yml`, so renaming that file needs the trusted publisher on npmjs.com changed first; the workflow passes no npm token.

## Commit Format

Commits and PR titles follow the generated Aronrepo policy below, enforced by the commit hook, the PR title check and CI. Edit `aronrepo.config.js` and run `bun x aronrepo agents --write` instead of editing the block.

<!-- aronrepo:commit-policy:start -->
<!-- Generated by `aronrepo agents --write`. Edit aronrepo.config.js and regenerate instead of editing this block. -->

## Commit and Release Policy

Release mode: **explicit**. Only the repository owner decides minor and major versions, with `Bump(Minor)` and `Bump(Major)` commits.

Commit headers and PR titles use `Type(Scope): Summary` or `Type: Summary`: a type from the table, an optional scope for the package or area, and a summary without a trailing period. Types and scopes match without case (`fix` is `Fix`); this repository writes them as the table does.

| Type | Release | Use for |
| --- | --- | --- |
| `Bump(Major)` | major | Release a major version. Only the repository owner decides it. |
| `Bump(Minor)` | minor | Release a minor version. Only the repository owner decides it. |
| `Bump(Patch)` | patch | Release a patch version without another release commit. |
| `Feat` | patch | A new capability: a new API, export, option, command, or package. |
| `Improve` | patch | A better existing capability without new API: behavior, output, messages, or defaults. |
| `Perf` | patch | Faster or lighter published code with the same behavior. |
| `Fix` | patch | A bug fix in published behavior. |
| `Deprecate` | patch | Mark a published capability as deprecated while it keeps working. |
| `Drop` | patch | Remove a published capability. |
| `Upgrade` | patch | Change a runtime dependency of a published package. |
| `Revert` | patch | Revert a commit. It releases what the reverted commit released. |
| `Docs(README)` | patch | Change a published package README. |
| `Docs` | none | Documentation that is not a published package README. |
| `Test` | none | Tests that cover existing behavior. |
| `Benchmark` | none | Benchmark harnesses, fixtures, and reports. |
| `Example` | none | Examples that do not ship in a package. |
| `Build` | none | Build tooling and development configuration. |
| `CI` | none | CI workflows and automation. |
| `Style` | none | Formatting and lint-only changes. |
| `Refactor` | none | Code changes that keep published behavior. |
| `Chore` | none | Maintenance: development dependencies, lockfiles, metadata, agent guidance, and unpublished workspaces. |

Legacy types are rejected: `Add` (use `Feat`), `New` (use `Feat`), `Update` (use `Improve`), `Misc` (use `Chore`).

### Release decisions belong to the owner

- Never write `Bump(Major)` or `Bump(Minor)` unless the user explicitly asked for that release level in the current conversation.
- Never add a `BREAKING CHANGE:` footer or a `Type!:` header. If a change breaks published behavior, stop and ask the user how to release it.
- Every type except `Bump(Minor)` and `Bump(Major)` releases at most a patch. Pick the type that describes the change, not the release level you want.

### Choosing a type

- Use a release type only when the commit changes files that ship in a published package (release paths) and affects published behavior, public API, release behavior, or published README content. Otherwise use a non-release type.
- Pick the type that describes the change: a new capability is `Feat`, a better existing capability is `Improve`, a bug fix is `Fix`, and a runtime dependency change is `Upgrade`.
- A commit that changes no release path must use a non-release type (`Chore`, `Refactor`, `Style`, `Test`, `Docs`, `Build`, `CI`, `Benchmark`, `Example`), even when it fixes or speeds up something.
- Split unrelated changes so each commit carries its own release level.

Non-release defaults:

- Agent instructions, prompts, and repository context: `Chore(Agent)`
- Sites, apps, and other unpublished workspaces: `Chore(<Scope>)`, `Refactor`, `Style`, or `Test`, even for fixes and performance work
- Tests that only cover existing behavior: `Test`
- Benchmark harnesses, fixtures, reports, and measurement-only changes: `Benchmark` (never `Perf`)
- Build tooling and dev-only configuration: `Build`; CI workflows: `CI`; formatting: `Style`
- Development dependencies, lockfiles, and routine metadata: `Chore(Deps)` or `Chore`
- Examples: `Example`; internal or site documentation: `Docs`
- Refactors that do not change published behavior: `Refactor`

### Release paths

Only changes to these files can release a version:

- `packages/ui/**`

Excluding: `**/tests/**`, `**/test/**`, `**/__tests__/**`, `**/*.{test,spec}.*`, `**/*.test-d.*`, `**/__snapshots__/**`, `**/__fixtures__/**`, `**/__mocks__/**`, `**/fixtures/**`, `**/benchmarks/**`, `**/examples/**`, `**/CHANGELOG.md`, `.github/**`, `.husky/**`.

### Before handing off commits

- `bun x aronrepo check --from origin/main --to HEAD`
- `bun x aronrepo explain`

`aronrepo explain` prints the next release level and the reason for each commit. Tell the user when it is not what they expect.
<!-- aronrepo:commit-policy:end -->
