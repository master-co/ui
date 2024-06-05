export default function Preview() {
    return (
        <>
            <label className="toggle toggle-md toggle-primary">
                <input className="toggle-input" type="checkbox" defaultChecked />
                <svg className="toggle-body">
                    <rect className="toggle-button" x="2" y="2" rx="14" />
                </svg>
            </label>
            <label className="toggle toggle-md toggle-primary">
                <input className="toggle-input" type="checkbox" defaultChecked disabled />
                <svg className="toggle-body">
                    <rect className="toggle-button" x="2" y="2" rx="14" />
                </svg>
            </label>
        </>
    )
}