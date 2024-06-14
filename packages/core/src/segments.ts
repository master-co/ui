import type { Config } from '@master/css'

export const segmentsSizes = {
    sm: 'p:1 r:4 h:24 {font:12;px:10;r:4}_.segment',
    md: 'p:5 r:6 h:32 {font:12;px:10;r:2}_.segment',
    lg: 'p:5 r:6 h:40 {font:14;px:12;r:2}_.segment'
}

export default {
    styles: {
        segments: {
            '': 'flex bg:canvas gap:2 w:fit',
            ...segmentsSizes
        },
        segment: {
            '': 'center-content flex font:medium gap:6 white-space:nowrap {bg:surface;s:01;outline:1|line-lightest;fg:strong}.active',
            icon: 'fg:lighter size:1em mx:-2'
        }
    }
} as Config