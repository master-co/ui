import type { Component } from 'svelte'
import Calendar from '../../../frameworks/svelte/Calendar.svelte'
import Combobox from '../../../frameworks/svelte/Combobox.svelte'
import Command from '../../../frameworks/svelte/Command.svelte'
import Listbox from '../../../frameworks/svelte/Listbox.svelte'
import Otp from '../../../frameworks/svelte/Otp.svelte'
import Stepper from '../../../frameworks/svelte/Stepper.svelte'
import Tabs from '../../../frameworks/svelte/Tabs.svelte'
import Toaster, { toast } from '../../../frameworks/svelte/Toaster.svelte'
import Tree from '../../../frameworks/svelte/Tree.svelte'
import Wheel from '../../../frameworks/svelte/Wheel.svelte'
import CompareExample from './CompareExample.svelte'
import ContextMenuExample from './ContextMenuExample.svelte'
import DialogExample from './DialogExample.svelte'
import FieldExample from './FieldExample.svelte'
import MenuExample from './MenuExample.svelte'
import PopoverExample from './PopoverExample.svelte'
import SplitterExample from './SplitterExample.svelte'
import TooltipExample from './TooltipExample.svelte'

/**
 * How each component is used. A component that takes markup of the page's is shown with it: a trigger,
 * panes, pictures, a control. The scenarios mount these, so every example here is one that runs.
 */
export const fixtures = {
  'calendar': Calendar,
  'combobox': Combobox,
  'command': Command,
  'compare': CompareExample,
  'context-menu': ContextMenuExample,
  'dialog': DialogExample,
  'field': FieldExample,
  'listbox': Listbox,
  'menu': MenuExample,
  'otp': Otp,
  'popover': PopoverExample,
  'splitter': SplitterExample,
  'stepper': Stepper,
  'tabs': Tabs,
  'toast': Toaster,
  'tooltip': TooltipExample,
  'tree': Tree,
  'wheel': Wheel,
} as unknown as Record<string, Component<Record<string, unknown>>>

export { toast }
