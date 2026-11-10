# @master/ui

Native HTML and CSS components crafted with [Master CSS](https://css.master.co), in the Moonstone / Obsidian material: a zinc pearl in light mode, a matte obsidian in dark mode, lit from above, with half-pixel contours and short shadows that fade.

Components use the platform before script: `<dialog>`, `popover` and invoker commands for overlays, CSS anchor positioning for placement, `appearance: base-select` for the option list, container queries for layout, and `@starting-style` for motion in and out. Each feature is an enhancement over a working baseline.

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

<button type="button" class="btn" commandfor="confirm" command="show-modal">Delete</button>
<dialog id="confirm" class="dialog" closedby="any">…</dialog>
```

| Component | Classes |
| --- | --- |
| Surface | `tray`, `sheet`, `sheet-{flat,raised,floating}`, `well` |
| Card | `card`, `card-{flat,interactive,split}`, `card-media`, `card-header`, `card-title`, `card-description`, `card-action`, `card-body`, `card-footer` |
| Divider | `divider`, `divider-{label,vertical}` |
| Button | `btn`, `btn-{primary,quiet,danger,gold}`, `btn-{sm,lg}`, `btn-{square,pill}`, `btn-group` |
| Link | `link`, `link-quiet` |
| Input | `input`, `input-{sm,lg}`, `input-auto`, `input-group`, `input-group-{sm,lg}`, `input-group-field`, `input-group-addon`, `field`, `field-hint`, `field-error` |
| Select | `select`, `select-raised`, `select-{sm,lg}`, `select-option` |
| Checkbox and radio | `checkbox`, `radio`, `check` |
| Switch | `switch`, `switch-{sm,lg}` |
| Slider | `slider` |
| Segmented control | `segmented`, `segmented-{sm,lg}`, `segmented-item`, `segmented-input` |
| Tabs | `tabs`, `tabs-sm`, `tabs-item` |
| Breadcrumb | `breadcrumb`, `breadcrumb-item`, `breadcrumb-link` |
| Dialog | `dialog`, `dialog-{sm,lg,drawer}`, `dialog-header`, `dialog-title`, `dialog-description`, `dialog-body`, `dialog-footer`, `dialog-close` |
| Popover | `popover`, `popover-{end,center,top}` |
| Menu | `menu`, `menu-{end,top}`, `menu-item`, `menu-item-danger`, `menu-input`, `menu-shortcut`, `menu-label`, `menu-separator` |
| Tooltip | `tooltip`, `tooltip-bottom` |
| Alert | `alert`, `alert-{info,success,warning,danger}`, `alert-icon`, `alert-body`, `alert-title`, `alert-description` |
| Progress | `progress`, `progress-{sm,lg}` |
| Skeleton | `skeleton`, `skeleton-{text,circle}` |
| Spinner | `spinner`, `spinner-{sm,lg,xl,inline}` |
| Accordion | `accordion`, `accordion-item`, `accordion-trigger`, `accordion-content` |
| Avatar | `avatar`, `avatar-{xs,sm,lg,xl}`, `avatar-square`, `avatar-image`, `avatar-status`, `avatar-group` |
| Badge | `badge`, `badge-{outline,raised,ink}`, `badge-{info,success,warning,danger}`, `badge-dot`, `badge-{sm,lg,pill}`, `badge-corner` |
| Icon | `icon` |
| Kbd | `kbd`, `kbd-raised` |

Documentation: [ui.master.co](https://ui.master.co)

## License

MIT
