const regions = [{ value: 'hnd', label: 'Tokyo' }, { value: 'sin', label: 'Singapore' }]

/** A fixture, its props, and what its first HTML holds when a server renders it: the state of its first value. */
export const first: [string, Record<string, unknown>, RegExp][] = [
  ['combobox', { options: regions, value: 'sin', listLabel: 'Regions', toggleLabel: 'Show regions', 'aria-label': 'Region' }, /value="Singapore"[\s\S]*data-value="sin" aria-checked="true"/],
  ['calendar', { value: ['2026-12-02', '2026-11-13'], multiple: true, months: 2, locale: 'en-GB', weekStart: 1 }, /November 2026[\s\S]*aria-multiselectable="true"[\s\S]*<button[^>]*tabindex="0"[^>]*value="2026-11-13"[^>]*aria-selected="true"[\s\S]*December 2026[\s\S]*class="calendar-day"[^>]*value="2026-12-02"[^>]*aria-selected="true"/],
  ['tabs', { tabs: [{ value: 'a', label: 'A', content: 'Panel A' }, { value: 'b', label: 'B', content: 'Panel B' }], value: 'b', 'aria-label': 'Account' }, /data-value="b" aria-selected="true"[\s\S]*hidden=""[^>]*>(<!--.*?-->)*Panel A/],
  ['splitter', { value: 36, label: 'Resize' }, /--splitter-size: 36%[\s\S]*aria-valuenow="36"/],
  ['dial', { value: 90, full: true, label: 'Angle', name: 'angle', text: (value: number) => `${value}°` }, /class="dial dial-full"[\s\S]*aria-valuenow="90"[\s\S]*aria-valuetext="90°"[\s\S]*--dial-value: 90;[\s\S]*--dial-max: 360[\s\S]*>90°<[\s\S]*value="90"/],
  ['wheel', { columns: [{ label: 'Hour', options: ['09', '10'] }], value: ['10'], 'aria-label': 'Time' }, /data-value="10" aria-selected="true"/],
  ['otp', { length: 4, value: '48', 'aria-label': 'Verification code' }, /value="4"[\s\S]*value="8"/],
  ['tags', { value: ['design', 'research'], name: 'labels', 'aria-label': 'Labels' }, /data-value="design"[\s\S]*name="labels" value="design"[\s\S]*data-value="research"/],
  ['editable', { value: 'Quarterly report', label: 'Title' }, /class="editable-preview"[^>]*>(<!--.*?-->)*Quarterly report[\s\S]*value="Quarterly report"/],
  ['gantt', { rows: [{ id: 'research', label: 'Research', start: 0, end: 3 }, { id: 'design', label: 'Design', start: 2, end: 6 }], from: 0, to: 10, value: { design: [3, 7] }, 'aria-label': 'Plan' }, /data-value="design"[^>]*--from: 3; --to: 7[\s\S]*tabindex="-1"[\s\S]*aria-valuenow="3" aria-valuetext="3 to 7"[^>]*>3 to 7</],
  ['sortable', { value: ['search', 'onboarding', 'billing'] }, /data-value="search"[\s\S]*data-value="onboarding"[\s\S]*data-value="billing"/],
  ['color-picker', { value: 'oklch(62% 0.19 260)', label: 'Accent color', name: 'accent' }, /--color-picker-hue: 260[\s\S]*aria-valuetext="Lightness 62%, chroma 0.19"[\s\S]*value="oklch" selected[\s\S]*name="accent" value="oklch\(62% 0.19 260\)"/],
  ['signature', { value: [[[50, 80, .5], [120, 90, .5]]], label: 'Sign the agreement', name: 'signature' }, /<path class="signature-stroke" d="M[^"]+Z"[\s\S]*name="signature" value="&lt;svg /],
  ['panel', { value: { x: 120, y: 80, width: 288, height: null, minimized: true } }, /--panel-x: 120px;\s*--panel-y: 80px;\s*--panel-width: 288px[\s\S]*panel-minimize" aria-pressed="true"/],
  ['cropper', { value: { x: 64, y: 48, width: 320, height: 240 }, label: 'Crop the photo' }, /--cropper-x: 0\.1; --cropper-y: 0\.1; --cropper-width: 0\.5; --cropper-height: 0\.5[\s\S]*role="application"/],
  ['context-menu', { items: [{ label: 'Rename' }], 'aria-label': 'Project' }, /class="menu menu-context"/],
  ['tree', { nodes: [{ label: 'themes', value: 'themes', children: [{ label: 'paper.css', value: 'paper' }, { label: 'dark.css', value: 'dark' }] }], checkable: true, value: ['paper'], 'aria-label': 'Files' }, /data-value="themes"[^>]*aria-checked="mixed"[\s\S]*data-value="paper"[^>]*aria-checked="true"[\s\S]*data-value="dark"[^>]*aria-checked="false"/],
  ['stepper', { value: 1250, format: { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }, locale: 'en-US', decrementLabel: 'Lower the budget', incrementLabel: 'Raise the budget', 'aria-label': 'Monthly budget' }, /value="1250"[^>]*aria-valuetext="\$1,250"[\s\S]*class="stepper-display"[^>]*>(<!--.*?-->)*\$1,250/],
]
