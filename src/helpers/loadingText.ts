async function withLoadingText<T>(message: string, fn: () => Promise<T>): Promise<T> {
    let loading = true
    const loadingIcons = ['|', '/', '-', '\\']
    let iconIdx = 0
    process.stdout.write(message + ' ')
    const loadingInterval = setInterval(() => {
        if (!loading) return
        process.stdout.write('\x1b[1D' + loadingIcons[iconIdx])
        iconIdx = (iconIdx + 1) % loadingIcons.length
    }, 100)
    let result: T
    try {
        result = await fn()
    } finally {
        clearInterval(loadingInterval)
        loading = false
        process.stdout.write('\r\x1b[K')
    }
    return result
}

export { withLoadingText }