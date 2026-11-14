'use client'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { tree } from '@master/ui/behaviors/tree.js'
import { useBehavior } from './use-behavior'

export interface TreeNode {
  label: ReactNode
  /**
   * What the row stands for: what selecting or checking a leaf gives `onValueChange`, and what `onExpand`
   * and `onRename` are called with. A row with neither `href` nor `children` can be selected.
   */
  value?: string
  /** A row that is a link. `current` marks the page that is open. */
  href?: string
  current?: boolean
  /** The rows under a branch, and whether it starts open. `[]` is a branch whose rows are loaded when it opens. */
  children?: TreeNode[]
  open?: boolean
  disabled?: boolean
}

interface Shared extends Omit<ComponentProps<'ul'>, 'defaultValue' | 'children' | 'role' | 'ref'> {
  nodes: TreeNode[]
  /**
   * Called with a branch's value each time it opens. A branch with `children: []` is busy until its rows
   * arrive: give it its children in `nodes`.
   */
  onExpand?: (value: string) => void
  /** Makes F2 rename the row in focus; called with the row's value and its new label. Keep the label in `nodes`. */
  onRename?: (value: string, label: string) => void
  /** The accessible name of the rename field. "Rename" and the label by default. */
  renameLabel?: (label: string) => string
}

interface One extends Shared {
  multiple?: false
  checkable?: false
  /** The value of the selected row, null for none. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

interface Several extends Shared {
  /** Any number of rows are selected. */
  multiple: true
  checkable?: false
  /** The values of the selected rows, in the order of the tree. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

interface Checks extends Shared {
  /** Every row has a check; checking a branch checks the rows under it. */
  checkable: true
  multiple?: false
  /** The values of the checked leaves, in the order of the tree. A branch is not in it: its check says its rows'. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

export type TreeProps = One | Several | Checks

/** A tree walked and folded with the arrow keys. Name it with `aria-label` or `aria-labelledby`. */
export function Tree({ nodes, value, defaultValue, onValueChange, multiple, checkable, onExpand, onRename, renameLabel, className, ...root }: TreeProps) {
  const ref = useBehavior(tree, { rename: Boolean(onRename), renameLabel }, {
    value,
    defaultValue,
    onValueChange,
    on: {
      expand: (event: Event) => onExpand?.((event as CustomEvent<{ value: string }>).detail.value),
      rename: (event: Event) => {
        const { value, label } = (event as CustomEvent<{ value: string, label: string }>).detail
        onRename?.(value, label)
      },
    },
  } as never)
  // The first value's rows are selected or checked in the first render; after that the behavior writes them.
  const [first] = useState(value ?? defaultValue)
  const chosen = [first ?? []].flat() as string[]
  const has = (node: TreeNode) => node.value !== undefined && chosen.includes(node.value)
  /** A branch says what the rows under it say: all checked, none, or mixed. */
  const checked = (node: TreeNode): 'true' | 'false' | 'mixed' => {
    if (!node.children?.length) return has(node) ? 'true' : 'false'
    const states = node.children.map(checked)
    return states.every(state => state === 'true') ? 'true' : states.every(state => state === 'false') ? 'false' : 'mixed'
  }
  const inside = (node: TreeNode) => (
    <>
      {node.children?.length === 0 && <span className="spinner" aria-hidden="true" />}
      {checkable && <span className="tree-check" aria-hidden="true" />}
      <span className="tree-label">{node.label}</span>
    </>
  )
  const rows = (list: TreeNode[]): ReactNode => list.map((node, index) => (
    <li role="none" key={index}>
      {node.children
        ? (
            <>
              <div className="tree-item tree-toggle" role="treeitem" data-value={node.value} aria-expanded={node.open ?? false} aria-checked={checkable ? checked(node) : undefined} aria-disabled={node.disabled || undefined}>{inside(node)}</div>
              <ul className="tree-sub" role="group">{rows(node.children)}</ul>
            </>
          )
        : node.href
          ? <a className="tree-item" role="treeitem" href={node.href} aria-current={node.current ? 'page' : undefined} aria-checked={checkable ? checked(node) : undefined} aria-disabled={node.disabled || undefined}>{inside(node)}</a>
          : <div className="tree-item" role="treeitem" data-value={node.value} aria-selected={checkable ? undefined : multiple ? has(node) : (node.value !== undefined && node.value === first) || undefined} aria-checked={checkable ? checked(node) : undefined} aria-disabled={node.disabled || undefined}>{inside(node)}</div>}
    </li>
  ))
  return <ul className={className ? `tree ${className}` : 'tree'} role="tree" aria-multiselectable={multiple || checkable || undefined} ref={ref} {...root}>{rows(nodes)}</ul>
}
