'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  Account,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  unpackAccount,
} from '@solana/spl-token';
import { deriveVault } from '@magicblock-labs/ephemeral-rollups-sdk';

import { TokenAccounts } from '@/hooks/use-token-account';
import { useTokenAccounts } from '@/hooks/use-token-accounts';
import { useSubscription } from '@/hooks/use-subscription';

interface TokenAccountContextValue {
  wallet?: PublicKey;
  recipient?: PublicKey;
  mint?: PublicKey;
  selectedAddress?: string;
  setSelectedAddress: React.Dispatch<React.SetStateAction<string | undefined>>;
  vault?: PublicKey;
  vaultAta?: PublicKey;
  vaultInfo?: AccountInfo<Buffer>;
  vaultAtaAccount?: Account;
  walletAccounts: TokenAccounts;
  recipientAccounts: TokenAccounts;
}

const TokenAccountContext = createContext<TokenAccountContextValue | undefined>(undefined);

interface TokenAccountProviderProps {
  mint?: PublicKey | string;
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
  mint,
  initialSelectedAddress,
  children,
}: TokenAccountProviderProps) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(
    initialSelectedAddress,
  );
  const recipientKey = useMemo(() => toPublicKey(selectedAddress), [selectedAddress]);
  const mintKey = useMemo(() => toPublicKey(mint), [mint]);
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
    setVaultInfo(undefined);
    setVaultAtaAccount(undefined);

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
      }
    } catch {
      setVaultInfo(undefined);
      setVaultAtaAccount(undefined);
    }
  }, [connection, vault, vaultAta]);

  useEffect(() => {
    const f = async () => {
      await fetchVault();
    };
    f();
  }, [fetchVault]);

  useSubscription(connection, vault, accountInfo => {
    setVaultInfo(accountInfo);
  });

  useSubscription(connection, vaultAta, accountInfo => {
    try {
      setVaultAtaAccount(unpackAccount(vaultAta!, accountInfo));
    } catch {
      setVaultAtaAccount(undefined);
    }
  });

  const value = useMemo(() => {
    console.log('walletAccounts:');
    console.log('\t ata:', walletAccounts.ata?.toString());
    console.log('\t eata:', walletAccounts.eata?.toString());
    console.log('\t mainnetAta:', walletAccounts.mainnetAta?.amount);
    console.log('\t mainnetEata:', walletAccounts.mainnetEata?.amount);
    console.log('\t ephemeralAta:', walletAccounts.ephemeralAta?.amount);
    console.log('\t tokenAccount:', walletAccounts.tokenAccount?.amount);
    console.log('\t isDelegated:', walletAccounts.isDelegated);
    console.log('\t accessDenied:', walletAccounts.accessDenied);

    console.log('recipientAccounts:', recipientAccounts);
    console.log('\t ata:', recipientAccounts.ata?.toString());
    console.log('\t eata:', recipientAccounts.eata?.toString());
    console.log('\t mainnetAta:', recipientAccounts.mainnetAta?.amount);
    console.log('\t mainnetEata:', recipientAccounts.mainnetEata?.amount);
    console.log('\t ephemeralAta:', recipientAccounts.ephemeralAta?.amount);
    console.log('\t tokenAccount:', recipientAccounts.tokenAccount?.amount);
    console.log('\t isDelegated:', recipientAccounts.isDelegated);
    console.log('\t accessDenied:', recipientAccounts.accessDenied);

    return {
      wallet: publicKey ?? undefined,
      recipient: recipientKey,
      mint: mintKey,
      selectedAddress,
      setSelectedAddress,
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
