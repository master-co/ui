# @master/ui

Native HTML and CSS components crafted with [Master CSS](https://css.master.co), in the Moonstone / Obsidian material: a zinc pearl in light mode, a matte obsidian in dark mode, lit from above with layered shadows.

## Install

```sh
npm install @master/css @master/ui
```

Import Master UI after the Master CSS preset in your app stylesheet:

```css
@import '@master/css';
@import '@master/ui';
```

Or import only the theme and the components you use:

```css
@import '@master/css';
@import '@master/ui/theme.css';
@import '@master/ui/components/button.css';
```

## Use

```html
<button type="button" class="btn btn-primary">Save changes</button>
<input type="checkbox" role="switch" class="switch" aria-label="Notifications">
```

| Component | Classes |
| --- | --- |
| Surface | `tray`, `sheet`, `sheet-{flat,raised,floating}`, `well` |
| Icon | `icon` |
| Button | `btn`, `btn-{primary,quiet,danger,gold}`, `btn-{sm,lg}`, `btn-{square,pill}` |
| Input | `input`, `input-{sm,lg}`, `field`, `field-hint`, `field-error` |
| Select | `select`, `select-raised`, `select-{sm,lg}` |
| Checkbox and radio | `checkbox`, `radio`, `check` |
| Switch | `switch`, `switch-{sm,lg}` |
| Segmented control | `segmented`, `segmented-{sm,lg}`, `segmented-item`, `segmented-input` |
| Tabs | `tabs`, `tabs-sm`, `tabs-item` |
| Badge | `badge`, `badge-{outline,raised,ink}`, `badge-{info,success,warning,danger}`, `badge-dot`, `badge-{sm,lg,pill}`, `badge-corner` |
| Kbd | `kbd`, `kbd-raised` |
| Spinner | `spinner`, `spinner-{sm,lg,xl,inline}` |

Documentation: [ui.master.co](https://ui.master.co)

## License

MIT
