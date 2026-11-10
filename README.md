# Master UI

Native HTML and CSS interface components crafted with [Master CSS](https://css.master.co), in the Moonstone / Obsidian material: a zinc pearl in light mode, a matte obsidian in dark mode, lit from above with layered shadows.

- **Native elements first.** Components style `<button>`, `<select>` and `<input role="switch">`, keeping their keyboard, form and accessibility behavior.
- **One stylesheet per component.** Rules live in `@layer components` and read Master CSS theme tokens, so utilities in markup always win.
- **Light, not decoration.** One material ladder of trays, sheets and wells; state reads through depth, not hue.
- **Light and dark from one source.** Semantic tokens resolve with `light-dark()`.

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
| [`packages/ui`](packages/ui) | `@master/ui`, the published CSS source |
| [`site`](site) | Documentation site: Astro, Svelte and `@master/internal-site`, deployed to Cloudflare Pages |

## Development

Requires [Bun](https://bun.sh) 1.4 and Node.js 24 or later.

```sh
bun install
bun run dev        # documentation site on http://localhost:3300
bun run test       # compile every component against the Master CSS preset
bun run type-check # Astro, Svelte and TypeScript checks
bun run build      # static site in site/out
```

Commits follow the [Aronrepo](https://github.com/1aron/aronrepo) policy in [AGENTS.md](AGENTS.md); the commit hook checks each message.

## Roadmap

1. **Native HTML and CSS** (current): the component stylesheets and their documentation.
2. **Framework bindings**: React, Svelte and Vue components that render the same markup and classes.
3. **Copy-in registry**: shadcn/ui-style source you add to a project and own.

## License

[MIT](LICENSE) © Aoyue Design LLC.
