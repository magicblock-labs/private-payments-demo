import { TokenListEntry } from '@/lib/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const TOKENS_STORAGE_KEY = 'token-list';
const SELECTED_TOKEN_STORAGE_KEY = 'selected-token';
const TOKENS_CHANGE_EVENT = 'tokens-changed';
const SELECTED_TOKEN_CHANGE_EVENT = 'selected-token-changed';

export function useTokens() {
  const isMountedRef = useRef(true);
  const hasHydratedTokensRef = useRef(false);
  const hasHydratedSelectedTokenRef = useRef(false);
  const [tokenList, setTokenList] = useState<TokenListEntry[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
      return storedTokens ? (JSON.parse(storedTokens) as TokenListEntry[]) : [];
    } catch (error) {
      console.error('Error loading tokens:', error);
      return [];
    }
  });
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | undefined>(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    try {
      const storedSelectedToken = localStorage.getItem(SELECTED_TOKEN_STORAGE_KEY);
      return storedSelectedToken ? (JSON.parse(storedSelectedToken) as TokenListEntry) : undefined;
    } catch (error) {
      console.error('Error loading selected token:', error);
      return undefined;
    }
  });

  // Track component lifecycle
  useEffect(() => {
    isMountedRef.current = true;

    // Listen for custom token change events to sync across instances
    const handleTokensChange = (e: CustomEvent) => {
      if (isMountedRef.current && e.detail && Array.isArray(e.detail)) {
        setTokenList(e.detail);
      }
    };
    const handleSelectedTokenChange = (e: CustomEvent) => {
      if (isMountedRef.current && e.detail && typeof e.detail === 'object') {
        setSelectedToken(e.detail);
      }
    };

    window.addEventListener(TOKENS_CHANGE_EVENT, handleTokensChange as EventListener);
    window.addEventListener(
      SELECTED_TOKEN_CHANGE_EVENT,
      handleSelectedTokenChange as EventListener,
    );

    return () => {
      isMountedRef.current = false;
      window.removeEventListener(TOKENS_CHANGE_EVENT, handleTokensChange as EventListener);
      window.removeEventListener(
        SELECTED_TOKEN_CHANGE_EVENT,
        handleSelectedTokenChange as EventListener,
      );
    };
  }, []);

  // Save tokens to localStorage whenever they change
  const setTokens = useCallback(
    (newTokens: TokenListEntry[] | ((prev: TokenListEntry[]) => TokenListEntry[])) => {
      if (!isMountedRef.current) {
        return;
      }
      setTokenList(prevTokens =>
        typeof newTokens === 'function' ? newTokens(prevTokens) : newTokens,
      );
    },
    [],
  );

  const setToken = useCallback(
    (
      newToken:
        | TokenListEntry
        | undefined
        | ((prev: TokenListEntry | undefined) => TokenListEntry | undefined),
    ) => {
      if (!isMountedRef.current) {
        return;
      }
      setSelectedToken(prevToken =>
        typeof newToken === 'function' ? newToken(prevToken) : newToken,
      );
    },
    [],
  );

  useEffect(() => {
    if (!hasHydratedTokensRef.current) {
      hasHydratedTokensRef.current = true;
      return;
    }
    if (!isMountedRef.current) {
      return;
    }
    try {
      localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokenList));
      const event = new CustomEvent(TOKENS_CHANGE_EVENT, { detail: tokenList });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }, [tokenList]);

  useEffect(() => {
    if (!hasHydratedSelectedTokenRef.current) {
      hasHydratedSelectedTokenRef.current = true;
      return;
    }
    if (!isMountedRef.current) {
      return;
    }
    try {
      localStorage.setItem(SELECTED_TOKEN_STORAGE_KEY, JSON.stringify(selectedToken));
      const event = new CustomEvent(SELECTED_TOKEN_CHANGE_EVENT, { detail: selectedToken });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error saving selected token:', error);
    }
  }, [selectedToken]);

  return { tokenList, selectedToken, setTokens, setToken };
}
