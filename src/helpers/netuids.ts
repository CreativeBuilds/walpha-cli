import _allowedNetuids from '../../netuids.json'

const allowedNetuids: Record<string, { tao: string, eth: string }> = _allowedNetuids

const isValidNetuid = (netuid: string) => {
    return Object.keys(allowedNetuids).includes(netuid)
}

export { allowedNetuids, isValidNetuid }