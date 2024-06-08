import type { Config } from '@master/css'

export const buttonSizes = {
    xs: 'font:12 h:6x px:2x px:3x.rounded r:4:where(*)',
    sm: 'font:12 h:8x px:3x px:4x.rounded r:6:where(*)',
    md: 'font:14 h:10x px:4x px:5x.rounded r:6:where(*)',
    lg: 'font:16 h:12x px:5x px:6x.rounded r:8:where(*)',
    xl: 'font:18 h:14x px:6x px:7x.rounded r:10:where(*)',
}

export const buttonColors = {
    primary: 'primary touch-primary'
}

export default {
    styles: {
        btn: {
            '': 'center-content inline-flex font:semibold outline-offset:-1 user-select:none square.round px:0:where(.round,square) {bg:transparent;fg:lightest;outline:0;cursor:not-allowed}:disabled',
            ...buttonSizes,
            ...buttonColors,
        }
    }
} as Config