/**
 * The platform features the library leans on, each with a live specimen in the contract's own markup. The facts
 * follow /guide/browser-support and the contracts' `platform` lists: what the feature does here, the components
 * that use it, and what a browser without it shows.
 */
export interface PlatformFeature {
  id: string
  /** The feature's own names, set in mono. */
  names: string[]
  summary: string
  usedBy: string[]
  without: string
  html: string
}

export const platformFeatures: PlatformFeature[] = [
  {
    id: 'dialog',
    names: ['<dialog>', 'commandfor', 'closedby'],
    summary: 'A modal opens, traps focus, closes on Escape or the scrim and returns focus, from three attributes.',
    usedBy: ['dialog', 'command', 'toast', 'banner'],
    without: 'Without invoker commands, call showModal() from a click handler; the stylesheet is the same.',
    html: `<button type="button" class="btn btn-sm" commandfor="platform-dialog" command="show-modal">Delete project</button>
<dialog id="platform-dialog" class="dialog" closedby="any" aria-labelledby="platform-dialog-title">
  <header class="dialog-header">
    <h2 class="dialog-title" id="platform-dialog-title">Delete this project?</h2>
    <p class="dialog-description">Atlas and its 14 deployments are removed, and its domains stop resolving at once.</p>
  </header>
  <footer class="dialog-footer">
    <button type="button" class="btn" commandfor="platform-dialog" command="close">Cancel</button>
    <button type="button" class="btn btn-primary" commandfor="platform-dialog" command="close">Delete project</button>
  </footer>
</dialog>`,
  },
  {
    id: 'popover',
    names: ['popover', 'position-area'],
    summary: 'A menu opens beside its button, flips at the viewport edge and closes on an outside click.',
    usedBy: ['menu', 'popover', 'tooltip', 'listbox'],
    without: 'Without anchor positioning it opens and closes the same, centered in the viewport.',
    html: `<button type="button" class="btn btn-sm" popovertarget="platform-menu">Ada Lovelace</button>
<div id="platform-menu" popover class="menu">
  <div class="menu-label">Account</div>
  <a class="menu-item" href="#markup">Profile</a>
  <a class="menu-item" href="#markup">Billing</a>
  <a class="menu-item" href="#markup">Sign out</a>
</div>`,
  },
  {
    id: 'interest',
    names: ['popover="hint"', 'interestfor'],
    summary: 'A tooltip shows on hover or keyboard focus and stays out of the way of the click.',
    usedBy: ['tooltip', 'popover', 'citation', 'hotspot'],
    without: 'Without interest invokers the tooltip does not appear; the button keeps its name and works.',
    html: `<button type="button" class="btn btn-sm" interestfor="platform-tip">Deploy</button>
<div id="platform-tip" popover="hint" class="tooltip">Ships the main branch to production</div>`,
  },
  {
    id: 'select',
    names: ['appearance: base-select', '::picker(select)'],
    summary: 'A native select draws its list on the floating sheet, with a check on the current option.',
    usedBy: ['select'],
    without: 'Without base-select the operating system draws the list; the control is the same.',
    html: `<label class="field">
  Framework
  <select class="select">
    <option class="select-option">Astro</option>
    <option class="select-option">Next.js</option>
    <option class="select-option">SvelteKit</option>
  </select>
</label>`,
  },
  {
    id: 'sizing',
    names: ['field-sizing: content'],
    summary: 'A textarea grows with what is typed into it, from three lines to twelve, then scrolls.',
    usedBy: ['input', 'composer', 'stepper'],
    without: 'Without field-sizing it keeps its minimum height and a resize handle.',
    html: `<label class="field">
  Notes
  <textarea class="input input-auto" placeholder="Keep typing: this one grows with its content"></textarea>
</label>`,
  },
  {
    id: 'anchor',
    names: ['anchor-scope', 'anchor()'],
    summary: 'One thumb glides to the current option: the edges are drawn on an anchor and transition.',
    usedBy: ['segmented', 'tabs', 'toc', 'list'],
    without: 'Without anchor-scope each current option draws its own mark, which changes at once.',
    html: `<div class="segmented segmented-sm" role="radiogroup" aria-label="Period">
  <label class="segmented-item"><input type="radio" class="segmented-input" name="platform-period" checked>Day</label>
  <label class="segmented-item"><input type="radio" class="segmented-input" name="platform-period">Week</label>
  <label class="segmented-item"><input type="radio" class="segmented-input" name="platform-period">Month</label>
</div>`,
  },
]
