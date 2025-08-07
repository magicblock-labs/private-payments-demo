import { useCallback, useEffect, useState } from 'react';
import { EPHEMERAL_RPC_URL } from '../lib/constants';
import { verifyTeeRpcIntegrity } from '@magicblock-labs/ephemeral-rollups-sdk/privacy';

export function useTdxQuoteVerification() {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const verifyQuote = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const isVerified = await verifyTeeRpcIntegrity(EPHEMERAL_RPC_URL);
      setIsVerified(isVerified);
    } catch (error) {
      console.error('Error verifying quote:', error);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const resetVerification = useCallback(() => {
    verifyQuote();
  }, [verifyQuote]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isVerified && !isLoading) {
        // Initial verification
        verifyQuote();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isVerified, isLoading, verifyQuote]);

  return { isVerified, isLoading, resetVerification };
}
