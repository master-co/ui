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

> [!NOTE]
> Master UI follows semantic versioning: only a major release removes or renames a class, a token, a contract field, an export or a command, and an earlier release marks it deprecated first. A minor or patch release can still retune how a component looks, so pin the exact version, as above, and upgrade on purpose: after an upgrade, `npx master-ui check` reports markup that no longer matches a contract and `npx master-ui status` lists what moved under the components you own. See [Stability](https://ui.master.co/guide/stability#upgrades).

Import Master UI after the Master CSS preset in your app stylesheet:

```css
@import '@master/css';
@import '@master/ui';
```

Or, in an app that loads styles on demand, keep the theme in the stylesheet and import each stylesheet from the module that renders it:

```css
@import '@master/css';
@import '@master/ui/theme.css';
```

```js
import '@master/ui/components/button.css'
import '@master/ui/layouts/shell.css'
```

Take one route, never both. A CSS `@import` includes a file again wherever it is written, so the full import beside a single stylesheet, or a CSS `@import` of one component, delivers that stylesheet twice; a bundler loads a module import once. A library built on Master UI imports per stylesheet from its modules, and so does an app that uses it. See [Keep to one route](https://ui.master.co/guide/installation#one-route).

Every rule of the library is in `@layer components.ui`, a layer inside `components`. Utilities in your markup win over it, and so does a rule of your own in `@layer components`, whatever its specificity and wherever a bundle puts it. A property your rule declares then also beats what the component declares for it in a state such as `:hover` or `:disabled`. See [Where your rule stands](https://ui.master.co/guide/customization#rule-layer).

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
| Card | `card`, `card-flat`, `card-interactive`, `card-split`, `card-link`, `card-media`, `card-header`, `card-title`, `card-description`, `card-action`, `card-body`, `card-footer` |
| Window | `window`, `window-flat`, `window-bar`, `window-controls`, `window-title`, `window-address`, `window-end`, `window-body` |
| Ticket | `ticket`, `ticket-row`, `ticket-body`, `ticket-stub` |
| Pile | `pile` |
| Device | `device`, `device-screen` |
| Hotspot | `hotspot`, `hotspot-pin` |
| Divider | `divider`, `divider-vertical`, `divider-label` |
| Texture | `texture`, `texture-grid`, `texture-stripes`, `texture-crosshatch`, `texture-checker`, `texture-fade` |
| Category | `category-stone`, `category-gray`, `category-zinc`, `category-neutral`, `category-slate`, `category-brown`, `category-orange`, `category-amber`, `category-yellow`, `category-lime`, `category-green`, `category-beryl`, `category-teal`, `category-cyan`, `category-sky`, `category-blue`, `category-indigo`, `category-violet`, `category-purple`, `category-fuchsia`, `category-pink`, `category-crimson`, `category-red` |
| Scroll area | `scroll-area`, `scroll-area-inline`, `scroll-area-latest` |
| Reveal | `reveal` |
| Icon | `icon` |
| Icon frame | `icon-frame`, `icon-frame-xs`, `icon-frame-sm`, `icon-frame-lg`, `icon-frame-raised`, `icon-frame-info`, `icon-frame-success`, `icon-frame-warning`, `icon-frame-danger`, `icon-frame-category` |
| Button | `btn`, `btn-primary`, `btn-quiet`, `btn-brand`, `btn-danger`, `btn-sm`, `btn-lg`, `btn-square`, `btn-pill`, `btn-hang-start`, `btn-hang-end`, `btn-group` |
| Toolbar | `toolbar`, `toolbar-floating`, `toolbar-separator` |
| Link | `link`, `link-quiet` |
| Skip link | `skip` |
| Input | `input`, `input-sm`, `input-lg`, `input-auto`, `input-group`, `input-group-sm`, `input-group-lg`, `input-group-wrap`, `input-group-field`, `input-group-addon`, `field`, `field-hint`, `field-error`, `field-help`, `fieldset`, `fieldset-legend` |
| Editor | `editor`, `editor-toolbar`, `editor-document`, `editor-paragraph`, `editor-heading`, `editor-subheading`, `editor-list`, `editor-list-numbered`, `editor-item`, `editor-quote`, `editor-link`, `editor-rule` |
| Select | `select`, `select-option`, `select-raised`, `select-sm`, `select-lg` |
| Checkbox | `check`, `checkbox` |
| Radio | `radio` |
| Switch | `switch`, `switch-sm`, `switch-lg` |
| Slider | `slider`, `slider-vertical` |
| Range | `range`, `range-start`, `range-end` |
| Dial | `dial`, `dial-full`, `dial-sm`, `dial-lg`, `dial-thumb`, `dial-value`, `dial-ticks`, `dial-mark` |
| Segmented control | `segmented`, `segmented-item`, `segmented-input`, `segmented-sm`, `segmented-lg` |
| Chip | `chip`, `chip-sm`, `chip-lg`, `chip-category`, `chip-input`, `chip-remove`, `chip-label`, `chip-media`, `chip-dot`, `chip-count` |
| Tags | `tags` |
| Editable | `editable`, `editable-preview`, `editable-field`, `editable-placeholder` |
| Swatch | `swatch`, `swatch-input`, `swatch-sm`, `swatch-lg`, `swatch-square` |
| Rating | `rating`, `rating-input`, `rating-sm`, `rating-lg`, `rating-half`, `rating-display` |
| Vote | `vote`, `vote-horizontal`, `vote-up`, `vote-score`, `vote-down` |
| Choice | `choice`, `choice-body`, `choice-title`, `choice-description`, `choice-end` |
| Poll | `poll`, `poll-title`, `poll-option`, `poll-input`, `poll-label`, `poll-value`, `poll-meta` |
| Scale | `scale`, `scale-option`, `scale-input`, `scale-ends` |
| Keypad | `keypad`, `keypad-key`, `keypad-key-quiet`, `keypad-letters` |
| Checklist | `checklist`, `checklist-item`, `checklist-label`, `checklist-body`, `checklist-title`, `checklist-description`, `checklist-end`, `checklist-count` |
| Dropzone | `dropzone`, `dropzone-input`, `dropzone-title`, `dropzone-description` |
| Signature | `signature`, `signature-readonly`, `signature-label`, `signature-pad`, `signature-ink`, `signature-stroke`, `signature-line`, `signature-placeholder`, `signature-actions`, `signature-undo`, `signature-clear`, `signature-name`, `signature-value`, `signature-status` |
| OTP | `otp`, `otp-slot`, `otp-separator` |
| Stepper | `stepper`, `stepper-field`, `stepper-value`, `stepper-display`, `stepper-scrub` |
| Wheel | `wheel`, `wheel-sm`, `wheel-column`, `wheel-option`, `wheel-separator` |
| Composer | `composer`, `composer-field`, `composer-attachments`, `composer-toolbar`, `composer-end`, `composer-hint` |
| Tabs | `tabs`, `tabs-item`, `tabs-sm` |
| Navbar | `navbar`, `navbar-floating`, `navbar-brand`, `navbar-nav`, `navbar-link`, `navbar-end`, `navbar-toggle`, `navbar-progress` |
| Tab bar | `tabbar`, `tabbar-floating`, `tabbar-item`, `tabbar-label` |
| Dock | `dock`, `dock-item`, `dock-image`, `dock-label`, `dock-divider` |
| Table of contents | `toc`, `toc-title`, `toc-list`, `toc-link` |
| Nav | `nav`, `nav-item`, `nav-end`, `nav-label`, `nav-group`, `nav-toggle`, `nav-sub` |
| Breadcrumb | `breadcrumb`, `breadcrumb-item`, `breadcrumb-link` |
| Pagination | `pagination`, `pagination-gap` |
| Pager | `pager`, `pager-link`, `pager-label`, `pager-title` |
| Steps | `steps`, `steps-vertical`, `steps-complete`, `steps-item`, `steps-body`, `steps-title`, `steps-description` |
| Dialog | `dialog`, `dialog-sm`, `dialog-lg`, `dialog-drawer`, `dialog-drawer-start`, `dialog-sheet`, `dialog-swipe`, `dialog-detents`, `dialog-panel`, `dialog-handle`, `dialog-header`, `dialog-title`, `dialog-description`, `dialog-body`, `dialog-footer`, `dialog-close` |
| Lightbox | `lightbox`, `lightbox-media`, `lightbox-caption`, `lightbox-close` |
| Popover | `popover`, `popover-end`, `popover-center`, `popover-top` |
| Color picker | `color-picker`, `color-picker-area`, `color-picker-thumb`, `color-picker-hue`, `color-picker-alpha`, `color-picker-swatch`, `color-picker-fields`, `color-picker-format`, `color-picker-text`, `color-picker-popover` |
| Gradient | `gradient`, `gradient-preview`, `gradient-bar`, `gradient-stop`, `gradient-fields`, `gradient-color`, `gradient-offset`, `gradient-type`, `gradient-angle`, `gradient-center`, `gradient-add`, `gradient-remove`, `gradient-reverse`, `gradient-css` |
| Panel | `panel`, `panel-header`, `panel-handle`, `panel-title`, `panel-actions`, `panel-minimize`, `panel-body`, `panel-resize` |
| Menu | `menu`, `menu-end`, `menu-top`, `menu-sub`, `menu-context`, `menu-item`, `menu-item-danger`, `menu-input`, `menu-shortcut`, `menu-label`, `menu-separator` |
| Listbox | `listbox`, `listbox-option`, `listbox-body`, `listbox-description`, `listbox-end`, `listbox-group`, `listbox-label`, `listbox-separator`, `listbox-empty` |
| Combobox | `combobox`, `combobox-toggle` |
| Command palette | `command`, `command-search`, `command-input`, `command-list`, `command-footer`, `command-hint` |
| Tooltip | `tooltip`, `tooltip-bottom` |
| Coachmark | `coachmark`, `coachmark-top`, `coachmark-count`, `coachmark-title`, `coachmark-text`, `coachmark-actions`, `coachmark-tour`, `coachmark-spotlight`, `coachmark-spotlight-dim`, `coachmark-beacon` |
| Toast | `toast-region`, `toast-region-top`, `toast-region-center`, `toast`, `toast-timed`, `toast-info`, `toast-success`, `toast-warning`, `toast-danger`, `toast-icon`, `toast-body`, `toast-title`, `toast-description`, `toast-action`, `toast-close` |
| Alert | `alert`, `alert-info`, `alert-success`, `alert-warning`, `alert-danger`, `alert-icon`, `alert-body`, `alert-title`, `alert-description` |
| Banner | `banner`, `banner-dismissible`, `banner-info`, `banner-success`, `banner-warning`, `banner-danger`, `banner-inverse`, `banner-brand`, `banner-content`, `banner-title`, `banner-action`, `banner-close` |
| Progress | `progress`, `progress-sm`, `progress-lg`, `progress-segmented`, `progress-label`, `progress-label-below`, `progress-marker`, `progress-ring`, `progress-ring-half`, `progress-ring-sm`, `progress-ring-lg`, `progress-ring-xl` |
| Meter | `meter`, `meter-sm`, `meter-lg`, `meter-segmented` |
| Gauge | `gauge`, `gauge-sm`, `gauge-lg`, `gauge-value`, `gauge-label` |
| Uptime | `uptime`, `uptime-sm`, `uptime-day`, `uptime-degraded`, `uptime-down`, `uptime-none` |
| Gantt | `gantt`, `gantt-now`, `gantt-row`, `gantt-scale`, `gantt-label`, `gantt-bar`, `gantt-milestone`, `gantt-resize-start`, `gantt-resize-end`, `gantt-ticks`, `gantt-status` |
| Schedule | `schedule`, `schedule-now`, `schedule-rail`, `schedule-day`, `schedule-heading`, `schedule-events`, `schedule-event`, `schedule-title`, `schedule-time`, `schedule-event-lane`, `schedule-event-continued`, `schedule-event-continues`, `schedule-event-plain`, `schedule-event-category`, `schedule-allday`, `schedule-allday-label`, `schedule-month`, `schedule-weekdays`, `schedule-weekday`, `schedule-weeks`, `schedule-week`, `schedule-date`, `schedule-date-outside`, `schedule-date-number`, `schedule-more`, `schedule-list`, `schedule-agenda`, `schedule-agenda-day`, `schedule-agenda-date`, `schedule-view`, `schedule-view-header`, `schedule-view-title`, `schedule-view-previous`, `schedule-view-next`, `schedule-view-today`, `schedule-view-switch`, `schedule-view-body` |
| Price | `price`, `price-sm`, `price-lg`, `price-amount`, `price-currency`, `price-period`, `price-was` |
| Skeleton | `skeleton`, `skeleton-text`, `skeleton-circle` |
| Shimmer | `shimmer` |
| Spinner | `spinner`, `spinner-sm`, `spinner-lg`, `spinner-xl`, `spinner-inline` |
| Busy | `busy` |
| Caret | `caret`, `caret-block` |
| Presence | `presence`, `presence-name`, `presence-message`, `presence-caret`, `presence-selection`, `presence-1`, `presence-2`, `presence-3`, `presence-4`, `presence-5`, `presence-6`, `presence-7`, `presence-8` |
| Flash | `flash` |
| Empty | `empty`, `empty-media`, `empty-title`, `empty-description`, `empty-actions` |
| Accordion | `accordion`, `accordion-item`, `accordion-trigger`, `accordion-content` |
| Expand | `expand`, `expand-toggle`, `expand-more`, `expand-less` |
| Table | `table`, `table-row`, `table-heading`, `table-cell`, `table-sort`, `table-title`, `table-primary`, `table-numeric`, `table-compact`, `table-interactive`, `table-sticky` |
| List | `list`, `list-row`, `list-media`, `list-body`, `list-title`, `list-description`, `list-meta`, `list-end`, `list-interactive` |
| Sortable | `sortable`, `sortable-row`, `sortable-item`, `sortable-item-back`, `sortable-item-forward`, `sortable-handle`, `sortable-status` |
| Kanban | `kanban`, `kanban-column`, `kanban-header`, `kanban-title`, `kanban-items`, `kanban-items-target`, `kanban-item`, `kanban-item-target`, `kanban-handle`, `kanban-controls`, `kanban-move`, `kanban-empty`, `kanban-preview`, `kanban-preview-landing`, `kanban-mover`, `kanban-mover-actions`, `kanban-status` |
| Swipe | `swipe`, `swipe-content`, `swipe-actions`, `swipe-action`, `swipe-action-danger` |
| Data list | `data-list`, `data-list-item`, `data-list-term`, `data-list-value` |
| File | `file`, `file-failed`, `file-sm`, `file-interactive`, `file-page`, `file-thumb`, `file-body`, `file-name`, `file-meta`, `file-end`, `file-progress` |
| Stat | `stat`, `stat-label`, `stat-row`, `stat-value`, `stat-delta`, `stat-delta-up`, `stat-delta-down`, `stat-description` |
| Odometer | `odometer`, `odometer-value`, `odometer-figures`, `odometer-digit` |
| Countdown | `countdown`, `countdown-tiles`, `countdown-inline`, `countdown-unit`, `countdown-value`, `countdown-label` |
| Chart | `chart`, `chart-quiet`, `chart-split`, `chart-body`, `chart-plot`, `chart-plot-radial`, `chart-plot-radar`, `chart-canvas`, `chart-grid`, `chart-grid-base`, `chart-tick`, `chart-tick-y`, `chart-tick-x`, `chart-tick-around`, `chart-tick-start`, `chart-tick-end`, `chart-tick-scale`, `chart-tick-minor`, `chart-line`, `chart-area`, `chart-area-stacked`, `chart-point`, `chart-hit`, `chart-hit-line`, `chart-cursor`, `chart-bar`, `chart-bar-inner`, `chart-bar-down`, `chart-bar-across`, `chart-bar-floating`, `chart-bar-bin`, `chart-bar-rise`, `chart-bar-fall`, `chart-dot`, `chart-dot-quiet`, `chart-dot-bubble`, `chart-dot-outlier`, `chart-value`, `chart-value-across`, `chart-value-before`, `chart-value-tile`, `chart-value-quiet`, `chart-slice`, `chart-track`, `chart-arc`, `chart-web`, `chart-shape`, `chart-band`, `chart-stem`, `chart-whisker`, `chart-box`, `chart-median`, `chart-link`, `chart-knot`, `chart-cell`, `chart-unit`, `chart-stage`, `chart-tile`, `chart-center`, `chart-center-value`, `chart-center-label`, `chart-tip`, `chart-tip-title`, `chart-tip-row`, `chart-tip-key`, `chart-tip-name`, `chart-tip-value`, `chart-legend`, `chart-key`, `chart-key-input`, `chart-key-mark`, `chart-key-line`, `chart-key-dot`, `chart-key-value` |
| Sparkline | `sparkline`, `sparkline-success`, `sparkline-warning`, `sparkline-danger`, `sparkline-plot`, `sparkline-line`, `sparkline-area`, `sparkline-baseline`, `sparkline-dot` |
| Breakdown | `breakdown`, `breakdown-rows`, `breakdown-item`, `breakdown-rest`, `breakdown-label`, `breakdown-value` |
| Heatmap | `heatmap`, `heatmap-lg`, `heatmap-cell` |
| Timeline | `timeline`, `timeline-item`, `timeline-marker`, `timeline-body`, `timeline-title`, `timeline-description`, `timeline-time` |
| Trace | `trace`, `trace-step`, `trace-failed`, `trace-summary`, `trace-marker`, `trace-meta`, `trace-detail` |
| Calendar | `calendar`, `calendar-month`, `calendar-header`, `calendar-title`, `calendar-title-button`, `calendar-grid`, `calendar-week`, `calendar-weekday`, `calendar-day`, `calendar-day-outside`, `calendar-day-range-start`, `calendar-day-range`, `calendar-day-range-end`, `calendar-period`, `calendar-period-outside` |
| Tree | `tree`, `tree-item`, `tree-label`, `tree-check`, `tree-toggle`, `tree-group`, `tree-sub` |
| Carousel | `carousel`, `carousel-slide`, `carousel-2`, `carousel-3`, `carousel-center`, `carousel-vertical`, `carousel-view`, `carousel-previous`, `carousel-next`, `carousel-dots`, `carousel-dot` |
| Marquee | `marquee`, `marquee-reverse`, `marquee-track` |
| Waveform | `waveform`, `waveform-sm`, `waveform-lg`, `waveform-bar`, `waveform-seek`, `waveform-time` |
| Player | `player`, `player-video`, `player-media`, `player-controls`, `player-button`, `player-play`, `player-mute`, `player-speed`, `player-captions`, `player-pip`, `player-fullscreen`, `player-off`, `player-on`, `player-elapsed`, `player-duration`, `player-seek`, `player-volume` |
| Transcript | `transcript`, `transcript-list`, `transcript-cue`, `transcript-time`, `transcript-text`, `transcript-speaker`, `transcript-return` |
| Splitter | `splitter`, `splitter-pane`, `splitter-handle` |
| Figure | `figure`, `figure-framed`, `figure-center`, `figure-media`, `figure-caption` |
| Compare | `compare`, `compare-before`, `compare-after`, `compare-range` |
| Cropper | `cropper`, `cropper-pan`, `cropper-round`, `cropper-image`, `cropper-box`, `cropper-handle`, `cropper-handle-top`, `cropper-handle-bottom`, `cropper-handle-left`, `cropper-handle-right`, `cropper-status` |
| Quote | `quote`, `quote-lg`, `quote-body`, `quote-text`, `quote-source`, `quote-name` |
| Message | `message`, `message-sent`, `message-avatar`, `message-bubble`, `message-meta`, `message-typing` |
| Thread | `thread`, `thread-item`, `thread-avatar`, `thread-body`, `thread-header`, `thread-text`, `thread-author`, `thread-meta`, `thread-replies` |
| Reaction | `reaction-group`, `reaction`, `reaction-input`, `reaction-emoji`, `reaction-count`, `reaction-add` |
| Avatar | `avatar`, `avatar-image`, `avatar-xs`, `avatar-sm`, `avatar-lg`, `avatar-xl`, `avatar-square`, `avatar-fallback`, `avatar-status`, `avatar-badge`, `avatar-group` |
| Badge | `badge`, `badge-sm`, `badge-lg`, `badge-pill`, `badge-outline`, `badge-raised`, `badge-ink`, `badge-category`, `badge-info`, `badge-success`, `badge-warning`, `badge-danger`, `badge-dot`, `badge-live`, `badge-corner`, `badge-compound`, `badge-label`, `badge-media`, `badge-addon` |
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

`check` reads HTML and templates that look like it (JSX, Svelte, Vue, Astro). It reports a modifier without its base, a part outside its root, two exclusive modifiers together, a class on the wrong element, a missing attribute or accessible name, and a class that looks like one of the library's but is in no contract, which is a warning unless `--strict` makes it an error. It also reads stylesheets and modules for how they load the library: a CSS `@import` of one component (`stylesheet-import`), the full library beside a module import of one stylesheet (`mixed-imports`), and the full library imported in more than one place (`repeated-import`, a warning). `--json` prints the diagnostics for a program. A project's own contracts are read too, from `ui/*.json` and the globs `contracts` lists in `master-ui.json`, and one with the name of a library contract replaces it.

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

A component is a class on a native element, so in a framework most of the library is the same markup in that framework's syntax; there is no `Button` to import. Thirty-seven patterns hold state, render rows from data, join parts by id or have a lifetime, and each has a component: avatar, calendar, carousel, chart, color-picker, combobox, command, compare, cropper, dial, dialog, editable, field, gantt, gradient, kanban, listbox, log, menu, otp, panel, player, popover, schedule, signature, sortable, splitter, stepper, tabs, tags, toast, toolbar, tooltip, tour, transcript, tree and wheel.

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
