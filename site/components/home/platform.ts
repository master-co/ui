/**
 * The platform features the library leans on, laid out as a bento of small, realistic scenes. Every scene is the
 * contracts' own markup and works without a script; the facts follow each contract's `platform` list, and what a
 * browser without a feature shows is on /guide/browser-support, linked above the bento. Ids are prefixed, since
 * other sections render live markup too.
 */
export interface PlatformFeature {
  id: string
  /** The tile's span in the library's bento: one cell, two columns, two rows, or both. */
  size: 'cell' | 'wide' | 'tall' | 'large'
  /** The feature's own names, set in mono. */
  names: string[]
  title: string
  summary: string
  html: string
}

const icon = (path: string) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`

const slides = [
  ['pearl', 'A pearl on a stone plinth, in soft morning light'],
  ['obsidian', 'A polished obsidian sphere on a dark glossy floor, a softbox reflected in it'],
  ['dune', 'Dunes at first light, their ridges catching a low sun'],
  ['tide', 'A still sea at dusk, the moon low over the horizon and its light broken on the water'],
  ['arches', 'A plaster hall with three arched openings, low sun laying their shapes across the floor'],
] as const

export const platformFeatures: PlatformFeature[] = [
  {
    id: 'carousel',
    size: 'large',
    names: ['::scroll-button()', '::scroll-marker', 'scroll-snap'],
    title: 'Slides with buttons and dots, drawn by the browser',
    summary: 'A row of slides snaps into place, and the browser adds previous and next buttons and a dot for each slide.',
    html: `<div class="carousel carousel-center" role="region" aria-label="Material studies" tabindex="0">
${slides.map(([file, alt]) => `  <figure class="carousel-slide figure">
    <img class="figure-media" src="/home/slides/${file}.svg" alt="${alt}" width="1200" height="1000" loading="lazy" decoding="async">
  </figure>`).join('\n')}
</div>`,
  },
  {
    id: 'dialog',
    size: 'wide',
    names: ['<dialog>', 'commandfor', 'closedby', '@starting-style'],
    title: 'A modal from three attributes',
    summary: 'Publish opens a modal that keeps focus inside, closes on Escape or the scrim, eases in and out, and hands focus back.',
    html: `<section class="sheet ui-scene-deploys" aria-labelledby="platform-deploys-title">
  <header class="ui-scene-bar">
    <div>
      <h3 class="ui-scene-title" id="platform-deploys-title">atlas.dev</h3>
      <p class="ui-scene-meta">Production · 3 changes waiting</p>
    </div>
    <button type="button" class="btn btn-primary btn-sm" commandfor="platform-dialog" command="show-modal">Publish</button>
  </header>
  <ul class="ui-scene-rows">
    <li><span class="avatar avatar-sm ui-tint-indigo" role="img" aria-label="Ada Lovelace">AL</span><span class="ui-scene-commit">Tighten the card's inset on phones</span><code>a1f9e2c</code><span class="badge badge-success badge-dot">Ready</span></li>
    <li><span class="avatar avatar-sm ui-tint-clay" role="img" aria-label="Grace Hopper">GH</span><span class="ui-scene-commit">Draw the toast's clock as a hairline</span><code>7c04b1d</code><span class="badge badge-success badge-dot">Ready</span></li>
    <li><span class="avatar avatar-sm ui-tint-sage" role="img" aria-label="Alan Turing">AT</span><span class="ui-scene-commit">Glide the segmented thumb</span><code>e55d0a8</code><span class="badge badge-warning badge-dot">Building</span></li>
  </ul>
</section>
<dialog id="platform-dialog" class="dialog" closedby="any" aria-labelledby="platform-dialog-title">
  <header class="dialog-header">
    <h2 class="dialog-title" id="platform-dialog-title">Publish to production?</h2>
    <p class="dialog-description">The three changes on main go live on atlas.dev at once. The current deployment stays one click away.</p>
  </header>
  <footer class="dialog-footer">
    <button type="button" class="btn" commandfor="platform-dialog" command="close">Cancel</button>
    <button type="button" class="btn btn-primary" commandfor="platform-dialog" command="close">Publish</button>
  </footer>
</dialog>`,
  },
  {
    id: 'menu',
    size: 'cell',
    names: ['popover', 'position-area'],
    title: 'A menu against its button',
    summary: 'It opens beside the button, turns back at the viewport edge and closes on Escape or a click outside.',
    html: `<div class="sheet ui-scene-file">
  <span class="ui-scene-file-icon" aria-hidden="true">PDF</span>
  <div class="ui-scene-file-text">
    <p class="ui-scene-title">brand-guidelines.pdf</p>
    <p class="ui-scene-meta">4.2 MB · edited 2h ago</p>
  </div>
  <button type="button" class="btn btn-quiet btn-square btn-sm" popovertarget="platform-menu" aria-label="File actions">${icon('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')}</button>
  <div id="platform-menu" popover class="menu menu-end">
    <button type="button" class="menu-item" popovertarget="platform-menu" popovertargetaction="hide">${icon('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>')}Rename<span class="menu-shortcut">⌘R</span></button>
    <button type="button" class="menu-item" popovertarget="platform-menu" popovertargetaction="hide">${icon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>')}Duplicate<span class="menu-shortcut">⌘D</span></button>
    <button type="button" class="menu-item" popovertarget="platform-menu" popovertargetaction="hide">${icon('<path d="M12 4v11M8 8l4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>')}Share</button>
    <hr class="menu-separator">
    <button type="button" class="menu-item menu-item-danger" popovertarget="platform-menu" popovertargetaction="hide">${icon('<path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>')}Delete</button>
  </div>
</div>`,
  },
  {
    id: 'interest',
    size: 'cell',
    names: ['popover="hint"', 'interestfor'],
    title: 'Tooltips on hover and focus',
    summary: 'Each tool names itself and its key on hover or keyboard focus, and stays out of the way of the click.',
    html: `<div class="toolbar" role="toolbar" aria-label="Formatting">
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Bold" aria-pressed="true" interestfor="platform-tip-bold">${icon('<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>')}</button>
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Italic" aria-pressed="false" interestfor="platform-tip-italic">${icon('<path d="M11 5h6M7 19h6M14 5l-4 14"/>')}</button>
  <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Link" interestfor="platform-tip-link">${icon('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')}</button>
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Code" interestfor="platform-tip-code">${icon('<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>')}</button>
</div>
<div id="platform-tip-bold" popover="hint" class="tooltip">Bold <kbd class="kbd">⌘B</kbd></div>
<div id="platform-tip-italic" popover="hint" class="tooltip">Italic <kbd class="kbd">⌘I</kbd></div>
<div id="platform-tip-link" popover="hint" class="tooltip">Link <kbd class="kbd">⌘K</kbd></div>
<div id="platform-tip-code" popover="hint" class="tooltip">Inline code <kbd class="kbd">⌘E</kbd></div>`,
  },
  {
    id: 'chart',
    size: 'wide',
    names: ['anchor-scope', 'anchor()', '@starting-style'],
    title: 'A thumb that glides, bars that rise',
    summary: 'The segmented thumb is drawn on an anchor and glides to the current option; the bars rise from the baseline as they arrive.',
    html: `<section class="card ui-scene-chart" aria-labelledby="platform-chart-title">
  <header class="card-header">
    <h3 class="card-title" id="platform-chart-title">Requests</h3>
    <p class="card-description">1.28M this week · up 12.4%</p>
    <div class="segmented segmented-sm card-action" role="radiogroup" aria-label="Period">
      <label class="segmented-item"><input type="radio" class="segmented-input" name="platform-period" value="day">Day</label>
      <label class="segmented-item"><input type="radio" class="segmented-input" name="platform-period" value="week" checked>Week</label>
      <label class="segmented-item"><input type="radio" class="segmented-input" name="platform-period" value="month">Month</label>
    </div>
  </header>
  <ol class="chart chart-quiet ui-chart-brand" style="--chart-max: 250" aria-label="Requests per day, this week, in thousands">
    <li class="chart-item" style="--value: 148"><span class="chart-label">Mon</span><span class="chart-value">148k</span></li>
    <li class="chart-item" style="--value: 176"><span class="chart-label">Tue</span><span class="chart-value">176k</span></li>
    <li class="chart-item" style="--value: 162"><span class="chart-label">Wed</span><span class="chart-value">162k</span></li>
    <li class="chart-item" style="--value: 214"><span class="chart-label">Thu</span><span class="chart-value">214k</span></li>
    <li class="chart-item" aria-current="true" style="--value: 238"><span class="chart-label">Fri</span><span class="chart-value">238k</span></li>
    <li class="chart-item" style="--value: 171"><span class="chart-label">Sat</span><span class="chart-value">171k</span></li>
    <li class="chart-item" style="--value: 171"><span class="chart-label">Sun</span><span class="chart-value">171k</span></li>
  </ol>
</section>`,
  },
  {
    id: 'select',
    size: 'cell',
    names: ['appearance: base-select', '::picker(select)'],
    title: 'A native select, in the material',
    summary: 'The list opens on the floating sheet, anchored to the control, with a check beside the current option.',
    html: `<div class="sheet ui-scene-form">
  <label class="field">
    Region
    <select class="select">
      <option class="select-option">Frankfurt · fra1</option>
      <option class="select-option" selected>Tokyo · hnd1</option>
      <option class="select-option">São Paulo · gru1</option>
      <option class="select-option">Virginia · iad1</option>
    </select>
  </label>
  <p class="ui-scene-meta">Functions run here first; the edge serves the rest.</p>
</div>`,
  },
  {
    id: 'composer',
    size: 'tall',
    names: ['field-sizing: content'],
    title: 'A field that grows with what you write',
    summary: 'The composer starts at one line and grows to ten as you type, then scrolls; the thread above stays put.',
    html: `<div class="card ui-scene-chat">
  <header class="ui-scene-chat-head">
    <p class="ui-scene-title">Design review</p>
    <p class="ui-scene-meta">#interface · 3 members</p>
  </header>
  <ol class="thread">
    <li class="thread-item">
      <span class="thread-avatar"><span class="avatar ui-tint-indigo">AL</span></span>
      <div class="thread-body">
        <p class="thread-header"><span class="thread-author">Ada Lovelace</span> <time class="thread-meta" datetime="2026-11-12T09:12">9:12</time></p>
        <p class="thread-text">The focus ring is cut by the mask on the code panel. Should it move to the group?</p>
      </div>
    </li>
    <li class="thread-item">
      <span class="thread-avatar"><span class="avatar ui-tint-sage">AT</span></span>
      <div class="thread-body">
        <p class="thread-header"><span class="thread-author">Alan Turing</span> <time class="thread-meta" datetime="2026-11-12T09:20">9:20</time></p>
        <p class="thread-text">Yes. The group already has the corner, so the ring follows it.</p>
      </div>
    </li>
  </ol>
  <form class="composer">
    <textarea class="composer-field" name="message" aria-label="Reply" placeholder="Reply to the thread"></textarea>
    <div class="composer-toolbar">
      <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Attach a file">${icon('<path d="M12 5v14M5 12h14"/>')}</button>
      <div class="composer-end">
        <span class="composer-hint">Enter to send</span>
        <button type="button" class="btn btn-primary btn-square btn-sm" aria-label="Send">${icon('<path d="M12 19V5M6 11l6-6 6 6"/>')}</button>
      </div>
    </div>
  </form>
</div>`,
  },
  {
    id: 'accordion',
    size: 'wide',
    names: ['::details-content', 'interpolate-size', 'details[name]'],
    title: 'An accordion that eases open',
    summary: 'Rows sharing a name close each other, and each panel eases to its height with interpolate-size.',
    html: `<div class="accordion">
  <details class="accordion-item" name="platform-faq" open>
    <summary class="accordion-trigger">Does it need JavaScript?</summary>
    <div class="accordion-content">No. Each component is a native element with one stylesheet; the browser keeps its behavior.</div>
  </details>
  <details class="accordion-item" name="platform-faq">
    <summary class="accordion-trigger">Can I change the corners?</summary>
    <div class="accordion-content">Set --corner-scale and --corner-shape once, and every component follows.</div>
  </details>
  <details class="accordion-item" name="platform-faq">
    <summary class="accordion-trigger">Is dark mode a second stylesheet?</summary>
    <div class="accordion-content">No. Every color token resolves with light-dark() and follows the page's color scheme.</div>
  </details>
</div>`,
  },
  {
    id: 'slider',
    size: 'cell',
    names: ['view-timeline', 'timeline-scope'],
    title: 'A filled track from the thumb',
    summary: 'A scroll-driven animation reads where the thumb is and fills the track up to it.',
    html: `<div class="sheet ui-scene-form">
  <label class="field">
    Volume
    <input type="range" class="slider" value="64">
  </label>
  <label class="field">
    Brightness
    <input type="range" class="slider" value="32">
  </label>
</div>`,
  },
]
