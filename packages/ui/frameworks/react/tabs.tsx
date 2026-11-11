'use client'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { tabs } from '@master/ui/behaviors/tabs.js'
import { useBehavior } from './use-behavior'

export interface Tab {
  /** What selecting the tab gives `onValueChange`. */
  value: string
  label: ReactNode
  /** The panel the tab shows. */
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps extends Omit<ComponentProps<'div'>, 'defaultValue' | 'children' | 'role'> {
  tabs: Tab[]
  /** The value of the selected tab. The first tab by default. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Classes for each panel, such as its padding. */
  panelClassName?: string
}

/** Tabs that switch panels in place. Name the tablist with `aria-label` or `aria-labelledby`. */
export function Tabs({ tabs: list, value, defaultValue, onValueChange, panelClassName, className, ...root }: TabsProps) {
  const id = useId()
  const ref = useBehavior(tabs, undefined, { value, defaultValue, onValueChange: onValueChange as ((value: string | null) => void) | undefined })
  const [first] = useState(value ?? defaultValue ?? list.find(tab => !tab.disabled)?.value)
  return (
    <>
      <div className={className ? `tabs ${className}` : 'tabs'} role="tablist" ref={ref} {...root}>
        {list.map((tab, index) => (
          <button type="button" className="tabs-item" role="tab" key={tab.value} id={`${id}tab${index}`} data-value={tab.value} aria-selected={tab.value === first} aria-controls={`${id}panel${index}`} tabIndex={tab.value === first ? 0 : -1} disabled={tab.disabled}>{tab.label}</button>
        ))}
      </div>
      {list.map((tab, index) => (
        <div className={panelClassName} role="tabpanel" key={tab.value} id={`${id}panel${index}`} aria-labelledby={`${id}tab${index}`} hidden={tab.value !== first}>{tab.content}</div>
      ))}
    </>
  )
}
