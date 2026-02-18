'use client';

import { useTokenAccount } from '@/hooks/use-token-account';
import { PublicKey } from '@solana/web3.js';
import { useMemo } from 'react';

export function useTokenAccounts(
  wallet?: PublicKey | string,
  recipient?: PublicKey | string,
  mint?: PublicKey | string,
) {
  const walletKey = useMemo(() => {
    if (!wallet) return;
    return new PublicKey(wallet);
  }, [wallet]);

  const recipientKey = useMemo(() => {
    if (!recipient) return;
    return new PublicKey(recipient);
  }, [recipient]);

  const tokenMint = useMemo(() => {
    if (!mint) return;
    return new PublicKey(mint);
  }, [mint]);

  const walletAccounts = useTokenAccount({ user: walletKey, tokenMint });
  const recipientAccounts = useTokenAccount({ user: recipientKey, tokenMint });

  return {
    walletAccounts,
    recipientAccounts,
  };
}
