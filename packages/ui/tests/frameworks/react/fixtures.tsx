import { useRef, type ComponentType } from 'react'
import { Calendar } from '../../../frameworks/react/calendar.tsx'
import { ColorPicker, type ColorPickerProps } from '../../../frameworks/react/color-picker.tsx'
import { Combobox } from '../../../frameworks/react/combobox.tsx'
import { Editable } from '../../../frameworks/react/editable.tsx'
import { Command } from '../../../frameworks/react/command.tsx'
import { Compare } from '../../../frameworks/react/compare.tsx'
import { Dial } from '../../../frameworks/react/dial.tsx'
import { Dialog } from '../../../frameworks/react/dialog.tsx'
import { Field } from '../../../frameworks/react/field.tsx'
import { Gantt } from '../../../frameworks/react/gantt.tsx'
import { Listbox } from '../../../frameworks/react/listbox.tsx'
import { Menu, type MenuProps } from '../../../frameworks/react/menu.tsx'
import { Otp } from '../../../frameworks/react/otp.tsx'
import { Panel, type PanelProps } from '../../../frameworks/react/panel.tsx'
import { Popover, type PopoverProps } from '../../../frameworks/react/popover.tsx'
import { Signature } from '../../../frameworks/react/signature.tsx'
import { Sortable, type SortableProps } from '../../../frameworks/react/sortable.tsx'
import { Splitter, type SplitterProps } from '../../../frameworks/react/splitter.tsx'
import { Stepper } from '../../../frameworks/react/stepper.tsx'
import { Tabs } from '../../../frameworks/react/tabs.tsx'
import { Tags } from '../../../frameworks/react/tags.tsx'
import { toast, Toaster } from '../../../frameworks/react/toast.tsx'
import { Toolbar, type ToolbarProps } from '../../../frameworks/react/toolbar.tsx'
import { Tooltip } from '../../../frameworks/react/tooltip.tsx'
import { Tour, type TourProps } from '../../../frameworks/react/tour.tsx'
import { Tree } from '../../../frameworks/react/tree.tsx'
import { Wheel } from '../../../frameworks/react/wheel.tsx'
import { type CompareProps } from '../../../frameworks/react/compare.tsx'
import { type DialogProps } from '../../../frameworks/react/dialog.tsx'
import { type FieldProps } from '../../../frameworks/react/field.tsx'

/**
 * How each component is used. A component that takes markup of the page's is shown with it: a trigger,
 * panes, pictures, a control. The scenarios mount these, so every example here is one that runs.
 */
const tasks = [
  { value: 'onboarding', label: 'Onboarding', due: 'Mon' },
  { value: 'billing', label: 'Billing', due: 'Tue' },
  { value: 'search', label: 'Search', due: 'Thu' },
]

function SortableExample(props: Omit<SortableProps<typeof tasks[number]>, 'items' | 'children'>) {
  return (
    <Sortable className="list" itemClassName="list-row" aria-label="Priorities" items={tasks} {...props}>
      {task => (
        <>
          <span className="list-body"><span className="list-title">{task.label}</span></span>
          <span className="list-end">{task.due}</span>
        </>
      )}
    </Sortable>
  )
}

function ToolbarExample(props: Omit<ToolbarProps, 'label'>) {
  return (
    <Toolbar label="Formatting" {...props}>
      <button type="button" className="btn btn-quiet btn-sm" aria-pressed="false">Bold</button>
      <button type="button" className="btn btn-quiet btn-sm" aria-pressed="false">Italic</button>
      <span className="toolbar-separator" role="separator" aria-orientation="vertical" />
      <button type="button" className="btn btn-quiet btn-sm">Link</button>
    </Toolbar>
  )
}

function TourExample(props: Omit<TourProps, 'steps' | 'trigger'>) {
  const share = useRef<HTMLButtonElement>(null)
  return (
    <>
      <div className="toolbar" role="toolbar" aria-label="Deployments">
        <button type="button" className="btn btn-quiet btn-sm" id="tour-search">Search</button>
        <button type="button" className="btn btn-quiet btn-sm" id="tour-filter">Filter</button>
        <button type="button" className="btn btn-quiet btn-sm" ref={share}>Share</button>
      </div>
      <Tour
        trigger={attributes => <button type="button" className="btn" {...attributes}>Take the tour</button>}
        steps={[
          { target: '#tour-search', title: 'Search every deployment', text: 'Find one by its branch, its commit or the person who shipped it.' },
          { target: () => document.getElementById('tour-filter'), title: 'Filter the list', text: 'Keep only the deployments of one branch, one author or one status.' },
          { target: share, title: 'Share a deployment', text: 'Copy a link to it, open for anyone on the team.' },
        ]}
        {...props}
      />
    </>
  )
}

function SplitterExample(props: Omit<SplitterProps, 'start' | 'end'>) {
  return <Splitter start={<p>Files</p>} end={<p>Editor</p>} {...props} />
}

function CompareExample(props: CompareProps) {
  return (
    <Compare {...props}>
      <img className="compare-before" src="/demo/moonstone.svg" alt="The valley before grading" width="800" height="500" />
      <img className="compare-after" src="/demo/portrait-1.svg" alt="The valley after grading" />
    </Compare>
  )
}

function MenuExample(props: MenuProps) {
  return <Menu trigger={attributes => <button type="button" className="btn" {...attributes}>Project</button>} {...props} />
}

function ContextMenuExample(props: MenuProps) {
  const target = useRef<HTMLDivElement>(null)
  return (
    <>
      <div className="sheet" tabIndex={0} ref={target}>Right-click this sheet</div>
      <Menu context={target} {...props} />
    </>
  )
}

function DialogExample(props: DialogProps) {
  return (
    <Dialog id="delete-project" aria-labelledby="delete-project-title" trigger={attributes => <button type="button" className="btn" {...attributes}>Delete project</button>} {...props}>
      <header className="dialog-header">
        <h2 className="dialog-title" id="delete-project-title">Delete this project?</h2>
        <p className="dialog-description">Atlas and its 14 deployments are removed.</p>
      </header>
      <footer className="dialog-footer">
        <button type="button" className="btn" {...{ commandfor: 'delete-project', command: 'close' }}>Cancel</button>
        <button type="button" className="btn btn-primary" {...{ commandfor: 'delete-project', command: 'close' }}>Delete project</button>
      </footer>
    </Dialog>
  )
}

function PanelExample(props: Omit<PanelProps, 'title' | 'handleLabel'>) {
  return (
    <Panel id="layers" title="Layers" handleLabel="Move the Layers panel with the arrow keys" trigger={attributes => <button type="button" className="btn" {...attributes}>Layers</button>} {...props}>
      <p>Header, Hero image, Pricing table</p>
    </Panel>
  )
}

/** A sheet the reader swipes: the track holds the panel, and the handle moves it between half and full height. */
function DialogSheetExample(props: DialogProps) {
  return (
    <Dialog id="comments" className="dialog-sheet dialog-swipe dialog-detents" aria-labelledby="comments-title" trigger={attributes => <button type="button" className="btn" {...attributes}>Comments</button>} {...props}>
      <div className="dialog-panel">
        <button type="button" className="dialog-handle" aria-label="Sheet height"></button>
        <header className="dialog-header">
          <h2 className="dialog-title" id="comments-title">Comments</h2>
          <p className="dialog-description">Three people reviewed this deployment.</p>
        </header>
        <div className="dialog-body">
          <p>Ada: the build on main is green again.</p>
        </div>
      </div>
    </Dialog>
  )
}

function PopoverExample(props: PopoverProps) {
  return (
    <Popover trigger={attributes => <button type="button" className="btn" {...attributes}>Share</button>} {...props}>
      <p>Anyone with the link can view the latest deployment.</p>
    </Popover>
  )
}

function ColorPickerPopoverExample(props: ColorPickerProps) {
  return (
    <ColorPicker
      trigger={attributes => <button type="button" className="btn" {...attributes}><span className="swatch swatch-sm color-picker-swatch" />Accent</button>}
      {...props}
    />
  )
}

function TooltipExample() {
  return <Tooltip trigger={attributes => <button type="button" className="btn" {...attributes}>Deploy</button>}>Ships the main branch to production</Tooltip>
}

function FieldExample(props: Omit<FieldProps, 'children'>) {
  return <Field {...props}>{control => <input className="input" type="email" {...control} />}</Field>
}

export const fixtures = {
  'calendar': Calendar,
  'color-picker': ColorPicker,
  'color-picker-popover': ColorPickerPopoverExample,
  'combobox': Combobox,
  'command': Command,
  'compare': CompareExample,
  'context-menu': ContextMenuExample,
  'dial': Dial,
  'dialog': DialogExample,
  'editable': Editable,
  'dialog-sheet': DialogSheetExample,
  'field': FieldExample,
  'gantt': Gantt,
  'listbox': Listbox,
  'menu': MenuExample,
  'otp': Otp,
  'panel': PanelExample,
  'popover': PopoverExample,
  'signature': Signature,
  'sortable': SortableExample,
  'splitter': SplitterExample,
  'stepper': Stepper,
  'tabs': Tabs,
  'tags': Tags,
  'toast': Toaster,
  'toolbar': ToolbarExample,
  'tooltip': TooltipExample,
  'tour': TourExample,
  'tree': Tree,
  'wheel': Wheel,
} as unknown as Record<string, ComponentType<Record<string, unknown>>>

export { toast }
