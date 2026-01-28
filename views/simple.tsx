'use client';

import SimplePage from '@/components/Simple';
import { Wallet } from '@/components/Wallet';
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
