import Content from './content'

export default function Page() {
    return (
        <div className="app-demo gap:8x flex:col@<2xs">
            <div className='w:full'>
                <Content />
            </div>
        </div>
    )
}