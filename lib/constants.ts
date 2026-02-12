import { DEFAULT_PRIVATE_VALIDATOR } from '@magicblock-labs/ephemeral-rollups-sdk';
import { PublicKey } from '@solana/web3.js';

export const DEVNET_RPC_URL =
  process.env.NEXT_PUBLIC_DEVNET_URL || 'https://rpc.magicblock.app/devnet';
export const EPHEMERAL_RPC_URL =
  process.env.NEXT_PUBLIC_MAGICBLOCK_URL || 'https://devnet.magicblock.app';

export const PAYMENTS_PROGRAM = new PublicKey('EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS');
export const VALIDATOR_PUBKEY = DEFAULT_PRIVATE_VALIDATOR;
