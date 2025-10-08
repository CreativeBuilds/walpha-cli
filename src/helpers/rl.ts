import readline from 'readline'

/**
 * Creates a new readline interface instance.
 * Each caller should create, use, and close its own instance to avoid conflicts.
 *
 * @returns A new readline.Interface instance
 */
function createReadlineInterface(): readline.Interface {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
}

export { createReadlineInterface }