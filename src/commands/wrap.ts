import { withLoadingText, spacedText } from "../helpers/text";
import { allowedNetuids, isValidNetuid } from "../helpers/netuids";
import { Provider } from "../provider";
import { initWallet, ethers } from "../wallet";
import { createReadlineInterface } from "../helpers/rl";
import { getContractAddress, loadWrapContract } from "../helpers/contract";
import { Chain } from "../helpers/contract";


async function wrapCommand(options: { netuid?: string, amount?: string, followUp?: { command: any, args: any } }) {
    // balance logic placeholder
    let [wallet, errorCode] = await initWallet()
    if (errorCode) {
        process.exit(1)
    }

    let provider = new Provider('tao')

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

    const [contract, contractError] = await loadWrapContract(taoAddress, provider, wallet!, Chain.TAO)
    if (contractError || !contract) {
        console.error(contractError || 'Failed to load contract')
        process.exit(1)
    }

    let balance = await withLoadingText('Fetching balance...', () => wallet!.getBalance(provider))

    console.log('')
    spacedText("Balance")
    console.log('TAO Balance:', ethers.formatEther(balance), '\n')

    let amount = options.amount;
    let answer_amount = await (async (): Promise<string> => {
        if (!amount) {
            amount = await getAnswerAmount(balance)
            return amount
        }
        return amount
    })()

    let answer_amount_wei = ethers.parseEther(answer_amount)

    const tx = await withLoadingText('Wrapping...', () => contract.depositTao(answer_amount_wei, { value: answer_amount_wei }).then(tx => tx.wait())).catch(error => {
        console.error('Error wrapping:', error)
        process.exit(1)
    })
    console.log('\nTransaction hash:', tx.hash)
    console.log(`View on explorer: https://evm.taostats.io/tx/${tx.hash}`)

    console.log('')

    if (options.followUp) {
        options.followUp.command(options.followUp.args)
    } else {
        await import('./account').then(mod => mod.balanceCommand()).catch(err => { console.error('Failed to run balance command:', err); process.exit(1) })
        process.exit(0)
    }
}

async function getAnswerAmount(balance: bigint): Promise<string> {
    const rl = createReadlineInterface()
    try {
        console.log('How much TAO do you want to wrap? Or use --amount [amount]:')
        const answer: string = await new Promise(resolve => rl.question('', resolve))
        rl.close()

        if (isNaN(Number(answer))) {
            console.error('Invalid amount.'); return getAnswerAmount(balance)
        } else if (Number(answer) > Number(ethers.formatEther(balance))) {
            console.log('')
            console.error('Insufficient balance. Either change the amount or send more TAO to your wallet.')
            const bal = Number(ethers.formatEther(balance))
            const amt = Number(answer)
            const diff = Math.abs(bal - amt).toFixed(4)
            console.log(`Your balance is ${bal.toFixed(4)} TAO which is ${diff} TAO less than the amount you want to wrap.`)
            console.log('')
            return getAnswerAmount(balance)
        }
        return answer
    } catch (error) {
        rl.close()
        throw error
    }
}

export { wrapCommand }