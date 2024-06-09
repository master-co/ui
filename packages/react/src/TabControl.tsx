'use client'

import { type ElementType, type ComponentPropsWithoutRef, useMemo } from 'react'
import clsx from 'clsx'
import { useTabView } from './TabView'

type TabControlProps<T extends ElementType> = {
    name: string
    as?: T
    disabled?: boolean
} & ComponentPropsWithoutRef<T>

export default function TabControl<T extends ElementType = 'button'>({ as, className, disabled, ...props }: TabControlProps<T>) {
    const tabView = useTabView()
    const Component = as || 'button'
    return <Component  {...props}
        className={clsx(!Component && 'tab', className, tabView.activeTab === props.name && 'active')}
        onClick={() => tabView.setActiveTab(props.name)}
        disabled={Component === 'button' ? disabled : undefined}
    />
}
