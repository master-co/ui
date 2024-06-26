import type { Config } from '@master/css'

export default {
    styles: {
        tabs: {
            '': 'flex font:14 gap:8x h:48',
            underlined: '{bb:2|transparent;pt:1;mb:-1}_.tab {fg:accent;bb:accent}_.tab.active bb:1|lightest bb:text-lightest_.tab:not(.active):hover',
        },
        tab: {
            '': 'flex align-items:center fg:strong font:medium justify-content:center user-select:none white-space:nowrap',
            icon: 'fg:lighter mx:-2 size:1em'
        }
    }
} as Config