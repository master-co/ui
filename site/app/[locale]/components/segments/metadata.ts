import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Segments',
    description: 'A set of segment controls, each of which functions as a button.',
    category: 'Control',
    openGraph: {
        images: [
            new URL('~/site/public/images/components/segments.jpg', import.meta.url).toString(),
            new URL('~/site/public/images/components/segments@dark.jpg', import.meta.url).toString()
        ]
    },
    filename: import.meta.url
})

export default metadata