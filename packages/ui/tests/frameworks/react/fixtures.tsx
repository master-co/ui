import { useRef, type ComponentType } from 'react'
import { Calendar } from '../../../frameworks/react/calendar.tsx'
import { Combobox } from '../../../frameworks/react/combobox.tsx'
import { Command } from '../../../frameworks/react/command.tsx'
import { Compare } from '../../../frameworks/react/compare.tsx'
import { Dialog } from '../../../frameworks/react/dialog.tsx'
import { Field } from '../../../frameworks/react/field.tsx'
import { Listbox } from '../../../frameworks/react/listbox.tsx'
import { Menu, type MenuProps } from '../../../frameworks/react/menu.tsx'
import { Otp } from '../../../frameworks/react/otp.tsx'
import { Popover, type PopoverProps } from '../../../frameworks/react/popover.tsx'
import { Splitter, type SplitterProps } from '../../../frameworks/react/splitter.tsx'
import { Stepper } from '../../../frameworks/react/stepper.tsx'
import { Tabs } from '../../../frameworks/react/tabs.tsx'
import { toast, Toaster } from '../../../frameworks/react/toast.tsx'
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
} as unknown as Record<string, ComponentType<Record<string, unknown>>>

export { toast }
