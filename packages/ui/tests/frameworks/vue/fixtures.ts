import type { Component } from 'vue'
import Avatar from '../../../frameworks/vue/Avatar.vue'
import Calendar from '../../../frameworks/vue/Calendar.vue'
import Chart from '../../../frameworks/vue/Chart.vue'
import ColorPicker from '../../../frameworks/vue/ColorPicker.vue'
import Combobox from '../../../frameworks/vue/Combobox.vue'
import Command from '../../../frameworks/vue/Command.vue'
import Editable from '../../../frameworks/vue/Editable.vue'
import Dial from '../../../frameworks/vue/Dial.vue'
import Gantt from '../../../frameworks/vue/Gantt.vue'
import Listbox from '../../../frameworks/vue/Listbox.vue'
import Gradient from '../../../frameworks/vue/Gradient.vue'
import Otp from '../../../frameworks/vue/Otp.vue'
import Schedule from '../../../frameworks/vue/Schedule.vue'
import Signature from '../../../frameworks/vue/Signature.vue'
import Player from '../../../frameworks/vue/Player.vue'
import Stepper from '../../../frameworks/vue/Stepper.vue'
import Tabs from '../../../frameworks/vue/Tabs.vue'
import Tags from '../../../frameworks/vue/Tags.vue'
import Toaster, { toast } from '../../../frameworks/vue/Toaster.vue'
import Tree from '../../../frameworks/vue/Tree.vue'
import Wheel from '../../../frameworks/vue/Wheel.vue'
import CarouselExample from './CarouselExample.vue'
import ColorPickerPopoverExample from './ColorPickerPopoverExample.vue'
import CompareExample from './CompareExample.vue'
import CropperExample from './CropperExample.vue'
import ContextMenuExample from './ContextMenuExample.vue'
import DialogExample from './DialogExample.vue'
import DialogSheetExample from './DialogSheetExample.vue'
import FieldExample from './FieldExample.vue'
import KanbanExample from './KanbanExample.vue'
import LogExample from './LogExample.vue'
import MenuExample from './MenuExample.vue'
import PanelExample from './PanelExample.vue'
import PopoverExample from './PopoverExample.vue'
import SortableExample from './SortableExample.vue'
import SplitterExample from './SplitterExample.vue'
import ToolbarExample from './ToolbarExample.vue'
import TooltipExample from './TooltipExample.vue'
import TourExample from './TourExample.vue'
import TranscriptExample from './TranscriptExample.vue'

/**
 * How each component is used. A component that takes markup of the page's is shown with it: a trigger,
 * panes, pictures, a control. The scenarios mount these, so every example here is one that runs.
 */
export const fixtures: Record<string, Component> = {
  'avatar': Avatar,
  'calendar': Calendar,
  'carousel': CarouselExample,
  'chart': Chart,
  'color-picker': ColorPicker,
  'color-picker-popover': ColorPickerPopoverExample,
  'combobox': Combobox,
  'command': Command,
  'compare': CompareExample,
  'cropper': CropperExample,
  'context-menu': ContextMenuExample,
  'dial': Dial,
  'dialog': DialogExample,
  'editable': Editable,
  'dialog-sheet': DialogSheetExample,
  'field': FieldExample,
  'gantt': Gantt,
  'listbox': Listbox,
  'log': LogExample,
  'menu': MenuExample,
  'gradient': Gradient,
  'otp': Otp,
  'schedule': Schedule,
  'panel': PanelExample,
  'player': Player,
  'popover': PopoverExample,
  'signature': Signature,
  'sortable': SortableExample,
  'kanban': KanbanExample,
  'splitter': SplitterExample,
  'stepper': Stepper,
  'tabs': Tabs,
  'tags': Tags,
  'toast': Toaster,
  'toolbar': ToolbarExample,
  'tooltip': TooltipExample,
  'tour': TourExample,
  'transcript': TranscriptExample,
  'tree': Tree,
  'wheel': Wheel,
}

export { toast }
