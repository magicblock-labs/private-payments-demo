import { Connection } from '@solana/web3.js';
import { useMemo } from 'react';

import { EPHEMERAL_RPC_URL } from '../lib/constants';

import { usePrivateRollupAuth } from './use-private-rollup-auth';

export function useEphemeralConnection() {
  const { authToken } = usePrivateRollupAuth();
  const ephemeralConnection = useMemo(() => {
    if (authToken) {
      return new Connection(`${EPHEMERAL_RPC_URL}?token=${authToken}`, 'confirmed');
    }
    return null;
  }, [authToken]);

  return { ephemeralConnection };
}
