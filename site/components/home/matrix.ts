/**
 * The hero's matrix: a pool of small, realistic panels built from the library's own markup, recycled through
 * columns that scroll forever. A panel is a template; `__K__` in it is replaced by a number each time it is drawn,
 * so the radio groups of two drawn copies never share a name. No panel uses an id. The whole matrix is
 * decoration, inert and hidden from assistive technology.
 */
const icon = (path: string) => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`
const glyph = {
  check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  warn: '<path d="M12 4 3 19h18L12 4ZM12 10v4M12 17v.01"/>',
  cross: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.35-4.35"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  prev: '<path d="m15 6-6 6 6 6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
}

/** A seeded sequence, so generated rows are the same on every build. */
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646

const uptime = (seed: number, down: number) => {
  const next = seeded(seed)
  return Array.from({ length: 36 }, (_, day) => {
    const state = day === down ? 'down' : next() > 0.93 ? 'degraded' : ''
    return `<li class="uptime-day${state ? ` uptime-${state}` : ''}">Day ${day + 1}: ${state || 'operational'}</li>`
  }).join('')
}

const heat = (seed: number, max: number) => {
  const next = seeded(seed)
  return Array.from({ length: 112 }, (_, day) => {
    const value = Math.round(next() * (day % 7 > 4 ? max / 3 : max))
    return `<li class="heatmap-cell" style="--value: ${value}">Day ${day + 1}: ${value}</li>`
  }).join('')
}

const bars = (values: number[], labels: string, current = -1) => values.map((value, index) => `<li class="chart-item"${index === current ? ' aria-current="true"' : ''} style="--value: ${value}"><span class="chart-label">${labels[index]}</span><span class="chart-value">${value}</span></li>`).join('')

/** A week of bars on a scale a little above its highest day, so the plot is used, not left empty. */
const chart = (label: string, values: number[], options: { max: number, quiet?: boolean, current?: number }) => `<ol class="chart${options.quiet ? ' chart-quiet' : ''} ui-mx-chart" style="--chart-max: ${options.max}" aria-label="${label}">${bars(values, 'MTWTFSS', options.current)}</ol>`

const card = (title: string, description: string, body: string, action = '') => `<section class="card">
  <header class="card-header">
    <h3 class="card-title">${title}</h3>
    <p class="card-description">${description}</p>${action ? `\n    ${action}` : ''}
  </header>
  ${body}
</section>`

const alert = (tone: string, symbol: string, title: string, description: string) => `<div class="alert alert-${tone}" role="status">
  ${icon(symbol).replace('class="icon"', 'class="icon alert-icon"')}
  <div class="alert-body"><p class="alert-title">${title}</p><p class="alert-description">${description}</p></div>
</div>`

const stat = (label: string, value: string, delta: string, direction: 'up' | 'down', description: string) => `<div class="card card-flat">
  <div class="stat">
    <p class="stat-label">${label}</p>
    <div class="stat-row"><p class="stat-value">${value}</p><p class="stat-delta stat-delta-${direction}">${delta}</p></div>
    <p class="stat-description">${description}</p>
  </div>
</div>`

const switches = (rows: [string, boolean][]) => `<div class="sheet ui-mx-list">
${rows.map(([label, on]) => `  <label class="check ui-mx-row"><span class="ui-mx-grow">${label}</span><input type="checkbox" role="switch" class="switch"${on ? ' checked' : ''}></label>`).join('\n')}
</div>`

/** The soft hue each person's initials keep across the page, as in the platform's scenes. */
const tints: Record<string, string> = { 'Ada Lovelace': 'indigo', 'Alan Turing': 'sage', 'Grace Hopper': 'clay' }

const avatar = (portrait: number | string, name: string, size = '') => typeof portrait === 'number'
  ? `<span class="avatar${size}"><img class="avatar-image" src="/home/matrix/portrait-${portrait}.svg" alt="${name}"></span>`
  : `<span class="avatar${size}${tints[name] ? ` ui-tint-${tints[name]}` : ''}" role="img" aria-label="${name}">${portrait}</span>`

const poll = (question: string, options: [string, number][], meta: string) => `<div class="card">
  <fieldset class="poll">
    <legend class="poll-title">${question}</legend>
${options.map(([label, value], index) => `    <label class="poll-option" style="--value: ${value}"><input class="poll-input" type="radio" name="mx-poll-__K__" value="${index}"${index === 0 ? ' checked' : ''}><span class="poll-label">${label}</span><span class="poll-value">${value}%</span></label>`).join('\n')}
    <p class="poll-meta">${meta}</p>
  </fieldset>
</div>`

const timeline = (title: string, items: [string, string][]) => `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label">${title}</p>
  <ol class="timeline">
${items.map(([title, time], index) => `    <li class="timeline-item"${index === 0 ? ' aria-current="true"' : ''}><span class="timeline-marker"></span><div class="timeline-body"><p class="timeline-title">${title}</p><time class="timeline-time">${time}</time></div></li>`).join('\n')}
  </ol>
</div>`

const steps = (title: string, items: [string, string][], current: number) => `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label">${title}</p>
  <ol class="steps steps-vertical">
${items.map(([name, note], index) => `    <li class="steps-item"${index === current ? ' aria-current="step"' : ''}><span class="steps-body"><span class="steps-title">${name}</span><span class="steps-description">${note}</span></span></li>`).join('\n')}
  </ol>
</div>`

const file = (page: string, name: string, meta: string) => `  <li class="file">
    <span class="file-page" aria-hidden="true">${page}</span>
    <div class="file-body"><p class="file-name">${name}</p><p class="file-meta">${meta}</p></div>
    <div class="file-end"><button type="button" class="btn btn-quiet btn-square btn-sm" aria-label="Remove ${name}">${icon(glyph.close)}</button></div>
  </li>`

const table = (rows: [string, string, string, string][]) => `<div class="sheet ui-mx-clip">
  <table class="table">
    <thead><tr class="table-row"><th class="table-heading" scope="col">Project</th><th class="table-heading" scope="col">Status</th><th class="table-heading table-numeric" scope="col">Req.</th></tr></thead>
    <tbody>
${rows.map(([name, tone, status, requests]) => `      <tr class="table-row"><th class="table-cell table-primary" scope="row">${name}</th><td class="table-cell"><span class="badge badge-${tone} badge-dot">${status}</span></td><td class="table-cell table-numeric">${requests}</td></tr>`).join('\n')}
    </tbody>
  </table>
</div>`

const checklist = (title: string, items: [string, string, boolean][]) => card(title, `${items.filter(item => item[2]).length} of ${items.length} done`, `<ul class="checklist">
${items.map(([name, note, done]) => `    <li class="checklist-item"><label class="checklist-label"><input type="checkbox" class="checkbox"${done ? ' checked' : ''}><span class="checklist-body"><span class="checklist-title">${name}</span><span class="checklist-description">${note}</span></span></label></li>`).join('\n')}
  </ul>`)

const data = (rows: [string, string][]) => `<div class="sheet ui-mx-pad">
  <dl class="data-list">
${rows.map(([term, value]) => `    <div class="data-list-item"><dt class="data-list-term">${term}</dt><dd class="data-list-value">${value}</dd></div>`).join('\n')}
  </dl>
</div>`

const quote = (text: string, portrait: number, name: string, role: string) => `<div class="sheet ui-mx-pad">
  <blockquote class="quote">
    <p class="quote-text">${text}</p>
    <footer class="quote-source">${avatar(portrait, '', ' avatar-sm')}<span><span class="quote-name">${name}</span>${role}</span></footer>
  </blockquote>
</div>`

const chips = (legend: string, items: [string, boolean][]) => `<div class="sheet ui-mx-pad">
  <fieldset class="ui-mx-chips">
    <legend class="ui-mx-label">${legend}</legend>
${items.map(([label, on]) => `    <label class="chip"><input type="checkbox" class="chip-input"${on ? ' checked' : ''}>${label}</label>`).join('\n')}
  </fieldset>
</div>`

const swatches = (legend: string, colors: [string, string][], current: number) => `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label">${legend}</p>
  <div class="ui-mx-row-flat" role="radiogroup" aria-label="${legend}">
${colors.map(([name, color], index) => `    <label class="swatch" style="--swatch: ${color}"><input class="swatch-input" type="radio" name="mx-swatch-__K__" aria-label="${name}"${index === current ? ' checked' : ''}></label>`).join('\n')}
  </div>
</div>`

const otp = (title: string, to: string, digits: string) => card(title, `Enter the code sent to ${to}.`, `<div class="card-body">
    <fieldset class="otp" aria-label="Verification code">
${[...digits.padEnd(4, ' ')].map((digit, index) => `      <input class="otp-slot" inputmode="numeric" maxlength="1" aria-label="Digit ${index + 1}"${digit.trim() ? ` value="${digit}"` : ''}>`).join('\n')}
    </fieldset>
  </div>`)

const project = (image: string, title: string, description: string, tone: string, status: string) => `<article class="card">
  <img class="card-media" src="${image}" alt="">
  <header class="card-header">
    <h3 class="card-title">${title}</h3>
    <p class="card-description">${description}</p>
    <span class="card-action badge badge-${tone} badge-dot">${status}</span>
  </header>
</article>`

const cover = (image: string, name: string, meta: string) => `<figure class="figure figure-framed">
  <img class="figure-media" src="${image}" alt="">
  <figcaption class="figure-caption">${name} · ${meta}</figcaption>
</figure>`

/**
 * The kinds of panel, each in two or three variants with their own content. The pool deals them out variant by
 * variant, so two panels of one kind are always a whole round of kinds apart.
 */
const kinds: string[][] = [
  [
    project('/home/matrix/harbor.svg', 'Harbor', 'harbor.dev · 2 hours ago', 'success', 'Ready'),
    project('/home/matrix/lighthouse.svg', 'Lighthouse', 'Status pages for every region', 'warning', 'Building'),
    project('/home/matrix/pines.svg', 'Pines', 'pines.app · 14 regions', 'success', 'Ready'),
    project('/home/matrix/cairn.svg', 'Cairn', 'Preview of pull request #311', 'info', 'Preview'),
  ],
  [
    cover('/home/slides/dune.svg', 'Dune', '1,200 × 1,000'),
    cover('/home/slides/tide.svg', 'Tide', 'Moodboard, autumn'),
    cover('/home/matrix/steps.svg', 'Steps', 'Stair hall, west light'),
    cover('/home/slides/arches.svg', 'Arches', 'Lobby, north wing'),
  ],
  [
    card('Sign in to Atlas', 'Welcome back. Use your work email.', `<div class="card-body ui-mx-stack">
    <label class="field">Email<input class="input" type="email" value="ada@atlas.dev"></label>
    <label class="field">Password<input class="input" type="password" value="moonstone"></label>
  </div>
  <footer class="card-footer"><button type="button" class="btn btn-primary">Continue</button></footer>`),
    card('Create a workspace', 'It takes a minute. You can rename it later.', `<div class="card-body ui-mx-stack">
    <label class="field">Name<input class="input" value="Atlas Labs"></label>
    <label class="input-group"><span class="input-group-addon">https://</span><input class="input-group-field" value="atlas" aria-label="Subdomain"><span class="input-group-addon">.master.co</span></label>
  </div>
  <footer class="card-footer"><button type="button" class="btn">Back</button><button type="button" class="btn btn-primary">Create</button></footer>`),
  ],
  [
    alert('success', glyph.check, 'Deployed to production', 'atlas.dev is live in 14 regions.'),
    alert('info', glyph.info, 'A new version is available', 'Reload to use the latest build.'),
    alert('warning', glyph.warn, 'You have used 82% of bandwidth', 'Upgrade before the 30th to avoid limits.'),
    alert('danger', glyph.cross, 'Build failed on main', 'Type error in src/routes/index.ts.'),
  ],
  [
    stat('Requests', '1.28M', '12.4%', 'up', 'Last 7 days'),
    stat('Error rate', '0.02%', '0.4%', 'down', 'Since Monday'),
    stat('Median response', '84 ms', '6 ms', 'down', 'Edge, all regions'),
    stat('Active users', '18,402', '3.1%', 'up', 'Today, so far'),
  ],
  [
    card('Deployments', '311 this week', chart('Deployments per day', [42, 58, 36, 71, 64, 22, 18], { max: 80 })),
    card('Build minutes', '1,420 of 3,000 used', chart('Build minutes per day', [62, 48, 75, 54, 88, 30, 26], { max: 100, quiet: true, current: 4 })),
    card('Sign-ups', '2,914 this week', chart('Sign-ups per day', [30, 44, 52, 49, 78, 91, 66], { max: 100 })),
  ],
  [
    card('API', '99.94% over 36 days', `<ol class="uptime" aria-label="API, the last 36 days">${uptime(7, 21)}</ol>`, '<span class="card-action badge badge-success badge-dot">Operational</span>'),
    card('Edge network', '99.98% over 36 days', `<ol class="uptime" aria-label="Edge network, the last 36 days">${uptime(41, -1)}</ol>`, '<span class="card-action badge badge-success badge-dot">Operational</span>'),
    card('Dashboard', '99.71% over 36 days', `<ol class="uptime" aria-label="Dashboard, the last 36 days">${uptime(13, 33)}</ol>`, '<span class="card-action badge badge-warning badge-dot">Degraded</span>'),
  ],
  [
    switches([['Automatic updates', true], ['Preview deployments', true], ['Usage analytics', false]]),
    switches([['Email digests', false], ['Mentions', true], ['Weekly report', true]]),
    switches([['Two-step sign in', true], ['Sign out other devices', false], ['Login alerts', true]]),
  ],
  [
    card('Design team', '5 members · 2 online', `<div class="card-body ui-mx-between">
    <span class="avatar-group">${avatar(1, 'Ada Lovelace')}${avatar(2, 'Alan Turing')}${avatar(3, 'Katherine Johnson')}${avatar('GH', 'Grace Hopper')}</span>
    <button type="button" class="btn btn-sm">Invite</button>
  </div>`),
    `<div class="sheet ui-mx-list">
  <div class="ui-mx-row">${avatar(1, 'Ada Lovelace', ' avatar-sm')}<span class="ui-mx-grow">Ada Lovelace</span><span class="badge badge-success badge-dot">Online</span></div>
  <div class="ui-mx-row">${avatar(2, 'Alan Turing', ' avatar-sm')}<span class="ui-mx-grow">Alan Turing</span><span class="badge">Away</span></div>
  <div class="ui-mx-row">${avatar(3, 'Katherine Johnson', ' avatar-sm')}<span class="ui-mx-grow">Katherine Johnson</span><span class="badge badge-ink">Owner</span></div>
</div>`,
  ],
  [
    card('Team', 'For a team that ships every day.', `<p class="price"><s class="price-was">$39</s><span class="price-currency">$</span><span class="price-amount">29</span><span class="price-period">per month</span></p>
  <footer class="card-footer"><button type="button" class="btn btn-primary">Choose Team</button></footer>`, '<span class="card-action badge badge-ink">Popular</span>'),
    card('Starter', 'For one person and a few projects.', `<p class="price"><span class="price-currency">$</span><span class="price-amount">9</span><span class="price-period">per month</span></p>
  <footer class="card-footer"><button type="button" class="btn">Choose Starter</button></footer>`),
  ],
  [
    `<div class="card ui-mx-pad ui-mx-stack">
  <div class="ui-mx-between"><p class="ui-mx-label">web-01 · fra1</p><span class="badge badge-success badge-dot">Healthy</span></div>
  <div class="ui-mx-gauges">
  <div class="gauge" role="meter" aria-label="CPU" aria-valuenow="38" style="--gauge-value: 38"><span class="gauge-value">38%</span><span class="gauge-label">CPU</span></div>
  <div class="gauge" role="meter" aria-label="Memory" aria-valuenow="72" style="--gauge-value: 72"><span class="gauge-value">72%</span><span class="gauge-label">Memory</span></div>
  </div>
</div>`,
    `<div class="card ui-mx-pad ui-mx-stack">
  <div class="ui-mx-between"><p class="ui-mx-label">db-02 · hnd1</p><span class="badge badge-warning badge-dot">Disk high</span></div>
  <div class="ui-mx-gauges">
  <div class="gauge" role="meter" aria-label="Disk" aria-valuenow="91" style="--gauge-value: 91"><span class="gauge-value">91%</span><span class="gauge-label">Disk</span></div>
  <div class="gauge" role="meter" aria-label="Cache hits" aria-valuenow="64" style="--gauge-value: 64"><span class="gauge-value">64%</span><span class="gauge-label">Cache</span></div>
  </div>
</div>`,
  ],
  [
    poll('Which theme should be the default?', [['Moonstone', 58], ['Obsidian', 31], ['Follow the system', 11]], '214 votes · 2 days left'),
    poll('Where should the next region be?', [['São Paulo', 46], ['Mumbai', 38], ['Johannesburg', 16]], '96 votes · closes Friday'),
  ],
  [
    timeline('atlas.dev', [['Deployed to production', '2 minutes ago'], ['Build completed', '3 minutes ago'], ['Commit pushed to main', '4 minutes ago']]),
    timeline('Incident #42', [['Incident resolved', '09:58'], ['Fix deployed to fra1', '09:41'], ['Latency rising in Europe', '09:12']]),
  ],
  [
    otp('Verify it’s you', 'ada@atlas.dev', '428'),
    otp('Two-step sign in', 'your phone', '91'),
  ],
  [
    card('Activity', 'The last sixteen weeks', `<ol class="heatmap" style="--heatmap-max: 6" aria-label="Deployments per day">${heat(23, 6)}</ol>`),
    card('Commits', '1,204 this quarter', `<ol class="heatmap" style="--heatmap-max: 9" aria-label="Commits per day">${heat(57, 9)}</ol>`),
  ],
  [
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label ui-mx-between"><span>Ada Lovelace</span><span class="ui-mx-small">#releases</span></p>
  <ol class="ui-mx-thread">
  <li class="message">${avatar(1, 'Ada', ' avatar-sm').replace('class="avatar avatar-sm"', 'class="avatar avatar-sm message-avatar"')}<div class="message-bubble">Did the docs build finish?</div></li>
  <li class="message message-sent"><div class="message-bubble">Yes, a minute ago. 71 pages, no warnings.</div></li>
  <li class="message message-sent"><div class="message-bubble">Shipping it now.</div><p class="message-meta">Read 09:42</p></li>
  </ol>
</div>`,
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label ui-mx-between"><span>Alan Turing</span><span class="ui-mx-small">Design review</span></p>
  <ol class="ui-mx-thread">
  <li class="message">${avatar(2, 'Alan', ' avatar-sm').replace('class="avatar avatar-sm"', 'class="avatar avatar-sm message-avatar"')}<div class="message-bubble">Can we move the review to Thursday?</div></li>
  <li class="message message-sent"><div class="message-bubble">Thursday at ten works.</div></li>
  <li class="message">${avatar(2, 'Alan', ' avatar-sm').replace('class="avatar avatar-sm"', 'class="avatar avatar-sm message-avatar"')}<div class="message-bubble">Booked. Bring the new covers.</div></li>
  </ol>
</div>`,
  ],
  [
    `<ul class="ui-mx-files">\n${file('pdf', 'Q3 infrastructure report.pdf', '2.4 MB · PDF document')}\n${file('fig', 'Moonstone tokens.fig', '18 MB · Design file')}\n</ul>`,
    `<ul class="ui-mx-files">\n${file('zip', 'atlas-build-311.zip', '41 MB · Archive')}\n${file('csv', 'Requests, October.csv', '640 KB · Spreadsheet')}\n</ul>`,
  ],
  [
    steps('Upgrade to Team', [['Account', 'ada@atlas.dev'], ['Billing', 'Team, yearly'], ['Confirm', 'Review and pay']], 1),
    steps('New project', [['Import', 'github.com/atlas/web'], ['Configure', 'Astro, Node 24'], ['Deploy', 'To production']], 2),
  ],
  [
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <div class="ui-mx-meter">
    <div class="ui-mx-between ui-mx-small"><span>Storage</span><span>4.1 of 10 GB</span></div>
    <meter class="meter" min="0" max="10" value="4.1" aria-label="Storage">4.1 of 10 GB</meter>
  </div>
  <div class="ui-mx-meter">
    <div class="ui-mx-between ui-mx-small"><span>Uploading 3 of 5 files</span><span>62%</span></div>
    <progress class="progress" value="62" max="100" aria-label="Upload">62%</progress>
  </div>
</div>`,
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <div class="ui-mx-meter">
    <div class="ui-mx-between ui-mx-small"><span>Bandwidth</span><span>820 of 1,000 GB</span></div>
    <meter class="meter" min="0" max="1000" value="820" low="600" high="800" aria-label="Bandwidth">820 of 1,000 GB</meter>
  </div>
  <div class="ui-mx-meter">
    <div class="ui-mx-between ui-mx-small"><span>Seats</span><span>7 of 10</span></div>
    <meter class="meter" min="0" max="10" value="7" aria-label="Seats">7 of 10</meter>
  </div>
</div>`,
  ],
  [
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <label class="input-group">${icon(glyph.search)}<input class="input-group-field" type="search" placeholder="Search projects" aria-label="Search projects"><kbd class="kbd">⌘K</kbd></label>
  <nav aria-label="Breadcrumb"><ol class="breadcrumb"><li class="breadcrumb-item"><a class="breadcrumb-link" href="#hero">Projects</a></li><li class="breadcrumb-item"><a class="breadcrumb-link" href="#hero">Atlas</a></li><li class="breadcrumb-item"><a class="breadcrumb-link" href="#hero" aria-current="page">Settings</a></li></ol></nav>
</div>`,
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label">Keyboard shortcuts</p>
  <div class="ui-mx-between ui-mx-small"><span>Search</span><kbd class="kbd">⌘K</kbd></div>
  <div class="ui-mx-between ui-mx-small"><span>New project</span><kbd class="kbd">⌘N</kbd></div>
  <div class="ui-mx-between ui-mx-small"><span>Deploy</span><kbd class="kbd">⌘⇧D</kbd></div>
</div>`,
  ],
  [
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label">Display</p>
  <div class="segmented segmented-sm" role="radiogroup" aria-label="View">
    <label class="segmented-item"><input type="radio" class="segmented-input" name="mx-view-__K__" value="list" checked>List</label>
    <label class="segmented-item"><input type="radio" class="segmented-input" name="mx-view-__K__" value="board">Board</label>
    <label class="segmented-item"><input type="radio" class="segmented-input" name="mx-view-__K__" value="timeline">Timeline</label>
  </div>
  <label class="field">Card size<input type="range" class="slider" value="64"></label>
</div>`,
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label">Requests chart</p>
  <div class="segmented segmented-sm" role="radiogroup" aria-label="Period">
    <label class="segmented-item"><input type="radio" class="segmented-input" name="mx-period-__K__" value="day">Day</label>
    <label class="segmented-item"><input type="radio" class="segmented-input" name="mx-period-__K__" value="week" checked>Week</label>
    <label class="segmented-item"><input type="radio" class="segmented-input" name="mx-period-__K__" value="month">Month</label>
  </div>
  <label class="field">Smoothing<input type="range" class="slider" value="28"></label>
</div>`,
  ],
  [
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <p class="ui-mx-label">Rate the new editor</p>
  <fieldset class="rating" aria-label="Rating">
${[1, 2, 3, 4, 5].map(score => `    <input type="radio" class="rating-input" name="mx-rating-__K__" value="${score}" aria-label="${score} stars"${score === 4 ? ' checked' : ''}>`).join('\n')}
  </fieldset>
  <p class="ui-mx-small">4 of 5 · Thanks for the feedback, Ada.</p>
</div>`,
    quote('Good tools make the next step clear and leave room for the work.', 3, 'Alex Morgan', 'Design lead, Atlas'),
  ],
  [
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <label class="field">Region<select class="select"><option class="select-option">Frankfurt · fra1</option><option class="select-option" selected>Tokyo · hnd1</option></select></label>
  <label class="check"><input type="checkbox" class="checkbox" checked>Serve from the edge</label>
</div>`,
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <label class="field">Framework<select class="select"><option class="select-option" selected>Astro</option><option class="select-option">SvelteKit</option></select></label>
  <label class="check"><input type="checkbox" class="checkbox">Build on every push</label>
</div>`,
  ],
  [
    table([['Atlas', 'success', 'Ready', '1.28M'], ['Borealis', 'warning', 'Building', '402K'], ['Cirrus', 'danger', 'Failed', '87K']]),
    table([['Docs', 'success', 'Ready', '611K'], ['Status', 'success', 'Ready', '74K'], ['Blog', 'info', 'Queued', '29K']]),
  ],
  [
    checklist('Get Atlas ready', [['Create a project', 'Done on 3 November', true], ['Connect a domain', 'atlas.dev is verified', true], ['Invite the team', '2 of 5 joined', false]]),
    checklist('Launch checklist', [['Write the changelog', 'Drafted by Ada', true], ['Run the audit', 'No issues found', true], ['Announce it', 'Scheduled for 10:00', false]]),
  ],
  [
    `<div class="well">
  <div class="empty">
    <div class="empty-media">${icon(glyph.upload)}</div>
    <h3 class="empty-title">No deployments yet</h3>
    <p class="empty-description">Push to main and it appears here.</p>
    <div class="empty-actions"><button type="button" class="btn btn-sm btn-primary">Deploy now</button></div>
  </div>
</div>`,
    `<div class="well">
  <div class="empty">
    <div class="empty-media">${icon(glyph.search)}</div>
    <h3 class="empty-title">No results for “cirus”</h3>
    <p class="empty-description">Check the spelling, or try another name.</p>
  </div>
</div>`,
  ],
  [
    `<div class="sheet ui-mx-pad ui-mx-between">
  <div><p class="ui-mx-label">Deploying atlas.dev</p><p class="ui-mx-small">Uploading 38 routes</p></div>
  <span class="spinner" role="status" aria-label="Deploying"></span>
</div>`,
    `<div class="sheet ui-mx-pad ui-mx-stack" aria-busy="true" aria-label="Loading members">
  <div class="ui-mx-between"><p class="ui-mx-label">Members</p><span class="ui-mx-small">Loading</span></div>
${[0, 1].map(() => `  <div class="ui-mx-skeleton" aria-hidden="true"><span class="skeleton skeleton-circle"></span><span class="ui-mx-grow ui-mx-meter"><span class="skeleton skeleton-text"></span><span class="skeleton skeleton-text"></span></span></div>`).join('\n')}
</div>`,
  ],
  [
    swatches('Accent', [['Graphite', 'oklch(24% .004 265)'], ['Pearl', 'oklch(97% .002 265)'], ['Indigo', 'oklch(58% .2 280)'], ['Moss', 'oklch(66% .14 150)'], ['Amber', 'oklch(74% .15 70)']], 2),
    chips('Topics', [['Design', true], ['Engineering', false], ['Research', true], ['Motion', true]]),
  ],
  [
    data([['Status', '<span class="badge badge-success badge-dot">Ready</span>'], ['Region', 'Tokyo (hnd1)'], ['Framework', 'Astro'], ['Commit', '<code class="code">9f2c1a</code>']]),
    data([['Plan', 'Team, yearly'], ['Seats', '7 of 10'], ['Renews', '12 March 2027'], ['Invoice', '<code class="code">INV-0311</code>']]),
  ],
  [
    `<nav class="sheet ui-mx-pad ui-mx-stack" aria-label="Pagination">
  <div class="ui-mx-between ui-mx-small"><span>Deployments</span><span>21–40 of 480</span></div>
  <ol class="pagination">
    <li><a class="btn btn-quiet btn-square btn-sm" href="#hero" aria-label="Previous page">${icon(glyph.prev)}</a></li>
    <li><a class="btn btn-quiet btn-square btn-sm" href="#hero" aria-label="Page 1">1</a></li>
    <li><a class="btn btn-quiet btn-square btn-sm" href="#hero" aria-label="Page 2" aria-current="page">2</a></li>
    <li><a class="btn btn-quiet btn-square btn-sm" href="#hero" aria-label="Page 3">3</a></li>
    <li class="pagination-gap" aria-hidden="true">…</li>
    <li><a class="btn btn-quiet btn-square btn-sm" href="#hero" aria-label="Page 24">24</a></li>
    <li><a class="btn btn-quiet btn-square btn-sm" href="#hero" aria-label="Next page">${icon(glyph.next)}</a></li>
  </ol>
</nav>`,
    `<div class="sheet ui-mx-pad ui-mx-stack">
  <div class="ui-mx-between"><p class="ui-mx-label">Regions</p><span class="ui-mx-small">1 slow · 1 down</span></div>
  <span class="ui-mx-badges"><span class="badge badge-success badge-dot">fra1</span><span class="badge badge-warning badge-dot">hnd1</span><span class="badge badge-danger badge-dot">iad1</span><span class="badge badge-success badge-dot">sfo1</span><span class="badge badge-success badge-dot">syd1</span></span>
</div>`,
  ],
]

/** Every panel, dealt variant by variant: all the first variants, then all the second, and so on. */
const dealt = Array.from({ length: Math.max(...kinds.map(kind => kind.length)) }, (_, variant) => kinds.flatMap((kind, id) => kind[variant] === undefined ? [] : [{ html: kind[variant], kind: id }])).flat()
export const matrixPool: string[] = dealt.map(panel => panel.html)

/**
 * The pool in four shelves, each kind of panel wholly on one, the kinds dealt largest first to whichever shelf is
 * shortest so the four come out the same size. A column takes its panels from one shelf, and the three columns on
 * either side of it from the other three, so the same panel, or another variant of its kind, never stands near it.
 * A column goes round its shelf without end, so each kind's variants are spread evenly round it: a variant's place
 * is its share of the way round, staggered from kind to kind, and two of one kind stand as far apart as they can.
 */
export const matrixShelves: number[][] = (() => {
  const sizes = [0, 0, 0, 0]
  const shelfOf = new Map<number, number>()
  kinds.map((kind, id) => ({ id, count: kind.length })).sort((a, b) => b.count - a.count || a.id - b.id).forEach(({ id, count }) => {
    const shortest = sizes.indexOf(Math.min(...sizes))
    shelfOf.set(id, shortest)
    sizes[shortest] += count
  })
  return sizes.map((_, shelf) => {
    const members = kinds.flatMap((_, id) => shelfOf.get(id) === shelf ? [id] : [])
    return members
      .flatMap((id, order) => kinds[id].map((_, variant) => ({ id, variant, at: (variant + order / members.length) / kinds[id].length })))
      .sort((a, b) => a.at - b.at)
      .map(({ id, variant }) => dealt.findIndex(panel => panel.kind === id && panel.html === kinds[id][variant]))
  })
})()

/** A panel drawn for one place in the matrix, its radio groups named for that place alone. */
export const drawPanel = (index: number, place: number) => matrixPool[index % matrixPool.length].replaceAll('__K__', String(place))

/**
 * Each column's shelf and where on it the column starts. Columns four apart share a shelf, at the two edges of the
 * view, so they start half way round it from each other.
 */
export function matrixColumns(columns: number, slots: number) {
  return Array.from({ length: columns }, (_, column) => {
    const shelf = matrixShelves[column % matrixShelves.length]
    const start = Math.floor(Math.floor(column / matrixShelves.length) * shelf.length / Math.ceil(columns / matrixShelves.length))
    return { shelf, start, panels: Array.from({ length: slots }, (_, slot) => shelf[(start + slot) % shelf.length]) }
  })
}
