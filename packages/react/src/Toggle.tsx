import type { FC, InputHTMLAttributes } from 'react'
import type { TOGGLE_SIZES, TOGGLE_COLORS } from '@master/ui'
import clsx from 'clsx'

type ToggleProps = {
    disabled?: boolean
    size?: keyof typeof TOGGLE_SIZES | string
    color?: keyof typeof TOGGLE_COLORS | string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

const Toggle: FC<ToggleProps> = ({
    className,
    size = 'md',
    color = 'primary',
    ...props
}) => {
    return (
        <label className={clsx(
            'toggle',
            size && `toggle-${size}`,
            color && `toggle-${color}`,
            className
        )}>
            <input {...props} className="toggle-control" type="checkbox" />
            <svg className="toggle-body">
                <rect className="toggle-button" />
            </svg>
        </label>
    )
}

export default Toggle