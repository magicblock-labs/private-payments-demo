'use client';

import React, { useState } from 'react';

import { TokenListEntry } from '@/components/Deposit';
import Tokens from '@/components/Tokens';
import VerificationToast from '@/components/VerificationToast';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import magicBlockLogo from '@/public/magicblock_white.png';
import Navbar from './Navbar';
import SimpleDeposit from './SimpleDeposit';

export default function SimplePage() {
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | null>(null);
  const wallet = useAnchorWallet();

  return (
    <div className='container flex flex-col gap-4 mx-auto mt-5 justify-center items-center'>
      <Navbar />

      {selectedToken && wallet?.publicKey && <SimpleDeposit token={selectedToken} />}
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
