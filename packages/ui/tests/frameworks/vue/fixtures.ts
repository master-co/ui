import type { Component } from 'vue'
import Calendar from '../../../frameworks/vue/Calendar.vue'
import Combobox from '../../../frameworks/vue/Combobox.vue'
import Command from '../../../frameworks/vue/Command.vue'
import Listbox from '../../../frameworks/vue/Listbox.vue'
import Otp from '../../../frameworks/vue/Otp.vue'
import Stepper from '../../../frameworks/vue/Stepper.vue'
import Tabs from '../../../frameworks/vue/Tabs.vue'
import Toaster, { toast } from '../../../frameworks/vue/Toaster.vue'
import Tree from '../../../frameworks/vue/Tree.vue'
import Wheel from '../../../frameworks/vue/Wheel.vue'
import CompareExample from './CompareExample.vue'
import ContextMenuExample from './ContextMenuExample.vue'
import DialogExample from './DialogExample.vue'
import FieldExample from './FieldExample.vue'
import MenuExample from './MenuExample.vue'
import PopoverExample from './PopoverExample.vue'
import SplitterExample from './SplitterExample.vue'
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
}

export { toast }
