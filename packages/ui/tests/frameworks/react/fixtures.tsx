import { useRef, type ComponentType } from 'react'
import { Avatar } from '../../../frameworks/react/avatar.tsx'
import { Calendar } from '../../../frameworks/react/calendar.tsx'
import { Carousel, type CarouselProps } from '../../../frameworks/react/carousel.tsx'
import { Combobox } from '../../../frameworks/react/combobox.tsx'
import { Editable } from '../../../frameworks/react/editable.tsx'
import { Command } from '../../../frameworks/react/command.tsx'
import { Compare } from '../../../frameworks/react/compare.tsx'
import { Dialog } from '../../../frameworks/react/dialog.tsx'
import { Field } from '../../../frameworks/react/field.tsx'
import { Listbox } from '../../../frameworks/react/listbox.tsx'
import { Menu, type MenuProps } from '../../../frameworks/react/menu.tsx'
import { Otp } from '../../../frameworks/react/otp.tsx'
import { Schedule } from '../../../frameworks/react/schedule.tsx'
import { Popover, type PopoverProps } from '../../../frameworks/react/popover.tsx'
import { Sortable, type SortableProps } from '../../../frameworks/react/sortable.tsx'
import { Splitter, type SplitterProps } from '../../../frameworks/react/splitter.tsx'
import { Stepper } from '../../../frameworks/react/stepper.tsx'
import { Tabs } from '../../../frameworks/react/tabs.tsx'
import { Tags } from '../../../frameworks/react/tags.tsx'
import { toast, Toaster } from '../../../frameworks/react/toast.tsx'
import { Toolbar, type ToolbarProps } from '../../../frameworks/react/toolbar.tsx'
import { Tooltip } from '../../../frameworks/react/tooltip.tsx'
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

const projects = [
  { value: 'atlas', name: 'Atlas', line: 'A map of every deployment, live.' },
  { value: 'borealis', name: 'Borealis', line: 'Edge functions close to the reader.' },
  { value: 'cirrus', name: 'Cirrus', line: 'Storage that follows the project.' },
]

function CarouselExample(props: Omit<CarouselProps<typeof projects[number]>, 'items' | 'children' | 'label'>) {
  return (
    <Carousel label="Featured projects" slideClassName="card" items={projects} {...props}>
      {project => (
        <>
          <h3 className="card-title">{project.name}</h3>
          <p className="card-description">{project.line}</p>
        </>
      )}
    </Carousel>
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

function PopoverExample(props: PopoverProps) {
  return (
    <Popover trigger={attributes => <button type="button" className="btn" {...attributes}>Share</button>} {...props}>
      <p>Anyone with the link can view the latest deployment.</p>
    </Popover>
  )
}

function TooltipExample() {
  return <Tooltip trigger={attributes => <button type="button" className="btn" {...attributes}>Deploy</button>}>Ships the main branch to production</Tooltip>
}

function FieldExample(props: Omit<FieldProps, 'children'>) {
  return <Field {...props}>{control => <input className="input" type="email" {...control} />}</Field>
}

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
} as unknown as Record<string, ComponentType<Record<string, unknown>>>

export { toast }
