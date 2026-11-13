'use client'
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { combobox } from '@master/ui/behaviors/combobox.js'
import { useBehavior } from './use-behavior'

export interface ComboboxOption {
  /** What choosing the option gives `onValueChange`. */
  value: string
  /** What the option says, and what the field holds once it is chosen. */
  label: string
  description?: string
  /** The caption of the group the option belongs to. Options of one group are written together, under it. */
  group?: string
  disabled?: boolean
}

interface Shared extends Omit<ComponentProps<'input'>, 'value' | 'defaultValue' | 'role' | 'multiple' | 'name'> {
  options: ComboboxOption[]
  /**
   * The text in the field, what the reader is looking for: written into the field each time it changes.
   * It is not the value; with one value it holds the chosen option's label once one is chosen.
   */
  query?: string
  /** Called with the text in the field each time the reader changes it, by typing or by choosing. */
  onQueryChange?: (query: string) => void
  /** False when `options` are already the matches: search for `query` and give the matches as `options`. */
  filter?: boolean
  /** The name of the list, for assistive technology. */
  listLabel: string
  /** The name of the button that opens the list. */
  toggleLabel: string
  /** What the list says when no option matches. */
  empty?: ReactNode
}

interface One extends Shared {
  multiple?: false
  /** The value of the chosen option; null while the field holds text no option was chosen for. */
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
}

interface Several extends Shared {
  /** Several values, each a chip in the field. */
  multiple: true
  /** The chosen values, in the order they were chosen. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
  /** The name each value is submitted with, in a hidden input of its chip. */
  name?: string
  /** The accessible name of a chip's remove button. `Remove <label>` by default. */
  removeLabel?: (label: string) => string
}

export type ComboboxProps = One | Several

/**
 * A combobox. Name the field with `aria-label`, or give it an `id` a label points at; every other prop of
 * an input goes to the field, so `onChange` hears what is typed. With `multiple`, the chosen values are
 * chips in the field, which React writes from the value.
 */
export function Combobox(props: ComboboxProps) {
  const { options, value, defaultValue, onValueChange, query, onQueryChange, filter = true, listLabel, toggleLabel, empty, className, multiple, ...rest } = props
  const { name, removeLabel = (label: string) => `Remove ${label}`, ...field } = rest as Omit<Several, keyof Shared | 'multiple' | 'value' | 'defaultValue' | 'onValueChange'> & ComponentProps<'input'>
  const id = useId()
  const handle = useRef<ReturnType<typeof combobox> | null>(null)
  /** The last query the owner gave or was told. */
  const known = useRef<string | undefined>(undefined)
  const heard = useRef(onQueryChange)
  useEffect(() => { heard.current = onQueryChange })
  const [first] = useState(value ?? defaultValue)
  const [firstQuery] = useState(query)
  const [chips, setChips] = useState<string[]>(() => (multiple ? [first ?? []].flat() as string[] : []))
  const ref = useBehavior(combobox, multiple ? { filter, draw: setChips, removeLabel } : { filter }, {
    value,
    defaultValue,
    onValueChange,
    attached: (attached: unknown) => { handle.current = attached as ReturnType<typeof combobox> | null },
    on: {
      input: () => {
        const next = handle.current?.query
        if (next === undefined || next === known.current) return
        heard.current?.(known.current = next)
      },
    },
  } as never)
  useEffect(() => {
    if (query === undefined || query === known.current || !handle.current) return
    handle.current.query = known.current = query
  }, [query])
  const chosen = (option: ComboboxOption) => (multiple ? [first ?? []].flat().includes(option.value) : option.value === first)
  const labelOf = (each: string) => options.find(option => option.value === each)?.label ?? each
  const groups = [...new Set(options.map(option => option.group))]
  return (
    <div className={className ? `combobox ${className}` : 'combobox'} ref={ref}>
      <div className={multiple ? 'input-group input-group-wrap' : 'input-group'}>
        {multiple && (value !== undefined ? value as string[] : chips).map(each => (
          <span className="chip" data-value={each} key={each}>
            {labelOf(each)}
            {name && <input type="hidden" name={name} value={each} />}
            <button type="button" className="chip-remove" tabIndex={-1} aria-label={removeLabel(labelOf(each))} />
          </span>
        ))}
        <input className="input-group-field" role="combobox" aria-expanded="false" aria-controls={`${id}list`} aria-autocomplete="list" autoComplete="off" defaultValue={(multiple ? undefined : options.find(option => option.value === first)?.label) ?? firstQuery} {...field} />
        <button type="button" className="combobox-toggle" tabIndex={-1} aria-label={toggleLabel} />
      </div>
      <div id={`${id}list`} popover="manual" className="listbox" role="listbox" aria-label={listLabel} aria-multiselectable={multiple || undefined}>
        {groups.map((group, index) => {
          const rows = options.filter(option => option.group === group).map(option => (
            <div className="listbox-option" role="option" key={option.value} data-value={option.value} aria-checked={chosen(option)} aria-disabled={option.disabled || undefined}>
              {option.description
                ? <span className="listbox-body"><span>{option.label}</span><span className="listbox-description">{option.description}</span></span>
                : option.label}
            </div>
          ))
          return group === undefined
            ? rows
            : (
                <div className="listbox-group" role="group" aria-labelledby={`${id}group${index}`} key={group}>
                  <div className="listbox-label" id={`${id}group${index}`}>{group}</div>
                  {rows}
                </div>
              )
        })}
        {empty !== undefined && <div className="listbox-empty">{empty}</div>}
      </div>
    </div>
  )
}
