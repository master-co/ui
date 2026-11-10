# Verification

1. `bun run test` compiles every stylesheet against the Master CSS preset and enforces the selector contract.
2. `bun run type-check` and `bun run build`; the build fails on an invalid class in any preview.
3. Run the site (`bun run dev`, port 3300) and inspect the affected pages in a browser at a 1:1 viewport (800px wide in the built-in browser), not an enlarged screenshot.
4. Check light and dark (emulate `prefers-color-scheme`), every affected state, and narrow widths.
5. Measure rather than guess: component heights, radii, insets and icon bounds with `getBoundingClientRect()` and `getComputedStyle()` inside the preview iframe; cap-height centering with canvas `measureText` once Geist has loaded.
6. Report what was measured, what was derived and what was judged, and name anything left unverified (for example forced colors or a real touch device).
