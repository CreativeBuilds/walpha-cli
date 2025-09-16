const allowedNetworks: Record<string, { psudeonyms: string[], rpcUrls: string[] }> = {
    'eth': {
        psudeonyms: ['ethereum', 'eth'],
        rpcUrls: ['https://eth.llamarpc.com']
    },
    'tao': {
        psudeonyms: ['subtensor', 'bittensor', 'tao'],
        rpcUrls: ['https://lite.chain.opentensor.ai']
    }
}

export { allowedNetworks }