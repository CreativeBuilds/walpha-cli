import { ethers } from 'ethers'
import fs from 'fs'
import { convertH160ToSS58 } from './helpers/h160toss58'
import { rl } from './helpers/rl'
import { Provider } from './provider'

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
        const keyOrPhrase = fs.readFileSync('private-key.txt', 'utf8')
        if (!keyOrPhrase) {
            return [null, 2]
        }
        try {
            return [new Wallet(keyOrPhrase), null]
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
    const answer = await new Promise<string>((resolve) => rl.question('', resolve))
    if (answer === 'y') {
        console.log('Enter your private key or passphrase for an EVM compatible wallet or leave blank to generate a new one:')
        const privateKey = await new Promise<string>((resolve) => rl.question('', resolve))
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
                return generateNewWallet()
            }
            fs.writeFileSync('private-key.txt', privateKey)
            wallet = new Wallet(privateKey)
            console.log('Successfully created new wallet, continuing...')
        } else {
            const newWallet = ethers.Wallet.createRandom()
            fs.writeFileSync('private-key.txt', newWallet.mnemonic?.phrase || '')
            wallet = new Wallet(newWallet.mnemonic?.phrase || '')
            console.log('New seed phrase generated and saved to private-key.txt')
        }
    } else {
        console.log('No private key found, please create it and add your private key or passphrase for an EVM compatible wallet')
        return [null, 1]
    }
    rl.close()
    return [wallet, null]
}

export { ethers, Wallet, initWallet, generateNewWallet }