'use client'

import { useEffect, useLayoutEffect } from 'react'
import type ThemeMode from 'theme-mode'
import { useThemeMode } from '@master/theme-mode.react'

export default function Layout({ children }: {
    children: JSX.Element
}) {
    const themeMode = useThemeMode()
    useLayoutEffect(() => {
        const sendHeight = () => {
            const height = document.body.scrollHeight
            window.parent.postMessage({ event: 'master-ui-iframe-height-resize', height }, '*')
        }
        const resizeObserver = new ResizeObserver(sendHeight)
        resizeObserver.observe(document.body)
        return () => {
            resizeObserver.disconnect()
        }
    })

    useEffect(() => {
        if (window.parent) {
            const handleThemeModeChange = (e: any) => {
                const parentThemeMode = e.detail as ThemeMode
                if (parentThemeMode.value) {
                    themeMode.value = parentThemeMode.value
                }
            }
            window.parent.document.documentElement.addEventListener('themeModeChange', handleThemeModeChange)
            return () => {
                window.parent.document.documentElement.removeEventListener('themeModeChange', handleThemeModeChange)
            }
        }
    }, [themeMode])
    return children
}