# Verification

1. `bun run test` compiles every stylesheet against the Master CSS preset and enforces the selector contract.
2. `bun run type-check` and `bun run build`; the build fails on an invalid class in any preview.
3. Run the site (`bun run dev`, port 3300) and inspect the affected pages in a browser at a 1:1 viewport (800px wide in the built-in browser), not an enlarged screenshot. A new page needs a restart of the dev server, and Astro allows one dev server per project: when another session holds it, build and serve `site/out` statically instead.
4. Check light and dark (emulate `prefers-color-scheme`), every affected state, and narrow widths.
5. Measure rather than guess: component heights, radii, insets and icon bounds with `getBoundingClientRect()` and `getComputedStyle()` inside the preview iframe; cap-height centering with canvas `measureText` once Geist has loaded.
6. For an overlay, open it with a real click and check: placement against its invoker, the flip at a viewport edge, <kbd>Esc</kbd> and light dismiss, focus return, and both the entrance and the exit. A hidden or background tab produces no frames, so a transition read from script stays at its first frame there: take a screenshot before measuring.
7. For a platform enhancement, check both branches: the upgraded one in a browser that has the feature, and the baseline by reading the rules that remain outside `@supports`.
8. Report what was measured, what was derived and what was judged, and name anything left unverified (for example forced colors, a real touch device, a 1x display or an engine you could not run).
