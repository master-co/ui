/**
 * Write what a program reads from the site, beside what a person reads:
 *
 *   /llms.txt                         the index: how to use the library, and a link to every page as Markdown
 *   /<section>/<slug>.md              each page as Markdown; a component's page is written from its contract
 *   /<locale>/llms.txt, /<locale>/<section>/<slug>.md   the same for each translated edition
 *   /contracts.json, /theme.json      the contracts and the tokens, as data
 *   /contract.schema.json             the schema every contract follows
 *   /standalone.css, /themes/*.css    the library compiled to plain CSS
 *   /r/registry.json, /r/<name>.json  a registry in the shadcn format: source to copy into a project and own
 *
 * Everything here is generated from `packages/ui` and `content`; none of it is written by hand.
 */
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blocks, charts, components, pageOfContract, pages as pageLayouts } from '../components/catalog.ts'
import { exampleSource } from '../utils/framework-example.ts'
import { example as exampleOf, exampleFiles, exampleSetup } from '../utils/examples.ts'
import { previewMarkdown } from '../utils/preview-markdown.ts'
import { anchorMarkdown } from '../utils/anchor-markdown.ts'
import { figureMarkdown } from '../utils/figure-markdown.ts'
import { promptMarkdown } from '../utils/prompt-markdown.ts'
import { locales, nameOfLocale } from '@master/internal-site/common/locales.js'
import { readLocalizedDocument } from '@master/internal-site/build/localization.ts'
import translations from '../i18n/translations.ts'
import { localizedContract } from '../i18n/contract-copy.ts'
import { editionOf } from './seo.mjs'
import siteConfig from '../site.config.ts'
import { markdownReferences, preserveFences, relatedMarkdown } from '../utils/portable-links.ts'
import { documentSections } from '../i18n/sections.ts'

const site = fileURLToPath(new URL('../', import.meta.url))
const ui = join(site, '../packages/ui')
const out = join(site, 'public')
const origin = new URL(siteConfig.origin).origin
const read = (file: string) => readFileSync(file, 'utf8')
const write = (file: string, content: string) => {
  mkdirSync(dirname(join(out, file)), { recursive: true })
  writeFileSync(join(out, file), content)
}

write('license.txt', `${read(join(site, 'LICENSE')).trimEnd()}\n\n---\n\n${read(join(ui, 'LICENSE')).trimEnd()}\n`)

/** Build the package first: the compiled CSS and the collected contracts are its outputs, not ours. */
execFileSync(process.execPath, ['--import', 'tsx', join(ui, 'scripts/build.ts')], { cwd: ui, stdio: 'ignore' })
const { contracts } = JSON.parse(read(join(ui, 'dist/contracts.json'))) as { contracts: any[] }
const contractOf = new Map(contracts.map(contract => [contract.name, contract]))

/** The framework components: what each renders, and its file in each framework. */
const manifest = JSON.parse(read(join(ui, 'frameworks/manifest.json'))) as { frameworks: Record<string, { title: string, package: string }>, components: Record<string, Record<string, string>> }
const componentsOf = (contract: string) => Object.entries(manifest.components).filter(([, entry]) => entry.contract === contract).map(([name]) => name)
/** A framework component's files: the component and what it imports from beside it. */
function frameworkFiles(framework: string, entry: string) {
  const from = join(ui, 'frameworks', framework)
  const files = new Map<string, string>()
  const pending = [entry]
  while (pending.length) {
    const name = pending.pop()!
    if (files.has(name)) continue
    files.set(name, read(join(from, name)))
    for (const match of files.get(name)!.matchAll(/from\s+['"]\.\/([\w.-]+)['"]/g)) {
      const found = [match[1], `${match[1]}.ts`, `${match[1]}.tsx`, match[1].replace(/\.js$/, '.ts')].find(candidate => existsSync(join(from, candidate)))
      if (found) pending.push(found)
    }
  }
  return files
}

// `layouts/` is the retired section: its pages moved to the components and the pages, and `_redirects` sends them there.
for (const generated of ['r', 'themes', 'layouts']) rmSync(join(out, generated), { recursive: true, force: true })
/** The languages other than English; each has its own `llms.txt` and Markdown pages. */
const translatedLocales = locales.filter(locale => locale !== 'en')
for (const locale of translatedLocales) rmSync(join(out, locale), { recursive: true, force: true })
for (const section of documentSections) {
  if (existsSync(join(out, section))) for (const file of readdirSync(join(out, section))) if (file.endsWith('.md')) rmSync(join(out, section, file))
}
cpSync(join(ui, 'dist/contracts.json'), join(out, 'contracts.json'))
cpSync(join(ui, 'dist/theme.json'), join(out, 'theme.json'))
cpSync(join(ui, 'dist/standalone.css'), join(out, 'standalone.css'))
cpSync(join(ui, 'dist/base.css'), join(out, 'base.css'))
cpSync(join(ui, 'dist/themes'), join(out, 'themes'), { recursive: true })
cpSync(join(ui, 'contract.schema.json'), join(out, 'contract.schema.json'))

/* ---------------------------------------------------------------- Markdown */

const row = (cells: string[]) => `| ${cells.map(cell => cell.replaceAll('|', '\\|').replaceAll('\n', ' ')).join(' | ')} |`
const table = (head: string[], rows: string[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n')
const code = (text: string) => `\`${text}\``
const owners = (entry: any): string[] => entry.of === undefined ? [] : Array.isArray(entry.of) ? entry.of : [entry.of]
const prefixOf = (locale: string) => locale === 'en' ? '' : `/${locale}`
const t = (locale: string, key: string) => translations[locale]?.[key] ?? key
const fills = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match)

/** The search builder already resolves drafts, missing translations and each document's localized metadata. */
type DocumentEntry = { url: string, title: string, description: string }
const editions = new Map<string, DocumentEntry>()
for (const locale of locales) {
  const entries: DocumentEntry[] = JSON.parse(read(join(out, 'search', locale + '.json')))
  for (const entry of entries) {
    const [section, slug] = entry.url.slice(prefixOf(locale).length + 1).split('/')
    if (slug && documentSections.includes(section)) editions.set(entry.url, entry)
  }
}

function edition(pathname: string, locale: string) {
  const entry = editions.get(prefixOf(locale) + pathname) ?? editions.get(pathname)
  if (!entry) throw new Error('No published document for ' + pathname)
  return entry
}

/** A contract as a page: everything an agent needs to write the markup, in the order it needs it. */
function contractMarkdown(source: any, locale = 'en') {
  const contract = localizedContract(source, locale)
  const tr = (text: string, values: Record<string, string> = {}) => fills(t(locale, text), values)
  const heading = (title: string) => `## ${tr(title)}`
  const list = (items: string[]) => items.join(` ${tr('or')} `)
  const markdownLink = (name: string) => origin + edition('/' + pageOfContract(name), locale).url + '.md'
  const contractPathname = `${origin}${prefixOf(locale)}/${pageOfContract(contract.name)}`
  const constraints = (entry: any) => [
    entry.kind === 'root' ? tr('Root class') : tr(entry.kind === 'part' ? 'Part of {classes}' : 'Modifier of {classes}', { classes: list(owners(entry).map(code)) }),
    entry.elements && tr('Use on {elements}', { elements: list(entry.elements.map((tag: string) => code(`<${tag}>`))) }),
    entry.attributes && tr('Requires {attributes}', { attributes: Object.entries(entry.attributes).map(([name, value]) => code(value === true ? name : `${name}="${Array.isArray(value) ? value.join('|') : value}"`)).join(', ') }),
    entry.label && tr('Requires an accessible name'),
    entry.exclusive && tr('One {group} at a time', { group: entry.exclusive })
  ].filter(Boolean).join('; ')
  const columns = (labels: string[]) => labels.map(label => tr(label))
  const behavior = contract.behavior && `@master/ui/behaviors/${contract.behavior}.js`
  const frameworks = componentsOf(contract.name)
  const frameworkGuide = origin + edition('/guide/frameworks', locale).url + '.md'
  const frameworkInstructions = frameworks.length
    ? tr('Copy these framework components into the project: {commands}. Each renders the same markup, attaches the behavior where needed, and passes the value in and out. Check the project’s `ui/` directory first for a local copy. See {guide}.', { commands: frameworks.map(name => code(`npx master-ui add ${name}`)).join(', '), guide: frameworkGuide })
    : tr('Write the markup in the framework’s syntax (`className` and `htmlFor` in JSX). Use the published classes directly.')
  return [
    `# ${contract.title}`,
    contract.description,
    `**${tr('Use it for')}**\n\n${contract.use}`,
    contract.instead?.length && `**${tr('Alternatives')}**\n\n${contract.instead.map((item: any) => `- ${item.when} → [${item.use}](${markdownLink(item.use)})`).join('\n')}`,
    `${heading('Markup')}\n\n\`\`\`html\n${contract.example}\n\`\`\``,
    `${heading('Classes')}\n\n${table(columns(['Class', 'Where it goes', 'Description']), contract.classes.map((entry: any) => [code(entry.name), constraints(entry), entry.description]))}`,
    contract.states?.length && `${heading('States')}\n\n${tr('Mark a state with the attribute; the stylesheet draws it. Never add a class for a state.')}\n\n${table(columns(['State', 'On', 'Mark it with', 'Notes']), contract.states.map((state: any) => [state.name, code(state.on), code(state.mark), state.description ?? '']))}`,
    contract.properties?.length && `${heading('Custom properties')}\n\n${tr('Set a public custom property that has a default on the element itself. Use a class of your own, a `style` attribute, or a rule such as `.toolbar .btn { --btn-height: 2rem }`.')}\n\n${table(columns(['Property', 'On', 'Default', 'Description']), contract.properties.map((property: any) => [code(property.name), property.on ? code(property.on) : '', property.default ? code(property.default) : '', property.description]))}`,
    `${heading('Script')}\n\n${contract.script === 'none' ? tr('None. Every state works without script.') : contract.script === 'optional' ? tr('Optional. The component works without script; a script adds a convenience.') : tr('Required. The pattern has no native element, so a script moves its attributes.')}${behavior ? `\n\n${tr('Reference script: {path}', { path: code(behavior) })}\n\n\`\`\`js\nimport { ${contract.behavior.replace(/-(\w)/g, (_: string, letter: string) => letter.toUpperCase())} } from '${behavior}'\n\`\`\`` : ''}`,
    contract.keyboard?.length && `${heading('Keyboard')}\n\n${table(columns(['Keys', 'Action']), contract.keyboard.map((item: any) => [item.keys, item.action]))}`,
    `${heading('Frameworks')}\n\n${frameworkInstructions}${frameworks.length && !frameworks.includes(contract.name) ? ` ${tr('Write the other classes in this contract as markup.')}` : ''}`,
    contract.platform?.length && `${heading('Platform')}\n\n${table(columns(['Feature', 'Fallback']), contract.platform.map((item: any) => [item.feature, item.fallback]))}`,
    contract.composes?.length && `${heading('Used with')}\n\n${contract.composes.map((name: string) => `- [${name}](${markdownLink(name)})`).join('\n')}`,
    `${heading('Install')}\n\n\`\`\`css\n/* All of the library, from one stylesheet. */\n@import '@master/ui';\n\`\`\`\n\n\`\`\`js\n// Or, never both: one module import per stylesheet, with the theme in the app stylesheet.\n${[...(contract.composes ?? []), contract.name].map((name: string) => `import '@master/ui/${contractOf.get(name)?.tier === 'layout' ? 'layouts' : 'components'}/${name}.css'`).join('\n')}\n\`\`\`\n\n${tr('Theme tokens: {tokens}', { tokens: contract.tokens.length ? contract.tokens.map(code).join(', ') : tr('none') })}\n\n${tr('Web page: {url}', { url: contractPathname })}`
  ].filter(Boolean).join('\n\n') + '\n'
}

/**
 * A working example as Markdown: every file it is made of, what it installs and how a page starts it, so it runs
 * outside this site with nothing but the packages it names.
 */
function exampleMarkdown(id: string, locale: string) {
  const { dependencies = {}, contracts: used } = exampleOf(id)
  const setup = exampleSetup(id)
  const installation = edition('/guide/installation', locale)
  return [
    `**${t(locale, 'Used with')}** ${[...used, ...Object.keys(dependencies)].map(code).join(', ')}`,
    `[${installation.title}](${origin}${installation.url}.md)`,
    `\`\`\`sh\n${setup.install}\n\`\`\``,
    ...(setup.start ? [`\`\`\`js name=start.js\n${setup.start}\n\`\`\``] : []),
    ...exampleFiles(id).map(file => `\`\`\`${file.lang} name=${file.name}\n${file.content}\n\`\`\``),
  ].join('\n\n')
}

/**
 * An MDX page as Markdown: previews become fenced markup, components that only draw are dropped.
 */
function mdxMarkdown(source: string, title: string, description: string, locale = 'en') {
  const prose = preserveFences(source.trimStart(), body => {
    const related = relatedMarkdown(body, (kind, slug) => {
      const target = edition('/' + kind + '/' + slug, locale)
      return `[${target.title}](${origin}${target.url}.md)`
    })
    const embedded = related.replace(/^(?:import .*\n)+/, '')
      .replace(/^<FrameworkPreview name="([^"]+)"[\s\S]*?\/>/gm, (_, name) => `\`\`\`svelte\n${exampleSource(name)}\n\`\`\``)
      .replace(/^<ComponentSource name="([^"]+)"(?: directory="([^"]+)")? \/>/gm, (_, name, directory = 'components') => `\`\`\`css\n${read(join(ui, directory, name + '.css')).trim()}\n\`\`\``)
      .replace(/^<Contract\w* [^>]*\/>/gm, '')
    return figureMarkdown(promptMarkdown(previewMarkdown(embedded, { example: id => exampleMarkdown(id, locale) })))
  })
  return `# ${title}\n\n${description}\n\n${anchorMarkdown(prose.trim(), origin)}\n`
}

// Render first, then resolve fragments against the actual Markdown each edition emits.
const documents = new Map<string, { text: string } & ReturnType<typeof markdownReferences>>()
for (const entry of editions.values()) {
  const { locale, identity } = editionOf(entry.url)
  const [, section, slug] = identity.split('/')
  const sourceFile = join(site, 'content', section, slug, 'content.mdx')
  const { content } = await readLocalizedDocument({ sourceFile, locale })
  const contract = section === 'components' || section === 'pages' ? contractOf.get(slug === 'app-shell' ? 'shell' : slug) : undefined
  const reference = contract && contractMarkdown(contract, locale)
  const text = contract?.tier === 'component' ? reference : mdxMarkdown(content, entry.title, entry.description, locale) + (reference ? '\n---\n\n' + reference : '')
  documents.set(entry.url, { text, ...markdownReferences(text) })
}
for (const [pathname, document] of documents) {
  const { locale } = editionOf(pathname)
  let text = document.text
  for (const { url, start, end } of document.links.toReversed()) {
    const target = new URL(url, origin + pathname)
    if (target.origin !== origin) continue
    let path = target.pathname.replace(/\.md$/, '')
    if (!documents.has(path)) continue
    if (url.startsWith('/') && !url.startsWith('//')) path = edition(path, locale).url
    const fragment = decodeURIComponent(target.hash.slice(1))
    const suffix = fragment && !documents.get(path)!.anchors.has(fragment) ? '' : '.md'
    const href = origin + path + suffix + target.search + target.hash
    text = text.slice(0, start) + href + text.slice(end)
  }
  write(pathname.slice(1) + '.md', text)
}

// Keep the guide's reading order and the catalog's grouping in every portable index.
const guideCategories: { pages: { pathname: string }[] }[] = JSON.parse(read(join(site, '.categories/guide.json')))
const ordered = new Map([
  ...guideCategories.flatMap(category => category.pages.map(page => page.pathname)),
  ...Object.entries({ components, charts, blocks, pages: pageLayouts }).flatMap(([kind, items]) => items.map(item => '/' + kind + '/' + item.slug))
].map((path, index) => [path, index]))
for (const locale of locales) {
  const prefix = prefixOf(locale)
  const introduction = read(join(site, 'i18n/llms', locale + '.md')).trim()
    .replaceAll('{origin}', origin).replace('{frameworkComponents}', Object.keys(manifest.components).join(', '))
  const sections = ['# Master UI', introduction]
  if (locale === 'en') {
    sections.push('## Languages', translatedLocales.map(lang => `- [${nameOfLocale[lang]}](${origin}/${lang}/llms.txt)`).join('\n'))
  }
  for (const section of documentSections) {
    const title = section[0].toUpperCase() + section.slice(1)
    const entries = [...editions.values()].filter(entry => entry.url.startsWith(prefix + '/' + section + '/'))
      .sort((a, b) => (ordered.get(a.url.slice(prefix.length)) ?? Infinity) - (ordered.get(b.url.slice(prefix.length)) ?? Infinity))
    if (entries.length) sections.push('## ' + t(locale, title), entries.map(page => `- [${page.title}](${origin}${page.url}.md): ${page.description}`).join('\n'))
  }
  write((prefix + '/llms.txt').slice(1), sections.join('\n\n') + '\n')
}

/* ---------------------------------------------------------------- Registry */

/**
 * The registry follows the shadcn registry-item schema, so its CLI and MCP server can read it, and uses only
 * the universal item type with explicit targets, so nothing in it assumes React or Tailwind.
 * Source is copied to `ui/` in the project; imports of the theme and of composed components stay on the package
 * until the project owns those too.
 */
const schema = 'https://ui.shadcn.com/schema/registry-item.json'
const item = (name: string) => `${origin}/r/${name}.json`
const file = (target: string, content: string) => ({ path: target, type: 'registry:file', target: `~/${target}`, content })
const items: any[] = []

items.push({
  $schema: schema, name: 'theme', type: 'registry:item', title: 'Theme', description: 'Moonstone and obsidian: the tokens and the mixins every Master UI stylesheet reads.',
  dependencies: ['@master/css'], files: [file('ui/theme.css', read(join(ui, 'theme.css')))], categories: ['Theme'],
  docs: 'Import ui/theme.css after @master/css and before any component.',
})
for (const name of readdirSync(join(ui, 'themes')).filter(name => name.endsWith('.css')).map(name => name.replace(/\.css$/, ''))) {
  items.push({
    $schema: schema, name: `theme-${name}`, type: 'registry:item', title: `${name[0].toUpperCase()}${name.slice(1)} theme`, description: `The ${name} theme: a starting point for a theme of your own.`,
    dependencies: ['@master/css'], registryDependencies: [item('theme')], files: [file(`ui/themes/${name}.css`, read(join(ui, 'themes', `${name}.css`)))], categories: ['Theme'],
    docs: `Import ui/themes/${name}.css after the library.`,
  })
}
for (const contract of contracts) {
  const { stylesheet, tokens, mixins, ...published } = contract
  const files = [
    file(`ui/${contract.name}.css`, read(join(ui, stylesheet))),
    file(`ui/${contract.name}.json`, `${JSON.stringify({ $schema: `${origin}/contract.schema.json`, ...published }, null, 2)}\n`),
  ]
  if (contract.behavior) {
    const pending = [`${contract.behavior}.js`]
    const taken = new Set<string>()
    while (pending.length) {
      const name = pending.pop()!
      if (taken.has(name)) continue
      taken.add(name)
      const source = read(join(ui, 'behaviors', name))
      files.push(file(`ui/${name}`, source))
      for (const match of source.matchAll(/from\s+['"]\.\/([\w-]+\.js)['"]/g)) pending.push(match[1])
    }
  }
  items.push({
    $schema: schema, name: contract.name, type: 'registry:item', title: contract.title, description: contract.description,
    dependencies: ['@master/css'], registryDependencies: [item('theme'), ...(contract.composes ?? []).map(item)], files, categories: [contract.category],
    docs: `Import ui/${contract.name}.css after ui/theme.css. Its contract is ui/${contract.name}.json; markup: ${origin}/${pageOfContract(contract.name)}.md`,
    meta: { tier: contract.tier, script: contract.script, classes: contract.classes.map((entry: any) => entry.name), tokens, mixins },
  })
}
/** A framework component is source to copy: it renders a contract's markup and imports the behavior from the package. */
for (const [framework, { title, package: dependency }] of Object.entries(manifest.frameworks)) {
  for (const [name, entry] of Object.entries(manifest.components)) {
    const contract = contractOf.get(entry.contract)
    items.push({
      $schema: schema, name: `${framework}-${name}`, type: 'registry:item', title: `${name[0].toUpperCase()}${name.slice(1)} for ${title}`,
      description: `The ${title} component that renders the markup of ${contract.title.toLowerCase()}, attaches its behavior where it has one and passes the value in and out.`,
      dependencies: ['@master/ui', dependency], files: [...frameworkFiles(framework, entry[framework])].map(([path, content]) => file(`ui/${path}`, content)), categories: [title],
      docs: `It needs the stylesheet of ${entry.contract} from @master/ui. Its markup is the contract's: ${origin}/components/${entry.contract}.md. How it is built: ${origin}/guide/frameworks.md`,
      meta: { tier: 'framework', framework, contract: entry.contract },
    })
  }
}

/** A block or a page is its first preview: markup to paste, written with components and utilities. */
for (const [kind, list] of [['blocks', blocks], ['pages', pageLayouts]] as const) {
  for (const entry of list) {
    const source = read(join(site, 'content', kind, entry.slug, 'content.mdx'))
    // The first preview: a working example of the shared source, or markup written on the page.
    const first = /<PagePreview\b[\s\S]*?(?:example="([^"]+)"|html=\{`([\s\S]*?)`\})/.exec(source)
    const working = first?.[1]
    const example = working ? exampleOf(working) : undefined
    const script = working && example?.script ? posix.relative(working, example.script) : undefined
    const markup = working ? exampleFiles(working)[0]!.content : first?.[2]
    if (!markup) continue
    const used = [...new Set([...markup.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)))]
    const needs = contracts.filter(contract => contract.classes.some((entry: any) => used.includes(entry.name))).map(contract => contract.name)
    const name = kind === 'blocks' ? `block-${entry.slug}` : `page-${entry.slug}`
    items.push({
      $schema: schema, name, type: 'registry:item', title: entry.name, description: entry.description,
      dependencies: ['@master/css', ...(example ? ['@master/ui', ...Object.entries(example.dependencies ?? {}).map(([dependency, version]) => `${dependency}@${version}`)] : [])],
      registryDependencies: needs.map(item),
      // A block that works carries its script and its data, so what a project copies still works.
      files: working
        ? exampleFiles(working).map(part => file(part.name === 'index.html' ? `ui/${kind}/${entry.slug}.html` : posix.normalize(`ui/${kind}/${entry.slug}/${part.name}`), `${part.content}\n`))
        : [file(`ui/${kind}/${entry.slug}.html`, `${markup}\n`)],
      categories: [entry.category],
      docs: script
        ? `Paste ${entry.slug}.html into a page and start it with mount() from ${entry.slug}/${script}. It uses: ${needs.join(', ')}. ${origin}/${kind}/${entry.slug}.md`
        : `Markup to paste into a page or a component. It uses: ${needs.join(', ')}. Variants: ${origin}/${kind}/${entry.slug}.md`,
      meta: { tier: kind === 'blocks' ? 'block' : 'page', components: needs, ...(script ? { script: 'required' } : {}) },
    })
  }
}
for (const entry of items) write(`r/${entry.name}.json`, `${JSON.stringify(entry, null, 2)}\n`)
write('r/registry.json', `${JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry.json', name: 'master', homepage: origin,
  items: items.map(({ files, $schema, ...entry }) => ({ ...entry, files: files.map(({ content, ...rest }: any) => rest) })),
}, null, 2)}\n`)

const markdownCount = documents.size
console.log(`Generated llms.txt, ${markdownCount} Markdown pages, contracts.json, theme.json, standalone.css and a registry of ${items.length} items`)
