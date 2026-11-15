'use client'
import { useEffect, useId, useRef, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { contextMenu, menu } from '@master/ui/behaviors/menu.js'

export type MenuItem =
  | { label: ReactNode, shortcut?: ReactNode, href?: string, onSelect?: () => void, danger?: boolean, disabled?: boolean }
  | { separator: true }

export interface MenuProps extends Omit<ComponentProps<'div'>, 'children' | 'ref'> {
  items: MenuItem[]
  /** The button that opens the menu: spread what it is given on a button of your own. */
  trigger?: (attributes: { popoverTarget: string, 'aria-haspopup': 'menu' }) => ReactNode
  /** Instead of a button: the element the menu belongs to. It opens at the pointer on a right click or a long press. */
  context?: RefObject<HTMLElement | null>
}

/** A menu of actions with the keys of a menu. Name it with `aria-label`. */
export function Menu({ items, trigger, context, className, id, ...root }: MenuProps) {
  const generated = useId()
  const name = id ?? generated
  const element = useRef<HTMLDivElement>(null)

  useEffect(() => menu(element.current!), [])

  // The target of a context menu is whatever the ref holds once a render is done: one mounted after the menu, or
  // mounted again, is another element, and the menu opens from it. A ref never changes, so every render looks.
  const opens = useRef<{ target: HTMLElement, forget: () => void } | null>(null)
  useEffect(() => {
    const target = context?.current ?? null
    if (target === (opens.current?.target ?? null)) return
    opens.current?.forget()
    opens.current = target ? { target, forget: contextMenu(target, element.current!) } : null
  })
  useEffect(() => () => {
    opens.current?.forget()
    opens.current = null
  }, [])

  return (
    <>
      {trigger?.({ popoverTarget: name, 'aria-haspopup': 'menu' })}
      <div id={name} popover="auto" className={['menu', context && 'menu-context', className].filter(Boolean).join(' ')} role="menu" ref={element} {...root}>
        {/* A link that is disabled goes nowhere: it keeps its place and its words, without the address. */}
        {items.map((item, index) => 'separator' in item
          ? <hr className="menu-separator" key={index} />
          : item.href
            ? <a className={item.danger ? 'menu-item menu-item-danger' : 'menu-item'} role="menuitem" key={index} href={item.disabled ? undefined : item.href} aria-disabled={item.disabled || undefined}>{item.label}{item.shortcut !== undefined && <span className="menu-shortcut">{item.shortcut}</span>}</a>
            : <button type="button" className={item.danger ? 'menu-item menu-item-danger' : 'menu-item'} role="menuitem" key={index} popoverTarget={name} popoverTargetAction="hide" onClick={item.onSelect} disabled={item.disabled}>{item.label}{item.shortcut !== undefined && <span className="menu-shortcut">{item.shortcut}</span>}</button>)}
      </div>
    </>
  )
}
