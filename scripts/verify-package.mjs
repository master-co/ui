// Installs @master/ui into an empty project the way a user would and uses it from there.
//
//   node scripts/verify-package.mjs                     packs packages/ui as the release packs it
//   node scripts/verify-package.mjs @master/ui@0.0.1    installs the version the registry serves,
//                                                       and also checks its signatures and provenance
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] })
const temporary = prefix => mkdtempSync(join(tmpdir(), prefix))

const spec = process.argv[2]
let target = spec
if (!target) {
  // aronrepo writes the release version into package.json and packs with the repository's
  // package manager, so do the same with a placeholder version. `prepack` builds dist.
  const archives = temporary('master-ui-pack-')
  const manifestPath = resolve('packages/ui/package.json')
  const source = readFileSync(manifestPath, 'utf8')
  try {
    writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(source), version: '0.0.0-verify' }, null, 2) + '\n')
    run('bun', ['pm', 'pack', '--destination', archives, '--quiet'], dirname(manifestPath))
  } finally {
    writeFileSync(manifestPath, source)
  }
  const archive = readdirSync(archives).find(file => file.endsWith('.tgz'))
  assert.ok(archive, 'bun pm pack wrote no archive')
  target = join(archives, archive)
}

const project = temporary('master-ui-consumer-')
writeFileSync(join(project, 'package.json'), JSON.stringify({ name: 'consumer', private: true, type: 'module' }))
run('npm', ['install', '--no-fund', '--no-audit', target], project)

const root = join(project, 'node_modules/@master/ui')
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const require = createRequire(join(project, 'index.js'))

// Every export resolves to a file in the archive; a pattern is tried with one name it must have.
const examples = { components: 'button', layouts: 'form', themes: 'paper', behaviors: 'combobox', 'dist/behaviors': 'combobox' }
for (const [subpath, value] of Object.entries(manifest.exports)) {
  if (subpath === './dist/*') continue
  for (const file of typeof value === 'string' ? [value] : Object.values(value)) {
    const directory = file.slice(2, file.lastIndexOf('/'))
    const path = file.replace('*', examples[directory])
    assert.ok(existsSync(join(root, path)), `${manifest.name} exports ${subpath} as ${path}, which the archive does not have`)
  }
}
assert.ok(existsSync(join(root, 'dist/standalone.css')), 'the archive has no dist/standalone.css')

// The checker loads as a module, the contracts are there, and the command answers.
const check = await import(require.resolve('@master/ui/check'))
assert.equal(typeof check.check, 'function', '@master/ui/check exports no check()')
const contracts = JSON.parse(readFileSync(require.resolve('@master/ui/contracts.json'), 'utf8'))
assert.ok(Object.keys(contracts.contracts ?? {}).length > 0, 'contracts.json lists no contracts')
assert.match(run('npx', ['--no-install', 'master-ui', 'list'], project), /^button\s/m, 'master-ui list printed no button')

if (spec) {
  // Every package in the project, @master/ui included, carries a valid registry signature and provenance.
  run('npm', ['audit', 'signatures'], project)
  const view = JSON.parse(run('npm', ['view', spec, 'dist', '--json'], project))
  assert.ok(view.attestations?.provenance, `${spec} has no provenance attestation`)
}

console.log(`✓ ${manifest.name}@${manifest.version} installs and works from ${spec ?? 'its packed archive'}`)
