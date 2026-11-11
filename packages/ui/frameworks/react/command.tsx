'use client'
import { useCallback, useEffect, useId, useReducer, useRef, type ComponentProps, type ReactNode } from 'react'
import { command } from '@master/ui/behaviors/command.js'
import { useBehavior } from './use-behavior'

export interface CommandItem {
  label: string
  /** A shortcut or a hint at the end of the row. */
  hint?: ReactNode
  /** The caption of the group the command belongs to. Commands of one group are written together. */
  group?: string
  /** Where the command goes. Without it, `onSelect` runs. */
  href?: string
  onSelect?: () => void
  disabled?: boolean
}

export interface CommandProps extends Omit<ComponentProps<'dialog'>, 'open' | 'onSelect'> {
  items: CommandItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** The key that opens and closes the palette with Command or Control. `'k'` by default, `false` for none. */
  shortcut?: string | false
  /** False when `items` are already the matches; `onSearch` then says what was typed. */
  filter?: boolean
  onSearch?: (text: string) => void
  /** The name of the search field, and the placeholder it shows. */
  searchLabel: string
  placeholder?: string
  /** The name of the list of commands. */
  listLabel: string
  empty?: ReactNode
}

/** A command palette: a native dialog over a search field and a list. Name the dialog with `aria-label`. */
export function Command({ items, open, onOpenChange, shortcut = 'k', filter = true, onSearch, searchLabel, placeholder, listLabel, empty, className, ...dialog }: CommandProps) {
  const id = useId()
  const element = useRef<HTMLDialogElement | null>(null)
  const attach = useBehavior(command, { shortcut, filter })
  const ref = useCallback((root: HTMLDialogElement | null) => {
    element.current = root
    return attach(root) ?? undefined
  }, [attach])
  const [tick, again] = useReducer((count: number) => count + 1, 0)
  const heard = useRef(onOpenChange)
  /** What the owner knows: the last state it set or was told. */
  const known = useRef(false)
  useEffect(() => { heard.current = onOpenChange })

  useEffect(() => {
    const root = element.current
    if (!root || open === undefined) return
    known.current = open
    if (open && !root.open) root.showModal()
    else if (!open && root.open) root.close()
  }, [open, tick])

  useEffect(() => {
    const root = element.current
    if (!root) return
    const controller = new AbortController()
    // The shortcut, Esc and a command that ran all open or close the dialog without asking: say so.
    const report = () => {
      if (root.open !== known.current) heard.current?.(known.current = root.open)
      again()
    }
    for (const type of ['toggle', 'close']) root.addEventListener(type, report, { signal: controller.signal })
    return () => controller.abort()
  }, [])

  const groups = [...new Set(items.map(item => item.group))]
  const option = (item: CommandItem, at: number) => item.href
    ? <a className="listbox-option" role="option" key={at} href={item.href} aria-disabled={item.disabled || undefined}>{item.label}{item.hint !== undefined && <span className="listbox-end">{item.hint}</span>}</a>
    : <div className="listbox-option" role="option" key={at} onClick={item.onSelect} aria-disabled={item.disabled || undefined}>{item.label}{item.hint !== undefined && <span className="listbox-end">{item.hint}</span>}</div>

  return (
    <dialog
      className={className ? `dialog command ${className}` : 'dialog command'}
      ref={ref}
      {...{ closedby: 'any' }}
      {...dialog}
    >
      <label className="command-search">
        <input className="command-input" type="search" role="combobox" aria-expanded="true" aria-controls={`${id}list`} aria-autocomplete="list" aria-label={searchLabel} autoComplete="off" placeholder={placeholder} autoFocus onInput={event => onSearch?.(event.currentTarget.value)} />
      </label>
      <div className="listbox command-list" id={`${id}list`} role="listbox" aria-label={listLabel}>
        {groups.map((group, index) => group === undefined
          ? items.map((item, at) => item.group === undefined && option(item, at))
          : (
              <div className="listbox-group" role="group" aria-labelledby={`${id}group${index}`} key={group}>
                <div className="listbox-label" id={`${id}group${index}`}>{group}</div>
                {items.map((item, at) => item.group === group && option(item, at))}
              </div>
            ))}
        {empty !== undefined && <div className="listbox-empty">{empty}</div>}
      </div>
    </dialog>
  )
}
