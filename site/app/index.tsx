'use client'

import type { App } from 'internal/contexts/app'
import { IconCompass, IconComponents, IconLayout } from '@tabler/icons-react'
import Logotype from 'internal/components/UILogotype'
import categories from './categories'

export default {
    navs: [
        { name: 'Guide', href: '/guide', Icon: IconCompass },
        { name: 'Components', href: '/components', Icon: IconComponents },
        { name: 'Layouts', href: '/layouts', Icon: IconLayout, disabled: true },
        // { name: 'Sections', href: '/sections', disabled: true },
        // { name: 'Templates', href: '/templates', disabled: true },
    ],
    categories,
    versions: [],
    Logotype
} as App