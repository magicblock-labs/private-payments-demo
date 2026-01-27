import { PublicKey } from '@solana/web3.js';

export const EPHEMERAL_RPC_URL =
  process.env.NEXT_PUBLIC_MAGICBLOCK_URL || 'https://devnet.magicblock.app';
export const VALIDATOR_PUBKEY = new PublicKey('FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA');

export const PAYMENTS_PROGRAM = new PublicKey('EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS');
export const DEPOSIT_PDA_SEED = 'deposit';
export const VAULT_PDA_SEED = 'vault';
