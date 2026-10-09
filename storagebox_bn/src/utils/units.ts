export const BYTES_PER_GB = 1024 * 1024 * 1024;

export const gbToBytes = (gb: number): bigint => BigInt(Math.round(gb * BYTES_PER_GB));
