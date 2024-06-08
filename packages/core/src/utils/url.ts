export default function url(target: string) {
    if (target.startsWith('<svg')) {
        return 'url(\'data:image/svg+xml,' + encodeURIComponent(target) + '\')'
    } else {
        return 'url(' + target + ')'
    }
}