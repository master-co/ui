import clsx from 'clsx'
import type { SVGProps } from 'react'

const SelectChevronIndicator = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
    <svg {...props} className={clsx('select-indicator right:.5em', className)} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9l6 6l6 -6"></path>
    </svg>
)

export default SelectChevronIndicator