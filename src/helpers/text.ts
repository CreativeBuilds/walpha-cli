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

function spacedText(text: string, totalLength: number = 40) {
    const textLength = text.length
    const dashesEachSide = Math.max(3, Math.floor((totalLength - textLength - 2) / 2))
    const leftDashes = '-'.repeat(dashesEachSide)
    const rightDashes = '-'.repeat(totalLength - textLength - dashesEachSide - 2)
    console.log(`${leftDashes} ${text} ${rightDashes}`)
}

export { withLoadingText, spacedText }