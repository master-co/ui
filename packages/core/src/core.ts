import { type Config, variables } from '@master/css'

// extends
import button from './button'
import toggle from './switch'
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
    variables: {
        primary: variables.indigo
    },
    styles: {
        strong
    }
} as Config

export default ui