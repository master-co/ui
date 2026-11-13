/**
 * Thirty deployments of Atlas Labs' projects over the last two weeks: what the filter bar narrows. A queued
 * deployment has not run, so its duration is 0 seconds.
 */
export const fields = [
  { key: 'project', label: 'Project', type: 'enum', options: [['Atlas', 'Atlas'], ['Borealis', 'Borealis'], ['Cinder', 'Cinder'], ['Drift', 'Drift'], ['Ember', 'Ember'], ['Fathom', 'Fathom']] },
  { key: 'branch', label: 'Branch', type: 'text' },
  { key: 'status', label: 'Status', type: 'enum', options: [['ready', 'Ready'], ['building', 'Building'], ['queued', 'Queued'], ['failed', 'Failed']] },
  { key: 'duration', label: 'Duration', type: 'number', unit: 'seconds' },
  { key: 'date', label: 'Date', type: 'date' },
]

export const deployments = [
  { id: 'dpl_3200', project: 'Atlas', branch: 'main', status: 'ready', duration: 47, date: '2026-11-14' },
  { id: 'dpl_3199', project: 'Borealis', branch: 'release/0.9', status: 'ready', duration: 42, date: '2026-11-14' },
  { id: 'dpl_3198', project: 'Cinder', branch: 'main', status: 'ready', duration: 112, date: '2026-11-13' },
  { id: 'dpl_3197', project: 'Drift', branch: 'main', status: 'queued', duration: 0, date: '2026-11-13' },
  { id: 'dpl_3196', project: 'Ember', branch: 'main', status: 'ready', duration: 71, date: '2026-11-12' },
  { id: 'dpl_3195', project: 'Drift', branch: 'release/0.9', status: 'ready', duration: 51, date: '2026-11-12' },
  { id: 'dpl_3194', project: 'Atlas', branch: 'main', status: 'queued', duration: 0, date: '2026-11-11' },
  { id: 'dpl_3193', project: 'Borealis', branch: 'main', status: 'ready', duration: 51, date: '2026-11-11' },
  { id: 'dpl_3192', project: 'Cinder', branch: 'fix/avatar-fallback', status: 'failed', duration: 38, date: '2026-11-10' },
  { id: 'dpl_3191', project: 'Drift', branch: 'feat/schedule-view', status: 'ready', duration: 96, date: '2026-11-10' },
  { id: 'dpl_3190', project: 'Atlas', branch: 'feat/schedule-view', status: 'ready', duration: 71, date: '2026-11-09' },
  { id: 'dpl_3189', project: 'Fathom', branch: 'feat/category-colors', status: 'queued', duration: 0, date: '2026-11-09' },
  { id: 'dpl_3188', project: 'Atlas', branch: 'feat/schedule-view', status: 'queued', duration: 0, date: '2026-11-08' },
  { id: 'dpl_3187', project: 'Borealis', branch: 'fix/avatar-fallback', status: 'ready', duration: 112, date: '2026-11-08' },
  { id: 'dpl_3186', project: 'Cinder', branch: 'release/0.9', status: 'ready', duration: 42, date: '2026-11-07' },
  { id: 'dpl_3185', project: 'Drift', branch: 'fix/avatar-fallback', status: 'ready', duration: 112, date: '2026-11-07' },
  { id: 'dpl_3184', project: 'Ember', branch: 'main', status: 'building', duration: 128, date: '2026-11-06' },
  { id: 'dpl_3183', project: 'Fathom', branch: 'chore/deps', status: 'ready', duration: 84, date: '2026-11-06' },
  { id: 'dpl_3182', project: 'Atlas', branch: 'fix/avatar-fallback', status: 'ready', duration: 55, date: '2026-11-05' },
  { id: 'dpl_3181', project: 'Borealis', branch: 'fix/avatar-fallback', status: 'ready', duration: 145, date: '2026-11-05' },
  { id: 'dpl_3180', project: 'Atlas', branch: 'feat/category-colors', status: 'ready', duration: 112, date: '2026-11-04' },
  { id: 'dpl_3179', project: 'Drift', branch: 'main', status: 'queued', duration: 0, date: '2026-11-04' },
  { id: 'dpl_3178', project: 'Ember', branch: 'release/0.9', status: 'building', duration: 55, date: '2026-11-03' },
  { id: 'dpl_3177', project: 'Fathom', branch: 'main', status: 'ready', duration: 96, date: '2026-11-03' },
  { id: 'dpl_3176', project: 'Atlas', branch: 'main', status: 'ready', duration: 163, date: '2026-11-02' },
  { id: 'dpl_3175', project: 'Drift', branch: 'chore/deps', status: 'ready', duration: 241, date: '2026-11-02' },
  { id: 'dpl_3174', project: 'Cinder', branch: 'release/0.9', status: 'failed', duration: 38, date: '2026-11-01' },
  { id: 'dpl_3173', project: 'Drift', branch: 'main', status: 'queued', duration: 0, date: '2026-11-01' },
  { id: 'dpl_3172', project: 'Ember', branch: 'main', status: 'ready', duration: 145, date: '2026-10-31' },
  { id: 'dpl_3171', project: 'Fathom', branch: 'chore/deps', status: 'building', duration: 112, date: '2026-10-31' },
]
