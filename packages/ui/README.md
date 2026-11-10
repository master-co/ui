# @master/ui

Native HTML and CSS components crafted with [Master CSS](https://css.master.co), in the Moonstone / Obsidian material: a zinc pearl in light mode, a matte obsidian in dark mode, lit from above, with half-pixel contours, short shadows that fade and corners that turn with continuous curvature.

Components use the platform before script: `<dialog>`, `popover` and invoker commands for overlays, CSS anchor positioning for placement, `appearance: base-select` for the option list, container queries for layout, scroll-driven animations for edge fades, `::scroll-button()` and `::scroll-marker` for carousels, `corner-shape` for corners, and `@starting-style` for motion in and out. Each feature is an enhancement over a working baseline.

A few patterns need behavior the platform does not have yet: a combobox, a command palette, a calendar, a tree with arrow keys, a context menu. For those the stylesheets draw every state from ARIA attributes and leave the behavior to your script or framework; each page shows the smallest script that drives it.

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
| Splitter | `splitter`, `splitter-pane`, `splitter-handle` |
| Button | `btn`, `btn-{primary,quiet,danger,brand}`, `btn-{sm,lg}`, `btn-{square,pill}`, `btn-group` |
| Toolbar | `toolbar`, `toolbar-floating`, `toolbar-separator` |
| Link | `link`, `link-quiet` |
| Input | `input`, `input-{sm,lg}`, `input-auto`, `input-group`, `input-group-{sm,lg}`, `input-group-field`, `input-group-addon`, `input-group-wrap`, `field`, `field-hint`, `field-error`, `fieldset`, `fieldset-legend` |
| Form | `form`, `form-row`, `form-section`, `form-heading`, `form-title`, `form-description`, `form-fields`, `form-actions` |
| Select | `select`, `select-raised`, `select-{sm,lg}`, `select-option` |
| Combobox | `combobox`, `combobox-toggle` |
| Listbox | `listbox`, `listbox-option`, `listbox-body`, `listbox-description`, `listbox-end`, `listbox-group`, `listbox-label`, `listbox-separator`, `listbox-empty` |
| Checkbox | `checkbox`, `check` |
| Radio | `radio` |
| Switch | `switch`, `switch-{sm,lg}` |
| Slider | `slider` |
| Segmented control | `segmented`, `segmented-{sm,lg}`, `segmented-item`, `segmented-input` |
| Chip | `chip`, `chip-input`, `chip-remove` |
| Swatch | `swatch`, `swatch-{sm,lg}`, `swatch-square`, `swatch-input` |
| Choice | `choice`, `choice-body`, `choice-title`, `choice-description`, `choice-end` |
| Rating | `rating`, `rating-{sm,lg}`, `rating-input` |
| Dropzone | `dropzone`, `dropzone-input`, `dropzone-title`, `dropzone-description` |
| OTP | `otp`, `otp-slot`, `otp-separator` |
| Composer | `composer`, `composer-field`, `composer-attachments`, `composer-toolbar`, `composer-end`, `composer-hint` |
| Calendar | `calendar`, `calendar-header`, `calendar-title`, `calendar-grid`, `calendar-week`, `calendar-weekday`, `calendar-day`, `calendar-day-outside`, `calendar-day-range{,-start,-end}` |
| Tabs | `tabs`, `tabs-sm`, `tabs-item` |
| Navbar | `navbar`, `navbar-floating`, `navbar-brand`, `navbar-nav`, `navbar-link`, `navbar-end`, `navbar-toggle`, `navbar-progress` |
| Tab bar | `tabbar`, `tabbar-floating`, `tabbar-item`, `tabbar-label` |
| Nav | `nav`, `nav-item`, `nav-end`, `nav-label`, `nav-group`, `nav-toggle`, `nav-sub` |
| Tree | `tree`, `tree-item`, `tree-toggle`, `tree-group`, `tree-sub` |
| Table of contents | `toc`, `toc-title`, `toc-list`, `toc-link` |
| Breadcrumb | `breadcrumb`, `breadcrumb-item`, `breadcrumb-link` |
| Pagination | `pagination`, `pagination-gap` |
| Steps | `steps`, `steps-{vertical,complete}`, `steps-item`, `steps-body`, `steps-title`, `steps-description` |
| Dialog | `dialog`, `dialog-{sm,lg,drawer,sheet}`, `dialog-header`, `dialog-title`, `dialog-description`, `dialog-body`, `dialog-footer`, `dialog-close` |
| Popover | `popover`, `popover-{end,center,top}` |
| Menu | `menu`, `menu-{end,top,sub,context}`, `menu-item`, `menu-item-danger`, `menu-input`, `menu-shortcut`, `menu-label`, `menu-separator` |
| Command palette | `command`, `command-search`, `command-input`, `command-list`, `command-footer`, `command-hint` |
| Tooltip | `tooltip`, `tooltip-bottom` |
| Toast | `toast-region`, `toast-region-{top,center}`, `toast`, `toast-timed`, `toast-{info,success,warning,danger}`, `toast-icon`, `toast-body`, `toast-title`, `toast-description`, `toast-close` |
| Alert | `alert`, `alert-{info,success,warning,danger}`, `alert-icon`, `alert-body`, `alert-title`, `alert-description` |
| Banner | `banner`, `banner-dismissible`, `banner-{info,success,warning,danger}`, `banner-{inverse,brand}`, `banner-content`, `banner-title`, `banner-action`, `banner-close` |
| Progress | `progress`, `progress-{sm,lg}`, `progress-ring`, `progress-ring-{sm,lg,xl}` |
| Meter | `meter`, `meter-{sm,lg}` |
| Skeleton | `skeleton`, `skeleton-{text,circle}` |
| Spinner | `spinner`, `spinner-{sm,lg,xl,inline}` |
| Empty | `empty`, `empty-media`, `empty-title`, `empty-description`, `empty-actions` |
| Accordion | `accordion`, `accordion-item`, `accordion-trigger`, `accordion-content` |
| Expand | `expand`, `expand-toggle`, `expand-more`, `expand-less` |
| Table | `table`, `table-{compact,interactive,sticky}`, `table-row`, `table-heading`, `table-cell`, `table-{primary,numeric}` |
| List | `list`, `list-interactive`, `list-row`, `list-media`, `list-body`, `list-title`, `list-description`, `list-end` |
| Data list | `data-list`, `data-list-item`, `data-list-term`, `data-list-value` |
| Stat | `stat`, `stat-label`, `stat-row`, `stat-value`, `stat-delta`, `stat-delta-{up,down}`, `stat-description` |
| Timeline | `timeline`, `timeline-item`, `timeline-marker`, `timeline-body`, `timeline-title`, `timeline-description`, `timeline-time` |
| Carousel | `carousel`, `carousel-{2,3}`, `carousel-slide` |
| Figure | `figure`, `figure-{framed,center}`, `figure-media`, `figure-caption` |
| Quote | `quote`, `quote-lg`, `quote-text`, `quote-source`, `quote-name` |
| Message | `message-list`, `message`, `message-sent`, `message-avatar`, `message-bubble`, `message-meta`, `message-typing` |
| Avatar | `avatar`, `avatar-{xs,sm,lg,xl}`, `avatar-square`, `avatar-image`, `avatar-status`, `avatar-group` |
| Badge | `badge`, `badge-{outline,raised,ink}`, `badge-{info,success,warning,danger}`, `badge-dot`, `badge-live`, `badge-{sm,lg,pill}`, `badge-corner` |
| Code | `code`, `code-block` |
| Icon | `icon` |
| Kbd | `kbd`, `kbd-raised` |
| Mark | `mark`, `mark-{brand,underline}` |

Documentation: [ui.master.co](https://ui.master.co)

## License

MIT
