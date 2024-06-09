import define from 'internal/utils/metadata'

const metadata = define({
    title: 'Tab View',
    description: 'A tab view presents multiple mutually exclusive content panes in the same context area, which users can switch between.',
    category: 'View Organizing',
    openGraph: {
        images: new URL('~/site/public/images/components/select.jpg', import.meta.url).toString()
    },
    filename: import.meta.url
})

export default metadata