const { hexToU8a } = require('@polkadot/util');
const { blake2AsU8a, encodeAddress } = require('@polkadot/util-crypto');

function convertH160ToSS58(ethAddress) {
    const prefix = 'evm:';
    const prefixBytes = new TextEncoder().encode(prefix);
    const addressBytes = hexToU8a(
        ethAddress.startsWith('0x') ? ethAddress.slice(2) : ethAddress
    );
    const combined = new Uint8Array(prefixBytes.length + addressBytes.length);
    combined.set(prefixBytes);
    combined.set(addressBytes, prefixBytes.length);
    const hash = blake2AsU8a(combined);
    const ss58Address = encodeAddress(hash, 42); // 42 is the Bittensor network prefix
    return ss58Address;
}

export { convertH160ToSS58 }