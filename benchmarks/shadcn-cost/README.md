# Master UI and shadcn/ui: what six components cost a page

This benchmark builds the same six components (Button, Card, Dialog, Tabs, Select, Tooltip) with Master UI and with shadcn/ui, each the standard way, and measures what the built page loads first. The homepage reads [`results.json`](results.json) at build time; nothing on it is typed in by hand.

## Run it

```sh
node benchmarks/shadcn-cost/run.mjs
```

Options: `--shadcn <version>` (default `4.23.0`, pinned so a rerun builds the same CLI), `--bases base,radix` (which primitives shadcn/ui is initialized with), `--keep` (keep the temporary projects and print where they are). It needs Node 24 or later, npm and a network connection. Everything is installed and built in a new directory under the system's temporary directory; nothing is installed into this repository, and the only file it writes here is `results.json`. A run takes a few minutes, mostly installs.

## Method

**shadcn/ui.** `npx shadcn@<version> init -t vite -b <base> -d` creates a Vite + React + Tailwind CSS v4 app with the default preset of that base (`base-nova` on Base UI, the CLI's default, and `radix-nova` on Radix), as the shadcn/ui documentation prescribes. `shadcn add button card dialog tabs select tooltip` writes the six components. Then, so that the build measures the components and not the template:

- the entry renders `<App />` and nothing else (the template's theme provider and its keyboard shortcut go);
- the template's webfont import goes (Master UI ships no font, and a font is a choice of its own);
- the template's README, assets and public folder go, since Tailwind would scan them for class names;
- while a case builds, `src/components/ui` holds only the files that case imports, and what they import, because Tailwind writes a utility for every class it finds in the sources;
- one `codeSplitting` group puts `react`, `react-dom` and `scheduler` in a chunk of their own, so the JavaScript is reported with and without the React runtime. Nothing else in the Vite config changes.

**Master UI.** The same demo, with the same words, written as markup in `index.html`. Its one stylesheet is the reset the components assume (`@master/css-preset/base.css`, the counterpart of Tailwind's preflight) followed by the theme and every stylesheet the demo uses and composes, compiled from this repository's `packages/ui` exactly as `packages/ui/scripts/build.ts` compiles `dist/standalone.css`. A page loads a behavior from `packages/ui/behaviors` only where its component needs one: the tabs, which switch panels in place, load `tabs.js`. The select is a native `<select class="select">`, which needs no script; an extra case, `combobox`, measures a select drawn as a combobox, which needs `combobox.js`. The project installs only Vite, at the version the shadcn/ui app resolved.

**Build and measure.** Both sides are built with `vite build` and Vite's defaults: Lightning CSS minifies the CSS, Oxc minifies the JavaScript, for Vite's Baseline Widely Available targets. Measured are the files `dist/index.html` loads on first paint: the HTML page, every stylesheet, every module script and every module it preloads. Each is reported raw and gzipped with `node:zlib` at its default level (6). Sizes in `results.json` are bytes; the homepage shows kB of 1,000 bytes.

**Cases.** `none` (the setup with no component: for shadcn/ui React, the Tailwind base and the theme; for Master UI the reset and the theme), one case per component, `all` (the six on one page) and, for Master UI only, `combobox`.

## Reading the results

- `masterUi.<case>` and `shadcn.<base>.<case>` each hold `html`, `css`, `js` and `total`, every one `{ raw, gzip }`, and the list of `files`. For shadcn/ui, `react` is the React chunk and `jsWithoutReact` the rest of the JavaScript. For Master UI, `stylesheets` lists what the case compiled and `behaviors` the scripts it loaded.
- `versions` records every package that decides the outcome, as installed; `machine`, `date` and `command` record the run.
- Master UI writes the markup in the HTML and shadcn/ui renders it from JavaScript, so the totals include the HTML on both sides.
- The theme and reset are paid once per page on either side, so a single component's figure includes them; `none` shows that floor and `all` shows how the cost grows.

What the figures do not cover: runtime cost (parse, hydration, layout), fonts and images, server rendering, or other ways to install either library. shadcn/ui components are source you own and may trim; so are Master UI's stylesheets.
