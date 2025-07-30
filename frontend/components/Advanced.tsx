'use client';

import React, { useState } from 'react';

import Deposit from '@/components/Deposit';
import Tokens from '@/components/Tokens';
import VerificationToast from '@/components/VerificationToast';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import magicBlockLogo from '@/public/magicblock_white.png';
import Navbar from './Navbar';
import { TokenListEntry } from '@/lib/types';

export default function HomePage() {
  const wallet = useAnchorWallet();

  return (
    <div className='container flex flex-col gap-4 mx-auto mt-5 justify-center items-center'>
      <Navbar />

      <Tokens />
      {wallet?.publicKey && <Deposit />}

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
