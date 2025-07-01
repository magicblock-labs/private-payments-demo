'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import React, { useState } from 'react';

import Deposit, { TokenListEntry } from '@/components/Deposit';
import Tokens from '@/components/Tokens';
import VerificationToast from '@/components/VerificationToast';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import magicBlockLogo from '@/public/magicblock_white.png';

export default function HomePage() {
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | null>(null);
  const wallet = useAnchorWallet();

  return (
    <div className='container flex flex-col gap-4 mx-auto mt-5 justify-center items-center'>
      <div className='w-fit'>
        <WalletMultiButton />
      </div>

      {selectedToken && wallet?.publicKey && <Deposit token={selectedToken} />}
      <Tokens setSelected={setSelectedToken} />

      <VerificationToast />

      <img
        src={magicBlockLogo.src}
        height={100}
        width={200}
        alt='Magic Block Logo'
        className='fixed bottom-4 left-4'
      />
    </div>
  );
}
