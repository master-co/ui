/*
 * Shared by the build and the page: which stylesheets a selection compiles, and its CSS written out from the
 * published standalone.css. The build checks this against the compiler; the page uses it to gzip a selection.
 */

export interface Fragment { range: [number, number], bytes: number }

export interface ThemeFragments {
    head: Fragment
    before: Fragment
    after: Fragment
    variablesPrelude: Fragment
    variables: Fragment[]
    keyframes: Fragment[]
    rules: Fragment
}

export interface UnitFragments {
    name: string
    composes: string[]
    rules: [number, number]
    bytes: number
    variables: number[]
    keyframes: number[]
}

/** The selected contracts and every contract they compose, in the order the library imports them. */
export function closure<Unit extends UnitFragments>(units: Unit[], names: Iterable<string>) {
    const byName = new Map(units.map(unit => [unit.name, unit]))
    const needed = new Set<string>()
    const visit = (name: string) => {
        const unit = byName.get(name)
        if (!unit || needed.has(name)) return
        needed.add(name)
        unit.composes.forEach(visit)
    }
    for (const name of names) visit(name)
    return units.filter(unit => needed.has(unit.name))
}

/** The fragments a selection is made of, in file order: the theme once, its resources, then each stylesheet's rules. */
export function fragments(theme: ThemeFragments, chosen: UnitFragments[]) {
    const variables = new Set(chosen.flatMap(unit => unit.variables))
    const keyframes = new Set(chosen.flatMap(unit => unit.keyframes))
    const list: Fragment[] = [theme.head, theme.before]
    const used = theme.variables.filter((_, index) => variables.has(index))
    if (used.length) {
        list.push(theme.variablesPrelude)
        used.forEach((fragment, index) => list.push(index ? { range: [fragment.range[0] - 1, fragment.range[1]], bytes: fragment.bytes + 1 } : fragment))
        // Each declaration after the first brings the semicolon before it; the rule closes with a brace.
        list.push({ range: [-1, -1], bytes: 1 })
    }
    list.push(theme.after, ...theme.keyframes.filter((_, index) => keyframes.has(index)), theme.rules)
    for (const unit of chosen) list.push({ range: unit.rules, bytes: unit.bytes })
    return list
}

/** The compiled bytes of a selection: the fragments add up exactly. */
export const compiledBytes = (list: Fragment[]) => list.reduce((sum, fragment) => sum + fragment.bytes, 0)

/** The selection's CSS, cut from the published file. The one range of [-1, -1] is the brace that closes the variables. */
export const write = (file: string, list: Fragment[]) => list.map(fragment => fragment.range[0] < 0 ? '}' : file.slice(fragment.range[0], fragment.range[1])).join('')
