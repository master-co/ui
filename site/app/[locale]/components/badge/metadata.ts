import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Badge',
    description: 'A badge displays notifications, status updates, or item counts, enhancing user awareness.',
    category: 'Status Indicators',
    openGraph: {
        images: [
            new URL('~/site/public/images/components/badge.jpg', import.meta.url).toString(),
            new URL('~/site/public/images/components/badge@dark.jpg', import.meta.url).toString()
        ]
    },
    filename: import.meta.url
})

export default metadata