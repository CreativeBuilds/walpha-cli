import { withLoadingText, spacedText } from "../helpers/text";
import { allowedNetuids } from "../helpers/netuids";
import { getErc20BalancesWithDelay } from "../helpers/balances";
import { Provider } from "../provider";
import { initWallet, generateNewWallet, ethers } from "../wallet";
import Table from "cli-table3";

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

    const tokenBalances: Record<string, Record<string, { balance: bigint, decimals: number }>> = {}
    
    const checkNetworkBalances = async (network: string, address: string, tokenSymbol: string) => {
        if (!address) return
        try {
            const provider = new Provider(network)
            const rpcProvider = await provider.get()
            const balances = await getErc20BalancesWithDelay([address], wallet!.address, 350, rpcProvider)
            if (balances.length > 0) {
                const { balance, decimals } = balances[0]
                if (!tokenBalances[tokenSymbol]) tokenBalances[tokenSymbol] = {}
                tokenBalances[tokenSymbol][network] = { balance, decimals }
            }
        } catch (error) {
            console.warn(`Failed to fetch ${network.toUpperCase()} balance for ${tokenSymbol}`)
        }
    }
    
    for (const netuid of Object.keys(allowedNetuids)) {
        const netuidData = allowedNetuids[netuid]
        const tokenSymbol = `wSN${netuid}`
        await checkNetworkBalances('tao', netuidData.tao, tokenSymbol)
        await checkNetworkBalances('eth', netuidData.eth, tokenSymbol)
    }

    spacedText("Wrapped Token Balances")
    
    if (Object.keys(tokenBalances).length === 0) {
        console.log("No wrapped token balances found")
        return
    }

    // Create table
    const networks = ['tao', 'eth']
    const table = new Table({
        head: ['Token', ...networks.map(n => n.toUpperCase())],
        style: { head: ['cyan'] }
    })

    // Add rows for each token
    Object.entries(tokenBalances).forEach(([token, balances]) => {
        const row = [token, ...networks.map(network => {
            const balance = balances[network]
            return balance ? ethers.formatUnits(balance.balance, balance.decimals) : '0.0'
        })]
        table.push(row)
    })

    console.log(table.toString())
}

export { balanceCommand }