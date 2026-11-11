# Master UI

Native HTML and CSS interface components crafted with [Master CSS](https://css.master.co), in the Moonstone / Obsidian material: a zinc pearl in light mode, a matte obsidian in dark mode, lit from above with layered shadows.

- **A contract for each component.** `button.json` beside `button.css` lists its classes, the element each goes on, its states, its public custom properties and one correct example. People and coding agents write to it, and `master-ui check` reports markup that breaks it.
- **Native elements first.** Components style `<button>`, `<select>` and `<input role="switch">`, keeping their keyboard, form and accessibility behavior. The few patterns with no native element ship a reference script that only moves attributes.
- **One stylesheet per component.** Rules live in `@layer components` and read Master CSS theme tokens, so utilities in markup always win.
- **The theme is only a theme.** A component never writes a color of its own; `themes/paper.css` is a second material built from tokens alone.
- **Yours when you need it.** Retune with tokens, replace the material with a theme, or `master-ui own <name>` to take a component's source, with upstream changes still visible.

```css
@import '@master/css';
@import '@master/ui';
```

```html
<button type="button" class="btn btn-primary">Save changes</button>
```

Read the documentation at [ui.master.co](https://ui.master.co).

## Repository

| Path | Contents |
| --- | --- |
| [`packages/ui`](packages/ui) | `@master/ui`: the CSS source, a contract beside each stylesheet, the behaviors, the checker and the `master-ui` command |
| [`skills/master-ui`](skills/master-ui) | The skill a coding agent uses in a project that has Master UI: `npx skills add master-co/ui --skill master-ui` |
| [`site`](site) | Documentation site: Astro, Svelte and `@master/internal-site`, deployed to Cloudflare Pages. It also publishes `llms.txt`, every page as Markdown, the contracts and a registry |

## Development

Requires [Bun](https://bun.sh) 1.4 and Node.js 24 or later.

```sh
bun install
bun run dev        # documentation site on http://localhost:3300
bun run test       # compile every stylesheet, hold it to its contract, run the checker and the behaviors
bun run type-check # Astro, Svelte and TypeScript checks
bun run build      # static site in site/out
```

Commits follow the [Aronrepo](https://github.com/1aron/aronrepo) policy in [AGENTS.md](AGENTS.md); the commit hook checks each message.

## Roadmap

1. **Native HTML and CSS**: the component stylesheets and their documentation.
2. **The foundation** (current): a contract for every stylesheet, a checker, reference behaviors, a second theme, a build to plain CSS, a registry of source to own, and what a coding agent reads (`llms.txt`, a skill).
3. **Refinement**: tuning the components and adding to them on that foundation.

Framework bindings for React, Svelte and Vue are set aside: a component is a class on a native element, so a wrapper is a few lines in a project's own idiom. They will be reconsidered later.

## License

[MIT](LICENSE) © Aoyue Design LLC.
