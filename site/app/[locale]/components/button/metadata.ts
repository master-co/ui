import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Button',
    description: 'Beautiful button components crafted with care in every size, color and shape.',
    category: 'Element',
    openGraph: {
        images: new URL('~/site/public/images/components/button.jpg', import.meta.url).toString()
    },
    filename: import.meta.url
})

export default metadata