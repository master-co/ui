'use client'
import { useEffect, useId, useRef, type ComponentProps, type ReactNode, type RefObject } from 'react'
import { contextMenu, menu } from '@master/ui/behaviors/menu.js'

export type MenuItem =
  | { label: ReactNode, shortcut?: ReactNode, href?: string, onSelect?: () => void, danger?: boolean, disabled?: boolean }
  | { separator: true }

export interface MenuProps extends Omit<ComponentProps<'div'>, 'children'> {
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

  useEffect(() => {
    const detach = menu(element.current!)
    const target = context?.current
    const forget = target ? contextMenu(target, element.current!) : undefined
    return () => {
      detach()
      forget?.()
    }
  }, [context])

  return (
    <>
      {trigger?.({ popoverTarget: name, 'aria-haspopup': 'menu' })}
      <div id={name} popover="auto" className={['menu', context && 'menu-context', className].filter(Boolean).join(' ')} role="menu" ref={element} {...root}>
        {items.map((item, index) => 'separator' in item
          ? <hr className="menu-separator" key={index} />
          : item.href
            ? <a className={item.danger ? 'menu-item menu-item-danger' : 'menu-item'} role="menuitem" key={index} href={item.href} aria-disabled={item.disabled || undefined}>{item.label}{item.shortcut !== undefined && <span className="menu-shortcut">{item.shortcut}</span>}</a>
            : <button type="button" className={item.danger ? 'menu-item menu-item-danger' : 'menu-item'} role="menuitem" key={index} popoverTarget={name} popoverTargetAction="hide" onClick={item.onSelect} disabled={item.disabled}>{item.label}{item.shortcut !== undefined && <span className="menu-shortcut">{item.shortcut}</span>}</button>)}
      </div>
    </>
  )
}
