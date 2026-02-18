'use client';

import SimplePage from '@/components/Simple';
import { Wallet } from '@/components/Wallet';
import { BlockhashCacheProvider } from '@/contexts/BlockhashCacheContext';
import { TokensProvider } from '@/contexts/TokensContext';

export default function Simple() {
  return (
    <Wallet>
      <BlockhashCacheProvider>
        <TokensProvider>
          <SimplePage />
        </TokensProvider>
      </BlockhashCacheProvider>
    </Wallet>
  );
}
