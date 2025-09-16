import { allowedNetworks } from "./helpers/networks"
import { ethers } from "./wallet"

class Provider {
    private _providers: ethers.JsonRpcProvider[]
    private _currentIdx: number
    private _network: string

    constructor(network: string) {
        if (!allowedNetworks[network]) throw new Error('Network not found')
        this._network = network
        this._providers = allowedNetworks[network].rpcUrls.map(url => new ethers.JsonRpcProvider(url))
        this._currentIdx = 0
    }

    public async get() {
        let lastErr = null
        for (let i = 0; i < this._providers.length; i++) {
            const idx = (this._currentIdx + i) % this._providers.length
            const provider = this._providers[idx]
            try {
                await provider.getBlockNumber()
                this._currentIdx = idx
                return provider
            } catch (err) {
                lastErr = err
                // Destroy the failed provider to stop its retry logic
                provider.destroy()
                continue
            }
        }
        throw new Error('All RPC URLs failed')
    }
}

export { Provider }