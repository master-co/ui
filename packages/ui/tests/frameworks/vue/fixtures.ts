import type { Component } from 'vue'
import Calendar from '../../../frameworks/vue/Calendar.vue'
import Combobox from '../../../frameworks/vue/Combobox.vue'
import Command from '../../../frameworks/vue/Command.vue'
import Editable from '../../../frameworks/vue/Editable.vue'
import Dial from '../../../frameworks/vue/Dial.vue'
import Listbox from '../../../frameworks/vue/Listbox.vue'
import Otp from '../../../frameworks/vue/Otp.vue'
import Stepper from '../../../frameworks/vue/Stepper.vue'
import Tabs from '../../../frameworks/vue/Tabs.vue'
import Tags from '../../../frameworks/vue/Tags.vue'
import Toaster, { toast } from '../../../frameworks/vue/Toaster.vue'
import Tree from '../../../frameworks/vue/Tree.vue'
import Wheel from '../../../frameworks/vue/Wheel.vue'
import CompareExample from './CompareExample.vue'
import ContextMenuExample from './ContextMenuExample.vue'
import DialogExample from './DialogExample.vue'
import FieldExample from './FieldExample.vue'
import MenuExample from './MenuExample.vue'
import PopoverExample from './PopoverExample.vue'
import SortableExample from './SortableExample.vue'
import SplitterExample from './SplitterExample.vue'
import ToolbarExample from './ToolbarExample.vue'
import TooltipExample from './TooltipExample.vue'

/**
 * How each component is used. A component that takes markup of the page's is shown with it: a trigger,
 * panes, pictures, a control. The scenarios mount these, so every example here is one that runs.
 */
export const fixtures: Record<string, Component> = {
  'calendar': Calendar,
  'combobox': Combobox,
  'command': Command,
  'compare': CompareExample,
  'context-menu': ContextMenuExample,
  'dial': Dial,
  'dialog': DialogExample,
  'editable': Editable,
  'field': FieldExample,
  'listbox': Listbox,
  'menu': MenuExample,
  'otp': Otp,
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
}

export { toast }
