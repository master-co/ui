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
  'tags': { value: ['design', 'research'], name: 'labels', 'aria-label': 'Labels', placeholder: 'Add a label' },
  'editable': { value: 'Quarterly report', label: 'Title', required: true, placeholder: 'Add a title' },
  'sortable': { value: ['onboarding', 'billing', 'search'] },
  'toolbar': {},
  'dial': { value: 40, label: 'Volume', text: (value: number) => `${value}%` },
  'color-picker': { value: 'oklch(62% 0.19 260)', label: 'Accent color', name: 'accent' },
  'color-picker-popover': { value: '#3b82f6', label: 'Accent color' },
  'signature': { label: 'Sign the agreement', name: 'signature' },
  'cropper': { value: { x: 64, y: 48, width: 320, height: 240 }, label: 'Crop the photo' },
  'gantt': { rows: [{ id: 'research', label: 'Research', start: 0, end: 3 }, { id: 'design', label: 'Design', start: 2, end: 6 }, { id: 'launch', label: 'Launch', start: 8 }], from: 0, to: 10, value: { design: [2, 6] }, 'aria-label': 'Plan' },
  'panel': { value: { x: 24, y: 24, width: 288, height: null, minimized: false } },
  'player': { src: '/demo/recording.m4a', label: 'A short recording' },
  'transcript': { cues: [{ start: 0.3, text: 'This is a short recording.' }, { start: 3, text: 'It says a few words.' }] },
  'log': { rows: ['Cloning master-co/ui', 'Installing packages'], latestLabel: 'Jump to latest', 'aria-label': 'Build log' },
  'tour': { spotlight: true },
  'dialog-sheet': {},
  'avatar': { src: 'data:image/png;base64,AAAA', alt: 'Alan Turing', initials: 'AT' },
  'carousel': { value: 'atlas' },
  'schedule': {
    today: '2026-11-13', locale: 'en-US', weekStart: 1, value: { date: '2026-11-13', view: 'month' },
    events: [
      { id: 'offsite', title: 'Offsite', start: '2026-11-07', end: '2026-11-11', allDay: true, category: 'teal' },
      { id: 'standup', title: 'Standup', start: '2026-11-13T09:00', end: '2026-11-13T09:15' },
      { id: 'review', title: 'Design review', start: '2026-11-13T10:00', end: '2026-11-13T11:30', category: 'violet' },
      { id: 'lunch', title: 'Lunch', start: '2026-11-13T12:00', end: '2026-11-13T13:00', category: 'green' },
      { id: 'call', title: 'Customer call', start: '2026-11-13T14:00', end: '2026-11-13T15:00', category: 'blue' },
    ],
  },
  'gradient': { value: { type: 'linear', angle: 90, center: [50, 50], stops: [{ id: 'dawn', offset: 0, color: '#ff6a00' }, { id: 'dusk', offset: 100, color: '#4f46e5' }] } },
}

/** What each component gives out, so the playground listens for that and nothing else. */
export const outputs: Record<string, string[]> = {
  'combobox': ['onValueChange'], 'listbox': ['onValueChange'], 'calendar': ['onValueChange'], 'command': ['onOpenChange'],
  'otp': ['onValueChange', 'onComplete'], 'splitter': ['onValueChange', 'onValueCommit'], 'stepper': ['onValueChange'],
  'compare': ['onValueChange'], 'tree': ['onValueChange'], 'wheel': ['onValueChange'], 'tabs': ['onValueChange'],
  'dialog': ['onOpenChange'], 'popover': ['onOpenChange'],
  'tags': ['onValueChange'], 'editable': ['onValueChange'], 'sortable': ['onValueChange'],
  'dial': ['onValueChange', 'onValueCommit'], 'color-picker': ['onValueChange'], 'signature': ['onValueChange'],
  'cropper': ['onValueChange', 'onValueCommit'], 'gantt': ['onValueChange', 'onValueCommit'], 'panel': ['onValueChange', 'onValueCommit'],
  'tour': ['onValueChange'],
  'carousel': ['onValueChange'], 'schedule': ['onValueChange'], 'gradient': ['onValueChange'],
}

export const toasts = [
  { title: 'Deployed to production', description: 'atlas.dev is live in 14 regions.', status: 'success', duration: 2000 },
  { description: 'Saved. This one stays until it is dismissed.', duration: false },
]
