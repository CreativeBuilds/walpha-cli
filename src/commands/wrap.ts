import { withLoadingText, spacedText } from "../helpers/text";
import { allowedNetuids } from "../helpers/netuids";
import { getErc20BalancesWithDelay } from "../helpers/balances";
import { Provider } from "../provider";
import { initWallet, generateNewWallet, ethers } from "../wallet";

async function balanceCommand() {
    // balance logic placeholder
    let [wallet, errorCode] = await initWallet()
    if (errorCode) {
        process.exit(1)
    }
    
    let provider = new Provider('tao')
    spacedText("Wallet Info")
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
    
    const erc20Addresses = Object.values(allowedNetuids)
    const rpcProvider = await provider.get()
    const erc20Balances = await getErc20BalancesWithDelay(erc20Addresses, wallet!.address, 350, rpcProvider)
    
    spacedText(`Wrapped Token Balance${erc20Addresses.length > 1 ? 's' : ''}`)

    erc20Balances.sort((a, b) => b.balance - a.balance).forEach(({ symbol, balance, decimals }: { symbol: string, balance: bigint, decimals: number }) => {
        if (balance >= 0n) console.log(`${symbol} Balance:`, ethers.formatUnits(balance, decimals))
    })
}

export { balanceCommand }