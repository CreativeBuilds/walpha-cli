import { ethers } from "../wallet"

const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
]

async function getErc20BalancesWithDelay(contracts: any[], address: string, delayMs = 300, rpcProvider: ethers.JsonRpcProvider) {
    const results = []
    for (const contractAddr of contracts) {
        const contract = new ethers.Contract(contractAddr, erc20Abi, rpcProvider)
        try {
            const [bal, decimals, symbol] = await Promise.all([
                contract.balanceOf(address),
                contract.decimals(),
                contract.symbol()
            ])
            results.push({ symbol, balance: bal, decimals })
        } catch (err) {
            results.push({ symbol: 'Unknown', balance: 0n, decimals: 18 })
        }
        await new Promise(res => setTimeout(res, delayMs))
    }
    return results
}

export { getErc20BalancesWithDelay }