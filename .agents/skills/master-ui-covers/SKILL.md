---
name: master-ui-covers
description: Draw, review and place Master UI covers, the small drawings of a component, a layout, a block or a page shown on the /components, /blocks and /pages overviews and on documentation pages. Use when one needs a cover, when redrawing or reviewing one, when adding a primitive or a glyph to the cover vocabulary, or when placing covers on a page.
license: MIT
metadata:
  author: master-co
  version: "0.4.0"
---

# Master UI covers

A cover is one drawing of a component on a stage. It is drawn in the library's own materials at their real size, so a reader recognizes the component before reading its name, and fifty covers side by side read as one family. One drawing serves light and dark: it holds no color of its own.

Use `$master-design` for craft judgment and `$master-ui-components` for the component being drawn. This skill supplies the rules that keep covers consistent with each other.

## Files

| File | Role |
| --- | --- |
| `site/components/cover/Cover.astro` | The stage. `<Cover slug="button" />` finds `art/button.astro`; `scheme="light"` or `"dark"` locks one scheme for a comparison. |
| `site/components/cover/cover.css` | The stage and the drawing vocabulary: materials, marks and the few component shapes. |
| `site/components/cover/theme.ts` | Scopes the published `@master/ui` theme to `.cover`. Never copy a token value into the site. |
| `site/components/cover/Glyph.astro` | The icons a cover may use. |
| `site/components/cover/art/<slug>.astro` | One drawing per component, a layout among them; the slug matches `site/components/catalog.ts`. |
| `site/components/cover/art/blocks/<slug>.astro`, `art/pages/<slug>.astro` | One drawing per block and per page. `<Cover slug="hero" kind="blocks" />` finds it. |

A component without a drawing shows a dashed outline on the overview, so a missing cover is plain to see.

## The stage

- The stage is a tray: 16 : 10, the surface corner, a hairline and no shadow. It is as wide as its column.
- The art is a **240 × 150 safe area** centered on the stage. Keep the subject within about **208 × 128** of it; a tall subject, such as a menu under its button, may use the full 150.
- The art is never stretched to fill a wider stage: more stage shows around it. Only a stage narrower than 240px scales the art down, which happens on a phone.
- The stage is decoration (`aria-hidden`); the name beside it carries the meaning.

## Drawing rules

1. **Real size.** A control is 38px (32px small) and so is a field, a switch 36 × 22, a ring half a pixel, a corner its role token. These come from the primitives; do not resize one to fill the stage. A small control is drawn in the row it lives in (a switch at the end of a settings row), not enlarged.
2. **Real materials.** Use the primitives and the theme tokens. A drawing never writes a color, a shadow or a radius value; where a mark needs a quieter ink or a nested corner, it names a token (`color: var(--color-text-muted)`, `--r: var(--radius-control-sm)`). Light and dark must both come out right from the same markup.
3. **Words are bars.** `cover-bar` stands for text: strong for a title or a label, plain for a sentence, faint for a hint or a placeholder. A character is written only where the glyph is the component: a keycap, an avatar's initials, an OTP digit, a page or step number. Keep initials narrow (`AL`, `JT`) so a stack does not clip them.
4. **One ink mark at most.** Ink goes on what the component is for: the primary action, the on or checked state, the current item. One state may take several marks when it is one fact (four stars of a rating); two different things never do. A component with no such state has no ink. Never hue, never the brand color: a status is drawn in muted ink, and even a swatch's colors are steps of ink.
5. **One subject, one idea.** Draw the state that names the component: a menu open under its button, a field focused with its caret, a switch on beside one that is off. Leave out everything a reader would not miss.
6. **Depth tells the story.** The stage is the tray; a sheet stands on it; a float passes over a sheet. A subject with no surface of its own (text, a hairline, a field, a small control, anything chip-toned) stands on a sheet, because that is where it lives and because a well or a chip tone disappears into the tray. A button, a chip and a choice are already faces and stand on the stage. A field that opens a list stands on the stage too, so the list has room under it.
7. **A page is a sheet that runs off the stage.** A component that belongs to a page's edge (a navbar, a banner, a tab bar) or dims a page (a dialog, a command palette) is drawn on one large sheet that leaves the stage on three sides, with faint bars for the content. Reuse the same sheet so these covers read as one family.
8. **The subject stays whole.** Context may run off the stage (the page under a dialog); the subject may not, unless running on is the point (a scroll area, a carousel) or it is larger than the safe area at real size (a calendar is 252px across). Then anchor its sheet inside the safe area and let it run off the end and the bottom of the stage; never shrink it to fit.
9. **Flow before coordinates.** Build with `cover-stack` and `cover-line` and their `--gap`; write sizes in pixels on the element. Use absolute positions only for things that overlap.
10. **Still.** A drawing has no animation and no interaction. The tile that holds it owns hover and focus.

## Layouts, blocks and pages

A block is drawn like a component: its pieces at real size, on a sheet, or on the page sheet that runs off the stage when it belongs to a page's edge (a header at the top, a footer at the foot). Where a block is several surfaces side by side (plans, quotations, figures), they stand on the stage as small sheets.

A page has no real size, so its cover is the kind that may be a **plan**: the whole page drawn small on a `cover-sheet cover-plan`, about 208 × 130. A layout whose point is the page around it (a breakout's edges, a sticky stack under its bar) is drawn as a plan too.

- Hairlines part the regions: `cover-rule` across, `cover-rule-upright` between columns.
- A region holds one or two bars to say what it is, never a drawing of its content. A block of content is a `cover-tone cover-skeleton`.
- The plan shows the region the page or layout is named for: the sidebar of an app shell, the three columns of a holy grail, the card in the middle of a centered page, the band that runs to the edges of a breakout.
- A layout that is small enough is drawn at real size instead (arrangements, an auto grid, a bento, masonry, a master-detail panel, a form).
- No ink on a plan, unless one small mark names the subject.

## Vocabulary

| Class | Draws |
| --- | --- |
| `cover-stack`, `cover-line` | A column and a row. `--gap` defaults to 8px and does not inherit. |
| `cover-center`, `cover-end`, `cover-round` | One mark centered in a box; a mark pushed to the end of its row; a true circle or pill. |
| `cover-plan` | On a `cover-sheet`: a page drawn small, with finer bars, for a layout. |
| `cover-sheet` | A raised face. `--r` sets its corner (default the surface corner). |
| `cover-float` | A floating face: a menu, a popover, a dialog, a toast. |
| `cover-flat`, `cover-chosen` | A flat face on one contour, and the chosen one on an ink contour. |
| `cover-tone`, `cover-skeleton` | A chip-toned face (an alert, inline code), and the same without a contour. |
| `cover-well`, `cover-focus` | A field, a slot or a track; with `cover-focus`, the focused one. |
| `cover-dashed` | A dropzone's dashed contour. |
| `cover-texture`, `cover-texture-grid`, `cover-texture-stripes` | On a `cover-well`: dots, a grid or stripes across it, in the texture ink. |
| `cover-media` | A picture: a tone with an inward outline. |
| `cover-control` | A button at rest. With `cover-control-sm`, `cover-control-lg`, `cover-square`, `cover-quiet`, `cover-pressed`, `cover-ink`. |
| `cover-ink` | The ink fill; bars and glyphs on it turn to the inverse ink. Also on `cover-chip`, `cover-dot`, `cover-star`, `cover-day`. |
| `cover-row` | A 32px row in a list. `cover-row-active` is under the pointer, `cover-row-checked` is the chosen value, `cover-row-current` has risen as a small sheet. |
| `cover-bar`, `cover-bar-strong`, `cover-bar-faint`, `cover-bar-figure` | Words, and a stat's large figure. Width is written on the element. |
| `cover-rule`, `cover-rule-upright`, `cover-guide` | A hairline, one between controls, and a tree level's guide. |
| `cover-check`, `cover-check-round`, `cover-check-on` | A checkbox, a radio, and the checked state. |
| `cover-switch`, `cover-track` + `cover-knob`, `cover-ring` | A switch; a track filled to `--fill` with its thumb; the same amount as a ring. |
| `cover-chip`, `cover-badge`, `cover-key`, `cover-tip` | A filter pill, a badge, a keycap and a tooltip. |
| `cover-avatar`, `cover-avatar-photo`, `cover-avatars` | Initials, a photo's tone, and a stack. Set `--cover-surface` on the surface they stand on and `--d` for their size. |
| `cover-dot`, `cover-star`, `cover-marker`, `cover-day`, `cover-spinner` | A marker dot, a rating star, a step's marker (`-current`, `-done`), a calendar day (`-today`) and a spinner at rest. |
| `cover-swatch`, `cover-swatch-on` | A color disc, set with `--swatch` as a step of ink, and the chosen one in its ring. |
| `cover-bubble`, `cover-bubble-sent` | A received message and a sent one, each tight at the corner toward its author. |
| `cover-mark`, `cover-quote`, `cover-band` | A wash of highlighter behind a phrase, a quotation's rail, and a banner's band. |
| `cover-rail`, `cover-rail-current`, `cover-pill`, `cover-pill-current`, `cover-grip` | A contents rail and its mark, a tab bar's pill, and a splitter's grip on an ink rule. |
| `cover-caret`, `cover-tab`, `cover-link`, `cover-fade`, `cover-fade-foot`, `cover-thumb`, `cover-scrim` | Shapes that belong to one component family. |
| `cover-page`, `cover-column`, `cover-marks`, `cover-wheel`, `cover-cell` | A file's folded page, a chart's bar (`--h` tall; `cover-ink` for the one that matters), a window's three marks, a wheel's column of values that fade away from the middle, and a heatmap's cell at `--tone` of ink. |
| `cover-span`, `cover-divide`, `cover-cite`, `cover-bar-struck` | On a `cover-track`: ink from `--from` to `--to` for a range; the line of a compare at `--fill`; a citation's numbered mark; a finished step's title with a hairline through it. |
| `cover-arc`, `cover-part`, `cover-legend` | A gauge's dial filled to `--fill` (0 to 1); a breakdown's segment `--w` wide at `--tone` of ink (with `cover-well` for what is left), and the dot of the same tone beside its name. |
| `cover-ticket`, `cover-stub`, `cover-device` + `cover-screen` | A ticket's two faces, which meet on a perforation between two notches; a phone's body `--d` wide and its screen. |
| `cover-elbow`, `cover-action`, `cover-mark-inserted` | A thread's line where it turns into a reply; a swipe's action in the well its row has uncovered; on a `cover-mark`: inserted words over a fine underline. |
| `cover-lane`, `cover-tick`, `cover-pin` | A gantt's bar from `--from` to `--to` of its track (with `cover-ink` for the current one); an uptime's day at `--tone` of ink; a hotspot's pin, placed by its middle on a `cover-media`. |
| `<Glyph name="…" />` | An icon on the 24px grid at a 1.5 stroke, sized by the control that holds it (`--glyph`). |

Extend the vocabulary before working around it. A new primitive copies its recipe from the component's stylesheet in `packages/ui/components`, reads tokens only, and is named for what it draws. Add a glyph's path to `Glyph.astro` first; keep the 24px grid and round caps. A nested corner is written as the component writes it: `--r: calc(var(--radius-control-sm) + 4px / var(--corner-scale))` is a small control's corner plus a 4px inset.

## Draw a cover

1. Read the component's stylesheet header and its page. Write one sentence that says what the cover shows; it becomes the comment at the top of the drawing.
2. Choose the state that names the component and where the ink goes, if anywhere.
3. Compose from primitives in `art/<slug>.astro`. Start from a neighbor of the same kind and match its sheet width (168 to 200px) and padding (16px).
4. Look at it between its neighbors on `/components`, in light and in dark. Its weight should match theirs: no cover is the loudest or the emptiest in its row without a reason.
5. Verify as below.

## Place a cover

- The overview (`site/components/ComponentIndex.astro`) shows every page of one tier in catalog order, grouped by category, four columns where they fit; `kind="blocks"` and `kind="pages"` list the other sections. It has no sidebar: `site/sections/library.astro` leaves it out for the three overview pages, and for every block and every page.
- A component page shows its own cover at the end of the page head and its neighbors' covers in the pager; `site/layouts/Doc.astro` does both from the page's pathname, so a page writes nothing.
- Link to other components with tiles, not bare covers: `<ComponentLinks slugs={['input', 'listbox']} />` in MDX under a `## Related` heading, or `ComponentTile` in an Astro page, as the homepage does. Pass `kind="blocks"` or `kind="pages"` to link the other sections. A tile is the cover, the name and, on request, the description, and it owns hover and focus.
- A bare `<Cover slug="menu" class="w(288)" />` is for a figure. Give it at least 240px so the art keeps its real size; it follows the page's theme without help.
- For a light and dark comparison, place two covers with `scheme="light"` and `scheme="dark"`.

## Verify

1. Open `/components`, `/blocks` or `/pages` in the site (`bun run dev`, port 3300). Changing a page's kind (`content.mdx` to `page.astro`) or the section shell needs a restart of the dev server.
2. Check light and dark. Each cover resolves its tokens from its own `color-scheme`, so cloning the covers into a scratch grid with `color-scheme: light` and `dark` gives a contact sheet of both; enlarge it with CSS `zoom` to inspect, and judge final weight at 100%.
3. Measure rather than guess: the subject's box against 208 × 128, a control's height, `scale: 1` on `.cover-art` at four columns.
4. Check two columns on a phone width, where the art scales down, and a keyboard pass over the tiles.
5. Run `bun run test`, `bun run skills:check`, `bun run type-check` and `bun run build`.
6. Report what was measured and what was judged, and name anything left unverified (forced colors, a 1x display, an engine without `corner-shape`).

## Review checklist

- Does the reader name the component from the drawing alone?
- Is everything at real size, in tokens, with no value written in the drawing?
- Is there at most one ink mark, on the right thing, and no hue?
- Are words bars, in no more than three tones?
- Does the subject sit whole inside the safe area, optically centered?
- Does it hold up in both schemes and beside its neighbors?
