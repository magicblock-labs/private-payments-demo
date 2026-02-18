'use client';

import { TokenListEntry } from '@/lib/types';
import { TOKEN_PROGRAM_ID, unpackAccount, unpackMint } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const LAST_SELECTED_TOKEN_STORAGE_KEY = 'last-selected-token';

interface TokensContextValue {
  tokens: TokenListEntry[];
  selectedToken: TokenListEntry | undefined;
  setSelectedToken: (_token: TokenListEntry | undefined) => void;
  fetchTokenAccounts: () => Promise<void>;
}

const TokensContext = createContext<TokensContextValue | undefined>(undefined);

export function TokensProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const [entries, setEntries] = useState<TokenListEntry[]>([]);
  const lastSelectedToken = useMemo<TokenListEntry | undefined>(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    try {
      const storedSelectedToken = localStorage.getItem(LAST_SELECTED_TOKEN_STORAGE_KEY);
      return storedSelectedToken ? (JSON.parse(storedSelectedToken) as TokenListEntry) : undefined;
    } catch (error) {
      console.error('Error loading selected token:', error);
      return undefined;
    }
  }, []);
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | undefined>(lastSelectedToken);

  const handleSetSelectedToken = useCallback((token: TokenListEntry | undefined) => {
    setSelectedToken(token);
    if (token) {
      localStorage.setItem(LAST_SELECTED_TOKEN_STORAGE_KEY, JSON.stringify(token));
    }
  }, []);

  const fetchTokenAccounts = useCallback(async () => {
    if (!connection || !publicKey) return;

    const { value: accounts } = await connection.getTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    const tokenAccounts = accounts.map(account => unpackAccount(account.pubkey, account.account));
    // We can only get 100 accounts at once, so we get the ones with the most tokens
    const mints = tokenAccounts
      .sort((a, b) => {
        return Number(b.amount) - Number(a.amount);
      })
      .map(account => account.mint)
      .slice(0, 100);

    const mintsInfo = await connection.getMultipleAccountsInfo(mints);
    const mintsAccounts = mintsInfo
      .map((account, i) => ({ account, mint: mints[i] }))
      .map(({ account, mint }) => unpackMint(mint, account));

    const newEntries = mintsAccounts.map(account => ({
      mint: account.address.toString(),
      creator: publicKey.toString(),
      decimals: account.decimals,
    }));

    if (lastSelectedToken && !newEntries.some(entry => entry.mint === lastSelectedToken.mint)) {
      newEntries.push(lastSelectedToken);
    }

    setEntries(newEntries);
  }, [connection, publicKey, lastSelectedToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTokenAccounts();
  }, [fetchTokenAccounts]);

  return (
    <TokensContext.Provider
      value={{
        tokens: entries,
        selectedToken,
        setSelectedToken: handleSetSelectedToken,
        fetchTokenAccounts,
      }}
    >
      {children}
    </TokensContext.Provider>
  );
}

export function useTokensContext() {
  const context = useContext(TokensContext);
  if (!context) {
    throw new Error('useTokensContext must be used within TokensProvider');
  }
  return context;
}
