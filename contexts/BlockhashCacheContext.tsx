'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Connection } from '@solana/web3.js';

import { useEphemeralConnection } from '@/hooks/use-ephemeral-connection';

type BlockhashCacheEntry = {
  blockhash?: string;
  lastValidBlockHeight?: number;
  updatedAt?: number;
};

interface BlockhashCacheContextValue {
  mainnet: BlockhashCacheEntry;
  ephemeral: BlockhashCacheEntry;
  refreshMainnet: () => Promise<void>;
  refreshEphemeral: () => Promise<void>;
}

const BlockhashCacheContext = createContext<BlockhashCacheContextValue | undefined>(undefined);

const EMPTY_ENTRY: BlockhashCacheEntry = {};

async function fetchLatestBlockhash(connection: Connection) {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  return { blockhash, lastValidBlockHeight, updatedAt: Date.now() };
}

export function BlockhashCacheProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const [mainnet, setMainnet] = useState<BlockhashCacheEntry>(EMPTY_ENTRY);
  const [ephemeral, setEphemeral] = useState<BlockhashCacheEntry>(EMPTY_ENTRY);
  const mainnetInFlight = useRef(false);
  const ephemeralInFlight = useRef(false);
  const mainnetSubId = useRef<number | null>(null);
  const ephemeralSubId = useRef<number | null>(null);

  const refreshMainnet = useCallback(async () => {
    if (!connection || mainnetInFlight.current) return;
    mainnetInFlight.current = true;
    try {
      const latest = await fetchLatestBlockhash(connection);
      setMainnet(latest);
    } catch (error) {
      console.warn('Failed to refresh mainnet blockhash cache:', error);
    } finally {
      mainnetInFlight.current = false;
    }
  }, [connection]);

  const refreshEphemeral = useCallback(async () => {
    if (!ephemeralConnection || ephemeralInFlight.current) return;
    ephemeralInFlight.current = true;
    try {
      const latest = await fetchLatestBlockhash(ephemeralConnection);
      setEphemeral(latest);
    } catch (error) {
      console.warn('Failed to refresh ephemeral blockhash cache:', error);
    } finally {
      ephemeralInFlight.current = false;
    }
  }, [ephemeralConnection]);

  useEffect(() => {
    if (!connection) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const latest = await fetchLatestBlockhash(connection);
        if (!cancelled) setMainnet(latest);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to bootstrap mainnet blockhash cache:', error);
        }
      }
    };

    bootstrap();
    let i = 0;
    mainnetSubId.current = connection.onSlotChange(() => {
      i++;
      if (i % 10 === 0) {
        void refreshMainnet();
      }
    });

    return () => {
      cancelled = true;
      if (mainnetSubId.current) {
        connection.removeSlotChangeListener(mainnetSubId.current);
        mainnetSubId.current = null;
      }
    };
  }, [connection, refreshMainnet]);

  useEffect(() => {
    if (!ephemeralConnection) {
      setEphemeral(EMPTY_ENTRY);
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      try {
        const latest = await fetchLatestBlockhash(ephemeralConnection);
        if (!cancelled) setEphemeral(latest);
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to bootstrap ephemeral blockhash cache:', error);
        }
      }
    };

    bootstrap();
    let i = 0;
    ephemeralSubId.current = ephemeralConnection.onSlotChange(() => {
      i++;
      if (i % 10 === 0) {
        void refreshEphemeral();
      }
    });

    return () => {
      cancelled = true;
      if (ephemeralSubId.current) {
        ephemeralConnection.removeSlotChangeListener(ephemeralSubId.current);
        ephemeralSubId.current = null;
      }
    };
  }, [ephemeralConnection, refreshEphemeral]);

  const value = useMemo(
    () => ({
      mainnet,
      ephemeral,
      refreshMainnet,
      refreshEphemeral,
    }),
    [mainnet, ephemeral, refreshMainnet, refreshEphemeral],
  );

  return <BlockhashCacheContext.Provider value={value}>{children}</BlockhashCacheContext.Provider>;
}

export function useBlockhashCache() {
  const context = useContext(BlockhashCacheContext);
  if (!context) {
    throw new Error('useBlockhashCache must be used within BlockhashCacheProvider');
  }
  return context;
}
