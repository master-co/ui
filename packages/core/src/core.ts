import { type Config } from '@master/css'

// extends
import button from './button'
import toggle from './toggle'
import segments from './segments'
import select from './select'
import tabs from './tabs'
import badge from './badge'

// styles
import strong from './styles/strong'

const ui = {
    extends: [
        button,
        toggle,
        segments,
        select,
        tabs,
        badge
    ],
    styles: {
        strong
    }
} as Config

export default ui