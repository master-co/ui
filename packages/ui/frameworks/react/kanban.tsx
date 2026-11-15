'use client'
import { useId, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { kanban, type KanbanMessages, type KanbanValue } from '@master/ui/behaviors/kanban.js'
import { useBehavior } from './use-behavior'

export type { KanbanValue }

export interface KanbanColumn {
  /** What the column stands for in the arrangement. */
  value: string
  /** The column's name: its title, and what the status and the mover call it. */
  label: string
}

export interface KanbanItem {
  /** What the item stands for in the arrangement. No other item has it. */
  value: string
  /** What the item is called: its handle and its move button are named with it. */
  label: string
  /** The column the item starts in, and stays in while the arrangement does not name it. The first by default. */
  column?: string
}

export interface KanbanLabels<T extends KanbanItem> {
  /** The accessible name of an item's handle. `Drag <label>` by default. */
  drag?: (item: T) => string
  /** The accessible name of the button that opens the mover for an item. `Move <label>` by default. */
  move?: (item: T) => string
  /** The mover's two fields and two buttons. */
  column?: string
  position?: string
  confirm?: string
  cancel?: string
}

/** What an item's own markup spreads on its two buttons. */
export interface KanbanControls {
  /** For the grip, an empty `<button>`: it carries the item with the pointer and the keys. */
  handle: ComponentProps<'button'>
  /** For the button that opens the mover, an empty `<button>`: a column and a position are chosen there. */
  move: ComponentProps<'button'>
}

export interface KanbanProps<C extends KanbanColumn, T extends KanbanItem> extends Omit<ComponentProps<'div'>, 'children' | 'defaultValue' | 'ref'> {
  /** The columns, in their order. The order is not the reader's to change. */
  columns: C[]
  items: T[]
  /** The arrangement: each column's value and the values of its items, in order. */
  value?: KanbanValue
  defaultValue?: KanbanValue
  onValueChange?: (value: KanbanValue) => void
  /** What an item shows, with the attributes of its handle and of its move button to spread. */
  children: (item: T, controls: KanbanControls) => ReactNode
  /** What stands beside a column's title, such as the number of items it holds. */
  header?: (column: C, items: T[]) => ReactNode
  /** What a column says while it holds no item. */
  empty?: (column: C) => ReactNode
  /** The names of the controls, in the page's language. */
  labels?: KanbanLabels<T>
  /** What the status region says, in the page's language. */
  messages?: KanbanMessages
}

/**
 * A board whose items the reader moves between columns. React writes the columns and their items in the
 * arrangement it holds; the behavior carries an item with the pointer and the keys, and asks React to arrange
 * the board when one is dropped. An item that changes column is rendered again in its new list, so what it
 * shows comes from the data, not from state kept inside it.
 */
export function Kanban<C extends KanbanColumn, T extends KanbanItem>({ columns, items, value, defaultValue, onValueChange, children, header, empty, labels = {}, messages, className, ...root }: KanbanProps<C, T>) {
  const id = useId()
  const [kept, setKept] = useState(() => value ?? defaultValue)
  const shown = arranged(columns, items, value ?? kept)
  // A move waits for the render that writes the item in its place, so focus finds its handle there. Every
  // arrangement asked for is kept, which renders even when the owner does not take it: the wait always ends.
  const waiting = useRef<(() => void)[]>([])
  useLayoutEffect(() => {
    waiting.current.splice(0).forEach(done => done())
  })
  const arrange = (next: KanbanValue) => new Promise<void>((done) => {
    waiting.current.push(done)
    setKept(next)
    onValueChange?.(next)
  })
  const ref = useBehavior(kanban, { messages, arrange })
  const { drag = (item: T) => `Drag ${item.label}`, move = (item: T) => `Move ${item.label}`, column: columnLabel = 'Column', position = 'Position', confirm = 'Move', cancel = 'Cancel' } = labels

  return (
    <div className={className ? `kanban ${className}` : 'kanban'} role="group" ref={ref} {...root}>
      {columns.map((column, at) => (
        <section className="kanban-column" data-value={column.value} aria-labelledby={`${id}-column-${at}`} key={column.value}>
          <header className="kanban-header">
            <h3 className="kanban-title" id={`${id}-column-${at}`}>{column.label}</h3>
            {header?.(column, shown[at]!)}
          </header>
          <ol className="kanban-items">
            {shown[at]!.map(item => (
              <li className="kanban-item" data-value={item.value} key={item.value}>
                {children(item, {
                  handle: { 'type': 'button', 'className': 'kanban-handle', 'aria-pressed': 'false', 'aria-label': drag(item) },
                  move: { 'type': 'button', 'className': 'kanban-move', 'popoverTarget': `${id}-mover`, 'aria-label': move(item) },
                })}
              </li>
            ))}
          </ol>
          <p className="kanban-empty">{empty ? empty(column) : 'No items'}</p>
        </section>
      ))}
      <div className="popover popover-end" popover="auto" id={`${id}-mover`}>
        <form className="kanban-mover">
          <label className="field">
            {columnLabel}
            <select className="select" name="column" />
          </label>
          <label className="field">
            {position}
            <select className="select" name="position" />
          </label>
          <div className="kanban-mover-actions">
            <button type="button" className="btn btn-sm" popoverTarget={`${id}-mover`} popoverTargetAction="hide">{cancel}</button>
            <button type="submit" className="btn btn-sm btn-primary">{confirm}</button>
          </div>
        </form>
      </div>
      <div className="kanban-preview" popover="manual" aria-hidden="true" />
      <p className="kanban-status" role="status" />
    </div>
  )
}

/**
 * The items of each column, in the order an arrangement gives them. An item it does not name keeps the column
 * it names itself, or the first, after the ones it does; a value it names that no item has is passed over.
 */
function arranged<C extends KanbanColumn, T extends KanbanItem>(columns: C[], items: T[], order: KanbanValue = []): T[][] {
  const named = new Set(order.flatMap(entry => entry.items))
  const own = (item: T) => columns.some(column => column.value === item.column) ? item.column : columns[0]?.value
  return columns.map((column) => {
    const listed = (order.find(entry => entry.value === column.value)?.items ?? []).flatMap(value => items.filter(item => item.value === value))
    return [...listed, ...items.filter(item => !named.has(item.value) && own(item) === column.value)]
  })
}
