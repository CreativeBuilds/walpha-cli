import { withLoadingText } from "../helpers/loadingText";
import { allowedNetuids } from "../helpers/netuids";
import { getErc20BalancesWithDelay } from "../helpers/balances";
import { Provider } from "../provider";
import { initWallet, generateNewWallet, ethers } from "../wallet";

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
    let provider = new Provider('tao')
    console.log('Wallet address:', wallet?.address)
    console.log('TAO address:', wallet?.h160toss58())

    const balance = await withLoadingText('Fetching balance...', () => wallet!.getBalance(provider))
    if (balance !== undefined) console.log('TAO Balance:', ethers.formatEther(balance))
    if (balance === 0n) {
        console.log(`Your balance is empty! Use your TAO address to send TAO and load your EVM address with funds`)
        // return;
    } else if (balance < BigInt(1e16)) {
        console.log(`Your balance is low on funds use your TAO address to send TAO and load your EVM address with funds`)
    }
    console.log('\n--------------------------------\n')

    const erc20Addresses = Object.values(allowedNetuids)
    const rpcProvider = await provider.get()

    const erc20Balances = await getErc20BalancesWithDelay(erc20Addresses, wallet!.address, 350, rpcProvider)

    erc20Balances.sort((a, b) => b.balance - a.balance).forEach(({ symbol, balance, decimals }: { symbol: string, balance: bigint, decimals: number }) => {
        if (balance >= 0n) console.log(`${symbol} Balance:`, ethers.formatUnits(balance, decimals))
    })
}

export { balanceCommand }