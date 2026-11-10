# @master/ui

Native HTML and CSS components crafted with [Master CSS](https://css.master.co), in the Moonstone / Obsidian material: a zinc pearl in light mode, a matte obsidian in dark mode, lit from above, with half-pixel contours, short shadows that fade and corners that turn with continuous curvature.

Components use the platform before script: `<dialog>`, `popover` and invoker commands for overlays, CSS anchor positioning for placement, `appearance: base-select` for the option list, container queries for layout, scroll-driven animations for edge fades, `::scroll-button()` and `::scroll-marker` for carousels, `corner-shape` for corners, and `@starting-style` for motion in and out. Each feature is an enhancement over a working baseline.

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
| Scroll area | `scroll-area`, `scroll-area-inline` |
| Button | `btn`, `btn-{primary,quiet,danger,brand}`, `btn-{sm,lg}`, `btn-{square,pill}`, `btn-group` |
| Toolbar | `toolbar`, `toolbar-floating`, `toolbar-separator` |
| Link | `link`, `link-quiet` |
| Input | `input`, `input-{sm,lg}`, `input-auto`, `input-group`, `input-group-{sm,lg}`, `input-group-field`, `input-group-addon`, `field`, `field-hint`, `field-error`, `fieldset`, `fieldset-legend` |
| Select | `select`, `select-raised`, `select-{sm,lg}`, `select-option` |
| Checkbox | `checkbox`, `check` |
| Radio | `radio` |
| Switch | `switch`, `switch-{sm,lg}` |
| Slider | `slider` |
| Segmented control | `segmented`, `segmented-{sm,lg}`, `segmented-item`, `segmented-input` |
| Chip | `chip`, `chip-input`, `chip-remove` |
| Choice | `choice`, `choice-body`, `choice-title`, `choice-description`, `choice-end` |
| Rating | `rating`, `rating-{sm,lg}`, `rating-input` |
| Dropzone | `dropzone`, `dropzone-input`, `dropzone-title`, `dropzone-description` |
| Tabs | `tabs`, `tabs-sm`, `tabs-item` |
| Nav | `nav`, `nav-item`, `nav-end`, `nav-label`, `nav-group`, `nav-toggle`, `nav-sub` |
| Breadcrumb | `breadcrumb`, `breadcrumb-item`, `breadcrumb-link` |
| Pagination | `pagination`, `pagination-gap` |
| Steps | `steps`, `steps-{vertical,complete}`, `steps-item`, `steps-body`, `steps-title`, `steps-description` |
| Dialog | `dialog`, `dialog-{sm,lg,drawer,sheet}`, `dialog-header`, `dialog-title`, `dialog-description`, `dialog-body`, `dialog-footer`, `dialog-close` |
| Popover | `popover`, `popover-{end,center,top}` |
| Menu | `menu`, `menu-{end,top}`, `menu-item`, `menu-item-danger`, `menu-input`, `menu-shortcut`, `menu-label`, `menu-separator` |
| Tooltip | `tooltip`, `tooltip-bottom` |
| Toast | `toast-region`, `toast-region-{top,center}`, `toast`, `toast-timed`, `toast-{info,success,warning,danger}`, `toast-icon`, `toast-body`, `toast-title`, `toast-description`, `toast-close` |
| Alert | `alert`, `alert-{info,success,warning,danger}`, `alert-icon`, `alert-body`, `alert-title`, `alert-description` |
| Progress | `progress`, `progress-{sm,lg}` |
| Skeleton | `skeleton`, `skeleton-{text,circle}` |
| Spinner | `spinner`, `spinner-{sm,lg,xl,inline}` |
| Empty | `empty`, `empty-media`, `empty-title`, `empty-description`, `empty-actions` |
| Accordion | `accordion`, `accordion-item`, `accordion-trigger`, `accordion-content` |
| Table | `table`, `table-{compact,interactive,sticky}`, `table-row`, `table-heading`, `table-cell`, `table-{primary,numeric}` |
| Carousel | `carousel`, `carousel-{2,3}`, `carousel-slide` |
| Avatar | `avatar`, `avatar-{xs,sm,lg,xl}`, `avatar-square`, `avatar-image`, `avatar-status`, `avatar-group` |
| Badge | `badge`, `badge-{outline,raised,ink}`, `badge-{info,success,warning,danger}`, `badge-dot`, `badge-{sm,lg,pill}`, `badge-corner` |
| Code | `code`, `code-block` |
| Icon | `icon` |
| Kbd | `kbd`, `kbd-raised` |

Documentation: [ui.master.co](https://ui.master.co)

## License

MIT
