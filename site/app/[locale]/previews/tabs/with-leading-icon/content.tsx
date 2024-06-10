import { Segment, Segments } from '@master/ui.react'
import { IconLayoutGrid, IconList } from '@tabler/icons-react'

export default () => <>
    <Segments size="sm">
        <Segment active>
            <IconLayoutGrid className='segment-icon' />
            Grid
        </Segment>
        <Segment>
            <IconList className='segment-icon' />
            List
        </Segment>
    </Segments>
    <Segments>
        <Segment active>
            <IconLayoutGrid className='segment-icon' />
            Grid
        </Segment>
        <Segment>
            <IconList className='segment-icon' />
            List
        </Segment>
    </Segments>
    <Segments size="lg">
        <Segment active>
            <IconLayoutGrid className='segment-icon' />
            Grid
        </Segment>
        <Segment>
            <IconList className='segment-icon' />
            List
        </Segment>
    </Segments>
</>