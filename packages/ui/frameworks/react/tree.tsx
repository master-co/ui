'use client'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { tree } from '@master/ui/behaviors/tree.js'
import { useBehavior } from './use-behavior'

export interface TreeNode {
  label: ReactNode
  /** What selecting the row gives `onValueChange`. A row with neither `href` nor `children` can be selected. */
  value?: string
  /** A row that is a link. `current` marks the page that is open. */
  href?: string
  current?: boolean
  /** The rows under a branch, and whether it starts open. */
  children?: TreeNode[]
  open?: boolean
  disabled?: boolean
}

export interface TreeProps extends Omit<ComponentProps<'ul'>, 'defaultValue' | 'children' | 'role'> {
  nodes: TreeNode[]
  /** The value of the selected row, null for none. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

/** A tree walked and folded with the arrow keys. Name it with `aria-label` or `aria-labelledby`. */
export function Tree({ nodes, value, defaultValue, onValueChange, className, ...root }: TreeProps) {
  const ref = useBehavior(tree, undefined, { value, defaultValue, onValueChange })
  const [first] = useState(value ?? defaultValue)
  const rows = (list: TreeNode[]): ReactNode => list.map((node, index) => (
    <li role="none" key={index}>
      {node.children
        ? (
            <>
              <div className="tree-item tree-toggle" role="treeitem" aria-expanded={node.open ?? false} aria-disabled={node.disabled || undefined}>{node.label}</div>
              <ul className="tree-sub" role="group">{rows(node.children)}</ul>
            </>
          )
        : node.href
          ? <a className="tree-item" role="treeitem" href={node.href} aria-current={node.current ? 'page' : undefined} aria-disabled={node.disabled || undefined}>{node.label}</a>
          : <div className="tree-item" role="treeitem" data-value={node.value} aria-selected={(node.value !== undefined && node.value === first) || undefined} aria-disabled={node.disabled || undefined}>{node.label}</div>}
    </li>
  ))
  return <ul className={className ? `tree ${className}` : 'tree'} role="tree" ref={ref} {...root}>{rows(nodes)}</ul>
}
