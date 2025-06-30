import { PublicKey } from '@solana/web3.js';

export function shortKey(key: PublicKey | string) {
  return key.toString().slice(0, 4) + '...' + key.toString().slice(-4);
}
