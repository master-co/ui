'use client'

import { useLayoutEffect } from 'react'

export default function Layout({ children }: {
    children: JSX.Element
}) {
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
    return children
}