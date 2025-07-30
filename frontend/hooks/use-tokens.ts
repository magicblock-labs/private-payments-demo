import { useCallback, useState, useEffect, useRef } from 'react';

import { TokenListEntry } from '@/lib/types';

const TOKENS_STORAGE_KEY = 'token-list';
const SELECTED_TOKEN_STORAGE_KEY = 'selected-token';
const TOKENS_CHANGE_EVENT = 'tokens-changed';
const SELECTED_TOKEN_CHANGE_EVENT = 'selected-token-changed';

// Generate a unique instance ID
let instanceCounter = 0;

export function useTokens() {
  const instanceId = useRef(++instanceCounter);
  const isMountedRef = useRef(true);
  const [tokenList, setTokenList] = useState<TokenListEntry[]>([]);
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | undefined>();

  // Track component lifecycle
  useEffect(() => {
    isMountedRef.current = true;

    // Listen for custom token change events to sync across instances
    const handleTokensChange = (e: CustomEvent) => {
      console.log('handleTokensChange', e.detail);
      if (e.detail && Array.isArray(e.detail)) {
        setTokenList(e.detail);
      }
    };
    const handleSelectedTokenChange = (e: CustomEvent) => {
      console.log('handleSelectedTokenChange', e.detail);
      if (e.detail && typeof e.detail === 'object') {
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

  // Load tokens from localStorage on mount
  useEffect(() => {
    try {
      const storedTokens = localStorage.getItem(TOKENS_STORAGE_KEY);
      if (storedTokens) {
        const parsedTokens = JSON.parse(storedTokens);
        setTokenList(parsedTokens);
      }
    } catch (error) {
      console.error(
        `[Instance ${instanceId.current}] Error loading tokens from localStorage:`,
        error,
      );
    }
  }, []); // Only run on mount

  // Load selected token from localStorage on mount
  useEffect(() => {
    try {
      const storedSelectedToken = localStorage.getItem(SELECTED_TOKEN_STORAGE_KEY);
      if (storedSelectedToken) {
        const parsedToken = JSON.parse(storedSelectedToken);
        setSelectedToken(parsedToken);
      }
    } catch (error) {
      console.error(
        `[Instance ${instanceId.current}] Error loading selected token from localStorage:`,
        error,
      );
    }
  }, []); // Only run on mount

  // Save tokens to localStorage whenever they change
  const setTokens = useCallback(
    (newTokens: TokenListEntry[] | ((prev: TokenListEntry[]) => TokenListEntry[])) => {
      if (!isMountedRef.current) {
        return;
      }
      setTokenList(prevTokens => {
        const updatedTokens = typeof newTokens === 'function' ? newTokens(prevTokens) : newTokens;
        try {
          localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(updatedTokens));

          // Dispatch custom event to notify other instances
          const event = new CustomEvent(TOKENS_CHANGE_EVENT, { detail: updatedTokens });
          window.dispatchEvent(event);
        } catch (error) {
          console.error(
            `[Instance ${instanceId.current}] Error saving tokens to localStorage:`,
            error,
          );
        }
        return updatedTokens;
      });
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
      setSelectedToken(prevToken => {
        const updatedToken = typeof newToken === 'function' ? newToken(prevToken) : newToken;
        try {
          localStorage.setItem(SELECTED_TOKEN_STORAGE_KEY, JSON.stringify(updatedToken));

          // Dispatch custom event to notify other instances
          const event = new CustomEvent(SELECTED_TOKEN_CHANGE_EVENT, { detail: updatedToken });
          window.dispatchEvent(event);
        } catch (error) {
          console.error(
            `[Instance ${instanceId.current}] Error saving selected token to localStorage:`,
            error,
          );
        }
        return updatedToken;
      });
    },
    [],
  );

  return { tokenList, selectedToken, setTokens, setToken };
}
