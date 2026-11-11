/**
 * Previews render in the typography the theme guide recommends: Geist with its stylistic sets, light regular text.
 * The document has no canvas of its own. The tray's stage shows through it, so a specimen stands on the stage's
 * material (plain, dots or hatch) and a page paints its own surface.
 */
export const previewHead = `<style>
@font-face { font-family: Geist; font-style: normal; font-weight: 100 900; font-display: block; src: url("/fonts/GeistVariable.woff2") format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-style: normal; font-weight: 400; font-display: block; src: url("/fonts/IBMPlexMono-Regular.woff2") format("woff2"); }
:root { --font-sans: Geist; --font-mono: "IBM Plex Mono"; --font-feature-sans: "ss02", "ss03", "ss04", "ss06", "ss07", "ss08"; }
html { background: transparent; }
body { font-family: var(--font-family-sans); font-feature-settings: var(--font-feature-sans); font-weight: 350; -webkit-font-smoothing: antialiased; }
</style>`

/** Fill the reserved specimen stage without stretching grid rows or leaving compact controls at its top. */
export const specimenHead = `${previewHead}<style>
@layer theme,base,defaults,components,utilities;
@layer defaults { body { align-content: safe center; } }
body { min-height: 100dvh; }
</style>`
