import { bs58 } from '@coral-xyz/anchor/dist/cjs/utils/bytes';
import { useAnchorWallet, useLocalStorage, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useMemo, useState } from 'react';

import { EPHEMERAL_RPC_URL } from '../lib/constants';
import { toast } from 'sonner';

const SESSION_DURATION = 1000 * 60 * 60 * 24 * 30; // 30 days

export function usePrivateRollupAuth() {
  const wallet = useAnchorWallet();
  const { signMessage } = useWallet();
  const [tokens, setTokens] = useLocalStorage<Record<string, string>>('tokens', {});
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authToken = useMemo(() => {
    return wallet?.publicKey?.toBase58() && tokens[wallet?.publicKey?.toBase58()];
  }, [tokens, wallet]);

  const getToken = useCallback(async () => {
    if (!wallet || !signMessage) return;

    setIsAuthenticating(true);

    try {
      const challengeResponse = await fetch(
        `${EPHEMERAL_RPC_URL}/auth/challenge?pubkey=${wallet.publicKey.toBase58()}`,
      );
      const challengeJson: { challenge: string } = await challengeResponse.json();
      console.log('challengeJson', challengeJson);

      const signature = await signMessage(
        new Uint8Array(Buffer.from(challengeJson.challenge, 'utf-8')),
      );
      const signatureString = bs58.encode(signature);

      const authResponse = await fetch(`${EPHEMERAL_RPC_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({
          pubkey: wallet.publicKey.toBase58(),
          message: challengeJson.challenge,
          signed_message: signatureString,
        }),
      });
      const authJson = await authResponse.json();

      if (authResponse.status !== 200) {
        throw new Error(`Failed to authenticate: ${authJson.error.message}`);
      }

      setTokens({
        ...tokens,
        [wallet.publicKey.toBase58()]: authJson.token,
      });
      toast.success(`Authenticated ${wallet.publicKey.toBase58()} successfully`);
    } catch (error) {
      console.error('Error getting token:', error);
    } finally {
      setIsAuthenticating(false);
    }
  }, [wallet, signMessage, tokens, setTokens]);

  return { authToken, isAuthenticating, tokens, getToken };
}
