import init, { js_get_collateral, js_verify } from '@phala/dcap-qvl-web';
import { useCallback, useEffect, useState } from 'react';
import { EPHEMERAL_RPC_URL } from '../lib/constants';

export function useTdxQuoteVerification() {
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const verifyQuote = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    const challengeBytes = Buffer.from(
      Uint8Array.from(
        Array(32)
          .fill(0)
          .map(() => Math.floor(Math.random() * 256)),
      ),
    );
    const challenge = challengeBytes.toString('base64');
    const url = `${EPHEMERAL_RPC_URL}/quote?challenge=${encodeURIComponent(challenge)}`;

    try {
      const response = await fetch(url);
      const responseJson = await response.json();

      if (responseJson.error) {
        throw new Error(responseJson.error);
      }

      const { quote }: { quote: string } = responseJson;

      // Initialize the WASM module
      await init();

      const rawQuote = Uint8Array.from(Buffer.from(quote, 'base64'));

      // Get the quote collateral
      // const pccs_url = 'https://pccs.dodecahedr0x.xyz/';
      // const pccs_url = 'https://api.trustedservices.intel.com/';
      const pccs_url = 'https://pccs.phala.network/tdx/certification/v4';
      const quoteCollateral = await js_get_collateral(pccs_url, rawQuote);

      // Current timestamp
      const now = BigInt(Math.floor(Date.now() / 1000));

      // Call the js_verify function
      const result = js_verify(rawQuote, quoteCollateral, now);

      setIsVerified(true);
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
