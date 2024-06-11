import type { Config } from '@master/css'

export default {
    styles: {
        tabs: {
            '': 'flex gap:8x h:48 font:14',
            underlined: 'bb:1|solid|line-lightest {bb:2|transparent;pt:1;mb:-1}_.tab bb:text-lightest_.tab:not(.active):hover {fg:accent;bb:accent}_.tab.active',
        },
        tab: {
            '': 'flex center-content user-select:none font:medium white-space:nowrap fg:strong',
            icon: 'fg:lighter size:1em mx:-2'
        }
    }
} as Config