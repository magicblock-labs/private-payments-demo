'use client';

import { Wallet } from '@/components/Wallet';
import AdvancedPage from '@/components/Advanced';
import { BlockhashCacheProvider } from '@/contexts/BlockhashCacheContext';

export default function Home() {
  return (
    <Wallet>
      <BlockhashCacheProvider>
        <AdvancedPage />
      </BlockhashCacheProvider>
    </Wallet>
  );
}
