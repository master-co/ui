# Preview sizing

Use this specification when adding or changing a `ComponentPreview`, `FrameworkPreview` or `PagePreview`, or their shared viewport. These rules belong to the documentation site; they do not impose fixed heights on the published components.

## Reserve the height before loading

The server HTML must reserve the final iframe height for the selected width and pointer mode. Loading the iframe, hydrating it, loading fonts, changing the theme or operating a component must not resize the iframe. Do not restore content sizing, an initial placeholder height followed by a measurement, or height writes from load handlers, font events or `ResizeObserver`.

Measure while authoring and verifying, then write the chosen heights into the preview call. Runtime measurements may operate the width control or detect whether the scroll guard is needed; they must not determine the height. `PreviewViewport.svelte` owns this separation. A minimum height on the iframe's body does not reserve space in the outer page.

| Preview | Authored height selection |
| --- | --- |
| `ComponentPreview`, `FrameworkPreview` | Required positive `height`; optional `mediumHeight` at 30rem ≤ viewport width < 40rem, and `narrowHeight` below 30rem. Each omitted override falls back to `height`. |
| `PagePreview` | `height` for desktop (720px by default), `tabletHeight` for tablet (defaults to `height`), `phoneHeight` for phone (defaults to `tabletHeight`). Optional `touchHeight: { desktop, tablet, phone }` overrides the corresponding value under `(pointer: coarse)`. |

These are the iframe viewport's own pixels, before a page preview is scaled onto its stage. Component height queries must follow the actual iframe container, including a width chosen with its range or drag handle. The host window width alone cannot select the right height. Page previews select their authored values through the Desktop / Tablet / Phone controls and CSS.

Changing a width or viewport preset may select another authored height. That deliberate layout change is different from a delayed resize at the same width.

## Choose the room and alignment together

Use enough height for padding, focus rings, shadows, wrapped text and the example's demonstrated states. Small controls should have compact stages and sit in the middle; the switch's 96px stage is an example, not a universal height. A taller stage is appropriate when it reserves interaction space and the composition makes the spare room deliberate.

Measure intermediate widths as well as the widest and narrowest view. A split card can stack at an intermediate width and become taller than either endpoint. Use the relevant height override instead of making every desktop specimen that tall. Check touch targets at wide widths too: pointer mode and viewport width are independent.

For disclosures, check every alternative answer or panel and simultaneous expansion where allowed. For an auto-growing textarea or composer, reserve its documented maximum growth; for unbounded user resizing or intentionally scrolling examples, keep a fixed window and let the scroll guard operate. A resting screenshot alone does not establish the required height.

Default specimen alignment fills the viewport and centers content without stretching grid rows. Keep this alignment in a layer that authored utilities can override. Do not stretch a grid's rows to consume the reservation.

An invoker needs room on the side where its overlay opens. Use `content-start` when its body must remain top-aligned, including a block or a wrapping flex body. `items-start` alone does not top-align the flex lines of `flex-wrap` when `align-content` centers them. For example:

```mdx
<ComponentPreview name="region" title="Region" height={320}
  bodyClass="content-start flex flex-wrap items-start justify-center gap-md p-lg"
  html={example} />
```

The top layer cannot escape the iframe. Open selects, menus, submenus, popovers, tooltips and dialogs in the real frame. Check their actual bounds; a top-layer element may be clipped even when the document's `scrollHeight` reports no overflow. Coarse-pointer options can be taller than the closed select. A context menu needs room around the pointer, on both axes, not just around a fixed invoker.

Page and shell examples whose geometry depends on `dvh`, sticky regions or scrolling retain a deliberate viewport height. A whole block should fit at each preset unless scrolling is the subject. Never grow the frame until an intended scroll lesson disappears. The scroll guard may observe document growth inside a fixed frame without resizing it.

## Acceptance checks

For changes to a preview's content or sizing, verify the affected examples. For changes to the shared viewport or specimen alignment, verify all preview kinds and the affected pages across the site.

1. **Stable geometry.** At the same width, pointer mode and theme, compare the server-rendered iframe height with its height after hydration, lazy loading and font loading. It must remain unchanged during interaction. Check Preview / Code switching preserves the iframe's dimensions and state; Code may occupy a different amount of page space.
2. **Responsive coverage.** Check desktop, phone and intermediate widths, including both sides of applicable height and content-layout thresholds. Record the actual `clientWidth` / `innerWidth`; a requested width may have been clamped or overwritten. Exercise the range, drag handle and Fit control where present. For a page preview, check all three presets and their scaled stage.
3. **Real pointer modes.** Run both fine-pointer and coarse-pointer contexts. Narrowing a desktop browser does not activate touch styles, and choosing Phone in a page preview does not change the host's pointer mode. Include wide touch layouts when larger targets affect their height.
4. **Visible and open states.** Inspect light and dark screenshots at native scale, including the Paper example when shared preview rendering changes. Check padding, vertical balance, clipping and unintended scrolling. Use real clicks, hover, keyboard actions and text input for the relevant expanded states; confirm overlays fit, close and return focus as expected.
5. **Reliable evidence.** Wait for the intended fonts and images and confirm they actually loaded; a font promise resolving after a failed request is not proof of the intended typography. Keep the compiled component and utility styles intact when measuring. If a concurrent build or dev reload disrupts the audit, serve a completed build from an isolated snapshot with its assets and verify that the final source, rather than temporary DOM overrides, passes.

A measurement can propose a height; it does not replace visual judgment. Deliver a preview with neither accidental blank space nor clipped content, and state any browser or interaction coverage that remains unverified. Follow the repository's normal test, type-check and build requirements as well.
