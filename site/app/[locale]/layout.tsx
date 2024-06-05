import RootLayout, { Body } from 'internal/layouts/root'
import i18n from 'internal/common/i18n.config.mjs'
import { importTranslations } from 'internal/utils/i18n'
import app from '~/site/app'
import redirects from '~/site/redirects.mjs'
import cssConfig from '~/site/master.css'
import Image from 'next/image'

export default function Layout({ children, params }: {
    children: JSX.Element,
    params: { locale: typeof i18n.locales[number] }
}) {
    return (
        <RootLayout
            app={app}
            cssConfig={cssConfig}
            locale={params.locale}
            translations={importTranslations(params.locale)}
            redirects={redirects}
        >
            <Body className="bg:base">
                {children}
            </Body>
        </RootLayout>
    )
}

if (process.env.NODE_ENV === 'development') {
    require('~/site/master.css')
}
