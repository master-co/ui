# Master UI documentation site

The site uses `@master/ui: workspace:*` because it documents and validates the package released from the same repository. Isolated previews, source panels and generated contracts/registry entries must all read that one source tree. Other Master repositories consume an exact published UI version; the UI site's own workspace dependency is the explicit exception.

`prepare-site` rejects a second UI instance resolved by the shared shell. For each new release, `scripts/verify-package.mjs @master/ui@<version>` installs the registry package, compares its complete authored source inventory and bytes with `packages/ui`, and verifies npm signatures and provenance. Generated `dist` and injected version metadata are checked through package installation rather than the source comparison. Deployment waits for registry verification; a site-only deployment keeps the released package sources unchanged.

The shared site and skill packages remain exact registry dependencies. Update them only after their versions are published and validated, then run the normal build and browser checks. Do not replace a dependency with a sibling checkout or an unpublished archive in a committed manifest.

Preview source listings use Cloudflare's [scoped `email_off` comments](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/) so example emails stay intact in server HTML and copied code. Keep these comments around the source renderer. Do not replace them with `Cache-Control: no-transform`, which also disables HTML compression on Pages. Hosted acceptance reports raw byte matches separately from responses where Cloudflare consumes exactly these two protocol comments; the latter must equal the artifact with only those comments removed. No other response rewriting is accepted.

## Delivery

The site is delivered through Cloudflare Pages' Git integration, the way Master CSS delivers css.master.co. GitHub holds no Cloudflare credential and never uploads the site.

1. After a push to `main` releases `@master/ui` and the registry serves it, or after a push that releases nothing, the `deploy-site` job of `.github/workflows/release.yml` plans the delivery (`node scripts/pages-site-release.mjs plan`). A release delivers with its own version; any other push delivers with the newest release's version, so the header always shows a version users can install. A pending release that failed to publish holds the site until it ships.
2. The job requires the release tag and the version npm serves (`preflight`), builds the exact commit with `PUBLIC_VERSION`, writes `site-release.json`, the public identity of the build (`identity`), runs `test:site-hosting` and `test:site` (Chromium) on those final bytes, and records the size and SHA-256 of every output file (`manifest`).
3. `deliver` attaches the manifest to the release as `site-main-<commit>.manifest.json`, never replacing an existing one, and moves the `pages-stable` branch to the commit, fast-forward only. It then waits for the Cloudflare Pages check of that commit, reads `site-release.json` from the immutable `<hash>.<subdomain>` deployment (which must answer `X-Robots-Tag: noindex`) and, in `production` mode, waits for `https://ui.master.co` to serve the same identity. `release-artifacts/site-delivery.json`, kept as a workflow artifact, records every external write and its outcome; read it before retrying a failed delivery.
4. Cloudflare builds `pages-stable` with `bun run build:site:cloudflare-pages` (`scripts/build-site-hosted.sh`). Before installing anything it requires a release tag on the commit, or for a site-only commit the newest release, and the manifest CI published for this commit. It builds with that version and fails unless the output matches the manifest byte for byte, the registry still serves the release and `pages-stable` still points at the commit. A differing build cannot become a new baseline.

Until the three repository variables exist, `deploy-site` delivers nothing and says so in a notice.

| GitHub repository variable | Value |
| --- | --- |
| `CLOUDFLARE_PAGES_PROJECT` | The Pages project's name |
| `CLOUDFLARE_PAGES_SUBDOMAIN` | Its actual `<name>.pages.dev` subdomain, without scheme or path; do not infer it from the project name |
| `CLOUDFLARE_PAGES_MODE` | `bootstrap` until ui.master.co is attached to the project, then `production` |

The Pages project is connected to `master-co/ui` with:

| Setting | Value |
| --- | --- |
| Production branch | `pages-stable` |
| Preview deployments | None |
| Build watch paths | Include `*`, exclude nothing |
| Root directory | The repository root (empty) |
| Build command | `MASTER_UI_PAGES_PROJECT=<project> MASTER_UI_PAGES_SUBDOMAIN=<subdomain>.pages.dev bun run build:site:cloudflare-pages` |
| Build output directory | `site/out` |
| Custom domain | `ui.master.co` |

| Cloudflare build variable | Value |
| --- | --- |
| `BUN_VERSION` | `1.4.4`, the `packageManager` pin |
| `NODE_VERSION` | `24`, as in `.nvmrc` |
| `SKIP_DEPENDENCY_INSTALL` | `1`; the build script runs the frozen install after proving the release |
| `MASTER_UI_PAGES_PROJECT` | The project's name, as in the build command |
| `MASTER_UI_PAGES_SUBDOMAIN` | Its `pages.dev` subdomain, as in the build command |

Leave `PUBLIC_VERSION` and `PUBLIC_URL` unset: the build script derives them from the release, and a configured value that differs fails the build. `wrangler.jsonc` at the repository root is the project's configuration (`name` is the project's name, `compatibility_date` applies to `public/_worker.js`). Pages replaces dashboard variables with that file's `vars` on every deployment, so after its checks pass the build script writes the five build variables above, with the exact Node version it ran, into the build's copy of the file; the identity values are also in the build command because Pages can apply the file before the script runs.

Start with `bootstrap`: the delivery is verified on its immutable `pages.dev` deployment only. Once ui.master.co serves the project, prove it from the retained manifest with `node scripts/pages-site-release.mjs canonical <site.manifest.json>` and switch the variable to `production`, after which every delivery also waits for the canonical origin. `node scripts/pages-release-target.mjs` checks the project, its production branch and its domain with a read-only Cloudflare token you supply (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `PAGES_PROJECT`); the workflow never has one.

Rerun the failed `deploy-site` job to retry: an existing manifest with the same bytes and a `pages-stable` that already points at the commit are verified, not written again. Never force-push or move `pages-stable` by hand, never replace a manifest, and never move a version tag to get a site deployed.

## Documentation regressions

The removed `/r/layout-arrangements.json` registry item returns `410 Gone` with `no-store`. A site-only Pages worker handles exactly that path before static asset lookup, preventing a stale registry item from surviving its removal. `_routes.json` leaves every other path on ordinary static serving, including the nine valid registry redirects. Run `bun run test:site-hosting` after building to verify the actual Pages dispatcher against a deliberately stale asset, GET/HEAD responses, redirects and static content.

Run `bun run build`, then `bun run test:site`. Set `MASTER_UI_BROWSER=chromium|firefox|webkit` to choose the engine. CI runs all three against the exact output artifact from its validated build. `MASTER_UI_SITE_OUTPUT` can point to another preserved build; it never starts or rebuilds the site implicitly.

The suite measures framed contract tables against adjacent previews; compares Preview and Code panel edges within half a CSS pixel; checks concentric window insets; and keeps the iframe node, dimensions and native selection through switching. It also checks standard figure titles/stages/captions, static HTML and Markdown anchors without site JavaScript, and SSR dimensions/state with preview hydration deliberately delayed. It exercises native keyboard selection rather than dispatching synthetic component change events. Copy controls are checked at rest and keyboard focus for their inset contour; page previews exercise the four layout classes at Desktop, Tablet and Phone widths, and framework previews retain the application value through a source switch. Scaled page frames retain their true document viewport, work without JavaScript, and preserve the authored one-click scroll activation; the pointer checks cover 390/768/1280px hosts.

The regular matrix is light/dark × 390/768/1280 CSS pixels × DPR 1/2, with a coarse pointer below 768 pixels. Separate 320px cases double the root font size and inject long CJK prose and labels, with reduced motion or forced colors. Root font scaling is a text reflow stress test, not a claim about browser zoom or physical-device testing. Browser metrics cannot replace visual review or assistive-technology checks. The JavaScript-free cases cover server markup, native view radios and portable anchors; cross-browser horizontal arrow scrolling uses the shared document keyboard adapter when the native engine does not handle it. Do not treat the static checks as proof of every keyboard behavior without JavaScript.

Measurements and failure images are written to `site/.cache/documentation-tests/<engine>`; the ordinary DPR 1 cases also retain surface screenshots. Set `MASTER_UI_SITE_BASELINE` to a preserved pre-change output directory to capture the same widths, themes and surfaces before the change. Baseline defects are recorded as evidence, not accepted as expected behavior. `MASTER_UI_SITE_EVIDENCE` changes the report location.
