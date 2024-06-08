import { Select, SelectChevronIndicator } from '@master/ui.react'

export default () => <>
    <Select outlined indicator={<SelectChevronIndicator />} size="sm" >
        <option>Banana</option>
        <option>Apple</option>
        <option>Orange</option>
    </Select>
    <Select outlined indicator={<SelectChevronIndicator />}>
        <option>Banana</option>
        <option>Apple</option>
        <option>Orange</option>
    </Select>
    <Select outlined indicator={<SelectChevronIndicator />} size="lg">
        <option>Banana</option>
        <option>Apple</option>
        <option>Orange</option>
    </Select>
</>