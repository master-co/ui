import type { Config } from '@master/css'

export const BADGE_SIZES = {
    xs: 'font:10 h:16 min-w:16 px:4 r:4:where(*)',
    sm: 'font:12 h:20 min-w:20 px:6 r:5:where(*)',
    md: 'font:12 h:24 min-w:24 px:8 r:6:where(*)',
    lg: 'font:14 h:28 min-w:28 px:8 r:6:where(*)',
    xl: 'font:16 h:32 min-w:32 px:10 r:6:where(*)',
} as const

export const BADGE_COLORS = {
    primary: 'strong-primary',
    gray: 'strong-gray',
    slate: 'strong-slate',
    brown: 'strong-brown',
    orange: 'strong-orange',
    amber: 'strong-amber',
    yellow: 'strong-yellow',
    lime: 'strong-lime',
    green: 'strong-green',
    teal: 'strong-teal',
    cyan: 'strong-cyan',
    sky: 'strong-sky',
    blue: 'strong-blue',
    indigo: 'strong-indigo',
    violet: 'strong-violet',
    purple: 'strong-purple',
    fuchsia: 'strong-fuchsia',
    pink: 'strong-pink',
    crimson: 'strong-crimson',
    red: 'strong-red',
} as const

export default {
    styles: {
        badge: {
            '': 'inline-flex justify-content:center align-items:center font:medium outline-offset:-1 leading:normal',
            ...BADGE_SIZES,
            ...BADGE_COLORS
        }
    }
} as Config