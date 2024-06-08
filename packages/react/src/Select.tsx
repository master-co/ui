import type { SelectHTMLAttributes } from 'react'
import type { selectSizes } from '@master/ui'
import clsx from 'clsx'

type SelectProps = {
    outlined?: boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    size?: (keyof typeof selectSizes) | string
} & SelectHTMLAttributes<HTMLSelectElement>

const Select = ({
    className,
    size = 'md',
    outlined = true,
    ...props
}: SelectProps) => {
    {/* 考慮將顏色主題變數搬移至 CSS */ }
    {/* TODO 看是否改為 CSS background images */ }
    return (
        <label className={clsx(
            'select',
            size && `select-${size}`, className,
            outlined && 'select-outlined'
        )}>
            <select {...props} className="select-control" />
            <svg className="select-indicator" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" />
                <path d="M8 9l4 -4l4 4" /><path d="M16 15l-4 4l-4 -4" />
            </svg>
        </label>
    )
}

export default Select