import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { contracts, imports } from './support.ts'

/**
 * The public skill tells an agent which component to use and which commands to run. Both must exist: a
 * component it names is a contract or a class of one, and a command it names is one the CLI has.
 */
const skill = new URL('../../../skills/master-ui/', import.meta.url)
const all = contracts()
const known = new Set([...all.map(contract => contract.name), ...all.flatMap(contract => contract.classes.map(entry => entry.name))])

test('choosing.md names only components and classes that exist', () => {
  const rows = readFileSync(new URL('references/choosing.md', skill), 'utf8').split('\n').filter(line => line.startsWith('|') && !line.startsWith('| ---') && !line.startsWith('| The job'))
  assert.ok(rows.length > 40)
  for (const row of rows) {
    const cell = row.split('|').at(-2) ?? ''
    const named = [...cell.matchAll(/`([a-z][a-z0-9-]*)`/g)].map(match => match[1]).filter(name => !name.startsWith('aria-'))
    assert.ok(named.length, `no component in: ${row}`)
    for (const name of named) assert.ok(known.has(name), `"${name}" is not a contract or a class of one: ${row}`)
  }
})

test('the skill names only commands the CLI has', () => {
  const cli = readFileSync(new URL('../bin/master-ui.js', import.meta.url), 'utf8')
  const commands = new Set([...cli.matchAll(/^  (?:async )?([a-z]+)\(\) \{/gm)].map(match => match[1]))
  for (const file of ['SKILL.md', 'references/customizing.md', 'references/choosing.md']) {
    const text = readFileSync(new URL(file, skill), 'utf8')
    for (const match of text.matchAll(/master-ui ([a-z]+)\b/g)) assert.ok(commands.has(match[1]), `${file}: "master-ui ${match[1]}" is not a command`)
  }
})

test('the skill names only behaviors and stylesheets the package has', () => {
  const text = readFileSync(new URL('SKILL.md', skill), 'utf8')
  for (const match of text.matchAll(/@master\/ui\/behaviors\/([a-z-]+)\.js/g)) assert.ok(existsSync(new URL(`../behaviors/${match[1]}.js`, import.meta.url)), `behaviors/${match[1]}.js`)
  assert.ok(imports.length > 80)
})
