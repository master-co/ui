/**
 * What the playground gives each component: the neutral props the scenarios use, with room to try them by hand.
 */
const regions = [
  { value: 'hnd', label: 'Tokyo' },
  { value: 'sin', label: 'Singapore' },
  { value: 'fra', label: 'Frankfurt', description: 'Germany' },
  { value: 'lhr', label: 'London' },
  { value: 'pdx', label: 'Oregon', disabled: true },
]

const menu = [
  { label: 'Rename', shortcut: '⌘R' },
  { label: 'Duplicate' },
  { label: 'Settings', href: '#settings' },
  { separator: true },
  { label: 'Delete', danger: true },
]

export const examples: Record<string, Record<string, unknown>> = {
  'combobox': { options: regions, value: 'sin', listLabel: 'Regions', toggleLabel: 'Show regions', empty: 'No regions match.', 'aria-label': 'Region', placeholder: 'Search regions' },
  'listbox': { options: regions.slice(0, 4), value: 'hnd', 'aria-label': 'Region' },
  'calendar': { value: '2026-11-13', locale: 'en-GB', weekStart: 1 },
  'command': { items: [{ label: 'New project', group: 'Suggestions' }, { label: 'Deploy to production', group: 'Suggestions' }, { label: 'Settings', group: 'Go to', href: '#settings' }], searchLabel: 'Search commands', placeholder: 'Type a command or search', listLabel: 'Commands', empty: 'No commands match.', 'aria-label': 'Command palette' },
  'otp': { length: 6, value: '48', 'aria-label': 'Verification code' },
  'splitter': { value: 36, min: 20, max: 80, label: 'Resize the file list', style: 'height: 8rem' },
  'stepper': { value: 4, min: 1, max: 12, decrementLabel: 'Fewer seats', incrementLabel: 'More seats', 'aria-label': 'Seats' },
  'compare': { value: 50, label: 'Show more of the second picture' },
  'menu': { items: menu, 'aria-label': 'Project' },
  'context-menu': { items: menu, 'aria-label': 'Project' },
  'tree': { nodes: [{ label: 'components', open: true, children: [{ label: 'button.css', value: 'components/button.css' }, { label: 'input.css', value: 'components/input.css' }] }, { label: 'themes', children: [{ label: 'paper.css', value: 'themes/paper.css' }] }, { label: 'README.md', value: 'README.md' }], value: 'components/input.css', 'aria-label': 'Files' },
  'wheel': { columns: [{ label: 'Hour', options: ['08', '09', '10', '11', '12'], separator: ':' }, { label: 'Minute', options: ['00', '15', '30', '45'] }, { label: 'Period', options: [{ value: 'am', label: 'AM' }, { value: 'pm', label: 'PM' }] }], value: ['10', '30', 'pm'], 'aria-label': 'Time' },
  'tabs': { tabs: [{ value: 'profile', label: 'Profile', content: 'Profile settings' }, { value: 'billing', label: 'Billing', content: 'Billing settings' }, { value: 'team', label: 'Team', content: 'Team settings', disabled: true }], value: 'profile', 'aria-label': 'Account' },
  'dialog': {},
  'popover': {},
  'tooltip': {},
  'field': { label: 'Work email', hint: 'We only send receipts.' },
  'toast': {},
}

/** What each component gives out, so the playground listens for that and nothing else. */
export const outputs: Record<string, string[]> = {
  'combobox': ['onValueChange'], 'listbox': ['onValueChange'], 'calendar': ['onValueChange'], 'command': ['onOpenChange'],
  'otp': ['onValueChange', 'onComplete'], 'splitter': ['onValueChange', 'onValueCommit'], 'stepper': ['onValueChange'],
  'compare': ['onValueChange'], 'tree': ['onValueChange'], 'wheel': ['onValueChange'], 'tabs': ['onValueChange'],
  'dialog': ['onOpenChange'], 'popover': ['onOpenChange'],
}

export const toasts = [
  { title: 'Deployed to production', description: 'atlas.dev is live in 14 regions.', status: 'success', duration: 2000 },
  { description: 'Saved. This one stays until it is dismissed.', duration: false },
]
