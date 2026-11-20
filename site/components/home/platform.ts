/**
 * The platform features the library leans on, laid out as a bento of small, realistic scenes. Every scene is the
 * contracts' own markup and works without a script; the facts follow each contract's `platform` list, and what a
 * browser without a feature shows is on /guide/browser-support, linked above the bento. Ids are prefixed, since
 * other sections render live markup too.
 */
import { chartMarkup } from './chart'
import { icon } from './icon'
import { master as moreHorizontal } from '@master/icons/data/native/16/soft/more-horizontal'
import { master as pencil } from '@master/icons/data/native/16/soft/pencil'
import { master as copy } from '@master/icons/data/native/16/soft/copy'
import { master as share } from '@master/icons/data/native/16/soft/share'
import { master as trash } from '@master/icons/data/native/16/soft/trash'
import { master as bold } from '@master/icons/data/native/16/soft/bold'
import { master as italic } from '@master/icons/data/native/16/soft/italic'
import { master as link } from '@master/icons/data/native/16/soft/link'
import { master as code } from '@master/icons/data/native/16/soft/code'
import { master as plus } from '@master/icons/data/native/16/soft/plus'
import { master as arrowUp } from '@master/icons/data/native/16/soft/arrow-up'
import { master as chevronDown } from '@master/icons/data/native/16/soft/chevron-down'

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
  <button type="button" class="btn btn-quiet btn-square btn-sm" popovertarget="platform-menu" aria-label="File actions">${icon(moreHorizontal)}</button>
  <div id="platform-menu" popover class="menu menu-end">
    <button type="button" class="menu-item" popovertarget="platform-menu" popovertargetaction="hide">${icon(pencil)}Rename<span class="menu-shortcut">⌘R</span></button>
    <button type="button" class="menu-item" popovertarget="platform-menu" popovertargetaction="hide">${icon(copy)}Duplicate<span class="menu-shortcut">⌘D</span></button>
    <button type="button" class="menu-item" popovertarget="platform-menu" popovertargetaction="hide">${icon(share)}Share</button>
    <hr class="menu-separator">
    <button type="button" class="menu-item menu-item-danger" popovertarget="platform-menu" popovertargetaction="hide">${icon(trash)}Delete</button>
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
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Bold" aria-pressed="true" interestfor="platform-tip-bold">${icon(bold)}</button>
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Italic" aria-pressed="false" interestfor="platform-tip-italic">${icon(italic)}</button>
  <span class="toolbar-separator" role="separator" aria-orientation="vertical"></span>
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Link" interestfor="platform-tip-link">${icon(link)}</button>
  <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Code" interestfor="platform-tip-code">${icon(code)}</button>
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
  <figure class="chart chart-quiet ui-chart-brand">${chartMarkup({ type: 'bar', label: 'Requests per day, this week, in thousands', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], series: [{ name: 'Requests', values: [148, 176, 162, 214, 238, 171, 171] }], max: 250, ticks: 5, current: 4, format: value => `${value}k` })}</figure>
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
      <button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Attach a file">${icon(plus)}</button>
      <div class="composer-end">
        <span class="composer-hint">Enter to send</span>
        <button type="button" class="btn btn-primary btn-square btn-sm" aria-label="Send">${icon(arrowUp)}</button>
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
    <summary class="accordion-trigger">Does it need JavaScript?${icon(chevronDown, 'icon accordion-chevron')}</summary>
    <div class="accordion-content">No. Each component is a native element with one stylesheet; the browser keeps its behavior.</div>
  </details>
  <details class="accordion-item" name="platform-faq">
    <summary class="accordion-trigger">Can I change the corners?${icon(chevronDown, 'icon accordion-chevron')}</summary>
    <div class="accordion-content">Set --corner-scale and --corner-shape once, and every component follows.</div>
  </details>
  <details class="accordion-item" name="platform-faq">
    <summary class="accordion-trigger">Is dark mode a second stylesheet?${icon(chevronDown, 'icon accordion-chevron')}</summary>
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
