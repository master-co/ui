import { Badge } from '@master/ui.react'
import { IconBell } from '@tabler/icons-react'

export default () => <>
    <span className='rel'>
        <IconBell strokeWidth="1.2" />
        <Badge rounded size="xs" color="red" className='abs right top translate(25%,-25%)'>6</Badge>
    </span>
</>