import { useCallback, useMemo } from 'react';
import { SessionTokenManager } from '@magicblock-labs/gum-sdk';
import { useProvider } from './use-provider';
import { useLocalStorage } from '@solana/wallet-adapter-react';
import { Keypair } from '@solana/web3.js';
import { BN } from 'bn.js';
import { PAYMENTS_PROGRAM } from '@/lib/constants';

export function useSessionManager() {
  const [sessionSecretKey, setSessionSecretKey] = useLocalStorage(
    'session-secret-key',
    Keypair.generate().secretKey,
  );
  const sessionKp = useMemo(() => Keypair.fromSecretKey(sessionSecretKey), [sessionSecretKey]);
  const { provider } = useProvider();
  const sessionManager = useMemo(() => {
    if (!provider) return;
    return new SessionTokenManager(provider.wallet, provider.connection);
  }, [provider]);

  const createSessionTx = useCallback(async () => {
    if (!provider || !sessionManager) return;
    const tx = await sessionManager.program.methods
      .createSession(true, null, null)
      .accounts({
        sessionSigner: sessionKp.publicKey,
        authority: provider.wallet.publicKey,
        targetProgram: PAYMENTS_PROGRAM,
      })
      .transaction();
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;
    tx.feePayer = provider.wallet.publicKey;
    tx.partialSign(sessionKp);
    return tx;
  }, [sessionManager, sessionKp]);

  return {
    sessionManager,
  };
}
