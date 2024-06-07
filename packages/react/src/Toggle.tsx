import clsx from 'clsx'
import type { FC, InputHTMLAttributes } from 'react'

const Button: FC<InputHTMLAttributes<HTMLInputElement>> = ({ className, ...props }) => {
    return (
        <label className={clsx('toggle', className || 'toggle-md toggle-primary')}>
            <input {...props} type="checkbox" />
            <svg className="toggle-body">
                <rect className="toggle-button" />
            </svg>
        </label>
    )
}

export default Button