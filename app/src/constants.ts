import { PublicKey } from '@solana/web3.js';

export const EPHEMERAL_RPC_URL =
  process.env.REACT_APP_MAGICBLOCK_URL || 'https://devnet.magicblock.app';

export const PAYMENTS_PROGRAM = new PublicKey('EnhkomtzKms55jXi3ijn9XsMKYpMT4BJjmbuDQmPo3YS');
export const DEPOSIT_PDA_SEED = 'deposit';

export const PERMISSION_PROGRAM_ID = new PublicKey('BTWAqWNBmF2TboMh3fxMJfgR16xGHYD7Kgr2dPwbRPBi');
export const PERMISSION_SEED = Buffer.from('permission:');
export const GROUP_SEED = Buffer.from('group:');
