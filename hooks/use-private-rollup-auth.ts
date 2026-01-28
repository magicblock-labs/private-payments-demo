import { EPHEMERAL_RPC_URL } from '../lib/constants';
import { getAuthToken } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const TOKENS_STORAGE_KEY = 'private-rollup-auth-tokens';
const TOKENS_CHANGE_EVENT = 'private-rollup-auth-tokens-changed';

// Generate a unique instance ID
let instanceCounter = 0;

type AuthToken = { token: string; expiresAt: number };

export function usePrivateRollupAuth() {
  const instanceId = useRef(++instanceCounter);
  const wallet = useAnchorWallet();
  const { signMessage } = useWallet();
  const [tokens, setTokensState] = useState<Record<string, AuthToken>>({});
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const isMountedRef = useRef(true);

  const authToken = useMemo(() => {
    let pk = wallet?.publicKey?.toBase58();
    if (pk) {
      let token = tokens[pk] ?? null;
      if (token?.expiresAt > Date.now()) {
        return token.token;
      }
    }
    return null;
  }, [tokens, wallet]);

  // Track component lifecycle
  useEffect(() => {
    isMountedRef.current = true;

    // Listen for custom token change events to sync across instances
    const handleTokenChange = (e: CustomEvent) => {
      if (isMountedRef.current && e.detail && typeof e.detail === 'object') {
        setTokensState(e.detail);
      }
    };

    window.addEventListener(TOKENS_CHANGE_EVENT, handleTokenChange as EventListener);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(TOKENS_CHANGE_EVENT, handleTokenChange as EventListener);
    };
  }, []);

  // Load tokens from localStorage whenever state is empty
  useEffect(() => {
    if (Object.keys(tokens).length === 0) {
      try {
        const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens);
          setTokensState(parsedTokens);
        }
      } catch {}
    }
  }, [tokens]); // Run whenever tokens state changes

  // Save tokens to localStorage whenever they change
  const setTokens = useCallback(
    (
      newTokens:
        | Record<string, AuthToken>
        | ((prev: Record<string, AuthToken>) => Record<string, AuthToken>),
    ) => {
      if (!isMountedRef.current) {
        return;
      }
      setTokensState(prevTokens => {
        const updatedTokens = typeof newTokens === 'function' ? newTokens(prevTokens) : newTokens;
        try {
          localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(updatedTokens));

          // Dispatch custom event to notify other instances
          const event = new CustomEvent(TOKENS_CHANGE_EVENT, { detail: updatedTokens });
          window.dispatchEvent(event);
        } catch {}
        return updatedTokens;
      });
    },
    [],
  );

  const getToken = useCallback(async () => {
    if (!wallet || !signMessage) return;

    setIsAuthenticating(true);

    try {
      const token = await getAuthToken(EPHEMERAL_RPC_URL, wallet.publicKey, signMessage);

      setTokens(oldTokens => ({
        ...oldTokens,
        [wallet.publicKey.toBase58()]: token,
      }));
      toast.success(`Authenticated ${wallet.publicKey.toBase58()} successfully`);
    } finally {
      setIsAuthenticating(false);
    }
  }, [wallet, signMessage, setTokens]);

  return { authToken, isAuthenticating, tokens, getToken };
}
