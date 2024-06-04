import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Checkbox',
    description: 'Carefully crafted checkbox components, including a variety of different sizes and styles.',
    category: 'Element',
    openGraph: {
        images: new URL('~/site/public/images/components/checkbox.jpg', import.meta.url).toString()
    },
    filename: import.meta.url
})

export default metadata