import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type TabProps = {
    active?: boolean
} & ButtonHTMLAttributes<HTMLAnchorElement>

const Tab = ({ className, active, ...props }: TabProps) => {
    return <a {...props} className={clsx('tab', className, active && 'active')} />
}

export default Tab