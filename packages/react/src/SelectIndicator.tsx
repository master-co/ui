import clsx from 'clsx'
import type { SVGProps } from 'react'

const SelectIndicator = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={clsx('select-indicator right:.25em', className)} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1.5em" height="1.5em" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path stroke="none" d="M0 0h24v24H0z" />
        <path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" />
    </svg>
)

export default SelectIndicator