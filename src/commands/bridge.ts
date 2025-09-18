import { withLoadingText, spacedText } from "../helpers/text";
import { allowedNetuids } from "../helpers/netuids";
import { getErc20BalancesWithDelay } from "../helpers/balances";
import { Provider } from "../provider";
import { initWallet, ethers } from "../wallet";
import Table from "cli-table3";
import { rl } from "../helpers/rl";
import { wrapCommand } from "./wrap";
import { eids, isValidChain } from "../helpers/eids";
import { getContractAddress, loadWrapContract } from "../helpers/contract";
import { Chain } from "../helpers/contract";

interface LayerZeroStatus {
    name: string;
}

interface LayerZeroMessage {
    status?: LayerZeroStatus;
}

interface LayerZeroResponse {
    data?: LayerZeroMessage[];
}

async function bridgeCommand({ netuid, fromChain, toChain }: { netuid?: string, fromChain?: Chain, toChain?: Chain }) {
    // balance logic placeholder
    let [wallet, errorCode] = await initWallet()
    if (errorCode) {
        process.exit(1)
    }

    // prompt user for netuid if not provided
    if (!netuid) {
        const netuidOptions = Object.keys(allowedNetuids)
        console.log('Please select a subnet:')
        netuid = await getAnswer('Which subnet?', netuidOptions)
    }

    // prompt user for fromChain and toChain if not provided
    if (!fromChain) {
        let availableChains = Object.values(Chain)
        if (toChain && Object.values(Chain).includes(toChain)) availableChains = availableChains.filter(chain => chain !== toChain)
        fromChain = await getAnswer('Which chain are you bridging from?', availableChains) as Chain
    }

    console.log('')

    if (!toChain) {
        const availableChains = Object.values(Chain).filter(chain => chain !== fromChain)
        if (availableChains.length === 0) {
            console.error('No available chains to bridge to')
            process.exit(1)
        } else if (availableChains.length === 1) {
            toChain = availableChains[0]
            console.log("Only one destination chain available, automatically selecting:", toChain)
            console.log('')
        } else {
            toChain = await getAnswer('Which chain are you bridging to?', availableChains) as Chain
        }
    }

    // validate fromChain and toChain
    if (!fromChain || !Object.values(Chain).includes(fromChain)) {
        console.error('Invalid from chain')
        process.exit(1)
    }
    if (!toChain || !Object.values(Chain).includes(toChain)) {
        console.error('Invalid to chain')
        process.exit(1)
    }

    // validate chains exist in EID mapping
    if (!isValidChain(fromChain)) {
        console.error(`Chain ${fromChain} not supported for bridging`)
        process.exit(1)
    }
    if (!isValidChain(toChain)) {
        console.error(`Chain ${toChain} not supported for bridging`)
        process.exit(1)
    }

    let fromProvider = new Provider(fromChain as Chain)
    let toProvider = new Provider(toChain as Chain)

    const balance = await withLoadingText('Fetching balance...', () => wallet!.getBalance(fromProvider as Provider))
    if (balance !== undefined) console.log('Balance:', parseFloat(ethers.formatEther(balance)).toFixed(4))
    if (balance === 0n) {
        console.log(`Your balance is empty! Use your TAO address to send TAO and load your EVM address with funds`)
        // return;
    } else if (balance < BigInt(1e16)) {
        console.log(`Your balance is low on funds make sure you have enough funds to bridge successfully`)
    }

    const tokenBalances: Record<string, Record<string, { balance: bigint, decimals: number }>> = {}

    const checkNetworkBalances = async (network: Chain, address: string, tokenSymbol: string) => {
        if (!address) return
        try {
            const provider = new Provider(network as Chain)
            const rpcProvider = await provider.get()
            const balances = await getErc20BalancesWithDelay([address], wallet!.address, 350, rpcProvider)
            if (balances.length > 0) {
                const { balance, decimals } = balances[0]
                if (balance > 0n) {
                    if (!tokenBalances[tokenSymbol]) tokenBalances[tokenSymbol] = {}
                    tokenBalances[tokenSymbol][network] = { balance, decimals }
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch ${network.toUpperCase()} balance for ${tokenSymbol}`)
        }
    }

    for (const netuid of Object.keys(allowedNetuids)) {
        const netuidData = allowedNetuids[netuid]
        const tokenSymbol = `wSN${netuid}`
        await checkNetworkBalances(fromChain as Chain, netuidData[fromChain as Chain], tokenSymbol)
    }

    spacedText("Wrapped Token Balances")

    if (Object.keys(tokenBalances).length === 0) {
        console.log("No wrapped token balances found")
        console.log('Would you like to convert TAO to wrapped tokens first? (y/n)')
        const answer = await new Promise(resolve => rl.question('', resolve))
        if (answer === 'y') {
            console.log('')
            wrapCommand({
                netuid: netuid, followUp: {
                    command: bridgeCommand,
                    args: { netuid, fromChain, toChain }
                }
            })
        } else {
            console.log('')
            process.exit(0)
        }
        return
    }

    // Create table
    const networks = [fromChain]
    const table = new Table({
        head: ['Token', 'Balance'],
        style: { head: ['cyan'] }
    })

    // Add rows for each token
    Object.entries(tokenBalances).forEach(([token, balances]) => {
        const row = [token, ...networks.map(network => {
            const balance = balances[network]
            return balance ? parseFloat(ethers.formatUnits(balance.balance, balance.decimals)).toFixed(4) : '0'
        })]
        table.push(row)
    })

    console.log(table.toString())

    // Get token selection
    const tokenOptions = Object.keys(tokenBalances)
    if (tokenOptions.length === 0) {
        console.log('No tokens available to bridge')
        process.exit(0)
    }

    console.log('')
    console.log('Select token to bridge:')
    const selectedToken = await getAnswer('Which token?', tokenOptions)

    const tokenBalance = tokenBalances[selectedToken][fromChain as Chain]
    if (!tokenBalance || tokenBalance.balance === 0n) {
        console.log('No balance available for selected token')
        process.exit(0)
    }

    // Get amount to bridge
    console.log('')
    console.log(`Available balance: ${parseFloat(ethers.formatUnits(tokenBalance.balance, tokenBalance.decimals)).toFixed(4)} ${selectedToken}`)
    console.log('How much do you want to bridge? (enter amount or "all" for full balance):')
    const amountAnswer: string = await new Promise(resolve => rl.question('', resolve))

    let bridgeAmount: bigint
    if (amountAnswer.toLowerCase() === 'all') {
        bridgeAmount = tokenBalance.balance
    } else {
        const amount = parseFloat(amountAnswer)
        if (isNaN(amount) || amount <= 0) {
            console.error('Invalid amount')
            process.exit(1)
        }
        bridgeAmount = ethers.parseUnits(amountAnswer, tokenBalance.decimals)
        if (bridgeAmount > tokenBalance.balance) {
            console.error('Insufficient balance')
            process.exit(1)
        }
    }

    // Get destination address
    console.log('')
    console.log(`Enter destination address or leave blank for (${wallet!.address})`)
    let destAddress: string = await new Promise(resolve => rl.question('', resolve))

    if (destAddress === '') {
        destAddress = wallet!.address
    }

    if (!ethers.isAddress(destAddress)) {
        console.error('Invalid address')
        process.exit(1)
    }

    const DST_EID = isValidChain(toChain) ? eids[toChain] : 0;
    const TO = destAddress;
    const AMOUNT = bridgeAmount
    const signer = await wallet!.getSigner(fromProvider as Provider)
    // Load Subtensor-side OFT (must match deployments/bittensor-evm/WrappedAlpha.json)
    const [taoAddress, taoError] = getContractAddress(netuid!, fromChain as Chain)
    if (taoError) {
        console.error(taoError)
        process.exit(1)
    }
    const [oft, oftError] = await loadWrapContract(taoAddress, fromProvider as Provider, wallet!, fromChain as Chain)
    if (oftError) {
        console.error(oftError)
        process.exit(1)
    }

    // Build V2 structs
    const toBytes32 = ethers.zeroPadValue(TO, 32);

    const sendParam = {
        dstEid: DST_EID,
        to: toBytes32,
        amountLD: AMOUNT,
        minAmountLD: 0,       // no slippage protection
        extraOptions: "0x",   // default executor opts; tune later if needed
        composeMsg: "0x",
        oftCmd: "0x",
    };

    const payInLzToken = false; // pay fee in native

    // 1) quote
    const quote = await oft!.quoteSend(sendParam, payInLzToken);
    // Some ABIs return a struct, others a tuple; handle both:
    const nativeFee = quote.nativeFee ?? quote[0];
    console.log("Native fee (wei):", nativeFee.toString());

    console.log('')
    console.log('Would you like to bridge tokens? (y/n)')
    const bridgeAnswer = await new Promise(resolve => rl.question('', resolve))
    if (bridgeAnswer !== 'y') {
        process.exit(0)
    }

    // 2) send
    const messagingFee = { nativeFee, lzTokenFee: quote.lzTokenFee ?? quote[1] };
    const refundAddress = await signer.getAddress();

    const tx = await oft!.send(sendParam, messagingFee, refundAddress, { value: nativeFee });
    await withLoadingText('Waiting for tx... ', () => tx.wait())
    console.log("Bridged tx confirmed!")
    console.log('')

    console.log(`Track tx on LayerZero Scan: https://layerzeroscan.com/tx/${tx.hash}`)

    const [lzResult, lzErr] = await withLoadingText('Waiting for LayerZero tx, this may take a minute...', () => pollLayerZeroTxStatus(tx.hash))
    if (lzErr) {
        console.error('LayerZero status polling failed:', lzErr)
        process.exit(1)
    }
    if (!lzResult) {
        console.error('LayerZero polling returned null result')
        process.exit(1)
    }
    console.log('LayerZero message status:', lzResult.status?.name)
    if (lzResult.status?.name !== 'DELIVERED' && lzResult.status?.name !== 'DELIVERED_DST') {
        console.warn('Warning: Message not finalized, check LayerZero Scan for details.')
        console.log(`LayerZero Scan: https://layerzeroscan.com/tx/${tx.hash}`)
    } else {
        console.log('Bridged successfully!')
    }
    process.exit(0)

}

async function pollLayerZeroTxStatus(txHash: string, interval = 5000, maxAttempts = 120): Promise<[LayerZeroMessage | null, Error | null]> {
    let attempts = 0
    const url = `https://scan.layerzero-api.com/v1/messages/tx/${txHash}`
    while (attempts < maxAttempts) {
        try {
            const res = await fetch(url)
            if (!res.ok) {
                if (res.status === 404 || res.status === 400) {
                    await new Promise(r => setTimeout(r, interval)); attempts++; continue
                }
                return [null, new Error(`HTTP error: ${res.status}`)]
            }
            const data = await res.json() as LayerZeroResponse
            if (!data?.data?.length) return [null, new Error('No data returned from LayerZero Scan')]
            const message = data.data[0]
            const statusName = message?.status?.name
            if (statusName === 'DELIVERED') return [message, null]
            process.stdout.write('.')
        } catch (err) {
            return [null, err as Error]
        }
        await new Promise(r => setTimeout(r, interval)); attempts++
    }
    return [null, new Error('Polling timed out')]
}

async function getAnswer(question: string, options: string[]) {
    console.log(question)
    options.forEach((option, idx) => console.log(`${idx + 1}: ${option}`))
    const answer: string = await new Promise(resolve => rl.question('', resolve))
    return options[parseInt(answer) - 1]
}

export { bridgeCommand }