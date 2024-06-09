import { Segment, Segments } from '@master/ui.react'

export default () => <>
    <Segments size='sm'>
        <Segment active>Grid</Segment>
        <Segment>List</Segment>
    </Segments>
    <Segments>
        <Segment active>Grid</Segment>
        <Segment>List</Segment>
    </Segments>
    <Segments size='lg'>
        <Segment active>Grid</Segment>
        <Segment>List</Segment>
    </Segments>
</>