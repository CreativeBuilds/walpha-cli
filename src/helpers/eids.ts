import _eids from '../../eids.json'

const eids: Record<string, number> = _eids

const getEid = (chain: string): [number, string | null] => {
    const eid = eids[chain]
    if (eid === undefined) {
        return [0, `Chain ${chain} not found in EID mapping`]
    }
    return [eid, null]
}

const getAvailableChains = (): string[] => {
    return Object.keys(eids)
}

const isValidChain = (chain: string): boolean => {
    return Object.keys(eids).includes(chain)
}

export { eids, getEid, getAvailableChains, isValidChain }
