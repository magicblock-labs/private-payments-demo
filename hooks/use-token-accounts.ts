'use client';

import { PublicKey } from '@solana/web3.js';

import { useTokenAccount } from '@/hooks/use-token-account';

export function useTokenAccounts(
  wallet?: PublicKey | string,
  recipient?: PublicKey | string,
  mint?: PublicKey | string,
) {
  const walletAccounts = useTokenAccount({ user: wallet, tokenMint: mint });
  const recipientAccounts = useTokenAccount({ user: recipient, tokenMint: mint });

  return {
    walletAccounts,
    recipientAccounts,
  };
}
