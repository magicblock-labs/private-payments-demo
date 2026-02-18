'use client';

import AdvancedPage from '@/components/Advanced';
import { Wallet } from '@/components/Wallet';
import { BlockhashCacheProvider } from '@/contexts/BlockhashCacheContext';
import { TokensProvider } from '@/contexts/TokensContext';

export default function Home() {
  return (
    <Wallet>
      <BlockhashCacheProvider>
        <TokensProvider>
          <AdvancedPage />
        </TokensProvider>
      </BlockhashCacheProvider>
    </Wallet>
  );
}
