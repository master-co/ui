const regions = [{ value: 'hnd', label: 'Tokyo' }, { value: 'sin', label: 'Singapore' }]

/** A fixture, its props, and what its first HTML holds when a server renders it: the state of its first value. */
export const first: [string, Record<string, unknown>, RegExp][] = [
  ['combobox', { options: regions, value: 'sin', listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region' }, /value="Singapore"[\s\S]*data-value="sin" aria-checked="true"/],
  ['calendar', { value: '2026-11-13', locale: 'en-GB', weekStart: 1 }, /November 2026[\s\S]*<button[^>]*tabindex="0"[^>]*value="2026-11-13"[^>]*aria-selected="true"/],
  ['tabs', { tabs: [{ value: 'a', label: 'A', content: 'Panel A' }, { value: 'b', label: 'B', content: 'Panel B' }], value: 'b', 'aria-label': 'Account' }, /data-value="b" aria-selected="true"[\s\S]*hidden=""[^>]*>(<!--.*?-->)*Panel A/],
  ['splitter', { value: 36, label: 'Resize' }, /--splitter-size: 36%[\s\S]*aria-valuenow="36"/],
  ['wheel', { columns: [{ label: 'Hour', options: ['09', '10'] }], value: ['10'], 'aria-label': 'Time' }, /data-value="10" aria-selected="true"/],
  ['otp', { length: 4, value: '48', 'aria-label': 'Verification code' }, /value="4"[\s\S]*value="8"/],
  ['context-menu', { items: [{ label: 'Rename' }], 'aria-label': 'Project' }, /class="menu menu-context"/],
]
