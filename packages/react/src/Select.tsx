import type { SelectHTMLAttributes } from 'react'
import type { SELECT_SIZES } from '@master/ui'
import clsx from 'clsx'
import SelectIndicator from './SelectIndicator'

type SelectProps = {
    outlined?: boolean
    size?: keyof typeof SELECT_SIZES | string & object
    indicator?: JSX.Element
} & SelectHTMLAttributes<HTMLSelectElement>

const Select = ({
    className,
    size = 'md',
    outlined,
    indicator = <SelectIndicator />,
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
            {indicator}
        </label>
    )
}

export default Select