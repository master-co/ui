import type { HTMLAttributes } from 'react'
import clsx from 'clsx'

type TabsProps = {
    underlined?: boolean
} & HTMLAttributes<HTMLDivElement>

const Tabs = ({ className, underlined, ...props }: TabsProps) => {
    return <div {...props} className={clsx(
        'tabs',
        underlined && 'tabs-underlined',
        className
    )} />
}

export default Tabs