# @master/ui

Native HTML and CSS components crafted with [Master CSS](https://css.master.co).

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
| Button | `btn`, `btn-{xs,sm,md,lg,xl}`, `btn-{primary,accent,danger,ghost}`, `btn-icon` |
| Badge | `badge`, `badge-{sm,lg}`, `badge-pill`, `badge-{primary,accent,success,warning,danger}`, `badge-corner` |
| Spinner | `spinner`, `spinner-{sm,lg,xl}` |
| Switch | `switch`, `switch-{sm,lg}` |
| Select | `select`, `select-{sm,lg}` |
| Segmented control | `segmented`, `segmented-{sm,lg}`, `segment` |
| Tabs | `tabs`, `tabs-sm`, `tab` |

Documentation: [ui.master.co](https://ui.master.co)

## License

MIT
