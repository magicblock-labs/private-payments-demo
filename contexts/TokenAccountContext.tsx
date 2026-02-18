'use client';

import { useSubscription } from '@/hooks/use-subscription';
import { TokenAccounts } from '@/hooks/use-token-account';
import { useTokenAccounts } from '@/hooks/use-token-accounts';
import { TokenListEntry } from '@/lib/types';
import { deriveVault } from '@magicblock-labs/ephemeral-rollups-sdk';
import {
  Account,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface TokenAccountContextValue {
  wallet?: PublicKey;
  recipient?: PublicKey;
  mint?: PublicKey;
  selectedAddress?: string;
  setSelectedAddress: (address: string | undefined) => void;
  vault?: PublicKey;
  vaultAta?: PublicKey;
  vaultInfo?: AccountInfo<Buffer>;
  vaultAtaAccount?: Account;
  walletAccounts: TokenAccounts;
  recipientAccounts: TokenAccounts;
}

const TokenAccountContext = createContext<TokenAccountContextValue | undefined>(undefined);

interface TokenAccountProviderProps {
  token?: TokenListEntry;
  initialSelectedAddress?: string;
  children: ReactNode;
}

function toPublicKey(value?: PublicKey | string) {
  if (!value) return;
  if (value instanceof PublicKey) return value;
  try {
    return new PublicKey(value);
  } catch {
    return;
  }
}

export function TokenAccountProvider({
  token,
  initialSelectedAddress,
  children,
}: TokenAccountProviderProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(
    initialSelectedAddress,
  );
  const recipientKey = useMemo(() => toPublicKey(selectedAddress), [selectedAddress]);
  const mintKey = useMemo(() => toPublicKey(token?.mint), [token]);
  const [vaultInfo, setVaultInfo] = useState<AccountInfo<Buffer> | undefined>(undefined);
  const [vaultAtaAccount, setVaultAtaAccount] = useState<Account | undefined>(undefined);

  const { walletAccounts, recipientAccounts } = useTokenAccounts(
    publicKey ?? undefined,
    recipientKey,
    mintKey,
  );

  const vault = useMemo(() => {
    if (!mintKey) return;
    return deriveVault(mintKey)[0];
  }, [mintKey]);

  const vaultAta = useMemo(() => {
    if (!vault || !mintKey) return;
    return getAssociatedTokenAddressSync(mintKey, vault, true, TOKEN_PROGRAM_ID);
  }, [mintKey, vault]);

  const fetchVault = useCallback(async () => {
    if (!vault || !vaultAta) return;

    try {
      const [vaultAccountInfo, vaultAtaInfo] = await connection.getMultipleAccountsInfo([
        vault,
        vaultAta,
      ]);
      setVaultInfo(vaultAccountInfo ?? undefined);
      if (vaultAtaInfo) {
        try {
          setVaultAtaAccount(unpackAccount(vaultAta, vaultAtaInfo));
        } catch {
          setVaultAtaAccount(undefined);
        }
      } else {
        setVaultAtaAccount(undefined);
      }
    } catch {
      setVaultInfo(undefined);
      setVaultAtaAccount(undefined);
    }
  }, [connection, vault, vaultAta]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVault();
  }, [fetchVault]);

  useSubscription(connection, vault, accountInfo => {
    setVaultInfo(accountInfo);
  });

  useSubscription(connection, vaultAta, accountInfo => {
    if (!vaultAta) return;
    try {
      setVaultAtaAccount(unpackAccount(vaultAta, accountInfo));
    } catch {
      setVaultAtaAccount(undefined);
    }
  });

  const value = useMemo(() => {
    return {
      wallet: publicKey ?? undefined,
      recipient: recipientKey,
      mint: mintKey,
      selectedAddress,
      setSelectedAddress: (address: string | undefined) => {
        if (!address) {
          setSelectedAddress(undefined);
          return;
        }
        try {
          new PublicKey(address);
          setSelectedAddress(address);
        } catch {
          setSelectedAddress(undefined);
        }
      },
      vault,
      vaultAta,
      vaultInfo,
      vaultAtaAccount,
      walletAccounts,
      recipientAccounts,
    };
  }, [
    publicKey,
    recipientKey,
    mintKey,
    selectedAddress,
    setSelectedAddress,
    vault,
    vaultAta,
    vaultInfo,
    vaultAtaAccount,
    walletAccounts,
    recipientAccounts,
  ]);

  return <TokenAccountContext.Provider value={value}>{children}</TokenAccountContext.Provider>;
}

export function useTokenAccountContext() {
  const context = useContext(TokenAccountContext);
  if (!context) {
    throw new Error('useTokenAccountContext must be used within TokenAccountProvider');
  }
  return context;
}
