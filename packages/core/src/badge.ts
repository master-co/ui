import type { Config } from '@master/css'

export const badgeSizes = {
    xs: 'font:10 h:16 min-w:16 px:4 r:4:where(*)',
    sm: 'font:12 h:20 min-w:20 px:6 r:5:where(*)',
    md: 'font:12 h:24 min-w:24 px:8 r:6:where(*)',
    lg: 'font:14 h:28 min-w:28 px:8 r:6:where(*)',
    xl: 'font:16 h:32 min-w:32 px:10 r:6:where(*)',
}

export const badgeColors = {
    primary: 'primary'
}

export default {
    styles: {
        badge: {
            '': 'inline-flex center-content font:medium outline-offset:-1 leading:normal',
            ...badgeSizes,
            ...badgeColors
        }
    }
} as Config