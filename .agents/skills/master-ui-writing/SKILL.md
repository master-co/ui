---
name: master-ui-writing
description: Write, restructure and review Master UI guides and library documentation. Clarify reader tasks, verify claims against contracts and source, and preserve usable previews, navigation, search and Markdown exports. Use for article titles, summaries and prose; component implementation and cover drawing have their own skills.
---

# Master UI writing

Use [master-writing](../master-writing/SKILL.md) for shared prose, evidence and editing guidance. This adapter owns Master UI's article boundaries, technical sources and content workflow. Keep ordinary edits narrow; a wording correction does not require a new diagram, an outline or an article rewrite.

## Give each page a job

Read the affected article, its metadata and adjacent guides before changing its structure. Identify what the reader needs to decide, do or look up. For substantial work, outline the reader questions and the example or evidence that answers each. Preserve useful explanation instead of reducing every page to steps.

The Guide mixes task guides with conceptual references. Its categories in `site/scripts/prepare.ts` organize getting started, customization, building and reference. Keep one primary purpose per page; link to the owner of a prerequisite instead of teaching it again. A shared subject alone does not justify merging pages or adding another URL.

The customization guides divide their work this way:

| Page | Reader task | Keep elsewhere |
| --- | --- | --- |
| `/guide/customization` | Choose a utility, theme token, component property, theme or owned source | Full theme-authoring instructions |
| `/guide/theme` (Default theme) | Understand the default material and look up token roles and values | Repeated token-override tutorials |
| `/guide/theming` (Theming) | Override and scope tokens, define recipes and build a theme | Repeated modification-layer decision tables |

A short example can make a choice concrete even when the full procedure lives elsewhere. Preserve URLs and explicit heading anchors when renaming headings or page titles. Update inbound link labels, metadata descriptions and sidebar subjects together. Read current neighboring metadata before changing categories or order; do not invent a parallel navigation list.

Component pages document one contract; use [master-ui-components](../master-ui-components/SKILL.md) and its [documentation pattern](../master-ui-components/references/documentation.md). Layout and block pages teach composition at their respective tiers. They do not create new material or redefine component contracts. The public consumer skill in `skills/master-ui` serves users of the library, while these repository skills serve its authors.

## Verify the explanation

Use current implementation and tests to establish a claim; existing prose or a diagram is only a starting point. Follow shared writing guidance for official, version-matched sources when describing external standards or compatibility.

| Claim | Primary local evidence |
| --- | --- |
| Classes, parts, required markup, properties and states | `packages/ui/components/*.json`, matching CSS and `contract.schema.json` |
| Default tokens, mixins, cascade and alternate material | `packages/ui/theme.css`, `themes/paper.css`, consuming component rules and compiled output |
| Keyboard, value, events and script requirements | Contract `keyboard`/`script`, `behaviors/`, behavior tests |
| Framework ownership, rendering and lifetime | `frameworks/manifest.json`, framework source and shared scenarios |
| CLI commands, copied source and exports | `bin/master-ui.js`, `check/`, build scripts, package exports and CLI tests |
| Browser enhancement and fallback | Stylesheet support gates, contract `platform`, browser tests and current official platform sources |

Distinguish runtime custom properties from compile-time mixins, a theme token inherited from a scope from a component property declared on its own element, and native platform behavior from a reference script. A theme changes tokens and recipes; owning a component changes its implementation. Keep these distinctions in examples, captions and diagrams.

Avoid claims such as “every token” or “works without JavaScript” unless the evidence supports the full scope. State the actual fallback or script requirement. When source and prose disagree, resolve what is true and correct the requested documentation; report implementation changes outside the authorized scope separately.

## Choose the teaching surface

- Use code for exact imports, markup, overrides and commands. Include the context needed to reproduce the example and explain the result readers can check.
- Use `ComponentPreview` for actual component material and states, and `PagePreview` for layouts and blocks. Keep working previews when they teach the point; use the component skill's preview rules when changing them.
- Use a table for comparable token roles or choices. Generate contract classes and property tables with `ContractTable`; do not maintain a second copy in prose.
- Use [master-ui-doc-illustrations](../master-ui-doc-illustrations/SKILL.md) when a relationship needs a drawing: token scope, theme overrides, contract versus implementation, or a sequence that a specimen cannot show. A short paragraph or an existing preview may already be enough. There is no figure quota.
- Use [master-ui-covers](../master-ui-covers/SKILL.md) for catalog cover drawings. A cover identifies a component, layout or block; it does not establish a technical claim.

## Integrate and verify

Author pages in `site/content/<section>/<slug>/content.mdx` and sibling `metadata.ts`, with explicit MDX imports. Default to the site's English; preserve identifiers and anchors in requested translations. A content edit normally uses the existing page template.

`site/scripts/prepare.ts` generates sidebar data and search, then calls `exports.ts` for portable Markdown, `llms.txt` and package outputs. These generated files are not authored or committed. Component Markdown comes from contracts; guide, layout and block Markdown comes from MDX conversion. A new MDX component is not automatically understood by either the search parser or Markdown converter. Keep essential explanations in authored prose and update the relevant adapter when meaningful content would otherwise disappear. For shared document components, inspect the pinned component API and its actual consumer export support before adopting it.

Run the checks required by the root `AGENTS.md`. Inspect the affected generated Markdown, search entry, sidebar title and links as well as the rendered page. Check code samples, preview labels and figure explanations survive in portable output; a successful build alone does not establish this. If the converter changes, add a focused test for the content it must preserve rather than matching editorial wording.

For substantial restructuring, previews, figures or shared presentation changes, inspect the affected pages at narrow and wide widths in light and dark. Exercise changed interactions and check the lesson, legibility, clipping and reading order. See the component skill's [verification](../master-ui-components/references/verification.md) for preview-specific checks. Do not add screenshot infrastructure for an isolated prose correction.

Report substantive changes, checks actually run and remaining limitations. Complete authorized repository edits without adding publication or external messaging to the task.
