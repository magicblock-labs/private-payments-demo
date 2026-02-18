import { EPHEMERAL_RPC_URL } from '../lib/constants';
import { logger } from '@/lib/log';
import { verifyTeeRpcIntegrity } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useCallback, useEffect, useState } from 'react';

export function useTdxQuoteVerification() {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tries, setTries] = useState(0);

  const verifyQuote = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setTries(old => old + 1);

    try {
      const isVerified = await verifyTeeRpcIntegrity(EPHEMERAL_RPC_URL);
      setIsVerified(isVerified);
    } catch (error) {
      logger.error('Error verifying quote:', error);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isVerified && !isLoading && tries < 3) {
        // Initial verification
        verifyQuote();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isVerified, isLoading, verifyQuote, tries]);

  return { isVerified, isLoading, verifyQuote };
}
