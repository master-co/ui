import { SVGProps } from 'react'

const Spinner = (props: SVGProps<SVGSVGElement>) => {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path className="@fade|1s|ease-out|reverse|infinite|-.875s" d="M7.75 7.75l-2.15 -2.15"></path>
            <path className="@fade|1s|ease-out|reverse|infinite|-.75s" d="M12 6l0 -3"></path>
            <path className="@fade|1s|ease-out|reverse|infinite|-.625s" d="M16.25 7.75l2.15 -2.15"></path>
            <path className="@fade|1s|ease-out|reverse|infinite|-.5s" d="M18 12l3 0"></path>
            <path className="@fade|1s|ease-out|reverse|infinite|-.375s" d="M16.25 16.25l2.15 2.15"></path>
            <path className="@fade|1s|ease-out|reverse|infinite|-.25s" d="M12 18l0 3"></path>
            <path className="@fade|1s|ease-out|reverse|infinite|-.125s" d="M7.75 16.25l-2.15 2.15"></path>
            <path className="@fade|1s|ease-out|reverse|infinite" d="M6 12l-3 0"></path>
        </svg>
    )
}

export default Spinner