'use client';

import AdvancedPage from '@/components/Advanced';
import { Wallet } from '@/components/Wallet';
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
