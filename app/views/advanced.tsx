'use client';

import { Wallet } from '@/components/Wallet';
import AdvancedPage from '@/components/Advanced';

export default function Home() {
  return (
    <Wallet>
      <AdvancedPage />
    </Wallet>
  );
}
