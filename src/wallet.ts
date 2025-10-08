import { ethers } from 'ethers'
import fs from 'fs'
import { convertH160ToSS58 } from './helpers/h160toss58'
import { createReadlineInterface } from './helpers/rl'
import { Provider } from './provider'
import {
    isFileEncrypted,
    loadEncryptedKey,
    decryptPrivateKey,
    encryptPrivateKey,
    saveEncryptedKey,
    shouldPromptForEncryption,
    markEncryptionDeclined,
    clearEncryptionReminder
} from './helpers/encryption'
import { promptPassword, promptPasswordWithValidation } from './helpers/password'
import inquirer from 'inquirer'

class Wallet {
    private key: string
    public address: string

    constructor(keyOrPhrase: string) {
        this.key = keyOrPhrase
        try {
            this.address = keyOrPhrase.startsWith('0x')
                ? new ethers.Wallet(keyOrPhrase).address
                : ethers.Wallet.fromPhrase(keyOrPhrase).address
        } catch (error) {
            console.error('Error creating wallet:', error)
            console.warn('Please check your key or phrase within private-key.txt')
            process.exit(1)
        }
    }

    // take a generate wallet and create signer based of json rpc provider
    public async getSigner(provider: Provider) {
        let _provider = await provider.get()
        return new ethers.Wallet(this.key, _provider)
    }

    public h160toss58() {
        return convertH160ToSS58(this.address)
    }

    public async getBalance(provider: Provider) {
        let _provider = await provider.get()
        return _provider.getBalance(this.address)
    }
}

async function initWallet(): Promise<[Wallet, null] | [null, number]> {
    let [wallet, errorCode] = await (async () => {
        if (!fs.existsSync('private-key.txt')) return [null, 1]

        // Check if file is encrypted
        if (isFileEncrypted('private-key.txt')) {
            const encryptedData = loadEncryptedKey('private-key.txt')
            if (!encryptedData) {
                console.error('Failed to load encrypted wallet file')
                return [null, 3]
            }

            // Prompt for password with retry logic (max 3 attempts)
            let attempts = 0
            const maxAttempts = 3

            while (attempts < maxAttempts) {
                try {
                    const password = await promptPassword('Enter wallet password:')
                    const keyOrPhrase = await decryptPrivateKey(encryptedData, password)
                    return [new Wallet(keyOrPhrase), null]
                } catch (error) {
                    attempts++
                    if (attempts < maxAttempts) {
                        console.log(`\nWrong password. ${maxAttempts - attempts} attempts remaining.\n`)
                    } else {
                        console.error('\nMaximum password attempts reached. Access denied.')
                        return [null, 4]
                    }
                }
            }
            return [null, 4]
        }

        // Handle plaintext file - offer migration to encrypted format
        const keyOrPhrase = fs.readFileSync('private-key.txt', 'utf8')
        if (!keyOrPhrase) {
            return [null, 2]
        }

        try {
            const wallet = new Wallet(keyOrPhrase)

            // Check if we should prompt for encryption (based on 24h reminder)
            if (shouldPromptForEncryption()) {
                // Prompt user to encrypt their plaintext wallet
                console.log('\n⚠️  Your wallet is not encrypted. It is highly recommended to encrypt it for security.')
                const { shouldEncrypt } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'shouldEncrypt',
                        message: 'Would you like to encrypt your wallet now?',
                        default: true
                    }
                ])

                if (shouldEncrypt) {
                    console.log('\nLet\'s set up encryption for your wallet.')
                    console.log('Password requirements:')
                    console.log('  - At least 8 characters')
                    console.log('  - At least one uppercase letter')
                    console.log('  - At least one lowercase letter')
                    console.log('  - At least one number\n')

                    try {
                        const password = await promptPasswordWithValidation(
                            'Set a password to encrypt your wallet:'
                        )

                        // Backup plaintext file
                        const backupPath = 'private-key.txt.backup.plaintext'
                        fs.copyFileSync('private-key.txt', backupPath)

                        // Encrypt and save
                        const encryptedData = await encryptPrivateKey(keyOrPhrase, password)
                        saveEncryptedKey('private-key.txt', encryptedData)

                        // Clear reminder file after successful encryption
                        clearEncryptionReminder()

                        console.log('\n✓ Wallet encrypted successfully!')
                        console.log(`✓ Backup saved to ${backupPath}`)
                        console.log('✓ You will need this password to access your wallet in the future.\n')
                    } catch (error) {
                        console.error('\nFailed to encrypt wallet:', error)
                        console.log('Continuing with unencrypted wallet...\n')
                    }
                } else {
                    // User declined - mark it and show reminder message
                    markEncryptionDeclined()
                }
            }

            return [wallet, null]
        } catch (error) {
            return [null, 3]
        }
    })()

    if (errorCode) {
        switch (errorCode) {
            case 1:
                console.log('No private key found, would you like to create a new one? (y/n)')
                break;
            case 2:
                console.error('Private key not found in private-key.txt, please create it and add your private key or passphrase for an EVM compatible wallet')
                break;
            case 3:
                console.error('Error initializing wallet')
                break;
            case 4:
                console.error('Failed to decrypt wallet')
                return [null, errorCode]
        }
        [wallet, errorCode] = await generateNewWallet()
        if (errorCode) {
            return [null, errorCode]
        }
        return [wallet!, null]
    }
    return [wallet!, null]
}

async function generateNewWallet(): Promise<[Wallet, null] | [null, number]> {
    let wallet: Wallet | null = null
    const rl = createReadlineInterface()

    try {
        const answer = await new Promise<string>((resolve) => rl.question('', resolve))
        if (answer === 'y') {
            console.log('Enter your private key or passphrase for an EVM compatible wallet or leave blank to generate a new one:')
            const privateKey = await new Promise<string>((resolve) => rl.question('', resolve))
            let keyOrPhrase = ''

            if (privateKey && privateKey.length > 0) {
                let isValid = false
                try {
                    // Try to create a Wallet instance to validate the key/phrase
                    let testWallet = new Wallet(privateKey)
                    isValid = !!testWallet.address
                } catch (e) {
                    isValid = false
                }
                if (!isValid) {
                    console.error('Invalid private key or passphrase. Please try again.')
                    rl.close()
                    return generateNewWallet()
                }
                keyOrPhrase = privateKey
                wallet = new Wallet(privateKey)
                console.log('Successfully created new wallet')
            } else {
                const newWallet = ethers.Wallet.createRandom()
                keyOrPhrase = newWallet.mnemonic?.phrase || ''
                wallet = new Wallet(keyOrPhrase)
                console.log('New seed phrase generated')
            }

            // Check if we should prompt for encryption (based on 24h reminder)
            if (shouldPromptForEncryption()) {
                // Prompt for encryption
                console.log('\nTo protect your wallet, it is highly recommended to encrypt it with a password.')
                const { shouldEncrypt } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'shouldEncrypt',
                        message: 'Would you like to encrypt your wallet?',
                        default: true
                    }
                ])

                if (shouldEncrypt) {
                    console.log('\nPassword requirements:')
                    console.log('  - At least 8 characters')
                    console.log('  - At least one uppercase letter')
                    console.log('  - At least one lowercase letter')
                    console.log('  - At least one number\n')

                    try {
                        const password = await promptPasswordWithValidation(
                            'Set a password to encrypt your wallet:'
                        )

                        // Encrypt and save
                        const encryptedData = await encryptPrivateKey(keyOrPhrase, password)
                        saveEncryptedKey('private-key.txt', encryptedData)

                        // Clear reminder file after successful encryption
                        clearEncryptionReminder()

                        console.log('\n✓ Wallet encrypted and saved to private-key.txt')
                        console.log('✓ Keep your password safe - it cannot be recovered if lost!')
                    } catch (error) {
                        console.error('\nFailed to encrypt wallet:', error)
                        console.log('Saving wallet without encryption...')
                        fs.writeFileSync('private-key.txt', keyOrPhrase)
                    }
                } else {
                    // Save without encryption
                    fs.writeFileSync('private-key.txt', keyOrPhrase)
                    console.log('\n⚠️  Wallet saved without encryption to private-key.txt')
                    // User declined - mark it and show reminder message
                    markEncryptionDeclined()
                }
            } else {
                // Less than 24h have passed, skip encryption prompt and save plaintext
                fs.writeFileSync('private-key.txt', keyOrPhrase)
                console.log('\n⚠️  Wallet saved without encryption to private-key.txt')
            }

            console.log('Continuing...')
        } else {
            console.log('No private key found, please create it and add your private key or passphrase for an EVM compatible wallet')
            rl.close()
            return [null, 1]
        }

        rl.close()
        return [wallet, null]
    } catch (error) {
        rl.close()
        throw error
    }
}

export { ethers, Wallet, initWallet, generateNewWallet }