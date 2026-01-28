'use client';

import { Wallet } from '@/components/Wallet';
import SimplePage from '@/components/Simple';
import { BlockhashCacheProvider } from '@/contexts/BlockhashCacheContext';

export default function Simple() {
  return (
    <Wallet>
      <BlockhashCacheProvider>
        <SimplePage />
      </BlockhashCacheProvider>
    </Wallet>
  );
}
