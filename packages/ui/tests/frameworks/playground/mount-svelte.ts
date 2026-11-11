import { mount as render, type Component } from 'svelte'
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
import CompareExample from '../svelte/CompareExample.svelte'
import ContextMenuExample from '../svelte/ContextMenuExample.svelte'
import DialogExample from '../svelte/DialogExample.svelte'
import FieldExample from '../svelte/FieldExample.svelte'
import MenuExample from '../svelte/MenuExample.svelte'
import PopoverExample from '../svelte/PopoverExample.svelte'
import SplitterExample from '../svelte/SplitterExample.svelte'
import TooltipExample from '../svelte/TooltipExample.svelte'
import Owner from './Owner.svelte'

const fixtures = {
  'calendar': Calendar, 'combobox': Combobox, 'command': Command, 'compare': CompareExample, 'context-menu': ContextMenuExample,
  'dialog': DialogExample, 'field': FieldExample, 'listbox': Listbox, 'menu': MenuExample, 'otp': Otp, 'popover': PopoverExample,
  'splitter': SplitterExample, 'stepper': Stepper, 'tabs': Tabs, 'toast': Toaster, 'tooltip': TooltipExample, 'tree': Tree, 'wheel': Wheel,
} as unknown as Record<string, Component<Record<string, unknown>>>

export function mount(name: string, target: HTMLElement, props: Record<string, unknown>) {
  render(Owner, { target, props: { component: fixtures[name], props } })
}

export { toast }
