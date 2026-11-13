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
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { blocks, components, pageOfContract, pages as pageLayouts } from '../components/catalog.ts'
import { exampleSource } from '../utils/framework-example.ts'
import { previewMarkdown } from '../utils/preview-markdown.ts'
import { anchorMarkdown } from '../utils/anchor-markdown.ts'
import { figureMarkdown } from '../utils/figure-markdown.ts'
import { promptMarkdown } from '../utils/prompt-markdown.ts'
import { locales } from '@master/internal-site/common/locales.js'
import { readLocalizedDocument } from '@master/internal-site/build/localization.ts'
import translations from '../i18n/translations.ts'
import { localizedContract } from '../i18n/contract-copy.ts'
import { documentSections } from '../i18n/sections.ts'

const site = fileURLToPath(new URL('../', import.meta.url))
const ui = join(site, '../packages/ui')
const out = join(site, 'public')
const origin = 'https://ui.master.co'
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

/** A contract as a page: everything an agent needs to write the markup, in the order it needs it. */
function contractMarkdown(source: any, locale = 'en') {
  const contract = localizedContract(source, locale)
  const tr = (text: string, values: Record<string, string> = {}) => fills(t(locale, text), values)
  const heading = (title: string) => `## ${tr(title)}`
  const list = (items: string[]) => items.join(` ${tr('or')} `)
  const markdownLink = (name: string) => {
    const pathname = pageOfContract(name)
    const hasEdition = existsSync(join(site, 'content', pathname, `content.${locale}.mdx`))
    return `${origin}${hasEdition ? prefixOf(locale) : ''}/${pathname}.md`
  }
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
  const frameworkGuide = `${origin}${prefixOf(locale)}/guide/frameworks.md`
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
    `${heading('Install')}\n\n\`\`\`css\n@import '@master/ui/theme.css';\n${[...(contract.composes ?? []), contract.name].map((name: string) => `@import '@master/ui/${contractOf.get(name)?.tier === 'layout' ? 'layouts' : 'components'}/${name}.css';`).join('\n')}\n\`\`\`\n\n${tr('Theme tokens: {tokens}', { tokens: contract.tokens.length ? contract.tokens.map(code).join(', ') : tr('none') })}\n\n${tr('Web page: {url}', { url: contractPathname })}`
  ].filter(Boolean).join('\n\n') + '\n'
}

/**
 * An MDX page as Markdown: previews become fenced markup, components that only draw are dropped.
 */
function mdxMarkdown(source: string, title: string, description: string, locale = 'en') {
  const link = (section: string, slug: string, hash = '') => {
    const translated = locale !== 'en' && existsSync(join(site, 'content', section, slug, `content.${locale}.mdx`))
    return `${origin}${translated ? prefixOf(locale) : ''}/${section}/${slug}.md${hash}`
  }
  const body = figureMarkdown(promptMarkdown(previewMarkdown(source.trimStart())))
    // The imports of the page itself, at its top. An import inside a code sample is part of the sample.
    .replace(/^(?:import .*\n)+/, '')
    .replace(/<FrameworkPreview name="([^"]+)"[\s\S]*?\/>/g, (_, name) => `\`\`\`svelte\n${exampleSource(name)}\n\`\`\``)
    .replace(/<ComponentSource name="([^"]+)"(?: directory="([^"]+)")? \/>/g, (_, name, directory = 'components') => `\`\`\`css\n${read(join(ui, directory, `${name}.css`)).trim()}\n\`\`\``)
    .replace(/<ComponentLinks slugs=\{\[([^\]]*)\]\}(?: kind="(\w+)")? \/>/g, (_, slugs, kind = 'components') => slugs.split(',').map((slug: string) => slug.trim().replace(/['"]/g, '')).filter(Boolean).map((slug: string) => `- [${slug}](${link(kind, slug)})`).join('\n'))
    .replace(/<Contract\w* [^>]*\/>/g, '')
    .replace(/\]\(\/(guide|components|blocks|pages)\/([\w-]+)(#[\w-]+)?\)/g, (_, section, slug, hash = '') => `](${link(section, slug, hash)})`)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return `# ${title}\n\n${description}\n\n${anchorMarkdown(body)}\n`
}

const metadataOf = (file: string) => {
  const source = read(file)
  const title = /subject: '([^']+)'/.exec(source)?.[1] ?? /title: (?:\{ absolute: )?'([^']+)'/.exec(source)?.[1] ?? ''
  return { title, description: /description: '((?:[^'\\]|\\.)*)'/.exec(source)?.[1].replace(/\\'/g, '\'') ?? '', order: Number(/order: (\d+)/.exec(source)?.[1] ?? 99), category: /category: '([^']+)'/.exec(source)?.[1] ?? '' }
}

const pages: Record<string, { slug: string, title: string, description: string }[]> = { guide: [], components: [], blocks: [], pages: [] }

for (const slug of readdirSync(join(site, 'content/guide'))) {
  const directory = join(site, 'content/guide', slug)
  if (!existsSync(join(directory, 'content.mdx'))) continue
  const metadata = metadataOf(join(directory, 'metadata.ts'))
  pages.guide.push({ slug, ...metadata })
  write(`guide/${slug}.md`, mdxMarkdown(read(join(directory, 'content.mdx')), metadata.title, metadata.description))
}
const categoryRank = ['Getting started', 'Customizing', 'Building', 'Reference']
pages.guide.sort((a: any, b: any) => categoryRank.indexOf(a.category) - categoryRank.indexOf(b.category) || a.order - b.order)

/*
 * A component's page is its contract. A layout among the components is read for its page first, the way it is built
 * and when to use it, with its contract after; the arrangements have no contract and are their page alone. A block or
 * a page is its page, and a page that is a frame (`page`, the app shell) ends with that frame's contract.
 */
for (const item of components) {
  const contract = contractOf.get(item.slug)
  pages.components.push({ slug: item.slug, title: item.name, description: item.description })
  write(`components/${item.slug}.md`, contract?.tier === 'component'
    ? contractMarkdown(contract)
    : mdxMarkdown(read(join(site, 'content/components', item.slug, 'content.mdx')), item.name, item.description) + (contract ? `\n---\n\n${contractMarkdown(contract)}` : ''))
}
for (const [kind, list] of [['blocks', blocks], ['pages', pageLayouts]] as const) {
  for (const item of list) {
    const source = read(join(site, 'content', kind, item.slug, 'content.mdx'))
    const contract = kind === 'pages' ? contractOf.get(item.slug === 'app-shell' ? 'shell' : item.slug) : undefined
    pages[kind].push({ slug: item.slug, title: item.name, description: item.description })
    write(`${kind}/${item.slug}.md`, mdxMarkdown(source, item.name, item.description) + (contract ? `\n---\n\n${contractMarkdown(contract)}` : ''))
  }
}

/** The translated prose comes from MDX and the translated contract from the same data as the rendered tables. */
const translatedPages: Record<string, typeof pages> = {}
for (const locale of translatedLocales) {
  translatedPages[locale] = Object.fromEntries(await Promise.all(Object.entries(pages).map(async ([section, entries]) => {
    const localized = await Promise.all(entries.map(async ({ slug }) => {
      const directory = join(site, 'content', section, slug)
      if (!existsSync(join(directory, `content.${locale}.mdx`))) return []
      const { content, frontmatter } = await readLocalizedDocument({ sourceFile: join(directory, 'content.mdx'), locale })
      if (frontmatter.draft) return []
      const { title, description } = frontmatter as { title: string, description: string }
      const contract = section === 'components' || section === 'pages' ? contractOf.get(slug === 'app-shell' ? 'shell' : slug) : undefined
      const authored = mdxMarkdown(content, title, description, locale)
      const reference = contract && contractMarkdown(contract, locale)
      write(`${locale}/${section}/${slug}.md`, contract?.tier === 'component' ? reference : authored + (reference ? `\n---\n\n${reference}` : ''))
      return [{ slug, title, description }]
    }))
    return [section, localized.flat()]
  })))
}

/** The index for one language: the rules, then links to the published Markdown editions. */
const englishIndex = read(join(site, 'i18n/llms/en.md')).trim()
const localizedIndex = Object.fromEntries(translatedLocales.flatMap(locale => {
  const filename = join(site, 'i18n/llms', `${locale}.md`)
  return existsSync(filename) ? [[locale, read(filename).trim()]] : []
}))

const llms = (locale: string) => {
  const prefix = prefixOf(locale)
  const list = (section: string, items: typeof pages.guide, at = '') => items.map(page => `- [${page.title}](${origin}${at}/${section}/${page.slug}.md): ${page.description}`).join('\n')
  const links = (section: string) => {
    const editions = translatedPages[locale]?.[section]
    return editions?.length ? list(section, editions, prefix) : list(section, pages[section])
  }
  const introduction = locale === 'en' ? englishIndex : localizedIndex[locale] ?? englishIndex
  return `# Master UI

${introduction.replaceAll('{origin}', origin).replace('{frameworkComponents}', Object.keys(manifest.components).join(', '))}

## ${t(locale, 'Guide')}

${links('guide')}

## ${t(locale, 'Components')}

${links('components')}

## ${t(locale, 'Blocks')}

${links('blocks')}

## ${t(locale, 'Pages')}

${links('pages')}
`
}
write('llms.txt', llms('en'))
for (const locale of translatedLocales) if (translatedPages[locale].guide.length) write(`${locale}/llms.txt`, llms(locale))

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
    const markup = /<PagePreview\b[\s\S]*?html=\{`([\s\S]*?)`\}/.exec(source)?.[1]
    if (!markup) continue
    const used = [...new Set([...markup.matchAll(/class="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)))]
    const needs = contracts.filter(contract => contract.classes.some((entry: any) => used.includes(entry.name))).map(contract => contract.name)
    const name = kind === 'blocks' ? `block-${entry.slug}` : `page-${entry.slug}`
    items.push({
      $schema: schema, name, type: 'registry:item', title: entry.name, description: entry.description,
      dependencies: ['@master/css'], registryDependencies: needs.map(item), files: [file(`ui/${kind}/${entry.slug}.html`, `${markup}\n`)], categories: [entry.category],
      docs: `Markup to paste into a page or a component. It uses: ${needs.join(', ')}. Variants: ${origin}/${kind}/${entry.slug}.md`,
      meta: { tier: kind === 'blocks' ? 'block' : 'page', components: needs },
    })
  }
}
for (const entry of items) write(`r/${entry.name}.json`, `${JSON.stringify(entry, null, 2)}\n`)
write('r/registry.json', `${JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry.json', name: 'master', homepage: origin,
  items: items.map(({ files, $schema, ...entry }) => ({ ...entry, files: files.map(({ content, ...rest }: any) => rest) })),
}, null, 2)}\n`)

const markdownCount = [pages, ...Object.values(translatedPages)].reduce((count, edition) => count + Object.values(edition).flat().length, 0)
console.log(`Generated llms.txt, ${markdownCount} Markdown pages, contracts.json, theme.json, standalone.css and a registry of ${items.length} items`)
