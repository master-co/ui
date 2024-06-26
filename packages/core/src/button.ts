import type { Config } from '@master/css'

export const BUTTON_SIZES = {
    xs: 'font:12 h:6x px:2x r:4:where(*)',
    sm: 'font:12 h:8x px:3x r:6:where(*)',
    md: 'font:14 h:10x px:4x r:6:where(*)',
    lg: 'font:16 h:12x px:5x r:8:where(*)',
    xl: 'font:18 h:14x px:6x r:10:where(*)',
} as const

export const BUTTON_COLORS = {
    primary: 'strong-primary bg:primary-active:active:not(.loading)',
    gray: 'strong-gray bg:gray-active:active:not(.loading)',
    slate: 'strong-slate bg:slate-active:active:not(.loading)',
    brown: 'strong-brown bg:brown-active:active:not(.loading)',
    orange: 'strong-orange bg:orange-active:active:not(.loading)',
    amber: 'strong-amber bg:amber-active:active:not(.loading)',
    yellow: 'strong-yellow bg:yellow-active:active:not(.loading)',
    lime: 'strong-lime bg:lime-active:active:not(.loading)',
    green: 'strong-green bg:green-active:active:not(.loading)',
    teal: 'strong-teal bg:teal-active:active:not(.loading)',
    cyan: 'strong-cyan bg:cyan-active:active:not(.loading)',
    sky: 'strong-sky bg:sky-active:active:not(.loading)',
    blue: 'strong-blue bg:blue-active:active:not(.loading)',
    indigo: 'strong-indigo bg:indigo-active:active:not(.loading)',
    violet: 'strong-violet bg:violet-active:active:not(.loading)',
    purple: 'strong-purple bg:purple-active:active:not(.loading)',
    fuchsia: 'strong-fuchsia bg:fuchsia-active:active:not(.loading)',
    pink: 'strong-pink bg:pink-active:active:not(.loading)',
    crimson: 'strong-crimson bg:crimson-active:active:not(.loading)',
    red: 'strong-red bg:red-active:active:not(.loading)'
} as const

export default {
    styles: {
        btn: {
            '': 'inline-flex justify-content:center align-items:center font:semibold outline-offset:-1 user-select:none {bg:transparent;fg:lightest;outline:0;cursor:not-allowed}:disabled:not(.loading) {cursor:wait;text:transparent}.loading',
            loading: 'size:1.125em abs',
            ...BUTTON_SIZES,
            ...BUTTON_COLORS,
        }
    }
} as Config