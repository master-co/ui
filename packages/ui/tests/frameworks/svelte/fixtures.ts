import type { Component } from 'svelte'
import Avatar from '../../../frameworks/svelte/Avatar.svelte'
import Calendar from '../../../frameworks/svelte/Calendar.svelte'
import Combobox from '../../../frameworks/svelte/Combobox.svelte'
import Command from '../../../frameworks/svelte/Command.svelte'
import Editable from '../../../frameworks/svelte/Editable.svelte'
import Listbox from '../../../frameworks/svelte/Listbox.svelte'
import Otp from '../../../frameworks/svelte/Otp.svelte'
import Schedule from '../../../frameworks/svelte/Schedule.svelte'
import Stepper from '../../../frameworks/svelte/Stepper.svelte'
import Tabs from '../../../frameworks/svelte/Tabs.svelte'
import Tags from '../../../frameworks/svelte/Tags.svelte'
import Toaster, { toast } from '../../../frameworks/svelte/Toaster.svelte'
import Tree from '../../../frameworks/svelte/Tree.svelte'
import Wheel from '../../../frameworks/svelte/Wheel.svelte'
import CarouselExample from './CarouselExample.svelte'
import CompareExample from './CompareExample.svelte'
import ContextMenuExample from './ContextMenuExample.svelte'
import DialogExample from './DialogExample.svelte'
import FieldExample from './FieldExample.svelte'
import MenuExample from './MenuExample.svelte'
import PopoverExample from './PopoverExample.svelte'
import SortableExample from './SortableExample.svelte'
import SplitterExample from './SplitterExample.svelte'
import ToolbarExample from './ToolbarExample.svelte'
import TooltipExample from './TooltipExample.svelte'

/**
 * How each component is used. A component that takes markup of the page's is shown with it: a trigger,
 * panes, pictures, a control. The scenarios mount these, so every example here is one that runs.
 */
export const fixtures = {
  'avatar': Avatar,
  'calendar': Calendar,
  'carousel': CarouselExample,
  'combobox': Combobox,
  'command': Command,
  'compare': CompareExample,
  'context-menu': ContextMenuExample,
  'dialog': DialogExample,
  'editable': Editable,
  'field': FieldExample,
  'listbox': Listbox,
  'menu': MenuExample,
  'otp': Otp,
  'schedule': Schedule,
  'popover': PopoverExample,
  'sortable': SortableExample,
  'splitter': SplitterExample,
  'stepper': Stepper,
  'tabs': Tabs,
  'tags': Tags,
  'toast': Toaster,
  'toolbar': ToolbarExample,
  'tooltip': TooltipExample,
  'tree': Tree,
  'wheel': Wheel,
} as unknown as Record<string, Component<Record<string, unknown>>>

export { toast }
