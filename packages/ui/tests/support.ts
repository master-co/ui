import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { compileManifestSync } from '@master/css-compiler/node'
import { createRenderSessionSync } from '@master/css/node'
import preset from '@master/css-preset/default-manifest.json' with { type: 'json' }
import type { Contract } from '../check/index.js'

export const root = new URL('../', import.meta.url)
export const read = (file: string) => readFileSync(new URL(file, root), 'utf8')
export const exists = (file: string) => existsSync(new URL(file, root))
export const stylesheets = (directory: string) => !existsSync(new URL(`${directory}/`, root)) ? [] : readdirSync(new URL(`${directory}/`, root)).filter(file => file.endsWith('.css')).map(file => `${directory}/${file}`).sort()

/** Components have a material, a state or a platform behavior. Layouts only place regions, in the few cases utilities cannot. */
export const components = stylesheets('components')
export const layouts = stylesheets('layouts')
export const themes = stylesheets('themes')
export const imports = [...read('master.css').matchAll(/@import\s+['"]\.\/([^'"]+)['"]/g)].map(match => match[1])

/** A stylesheet without its comments, so a word in a comment is never read as a declaration. */
export const code = (file: string) => read(file).replace(/\/\*[\s\S]*?\*\//g, '')

export function compile(files: string[]) {
  const result = compileManifestSync(files.map(read).join('\n\n'), { baseManifest: preset as never })
  const problems = result.diagnostics.filter(diagnostic => diagnostic.severity === 'error' || diagnostic.severity === 'warning')
  if (problems.length) throw new Error(`${files.join(', ')} reported diagnostics:\n${JSON.stringify(problems, null, 2)}`)
  return result
}

export const contractFile = (stylesheet: string) => stylesheet.replace(/\.css$/, '.json')
export const slug = (stylesheet: string) => stylesheet.replace(/^.*\//, '').replace(/\.css$/, '')
export const contract = (stylesheet: string) => JSON.parse(read(contractFile(stylesheet))) as Contract & Record<string, any>
export const contracts = () => [...components, ...layouts].filter(file => exists(contractFile(file))).map(contract)

/**
 * Whether a class is a utility. With `'preset'` only the Master CSS preset answers, which is what a class name
 * must not collide with. With `'library'` the theme's tokens count too (`bg-surface-tray`, `shadow-raised`),
 * which is what markup may use.
 */
export function utilities(scope: 'preset' | 'library' = 'preset') {
  const engine = createRenderSessionSync({ manifest: (scope === 'library' ? compile(imports).manifest : preset) as never })
  const cache = new Map<string, boolean>()
  return {
    has(name: string) {
      if (!cache.has(name)) cache.set(name, !engine.ensureClassRules([name]).invalidClassNames.includes(name))
      return cache.get(name)!
    },
    dispose: () => engine.dispose(),
  }
}

/** A small validator for the subset of JSON Schema draft-07 that contract.schema.json uses. */
export function validate(value: unknown, schema: any, definitions: any = schema.definitions, path = '$'): string[] {
  if (schema.$ref) return validate(value, definitions[schema.$ref.replace('#/definitions/', '')], definitions, path)
  const errors: string[] = []
  if (schema.oneOf) {
    const passing = schema.oneOf.filter((option: any) => validate(value, option, definitions, path).length === 0)
    if (passing.length !== 1) errors.push(`${path}: matches ${passing.length} of the allowed shapes`)
    return errors
  }
  if ('const' in schema && value !== schema.const) errors.push(`${path}: must be ${JSON.stringify(schema.const)}`)
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: must be one of ${schema.enum.join(', ')}`)
  const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value
  if (schema.type && schema.type !== type) return [...errors, `${path}: must be ${schema.type}, is ${type}`]
  if (type === 'string') {
    const text = value as string
    if (schema.minLength && text.length < schema.minLength) errors.push(`${path}: is empty`)
    if (schema.pattern && !new RegExp(schema.pattern).test(text)) errors.push(`${path}: "${text}" does not match ${schema.pattern}`)
  }
  if (type === 'array') {
    const list = value as unknown[]
    if (schema.minItems && list.length < schema.minItems) errors.push(`${path}: needs at least ${schema.minItems} item`)
    if (schema.uniqueItems && new Set(list.map(item => JSON.stringify(item))).size !== list.length) errors.push(`${path}: has a duplicate`)
    if (schema.items) list.forEach((item, at) => errors.push(...validate(item, schema.items, definitions, `${path}[${at}]`)))
  }
  if (type === 'object') {
    const object = value as Record<string, unknown>
    for (const key of schema.required ?? []) if (!(key in object)) errors.push(`${path}: is missing "${key}"`)
    for (const [key, item] of Object.entries(object)) {
      if (schema.properties?.[key]) errors.push(...validate(item, schema.properties[key], definitions, `${path}.${key}`))
      else if (schema.additionalProperties === false) errors.push(`${path}: has an unknown key "${key}"`)
      else if (typeof schema.additionalProperties === 'object') errors.push(...validate(item, schema.additionalProperties, definitions, `${path}.${key}`))
    }
  }
  return errors
}
