import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { check, createIndex, format } from '../../check/index.js'
import { contracts, utilities } from '../support.ts'
import { scenarios } from './scenarios.ts'

/**
 * The framework components as source. Each is listed in the manifest with the contract it renders, has a
 * scenario, satisfies the contracts as the checker reads it, takes its behavior from the package and
 * depends on nothing but its framework.
 */
const root = new URL('../../frameworks/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8')) as { frameworks: Record<string, { title: string, package: string }>, components: Record<string, Record<string, string>> }
const all = contracts()
const index = createIndex(all)
const helper = /^(use-)?behavior(\.svelte)?\.ts$/

test('every component renders a contract and has a scenario', () => {
  for (const [name, entry] of Object.entries(manifest.components)) {
    assert.ok(all.some(contract => contract.name === entry.contract), `${name}: "${entry.contract}" is not a contract`)
    assert.ok(scenarios[name], `${name} has no scenario in scenarios.ts`)
  }
  assert.deepEqual(Object.keys(scenarios).sort(), Object.keys(manifest.components).sort(), 'a scenario without a component')
})

test('every contract that names a behavior has a component, which is the reason it needs one', () => {
  const rendered = new Set(Object.values(manifest.components).map(entry => entry.contract))
  for (const contract of all) if (contract.behavior) assert.ok(rendered.has(contract.name), `${contract.name} names a behavior and has no framework component`)
})

for (const [framework, { package: dependency }] of Object.entries(manifest.frameworks)) {
  const directory = new URL(`${framework}/`, root)
  const files = existsSync(directory) ? readdirSync(directory) : []

  test(`${framework}: the manifest lists the components, all of them and no other`, () => {
    const listed = Object.values(manifest.components).map(entry => entry[framework]).sort()
    assert.deepEqual(listed.filter(file => !files.includes(file)), [], 'in the manifest, not in the directory')
    assert.deepEqual(files.filter(file => !helper.test(file) && !listed.includes(file)).sort(), [], 'in the directory, not in the manifest')
  })

  test(`${framework}: every component satisfies the contracts as the checker reads its source`, () => {
    const preset = utilities('library')
    try {
      const known = (name: string) => index.classes.has(name) || preset.has(name)
      const problems = files.flatMap(file => format(check(readFileSync(new URL(file, directory), 'utf8'), index, { knows: known, strict: true }), `${framework}/${file}`)).filter(Boolean)
      assert.deepEqual(problems, [])
    } finally { preset.dispose() }
  })

  test(`${framework}: a component depends on its framework and the behaviors, and takes its behavior from the package`, () => {
    for (const [name, entry] of Object.entries(manifest.components)) {
      if (!files.includes(entry[framework])) continue
      const source = readFileSync(new URL(entry[framework], directory), 'utf8')
      const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(match => match[1])
      for (const from of imports) {
        assert.ok(from === dependency || from.startsWith(`${dependency}/`) || /^@master\/ui\/behaviors\/[\w-]+\.js$/.test(from) || from.startsWith('./'), `${framework}/${entry[framework]} imports "${from}"`)
      }
      const behavior = all.find(contract => contract.name === entry.contract)?.behavior
      if (behavior && name === entry.contract) assert.ok(imports.includes(`@master/ui/behaviors/${behavior}.js`), `${framework}/${entry[framework]} does not import the ${behavior} behavior`)
      assert.doesNotMatch(source, /addEventListener\(\s*['"]key|onKeyDown|onkeydown|@keydown/, `${framework}/${entry[framework]} answers a key: that is the behavior's`)
    }
  })
}
