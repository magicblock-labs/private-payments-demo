import { AnchorProvider } from '@coral-xyz/anchor';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';

import { useEphemeralConnection } from './use-ephemeral-connection';

export function useProvider() {
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const wallet = useAnchorWallet();

  const provider = useMemo(() => {
    if (!wallet) return;
    return new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
  }, [wallet, connection]);

  const ephemeralProvider = useMemo(() => {
    if (!ephemeralConnection || !wallet) return;
    return new AnchorProvider(ephemeralConnection, wallet, {
      commitment: 'confirmed',
    });
  }, [wallet, ephemeralConnection]);

  return { ephemeralProvider, provider };
}
