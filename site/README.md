# Master UI documentation site

The site uses `@master/ui: workspace:*` because it documents and validates the package released from the same repository. Isolated previews, source panels and generated contracts/registry entries must all read that one source tree. Other Master repositories consume an exact published UI version; the UI site's own workspace dependency is the explicit exception.

`prepare-site` rejects a second UI instance resolved by the shared shell. For each new release, `scripts/verify-package.mjs @master/ui@<version>` installs the registry package, compares its complete authored source inventory and bytes with `packages/ui`, and verifies npm signatures and provenance. Generated `dist` and injected version metadata are checked through package installation rather than the source comparison. Deployment waits for registry verification; a site-only deployment keeps the released package sources unchanged.

The shared site and skill packages remain exact registry dependencies. Update them only after their versions are published and validated, then run the normal build and browser checks. Do not replace a dependency with a sibling checkout or an unpublished archive in a committed manifest.
