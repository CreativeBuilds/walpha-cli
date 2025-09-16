import { allowedNetuids } from "./netuids";
import { ethers, Wallet } from "../wallet";
import { Provider } from "../provider";

const WRAP_CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "depositTao",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            }
        ],
        "name": "withdrawTao",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

const getTaoContractAddress = (netuid: string): [string, string] => {
    
    if (!allowedNetuids[netuid]) {
        return ['', `Netuid ${netuid} not found in allowed netuids`]
    }
    
    return [allowedNetuids[netuid].tao, '']
}

const loadWrapContract = async (taoAddress: string, provider: Provider, wallet: Wallet): Promise<[ethers.Contract | null, string]> => {
    try {
        const contract = new (ethers.Contract)(taoAddress, WRAP_CONTRACT_ABI, await wallet.getSigner(provider))
        return [contract, '']
    } catch (error) {
        return [null, `Failed to load contract: ${error}`]
    }
}

export { getTaoContractAddress, loadWrapContract, WRAP_CONTRACT_ABI }