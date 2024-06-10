import { Badge } from '@master/ui.react'
import { IconShoppingCart } from '@tabler/icons-react'

export default () => <>
    <span className='rel'>
        <IconShoppingCart strokeWidth="1.2" />
        <Badge rounded size="xs" className='abs right top translate(25%,-25%)'>6</Badge>
    </span>
</>