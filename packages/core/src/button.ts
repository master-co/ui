import type { Config } from '@master/css'

export const styles = {
    btn: {
        '': 'center-content inline-flex font:semibold outline-offset:-1 user-select:none',
        // sizes
        xs: 'font:12 h:6x px:2x px:3x.rounded p:0:where(.round,square) r:4',
        sm: 'font:12 h:8x px:3x px:4x.rounded p:0:where(.round,square) r:6',
        md: 'font:14 h:10x px:4x px:5x.rounded p:0:where(.round,square) r:6',
        lg: 'font:16 h:12x px:5x px:6x.rounded p:0:where(.round,square) r:8',
        xl: 'font:18 h:14x px:6x px:7x.rounded p:0:where(.round,square) r:10',
        // colors
        primary: 'primary touch-primary'
    }
}

export default {
    styles
} as Config