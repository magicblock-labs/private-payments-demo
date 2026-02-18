'use client';

import Navbar from './Navbar';
import SimpleDeposit from './SimpleDeposit';
import { Muted } from './ui/typography';
import Tokens from '@/components/Tokens';
import VerificationToast from '@/components/VerificationToast';
import { TokenAccountProvider } from '@/contexts/TokenAccountContext';
import { useTokensContext } from '@/contexts/TokensContext';
import magicBlockLogo from '@/public/magicblock_white.png';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

export default function SimplePage() {
  const wallet = useAnchorWallet();
  const { selectedToken: token } = useTokensContext();

  return (
    <div className='min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800'>
      <div className='container flex flex-col gap-8 mx-auto px-4 py-8'>
        {/* Header Section */}
        <div className='flex flex-col items-center text-center space-y-6'>
          <div className='flex items-center justify-between w-full'>
            <div className='flex items-center gap-3'>
              <Image
                src={magicBlockLogo.src}
                height={40}
                width={120}
                alt='Magic Block Logo'
                className='dark:invert-0'
              />
            </div>
            <Navbar />
          </div>

          <div className='space-y-4 max-w-3xl'>
            <h1 className='text-5xl font-bold bg-linear-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent'>
              Private Payments
            </h1>
            <p className='text-xl text-muted-foreground leading-relaxed'>
              Create and manage private tokens on the blockchain with enterprise-grade security and
              seamless user experience.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <TokenAccountProvider token={token}>
          <div className='flex flex-col gap-8 max-w-6xl mx-auto w-full'>
            <Tokens />
            {token && wallet?.publicKey && (
              <>
                <SimpleDeposit />
                <div className='flex justify-center'>
                  <Link href='/advanced' className='text-center'>
                    <Muted className='hover:text-foreground transition-colors duration-200 cursor-pointer'>
                      Go to the advanced view →
                    </Muted>
                  </Link>
                </div>
              </>
            )}
          </div>
        </TokenAccountProvider>

        <VerificationToast />
      </div>
    </div>
  );
}
