# Master UI AI Instructions

Master UI publishes native HTML and CSS components for Master CSS v2, and the layouts and blocks built from them. Keep shared policy here.

## Layout

- `packages/ui` is `@master/ui`: CSS source only, no build step. `master.css` imports `theme.css` first, then every `components/<name>.css`, then the few `layouts/<name>.css`. Consumers import it after `@import '@master/css'`.
- `site` is the documentation site on `@master/internal-site` (Astro 7, Svelte 5, Master CSS 2). Pages live in `site/content/<section>/<slug>/content.mdx` with a sibling `metadata.ts` (`define()` from `@master/internal-site/utils/metadata`). `scripts/prepare.ts` writes one sidebar per section (`.categories/<section>.json`) and the search index before dev, build and type checks. The guide, components, layouts and blocks each have a sidebar of their own; none lists another section's pages.
- The site has three library sections beside the guide: `content/components`, `content/layouts` and `content/blocks`, listed in `site/components/catalog.ts` (`components`, `layouts`, `blocks`). Component docs use `site/components/ComponentPreview.astro` (isolated preview compiled from the published `@master/ui` source) and `ComponentSource.astro`; layouts and blocks use `PagePreview.astro`, a real viewport at a desktop, tablet or phone width scaled to the column. Add a new component to the catalog and `packages/ui/master.css`. Every page of the three sections has a cover, `site/components/cover/art/<slug>.astro` for a component and `art/<layouts|blocks>/<slug>.astro` for the others, shown on the `/components`, `/layouts` and `/blocks` overviews, which have no sidebar. A layout's or a block's own page has no sidebar and no contents rail either; only component pages read beside a sidebar. Its head, words, tables and pager keep the text column, 41rem, centred in the window as a component's page keeps it; only its page previews leave that column, centred on the same axis and running to the page's gutters, up to 96rem. Every preview, on any page, opens on Preview with its source behind a Code view of the same tray (`site/components/PreviewSwitch.astro`). A preview that scrolls lets the pointer through until it is clicked (`PreviewGuard.astro`), so scrolling the page never gets caught in one. A preview's document is transparent and stands on the tray's stage: dots for a component's specimen, `plain` for running text, and a hatched stage around the window of a page preview, so every edge has something to be seen against.

## Skills

Repository skills live in `.agents/skills/` (linked as `.claude/skills/`).

- `master-ui-components` (owned here): the tiers, the component contracts, size scale, documentation pattern and verification. Use it for any change to `packages/ui` or to a component, layout or block page.
- `master-ui-covers` (owned here): the cover drawings in `site/components/cover`: the stage, the drawing rules, the vocabulary and verification. Use it when a component, a layout or a block needs a cover or a cover is redrawn or placed on a page.
- `master-design` (managed by `@master/internal-skills`; run `bun run skills:sync`, never edit it here): craft judgment for surfaces, geometry, type, states and motion.

## Tiers

What separates the tiers is whether there is knowledge worth a class, not size. `master-ui-components` holds the full rules in `references/tiers.md`.

- **Component**: has a material, a state, a platform behavior or a geometry its pieces share. Semantic classes in `packages/ui/components`.
- **Layout**: where regions go and what scrolls. Markup written with utilities, on a page in `site/content/layouts`. A layout owns no material; a test fails a layout stylesheet that draws one. Only what utilities cannot say (a `dvh` height, a safe-area inset, a container threshold) is a layout class in `packages/ui/layouts`: `page`, `shell`, `auto-grid`, `form`.
- **Block**: one stretch of a page with a purpose, composed from components and utilities, on a page in `site/content/blocks`. A block invents no material: if it needs one, add the component or the modifier.
- A component does not own the page: it never positions itself unless standing there is its behavior (a sticky navbar, a dialog in the top layer).
- With none of the four kinds of knowledge, do not add a class, however often the markup repeats. Templates (whole pages) are not built yet.

## Component Contracts

The visual language is Master's Moonstone / Obsidian system. `site/content/guide/theme` documents it publicly and `master-ui-components` holds the full rules. The essentials:

- Native element and semantics first; components work without JavaScript wherever the platform has an element for the job. For a pattern with no native element (combobox, command palette, calendar, tree, context menu), the stylesheet draws every state from ARIA and native attributes, a script only moves those attributes, and the page shows the smallest script that drives it.
- Platform before script. Overlays are `<dialog>` and `popover` opened by `command` / `commandfor` / `popovertarget`; tooltips are `popover="hint"` with `interestfor`; placement is CSS anchor positioning; a select's list is `appearance: base-select`; layout follows `@container` and `:has()`; textareas grow with `field-sizing: content`; scroll-driven animations read scroll position; carousels use `::scroll-button()` and `::scroll-marker`; motion in and out uses `@starting-style` and `transition-behavior: allow-discrete`. Each is an enhancement gated by `@supports` over a working baseline, with the fallback stated in the stylesheet and on the component page.
- A class name must not be a preset utility (`list-item` is `display: list-item`); a test enforces it.
- Class selectors only: `.<component>`, parts `.<component>-<part>`, modifiers `.<component>-<modifier>` nested as `&.<component>-<modifier>`. Never element types or child combinators (`> svg`); pass values to children through custom properties such as `--icon-size`. No data attributes for variants. Tests enforce this.
- Tokens only, monochrome chrome, state as depth (raised → hover lift → pressed well), controls 32 / 38 / 44px.
- Soft edges: a contour is a half-pixel `box-shadow` ring, never a 1px border; shadows fade out instead of ending in a line; radii come from role tokens (`--radius-chip`, `--radius-control*`, `--radius-surface`) and a holder's corner is what it holds plus the inset.
- Continuous corners: every radius is `calc(<radius> * var(--corner-scale))` with `corner-shape: var(--corner-shape)`, a squircle where supported and a circle elsewhere. Pills, dots, avatars and thumbs set `corner-shape: round`.
- Gate hover with `(hover: hover)`, grow targets on `(pointer: coarse)`, remove travel under reduced motion, draw system-color outlines in forced colors.
- Never `!important`; the `utilities` layer must keep winning.
- Framework bindings (React, Svelte, Vue) and a copy-in registry are planned on top of these stylesheets; do not add them without a design discussion.

## Validation

Run `bun run test` (compiles every stylesheet against the preset and checks selectors), `bun run skills:check`, `bun run type-check` and `bun run build`. Preview markup is validated during the build: an invalid utility class fails it. Check visual changes in light and dark previews.

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
