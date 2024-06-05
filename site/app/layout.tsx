import { Metadata } from 'next'

if (process.env.NODE_ENV === 'development') {
    require('~/site/master.css')
}

export { viewport } from 'internal/layouts/root'

export const metadata: Metadata = {
    title: {
        template: `%s - ${process.env.NEXT_PUBLIC_PROJECT}`,
        default: process.env.NEXT_PUBLIC_PROJECT as string
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_URL as string)
}

export default async function RootLayout({ children }: {
    children: JSX.Element
}) {
    return children
}
