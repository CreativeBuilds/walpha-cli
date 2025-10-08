import fs from 'fs'
import inquirer from 'inquirer'
import { isFileEncrypted, loadEncryptedKey, decryptPrivateKey } from '../helpers/encryption'
import { promptPassword } from '../helpers/password'

const PRIVATE_KEY_FILE = 'private-key.txt'
const MAX_PASSWORD_ATTEMPTS = 3

export async function unlockCommand() {
    // Check if wallet file exists
    if (!fs.existsSync(PRIVATE_KEY_FILE)) {
        console.error(`Error: Wallet file not found at ${PRIVATE_KEY_FILE}`)
        console.error('Please create a wallet first.')
        process.exit(1)
    }

    let privateKey: string

    try {
        // Check if the file is encrypted
        const isEncrypted = isFileEncrypted(PRIVATE_KEY_FILE)

        if (isEncrypted) {
            // Load encrypted data
            const encryptedData = loadEncryptedKey(PRIVATE_KEY_FILE)
            if (!encryptedData) {
                console.error('Error: Failed to load encrypted wallet data')
                process.exit(1)
            }

            // Prompt for password with retry logic
            let attempts = 0
            let decrypted = false

            while (attempts < MAX_PASSWORD_ATTEMPTS && !decrypted) {
                attempts++
                try {
                    const password = await promptPassword(
                        attempts === 1
                            ? 'Enter wallet password:'
                            : `Enter wallet password (attempt ${attempts}/${MAX_PASSWORD_ATTEMPTS}):`
                    )

                    privateKey = await decryptPrivateKey(encryptedData, password)
                    decrypted = true
                } catch (error) {
                    if (attempts < MAX_PASSWORD_ATTEMPTS) {
                        console.error('\nIncorrect password. Please try again.\n')
                    } else {
                        console.error('\nMaximum password attempts reached. Exiting.')
                        process.exit(1)
                    }
                }
            }
        } else {
            // Read plaintext file
            privateKey = fs.readFileSync(PRIVATE_KEY_FILE, 'utf8').trim()
        }

        // Display security warning
        console.log('\n⚠️  SECURITY WARNING ⚠️')
        console.log('━'.repeat(60))
        console.log('You are about to display your private key or seed phrase.')
        console.log('Anyone with access to this information can control your wallet')
        console.log('and steal your funds.')
        console.log('')
        console.log('Please ensure:')
        console.log('  • No one is looking at your screen')
        console.log('  • You are not sharing your screen')
        console.log('  • You are in a secure location')
        console.log('━'.repeat(60))
        console.log('')

        // Prompt for confirmation
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Do you want to proceed and display your private key?',
                default: false
            }
        ])

        if (!confirm) {
            console.log('Operation cancelled.')
            process.exit(0)
        }

        // Display the private key
        console.log('\n' + '═'.repeat(60))
        console.log('PRIVATE KEY / SEED PHRASE:')
        console.log('═'.repeat(60))
        console.log(privateKey!)
        console.log('═'.repeat(60))
        console.log('')
        console.log('💡 Tip: Clear your terminal history after copying this key:')
        console.log('   history -c && history -w    (Linux/macOS)')
        console.log('   Clear-History               (PowerShell)')
        console.log('')

        process.exit(0)
    } catch (error) {
        console.error('Error unlocking wallet:', error instanceof Error ? error.message : error)
        process.exit(1)
    }
}
