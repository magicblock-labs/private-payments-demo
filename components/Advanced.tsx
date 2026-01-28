'use client';

import Navbar from './Navbar';
import { Muted } from './ui/typography';
import Deposit from '@/components/Deposit';
import Tokens from '@/components/Tokens';
import VerificationToast from '@/components/VerificationToast';
import magicBlockLogo from '@/public/magicblock_white.png';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Settings } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

export default function HomePage() {
  const wallet = useAnchorWallet();

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
            <div className='flex items-center justify-center gap-3'>
              <Settings className='w-8 h-8 text-purple-600' />
              <h1 className='text-5xl font-bold bg-linear-to-r from-purple-600 via-pink-600 to-indigo-600 bg-clip-text text-transparent'>
                Advanced Mode
              </h1>
            </div>
            <p className='text-xl text-muted-foreground leading-relaxed'>
              Full control over your private payments with advanced features and detailed management
              options.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className='flex flex-col gap-8 max-w-6xl mx-auto w-full'>
          <Tokens deposit />
          {wallet?.publicKey && (
            <>
              <Deposit />
              <div className='flex justify-center'>
                <Link href='/' className='text-center'>
                  <Muted className='hover:text-foreground transition-colors duration-200 cursor-pointer'>
                    ← Go to the simple view
                  </Muted>
                </Link>
              </div>
            </>
          )}
        </div>

        <VerificationToast />
      </div>
    </div>
  );
}
