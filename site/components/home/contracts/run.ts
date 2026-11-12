import { check, createIndex, format } from '@master/ui/check'
import { contract, uiFiles, type Contract } from '~/site/utils/ui-source'

/**
 * The homepage's contract figure, computed when the page is built: one real contract, a first draft that
 * breaks it, and what the checker says about each. Nothing here is written by hand, so the figure cannot
 * drift from the library. The draft lives in this module rather than in markup, so `master-ui check` run over
 * the site never reads it as a page of its own.
 */

/** Every contract, as `master-ui check` loads them: the order `master.css` imports the stylesheets in. */
const contracts = uiFiles()
  .filter(file => file !== 'theme.css')
  .map(file => {
    const [directory, name] = file.replace(/\.css$/, '').split('/') as ['components' | 'layouts', string]
    // The site's `Contract` type names only what its tables read; the file holds every key of the schema.
    return contract(name, directory) as unknown as SpecContract
  })
const index = createIndex(contracts)

export type Severity = 'error' | 'warning' | 'info'
export interface Finding { code: string, severity: Severity, line: number, column: number, className?: string, text: string }

/** A contract with the keys the figure draws, as `packages/ui/contract.schema.json` defines them. */
export type SpecContract = Omit<Contract, 'classes'> & {
  tier: string
  category?: string
  script: string
  example: string
  classes: (Contract['classes'][number] & { elements?: string[], attributes?: Record<string, true | string | string[]>, label?: true, exclusive?: string })[]
  [key: string]: unknown
}

export interface ContractRun {
  file: string
  command: string
  contract: SpecContract
  draft: string
  fixed: string
  /** The line the fix rewrites, 1-based, and the line before and after it. */
  changed: { line: number, before: string, after: string }
  findings: Finding[]
  summary: { draft: string, fixed: string }
}

/** One file's result as the CLI prints it: a line per diagnostic, then the count. */
function run(source: string, file: string) {
  const diagnostics = check(source, index)
  const errors = diagnostics.filter(diagnostic => diagnostic.severity === 'error').length
  const lines = diagnostics.length ? format(diagnostics, file).split('\n') : []
  return {
    findings: diagnostics.map((diagnostic, at) => ({ code: diagnostic.code, severity: diagnostic.severity, line: diagnostic.line, column: diagnostic.column, className: diagnostic.className, text: lines[at] })),
    summary: `1 files checked: ${errors} errors, ${diagnostics.length - errors} warnings.`,
  }
}

/**
 * The switch, written the way a draft from memory often goes: the role left off and the state written as a
 * class. The fix is the contract's own example.
 */
export function contractRun(): ContractRun {
  const file = 'settings.html'
  const switchContract = contracts.find(item => item.name === 'switch')
  if (!switchContract) throw new Error('HomeContracts: the switch contract is missing.')
  const fixed = switchContract.example
  const right = 'type="checkbox" role="switch" class="switch" checked'
  const wrong = 'type="checkbox" class="switch switch-on" checked'
  if (!fixed.includes(right)) throw new Error('HomeContracts: the switch example changed; rewrite the draft in contracts/run.ts.')
  const draft = fixed.replace(right, wrong)
  const before = run(draft, file)
  const after = run(fixed, file)
  // The figure tells this story only while the checker still tells it.
  if (!before.findings.some(finding => finding.code === 'attribute') || !before.findings.some(finding => finding.code === 'unknown-class') || after.findings.length) {
    throw new Error('HomeContracts: the checker no longer reports the draft as the figure describes; update contracts/run.ts.')
  }
  const draftLines = draft.split('\n')
  const fixedLines = fixed.split('\n')
  const line = draftLines.findIndex((text, at) => text !== fixedLines[at])
  return {
    file,
    command: `npx master-ui check ${file}`,
    contract: switchContract,
    draft,
    fixed,
    changed: { line: line + 1, before: draftLines[line], after: fixedLines[line] },
    findings: before.findings,
    summary: { draft: before.summary, fixed: after.summary },
  }
}
