/**
 * Twelve resources of Atlas, a deployment platform: what the results page searches, narrows and sorts. A real
 * page asks its server for one page of these and for the count; the rows here stand in for that answer.
 * `updated` is `YYYY-MM-DD`, so dates sort as text.
 */
export const types = [['guide', 'Guide'], ['template', 'Template'], ['video', 'Video'], ['case-study', 'Case study']]

export const resources = [
  { id: 'first-project', type: 'guide', title: 'Deploy your first project', summary: 'Connect a repository, push to main and open the address Atlas gives it.', updated: '2026-11-12' },
  { id: 'dashboard-tour', type: 'video', title: 'A tour of the new dashboard', summary: 'Four minutes through projects, domains and usage, now on one page.', updated: '2026-11-10' },
  { id: 'borealis-builds', type: 'case-study', title: 'How Borealis cut cold builds to under a minute', summary: 'Restoring caches before the install step, measured across forty projects.', updated: '2026-11-06' },
  { id: 'astro-blog', type: 'template', title: 'Astro blog starter', summary: 'Posts in Markdown, a feed and a preview deployment for every draft.', updated: '2026-11-03' },
  { id: 'rolling-back', type: 'guide', title: 'Roll back without a meeting', summary: 'A deployment never changes, so going back is choosing an earlier one.', updated: '2026-10-29' },
  { id: 'build-log', type: 'video', title: 'Reading a build log', summary: 'Where a failed build says what went wrong, and what the timings mean.', updated: '2026-10-24' },
  { id: 'incident-runbook', type: 'template', title: 'Incident runbook', summary: 'Who decides, who writes the update and when to roll back, on one page.', updated: '2026-10-20' },
  { id: 'custom-domain', type: 'guide', title: 'Move a custom domain to Atlas without downtime, certificates included', summary: 'Lower the record’s lifetime, issue the certificate first, then switch.', updated: '2026-10-15' },
  { id: 'cinder-previews', type: 'case-study', title: 'Cinder reviews forty previews a day with a team of six', summary: 'Comments pinned to the page replaced the screenshots in their reviews.', updated: '2026-10-09' },
  { id: 'edge-caching', type: 'video', title: 'Edge caching in ten minutes', summary: 'What is cached in each region, for how long, and how a deployment clears it.', updated: '2026-10-02' },
  { id: 'launch-checklist', type: 'template', title: 'Launch checklist', summary: 'Domains, redirects, analytics and a rollback plan, to tick off before a launch.', updated: '2026-09-25' },
  { id: 'branch-previews', type: 'guide', title: 'Preview every branch', summary: 'Give each branch its own address and protect it with a password.', updated: '2026-09-18' },
]
