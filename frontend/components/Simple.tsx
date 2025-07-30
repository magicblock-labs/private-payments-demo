'use client';

import React from 'react';

import Tokens from '@/components/Tokens';
import VerificationToast from '@/components/VerificationToast';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import magicBlockLogo from '@/public/magicblock_white.png';
import Navbar from './Navbar';
import SimpleDeposit from './SimpleDeposit';
import { useTokens } from '@/hooks/use-tokens';

export default function SimplePage() {
  const wallet = useAnchorWallet();
  const { selectedToken: token } = useTokens();

  return (
    <div className='container flex flex-col gap-4 mx-auto mt-5 justify-center items-center'>
      <Navbar />

      <Tokens />
      {token && wallet?.publicKey && <SimpleDeposit />}

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
