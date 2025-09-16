const allowedNetworks: Record<string, { psudeonyms: string[], rpcUrls: string[] }> = {
    'eth': {
        psudeonyms: ['ethereum', 'eth'],
        rpcUrls: ['https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID']
    },
    'tao': {
        psudeonyms: ['subtensor', 'bittensor', 'tao'],
        rpcUrls: ['https://lite.chain.opentensor.ai']
    }
}

export { allowedNetworks }