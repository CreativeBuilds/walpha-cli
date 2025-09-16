import { initWallet, generateNewWallet } from "../wallet";

async function balanceCommand() {
    // balance logic placeholder
    let [wallet, errorCode] = initWallet()
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
            console.error('Error generating new wallet')
            process.exit(1)
        }
    }
    console.log('Wallet address:', wallet?.address)
    console.log('TAO address:', wallet?.h160toss58())
    console.warn('Balance command is not implemented yet.')

}

export { balanceCommand }