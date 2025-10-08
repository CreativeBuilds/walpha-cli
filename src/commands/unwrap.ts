import { withLoadingText, spacedText } from "../helpers/text";
import { allowedNetuids, isValidNetuid } from "../helpers/netuids";
import { Provider } from "../provider";
import { initWallet, ethers } from "../wallet";
import { createReadlineInterface } from "../helpers/rl";
import { Chain, getContractAddress, loadWrapContract } from "../helpers/contract";
import { getErc20BalancesWithDelay } from "../helpers/balances";
import { JsonRpcProvider } from "ethers";

async function unwrapCommand(options: { netuid?: string, amount?: string }) {
    let [wallet, errorCode] = await initWallet()
    if (errorCode) {
        process.exit(1)
    }

    let provider = new Provider(Chain.TAO)

    let netuid = options.netuid;
    let answer_netuid = await (async () => {
        if (!isValidNetuid(netuid ?? '')) {
            const rl = createReadlineInterface()
            try {
                const subnets = Object.keys(allowedNetuids)
                console.log('Please pick a subnet from the following list or use --netuid [netuid]:')
                subnets.forEach((subnet, idx) => console.log(`${idx + 1}: ${subnet}`))
                const answer: string = await new Promise(resolve => rl.question('', resolve))
                let idx = parseInt(answer) - 1
                if (!isNaN(idx) && idx >= 0 && idx < subnets.length) { netuid = subnets[idx]; rl.close(); return netuid }
                if (subnets.includes(answer)) { netuid = answer; rl.close(); return netuid }
                console.error('Invalid selection.'); rl.close(); process.exit(1)
            } catch (error) {
                rl.close()
                throw error
            }
        }
        return netuid
    })()

    const [taoAddress, taoError] = getContractAddress(answer_netuid!)
    if (taoError) {
        console.error(taoError)
        process.exit(1)
    }

    const [contract, contractError] = await loadWrapContract(taoAddress, provider as Provider, wallet!, Chain.TAO)
    if (contractError || !contract) {
        console.error(contractError || 'Failed to load contract')
        process.exit(1)
    }

    // Get wrapped token balance
    const wrappedBalance = await withLoadingText('Fetching wrapped token balance...', async () => {
        const rpcProvider = await provider.get()
        const balances = await getErc20BalancesWithDelay([taoAddress], wallet!.address, 350, rpcProvider as JsonRpcProvider)
        return balances.length > 0 ? balances[0].balance : 0n
    })

    console.log('')
    spacedText("Wrapped Token Balance")
    console.log(`wSN${answer_netuid} Balance:`, ethers.formatUnits(wrappedBalance, 9), '\n')

    if (wrappedBalance === 0n) {
        console.log('No wrapped tokens to unwrap.')
        process.exit(0)
    }

    let amount = options.amount;
    let answer_amount = await (async (): Promise<string> => {
        if (!amount) {
            amount = await getAnswerAmount(wrappedBalance)
            return amount
        }
        return amount
    })()

    // If amount is empty string, use max balance
    if (answer_amount === '') {
        answer_amount = ethers.formatUnits(wrappedBalance, 9)
        console.log('Using max balance:', parseFloat(answer_amount).toFixed(4))
    }

    let answer_amount_wei = ethers.parseUnits(answer_amount, 9)

    if (answer_amount_wei > wrappedBalance) {
        console.log('')
        console.error('Insufficient wrapped token balance. Either change the amount or wrap more TAO first.')
        const bal = Number(ethers.formatUnits(wrappedBalance, 9))
        const amt = Number(answer_amount)
        const diff = Math.abs(bal - amt).toFixed(4)
        console.log(`Your wrapped balance is ${bal.toFixed(4)} wSN${answer_netuid} which is ${diff} wSN${answer_netuid} less than the amount you want to unwrap.`)
        console.log('')
        process.exit(1)
    }

    const tx = await withLoadingText('Unwrapping...', () => contract.withdrawTao(answer_amount_wei).then(tx => tx.wait())).catch(error => {
        console.error('Error unwrapping:', error)
        process.exit(1)
    })
    console.log('\nTransaction hash:', tx.hash)
    console.log(`View on explorer: https://evm.taostats.io/tx/${tx.hash}`)

    // Get updated wrapped token balance
    const newWrappedBalance = await withLoadingText('Fetching updated wrapped token balance...', async () => {
        const rpcProvider = await provider.get()
        const balances = await getErc20BalancesWithDelay([taoAddress], wallet!.address, 350, rpcProvider as JsonRpcProvider)
        return balances.length > 0 ? balances[0].balance : 0n
    })
    
    console.log('')
    spacedText("New Wrapped Token Balance")
    console.log(`wSN${answer_netuid} Balance:`, ethers.formatUnits(newWrappedBalance, 9), '\n')
    process.exit(0)
}

async function getAnswerAmount(wrappedBalance: bigint): Promise<string> {
    const rl = createReadlineInterface()
    try {
        console.log('How much wrapped token do you want to unwrap? (leave blank for max) Or use --amount [amount]:')
        const answer: string = await new Promise(resolve => rl.question('', resolve))
        rl.close()

        // If empty string, return it to trigger max balance logic
        if (answer === '') {
            return answer
        }

        if (isNaN(Number(answer))) {
            console.error('Invalid amount.'); return getAnswerAmount(wrappedBalance)
        } else if (Number(answer) > Number(ethers.formatUnits(wrappedBalance, 9))) {
            console.log('')
            console.error('Insufficient wrapped token balance. Either change the amount or wrap more TAO first.')
            const bal = Number(ethers.formatUnits(wrappedBalance, 9))
            const amt = Number(answer)
            const diff = Math.abs(bal - amt).toFixed(4)
            console.log(`Your wrapped balance is ${bal.toFixed(4)} which is ${diff} less than the amount you want to unwrap.`)
            console.log('')
            return getAnswerAmount(wrappedBalance)
        }
        return answer
    } catch (error) {
        rl.close()
        throw error
    }
}

export { unwrapCommand }
