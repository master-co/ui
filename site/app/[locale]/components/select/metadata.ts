import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Select',
    description: 'Beautiful select components crafted with care in every size, color and interaction.',
    category: 'Control',
    openGraph: {
        images: [
            new URL('~/site/public/images/components/select.jpg', import.meta.url).toString(),
            new URL('~/site/public/images/components/select@dark.jpg', import.meta.url).toString()
        ]
    },
    filename: import.meta.url
})

export default metadata