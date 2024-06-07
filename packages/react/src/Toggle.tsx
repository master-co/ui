import type { InputHTMLAttributes } from 'react'
import type { toggleSizes, toggleColors } from '@master/ui'
import clsx from 'clsx'

type ToggleProps = {
    disabled?: boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    size?: (keyof typeof toggleSizes) | string
    // eslint-disable-next-line @typescript-eslint/ban-types
    color?: (keyof typeof toggleColors) | string
} & InputHTMLAttributes<HTMLInputElement>

const Toggle = ({
    className,
    size = 'md',
    color = 'primary',
    ...props
}: ToggleProps) => {
    return (
        <label className={clsx(
            'toggle',
            size && `toggle-${size}`,
            color && `toggle-${color}`,
            className
        )}>
            <input {...props} type="checkbox" />
            <svg className="toggle-body">
                <rect className="toggle-button" />
            </svg>
        </label>
    )
}

export default Toggle