import { test } from 'node:test'
import assert from 'node:assert/strict'
import { check, createIndex, owners, parse } from '../check/index.js'
import { code, compile, components, contract, contractFile, contracts, exists, layouts, read, slug, utilities, validate } from './support.ts'

/**
 * A contract sits beside its stylesheet and says what the stylesheet promises. These tests keep the two from
 * drifting: a class the stylesheet defines is in the contract and the other way around, a property the
 * contract publishes is one the stylesheet reads, and the example is markup the checker accepts.
 */
const schema = JSON.parse(read('contract.schema.json'))
const all = contracts()
const index = createIndex(all)
const names = new Set(all.map(item => item.name))

for (const file of [...components, ...layouts]) {
  test(`${file} has a contract`, () => {
    assert.ok(exists(contractFile(file)), `${contractFile(file)} is missing`)
  })
  if (!exists(contractFile(file))) continue
  const subject = contract(file)

  test(`${contractFile(file)} follows the schema`, () => {
    assert.deepEqual(validate(subject, schema), [])
    assert.equal(subject.name, slug(file), 'name is the file name')
    assert.equal(subject.tier, file.startsWith('layouts/') ? 'layout' : 'component')
    assert.equal(subject.$schema, '../contract.schema.json')
  })

  test(`${contractFile(file)} lists the classes of ${file}, all of them and no other`, () => {
    // A stylesheet may tune a component it holds (`.input-group .btn`); that class stays in its own contract.
    const foreign = (name: string) => index.classes.has(name) && index.classes.get(name)!.contract.name !== subject.name
    const compiled = compile(['theme.css', file]).nativeClassNames
    const defined = compiled.filter(name => !foreign(name)).sort()
    const listed = subject.classes.map(entry => entry.name).sort()
    assert.deepEqual(listed.filter(name => !compiled.includes(name)), [], 'in the contract, not in the stylesheet')
    assert.deepEqual(defined.filter(name => !listed.includes(name)), [], 'in the stylesheet, not in the contract')
    assert.equal(new Set(listed).size, listed.length, 'a class is listed twice')
  })

  test(`${contractFile(file)} relates its classes to each other`, () => {
    const own = new Map(subject.classes.map(entry => [entry.name, entry]))
    assert.ok(subject.classes.some(entry => entry.kind === 'root'), 'has no root')
    for (const entry of subject.classes) {
      if (entry.kind === 'root') {
        assert.equal(entry.of, undefined, `${entry.name}: a root belongs to nothing`)
        continue
      }
      assert.ok(owners(entry).length, `${entry.name}: a ${entry.kind} names what it belongs to in "of"`)
      for (const base of owners(entry)) {
        const owner = own.get(base) ?? index.classes.get(base)?.entry
        assert.ok(owner, `${entry.name}: "${base}" is not a class of any contract`)
        if (entry.kind === 'part') assert.equal(owner!.kind, 'root', `${entry.name}: a part belongs to a root`)
        if (entry.kind === 'modifier') assert.notEqual(owner!.kind, 'modifier', `${entry.name}: a modifier goes with a root or a part`)
      }
    }
    for (const reference of [...(subject.composes ?? []), ...(subject.instead ?? []).map((item: { use: string }) => item.use)]) {
      assert.ok(names.has(reference), `"${reference}" is not a contract`)
      assert.notEqual(reference, subject.name, 'a contract does not refer to itself')
    }
  })

  test(`${contractFile(file)} publishes only what ${file} reads`, () => {
    const source = code(file)
    // A property may be read by a mixin the stylesheet applies (`--anchored-gap` in `--anchored`).
    const theme = code('theme.css')
    const applied = [...source.matchAll(/@apply\s+(--[a-z0-9-]+)/g)].map(match => new RegExp(`@mixin\\s+${match[1]}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(theme)?.[1] ?? '').join('\n')
    const own = new Set(subject.classes.map(entry => entry.name))
    for (const property of subject.properties ?? []) {
      assert.ok(source.includes(property.name) || applied.includes(property.name), `${property.name} does not appear in the stylesheet`)
      if (property.on) assert.ok(own.has(property.on), `${property.name}: "${property.on}" is not a class of this contract`)
      if (property.default !== undefined) {
        const declared = [...source.matchAll(new RegExp(`${property.name}:\\s*([^;]+);`, 'g'))].map(match => match[1].trim().replace(/\s+/g, ' '))
        assert.ok(declared.includes(property.default.replace(/\s+/g, ' ')), `${property.name}: the stylesheet declares ${declared.join(' | ') || 'nothing'}, the contract says ${property.default}`)
      }
    }
    for (const state of subject.states ?? []) {
      assert.ok(own.has(state.on), `state ${state.name}: "${state.on}" is not a class of this contract`)
      const token = /[a-z][a-z-]*/.exec(state.mark)?.[0]
      assert.ok(token && source.includes(token), `state ${state.name}: the stylesheet never reads "${state.mark}"`)
    }
  })

  test(`${contractFile(file)} gives an example the checker accepts`, () => {
    const preset = utilities('library')
    try {
      const known = (name: string) => index.classes.has(name) || preset.has(name)
      assert.deepEqual(check(subject.example, index, { knows: known, strict: true }), [])
      const used = parse(subject.example).flatMap(element => element.classes)
      assert.deepEqual(used.filter(name => !known(name)), [], 'a class that is neither a contract class nor a preset utility')
      const root = subject.classes.find(entry => entry.kind === 'root')!
      assert.ok(subject.classes.some(entry => entry.kind === 'root' && used.includes(entry.name)), `the example does not use ${root.name}`)
    } finally { preset.dispose() }
  })

  test(`${contractFile(file)} names its behavior when it needs a script`, () => {
    if (subject.script === 'required') assert.ok(subject.behavior, 'a pattern that needs a script names the reference script that drives it')
    if (subject.behavior) {
      assert.notEqual(subject.script, 'none')
      assert.ok(exists(`behaviors/${subject.behavior}.js`), `behaviors/${subject.behavior}.js is missing`)
    }
  })
}

test('a class belongs to one contract', () => {
  const seen = new Map<string, string>()
  for (const item of all) {
    for (const entry of item.classes) {
      assert.ok(!seen.has(entry.name), `${entry.name} is in ${seen.get(entry.name)} and ${item.name}`)
      seen.set(entry.name, item.name)
    }
  }
})
