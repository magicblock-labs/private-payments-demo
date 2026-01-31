import { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { AccountInfo } from '@solana/web3.js';
import { useEffect, useRef } from 'react';

export function useSubscription(
  connection: Connection | null,
  account?: PublicKey | string,
  onAccountChange?: (accountInfo: AccountInfo<Buffer>) => void,
) {
  const subscriptionId = useRef<number | null>(null);

  useEffect(() => {
    if (!connection || !account || !onAccountChange) return;

    const subscribe = async () => {
      // Clean up any existing subscription
      if (subscriptionId.current) {
        connection.removeAccountChangeListener(subscriptionId.current);
        subscriptionId.current = null;
      }

      try {
        const publicKey = new PublicKey(account);
        subscriptionId.current = connection.onAccountChange(publicKey, onAccountChange);
      } catch (error) {
        console.error('Error getting account info:', error);
      }
    };

    subscribe();

    return () => {
      if (subscriptionId.current) {
        try {
          connection.removeAccountChangeListener(subscriptionId.current);
          subscriptionId.current = null;
        } catch (error) {
          console.error('Error removing account subscription:', error);
        }
      }
    };
  }, [connection, account, onAccountChange]);
}
