'use client';

import { useTokenAccount } from '@/hooks/use-token-account';
import { PublicKey } from '@solana/web3.js';

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
