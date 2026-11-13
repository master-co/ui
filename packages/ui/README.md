# @master/ui

Native HTML and CSS components crafted with [Master CSS](https://css.master.co), and the layouts, blocks and pages built from them, in the Moonstone / Obsidian material: a zinc pearl in light mode, a matte obsidian in dark mode, lit from above, with half-pixel contours, short shadows that fade and corners that turn with continuous curvature.

Each stylesheet has a contract beside it, `button.css` and `button.json`: its classes, the element each goes on, the states it draws from native and ARIA attributes, its public custom properties and the smallest correct markup. People and coding agents write to the contract; `master-ui check` reports markup that breaks one.

Components use the platform before script: `<dialog>`, `popover` and invoker commands for overlays, CSS anchor positioning for placement, `appearance: base-select` for the option list, container queries for layout, scroll-driven animations for edge fades, `::scroll-button()` and `::scroll-marker` for carousels, `corner-shape` for corners, and `@starting-style` for motion in and out. Each feature is an enhancement over a working baseline.

A few patterns need behavior the platform does not have yet: a combobox, a command palette, a calendar, a tree with arrow keys, a context menu. For those the stylesheets draw every state from ARIA attributes, and a reference script in `@master/ui/behaviors` moves the attributes: attach it, or write your own against the same ones.

In React, Svelte and Vue most components are still a class on a native element. The patterns that hold state have a component to copy into the project, which renders the markup and attaches the behavior: `npx master-ui add combobox --framework=react`. See [React, Svelte and Vue](https://ui.master.co/guide/frameworks).

## Four tiers

| Tier | What it is | How it is published |
| --- | --- | --- |
| [Components](https://ui.master.co/components) | A part with a material, a state, a platform behavior or a geometry its pieces share | Semantic classes in this package |
| [Layouts](https://ui.master.co/components#layouts) | How the room inside a region is arranged: a stack, an auto grid, a bento, masonry, a column a figure breaks out of | Utilities, and the layout classes below where utilities cannot say it |
| [Blocks](https://ui.master.co/blocks) | One stretch of a page with a purpose: a hero, a pricing table, a footer | Markup to copy: components and utilities, composed |
| [Pages](https://ui.master.co/pages) | A whole screen: where its regions go and what scrolls | Markup to copy, on one of two frames, `page` and `shell` |

A thing is a class only when there is knowledge to put behind it. A footer is links in columns, so it is markup. A component never positions itself on the page unless standing there is its behavior, and a layout never draws a surface.

## Install

```sh
npm install @master/css @master/ui --save-exact
```

> [!WARNING]
> Master UI is experimental. Until 1.0 any release may rename or remove a class, a token, a contract field, an export or a command, without a deprecation or a migration guide. Pin the exact version, as above, and upgrade on purpose: after an upgrade, `npx master-ui check` reports markup that no longer matches a contract and `npx master-ui status` lists what moved under the components you own. See [Stability](https://ui.master.co/guide/stability#experimental).

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
@import '@master/ui/layouts/shell.css';
```

## Use

```html
<button type="button" class="btn btn-primary">Save changes</button>
<input type="checkbox" role="switch" class="switch" aria-label="Notifications">

<button type="button" class="btn" commandfor="confirm" command="show-modal">Delete</button>
<dialog id="confirm" class="dialog" aria-labelledby="confirm-title" closedby="any">…</dialog>
```

## Contracts

`components/<name>.json` and `layouts/<name>.json` follow `contract.schema.json`; `@master/ui/contracts.json` collects them. The table is written from them by `bun run build`.

<!-- contracts:start -->
| Stylesheet | Classes |
| --- | --- |
| Surface | `sheet`, `sheet-flat`, `sheet-raised`, `sheet-floating`, `sheet-inverse`, `well`, `tray` |
| Card | `card`, `card-flat`, `card-interactive`, `card-split`, `card-media`, `card-header`, `card-title`, `card-description`, `card-action`, `card-body`, `card-footer` |
| Window | `window`, `window-flat`, `window-bar`, `window-controls`, `window-title`, `window-address`, `window-end`, `window-body` |
| Ticket | `ticket`, `ticket-row`, `ticket-body`, `ticket-stub` |
| Pile | `pile` |
| Device | `device`, `device-screen` |
| Hotspot | `hotspot`, `hotspot-pin` |
| Divider | `divider`, `divider-vertical`, `divider-label` |
| Texture | `texture`, `texture-grid`, `texture-stripes`, `texture-crosshatch`, `texture-checker`, `texture-fade` |
| Scroll area | `scroll-area`, `scroll-area-inline` |
| Reveal | `reveal` |
| Icon | `icon` |
| Button | `btn`, `btn-primary`, `btn-quiet`, `btn-brand`, `btn-danger`, `btn-sm`, `btn-lg`, `btn-square`, `btn-pill`, `btn-group` |
| Toolbar | `toolbar`, `toolbar-floating`, `toolbar-separator` |
| Link | `link`, `link-quiet` |
| Skip link | `skip` |
| Input | `input`, `input-sm`, `input-lg`, `input-auto`, `input-group`, `input-group-sm`, `input-group-lg`, `input-group-wrap`, `input-group-field`, `input-group-addon`, `field`, `field-hint`, `field-error`, `fieldset`, `fieldset-legend` |
| Select | `select`, `select-option`, `select-raised`, `select-sm`, `select-lg` |
| Checkbox | `check`, `checkbox` |
| Radio | `radio` |
| Switch | `switch`, `switch-sm`, `switch-lg` |
| Slider | `slider` |
| Range | `range`, `range-start`, `range-end` |
| Segmented control | `segmented`, `segmented-item`, `segmented-input`, `segmented-sm`, `segmented-lg` |
| Chip | `chip`, `chip-input`, `chip-remove` |
| Swatch | `swatch`, `swatch-input`, `swatch-sm`, `swatch-lg`, `swatch-square` |
| Rating | `rating`, `rating-input`, `rating-sm`, `rating-lg` |
| Vote | `vote`, `vote-horizontal`, `vote-up`, `vote-score`, `vote-down` |
| Choice | `choice`, `choice-body`, `choice-title`, `choice-description`, `choice-end` |
| Poll | `poll`, `poll-title`, `poll-option`, `poll-input`, `poll-label`, `poll-value`, `poll-meta` |
| Scale | `scale`, `scale-option`, `scale-input`, `scale-ends` |
| Keypad | `keypad`, `keypad-key`, `keypad-key-quiet`, `keypad-letters` |
| Checklist | `checklist`, `checklist-item`, `checklist-label`, `checklist-body`, `checklist-title`, `checklist-description`, `checklist-end`, `checklist-count` |
| Dropzone | `dropzone`, `dropzone-input`, `dropzone-title`, `dropzone-description` |
| OTP | `otp`, `otp-slot`, `otp-separator` |
| Stepper | `stepper`, `stepper-field` |
| Wheel | `wheel`, `wheel-sm`, `wheel-column`, `wheel-option`, `wheel-separator` |
| Composer | `composer`, `composer-field`, `composer-attachments`, `composer-toolbar`, `composer-end`, `composer-hint` |
| Tabs | `tabs`, `tabs-item`, `tabs-sm` |
| Navbar | `navbar`, `navbar-floating`, `navbar-brand`, `navbar-nav`, `navbar-link`, `navbar-end`, `navbar-toggle`, `navbar-progress` |
| Tab bar | `tabbar`, `tabbar-floating`, `tabbar-item`, `tabbar-label` |
| Table of contents | `toc`, `toc-title`, `toc-list`, `toc-link` |
| Nav | `nav`, `nav-item`, `nav-end`, `nav-label`, `nav-group`, `nav-toggle`, `nav-sub` |
| Breadcrumb | `breadcrumb`, `breadcrumb-item`, `breadcrumb-link` |
| Pagination | `pagination`, `pagination-gap` |
| Pager | `pager`, `pager-link`, `pager-label`, `pager-title` |
| Steps | `steps`, `steps-vertical`, `steps-complete`, `steps-item`, `steps-body`, `steps-title`, `steps-description` |
| Dialog | `dialog`, `dialog-sm`, `dialog-lg`, `dialog-drawer`, `dialog-drawer-start`, `dialog-sheet`, `dialog-header`, `dialog-title`, `dialog-description`, `dialog-body`, `dialog-footer`, `dialog-close` |
| Lightbox | `lightbox`, `lightbox-media`, `lightbox-caption`, `lightbox-close` |
| Popover | `popover`, `popover-end`, `popover-center`, `popover-top` |
| Menu | `menu`, `menu-end`, `menu-top`, `menu-sub`, `menu-context`, `menu-item`, `menu-item-danger`, `menu-input`, `menu-shortcut`, `menu-label`, `menu-separator` |
| Listbox | `listbox`, `listbox-option`, `listbox-body`, `listbox-description`, `listbox-end`, `listbox-group`, `listbox-label`, `listbox-separator`, `listbox-empty` |
| Combobox | `combobox`, `combobox-toggle` |
| Command palette | `command`, `command-search`, `command-input`, `command-list`, `command-footer`, `command-hint` |
| Tooltip | `tooltip`, `tooltip-bottom` |
| Toast | `toast-region`, `toast-region-top`, `toast-region-center`, `toast`, `toast-timed`, `toast-info`, `toast-success`, `toast-warning`, `toast-danger`, `toast-icon`, `toast-body`, `toast-title`, `toast-description`, `toast-close` |
| Alert | `alert`, `alert-info`, `alert-success`, `alert-warning`, `alert-danger`, `alert-icon`, `alert-body`, `alert-title`, `alert-description` |
| Banner | `banner`, `banner-dismissible`, `banner-info`, `banner-success`, `banner-warning`, `banner-danger`, `banner-inverse`, `banner-brand`, `banner-content`, `banner-title`, `banner-action`, `banner-close` |
| Progress | `progress`, `progress-sm`, `progress-lg`, `progress-segmented`, `progress-ring`, `progress-ring-sm`, `progress-ring-lg`, `progress-ring-xl` |
| Meter | `meter`, `meter-sm`, `meter-lg`, `meter-segmented` |
| Gauge | `gauge`, `gauge-sm`, `gauge-lg`, `gauge-value`, `gauge-label` |
| Uptime | `uptime`, `uptime-sm`, `uptime-day`, `uptime-degraded`, `uptime-down`, `uptime-none` |
| Gantt | `gantt`, `gantt-now`, `gantt-row`, `gantt-scale`, `gantt-label`, `gantt-bar`, `gantt-milestone`, `gantt-ticks` |
| Schedule | `schedule`, `schedule-now`, `schedule-rail`, `schedule-day`, `schedule-heading`, `schedule-events`, `schedule-event`, `schedule-title`, `schedule-time` |
| Price | `price`, `price-sm`, `price-lg`, `price-amount`, `price-currency`, `price-period`, `price-was` |
| Skeleton | `skeleton`, `skeleton-text`, `skeleton-circle` |
| Shimmer | `shimmer` |
| Spinner | `spinner`, `spinner-sm`, `spinner-lg`, `spinner-xl`, `spinner-inline` |
| Busy | `busy` |
| Caret | `caret`, `caret-block` |
| Flash | `flash` |
| Empty | `empty`, `empty-media`, `empty-title`, `empty-description`, `empty-actions` |
| Accordion | `accordion`, `accordion-item`, `accordion-trigger`, `accordion-content` |
| Expand | `expand`, `expand-toggle`, `expand-more`, `expand-less` |
| Table | `table`, `table-row`, `table-heading`, `table-cell`, `table-primary`, `table-numeric`, `table-compact`, `table-interactive`, `table-sticky` |
| List | `list`, `list-row`, `list-media`, `list-body`, `list-title`, `list-description`, `list-end`, `list-interactive` |
| Swipe | `swipe`, `swipe-content`, `swipe-actions`, `swipe-action`, `swipe-action-danger` |
| Data list | `data-list`, `data-list-item`, `data-list-term`, `data-list-value` |
| File | `file`, `file-failed`, `file-sm`, `file-interactive`, `file-page`, `file-thumb`, `file-body`, `file-name`, `file-meta`, `file-end`, `file-progress` |
| Stat | `stat`, `stat-label`, `stat-row`, `stat-value`, `stat-delta`, `stat-delta-up`, `stat-delta-down`, `stat-description` |
| Odometer | `odometer`, `odometer-value`, `odometer-figures`, `odometer-digit` |
| Countdown | `countdown`, `countdown-tiles`, `countdown-inline`, `countdown-unit`, `countdown-value`, `countdown-label` |
| Chart | `chart`, `chart-quiet`, `chart-values`, `chart-horizontal`, `chart-spark`, `chart-item`, `chart-label`, `chart-value` |
| Sparkline | `sparkline`, `sparkline-success`, `sparkline-warning`, `sparkline-danger`, `sparkline-plot`, `sparkline-line`, `sparkline-area`, `sparkline-baseline`, `sparkline-dot` |
| Breakdown | `breakdown`, `breakdown-rows`, `breakdown-item`, `breakdown-rest`, `breakdown-label`, `breakdown-value` |
| Heatmap | `heatmap`, `heatmap-lg`, `heatmap-cell` |
| Timeline | `timeline`, `timeline-item`, `timeline-marker`, `timeline-body`, `timeline-title`, `timeline-description`, `timeline-time` |
| Trace | `trace`, `trace-step`, `trace-failed`, `trace-summary`, `trace-marker`, `trace-meta`, `trace-detail` |
| Calendar | `calendar`, `calendar-header`, `calendar-title`, `calendar-grid`, `calendar-week`, `calendar-weekday`, `calendar-day`, `calendar-day-outside`, `calendar-day-range-start`, `calendar-day-range`, `calendar-day-range-end` |
| Tree | `tree`, `tree-item`, `tree-toggle`, `tree-group`, `tree-sub` |
| Carousel | `carousel`, `carousel-slide`, `carousel-2`, `carousel-3`, `carousel-center` |
| Marquee | `marquee`, `marquee-reverse`, `marquee-track` |
| Waveform | `waveform`, `waveform-sm`, `waveform-lg`, `waveform-bar`, `waveform-seek`, `waveform-time` |
| Splitter | `splitter`, `splitter-pane`, `splitter-handle` |
| Figure | `figure`, `figure-framed`, `figure-center`, `figure-media`, `figure-caption` |
| Compare | `compare`, `compare-before`, `compare-after`, `compare-range` |
| Quote | `quote`, `quote-lg`, `quote-text`, `quote-source`, `quote-name` |
| Message | `message`, `message-sent`, `message-avatar`, `message-bubble`, `message-meta`, `message-typing` |
| Thread | `thread`, `thread-item`, `thread-avatar`, `thread-body`, `thread-header`, `thread-text`, `thread-author`, `thread-meta`, `thread-replies` |
| Reaction | `reaction-group`, `reaction`, `reaction-input`, `reaction-emoji`, `reaction-count`, `reaction-add` |
| Avatar | `avatar`, `avatar-image`, `avatar-xs`, `avatar-sm`, `avatar-lg`, `avatar-xl`, `avatar-square`, `avatar-status`, `avatar-group` |
| Badge | `badge`, `badge-sm`, `badge-lg`, `badge-pill`, `badge-outline`, `badge-raised`, `badge-ink`, `badge-info`, `badge-success`, `badge-warning`, `badge-danger`, `badge-dot`, `badge-live`, `badge-corner` |
| Heading | `heading`, `heading-xs`, `heading-sm`, `heading-lg`, `heading-xl`, `heading-2xl`, `heading-display`, `eyebrow`, `lead`, `lead-sm`, `lead-lg` |
| Code | `code`, `code-block`, `code-line`, `code-line-highlight`, `code-line-added`, `code-line-removed`, `code-numbered`, `code-panel`, `code-header`, `code-title` |
| Snippet | `snippet`, `snippet-sm`, `snippet-lg`, `snippet-prompt`, `snippet-command`, `snippet-icon`, `snippet-check`, `snippet-status` |
| Kbd | `kbd`, `kbd-raised` |
| Mark | `mark`, `mark-brand`, `mark-underline` |
| Revision | `ins`, `del` |
| Bullets | `bullets`, `bullets-check`, `bullets-numbered`, `bullets-item`, `bullets-off` |
| Mention | `mention`, `mention-self` |
| Citation | `citation` |
| Page (layout) | `page` |
| Shell (layout) | `shell`, `shell-fixed`, `shell-header`, `shell-sidebar`, `shell-main`, `shell-aside`, `shell-footer`, `shell-toggle` |
| Auto grid (layout) | `auto-grid`, `auto-grid-fit` |
| Bento (layout) | `bento`, `bento-dense`, `bento-wide`, `bento-tall`, `bento-large`, `bento-full` |
| Masonry (layout) | `masonry`, `masonry-item` |
| Breakout (layout) | `breakout`, `breakout-wide`, `breakout-full` |
| Sticky stack (layout) | `sticky-stack`, `sticky-stack-item` |
| Form (layout) | `form`, `form-row`, `form-section`, `form-heading`, `form-title`, `form-description`, `form-fields`, `form-actions` |
<!-- contracts:end -->

## Command line

```sh
npx master-ui list                # every contract, one line each
npx master-ui contract dialog     # one contract as JSON; a class name works too
npx master-ui check               # report markup that breaks a contract
npx master-ui init                # write ui/index.css, one @import per stylesheet
npx master-ui own menu            # copy a component's stylesheet, contract and behavior into ui/
npx master-ui add combobox        # copy a React, Svelte or Vue component into ui/ (--framework=react)
npx master-ui status              # which owned or added components changed upstream
npx master-ui diff menu           # what changed upstream since it was taken
npx master-ui accept menu         # record that the change has been merged
```

`check` reads HTML and templates that look like it (JSX, Svelte, Vue, Astro). It reports a modifier without its base, a part outside its root, two exclusive modifiers together, a class on the wrong element, a missing attribute or accessible name, and a class that looks like one of the library's but is in no contract. A project's own contracts in `ui/*.json` are read too, and one with the name of a library contract replaces it.

```js
import { check, createIndex } from '@master/ui/check'
import contracts from '@master/ui/contracts.json' with { type: 'json' }

const diagnostics = check(html, createIndex(contracts.contracts))
```

## Behaviors

A few patterns have no native element. Their stylesheets draw every state from ARIA; a behavior is the reference script that moves those attributes and nothing else.

```js
import { attach } from '@master/ui/behaviors'
import { combobox } from '@master/ui/behaviors/combobox.js'

const detach = attach()                                     // every pattern in the document
const stop = combobox(document.querySelector('.combobox'))  // or one
stop.value = 'hnd'                                          // where a pattern has a value: read it, or set it
```

## React, Svelte and Vue

A component is a class on a native element, so in a framework most of the library is the same markup in that framework's syntax; there is no `Button` to import. Seventeen patterns hold state, render rows from data, join parts by id or have a lifetime, and each has a component: calendar, combobox, command, compare, dialog, field, listbox, menu, otp, popover, splitter, stepper, tabs, toast, tooltip, tree and wheel.

```sh
npx master-ui add combobox --framework=react   # ui/combobox.tsx and ui/use-behavior.ts
```

The component is copied, not imported: it renders the contract's markup in the framework's idiom and is yours to edit. What it decides stays in `@master/ui/behaviors`, so a fix to the keys reaches every framework with the package. See [React, Svelte and Vue](https://ui.master.co/guide/frameworks).

## Without Master CSS

`bun run build` compiles the same source to plain CSS, published in `dist/`:

| File | Holds |
| --- | --- |
| `@master/ui/standalone.css` | The theme and every component; the tokens are custom properties |
| `@master/ui/dist/themes/paper.css` | The same with the Paper theme |
| `@master/ui/base.css` | The reset the components assume, from the Master CSS preset |
| `@master/ui/contracts.json`, `@master/ui/theme.json` | The contracts and the tokens as data |

## Themes

A component never writes a color: it names a token of `theme.css`. `themes/paper.css` is a second theme written with tokens alone, flat and ruled where Moonstone is lit; import it after the library, or copy it to start your own.

```css
@import '@master/css';
@import '@master/ui';
@import '@master/ui/themes/paper.css';
```

## License

[MIT License](LICENSE) © Aoyue Design LLC.
