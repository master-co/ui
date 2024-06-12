import type { Config } from '@master/css'

export const buttonSizes = {
    xs: 'font:12 h:6x px:2x r:4:where(*)',
    sm: 'font:12 h:8x px:3x r:6:where(*)',
    md: 'font:14 h:10x px:4x r:6:where(*)',
    lg: 'font:16 h:12x px:5x r:8:where(*)',
    xl: 'font:18 h:14x px:6x r:10:where(*)',
}

export const buttonColors = {
    primary: 'primary touch-primary'
}

export default {
    styles: {
        btn: {
            '': 'center-content inline-flex font:semibold outline-offset:-1 user-select:none {bg:transparent;fg:lightest;outline:0;cursor:not-allowed}:disabled:not(.loading) {cursor:wait;text:transparent}.loading',
            loading: 'size:1.125em abs',
            ...buttonSizes,
            ...buttonColors,
        }
    }
} as Config