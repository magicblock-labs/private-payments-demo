'use client';

import React from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3, Muted } from '@/components/ui/typography';
import { useTokenAccountContext } from '@/contexts/TokenAccountContext';
import { User, Wallet, Shield } from 'lucide-react';
import { shortKey } from '@/lib/utils';

interface TransferProps {
  user?: string;
}

export default function SimpleRecipient({ user }: TransferProps) {
  const { recipientAccounts } = useTokenAccountContext();
  const { ephemeralAta, mainnetAta, isDelegated } = recipientAccounts;

  function mainnetBalance(): string {
    if (mainnetAta) {
      return (Number(mainnetAta.amount) / Math.pow(10, 6)).toFixed(2);
    } else {
      return '0';
    }
  }

  function ephemeralBalance(): string {
    if (ephemeralAta) {
      return (Number(ephemeralAta.amount) / Math.pow(10, 6)).toFixed(2);
    } else {
      return '***';
    }
  }

  return (
    <Card className='h-full bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50'>
      <CardHeader className='bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-border/50'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-emerald-600/10 rounded-lg'>
            <User className='w-6 h-6 text-emerald-600' />
          </div>
          <div className='flex-1'>
            <H3 className='border-none! pb-0! text-foreground'>Recipient</H3>
            <Muted className='text-emerald-700! dark:text-emerald-300!'>
              {user ? shortKey(user) : 'None selected'}
            </Muted>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-6'>
        <div className='space-y-4'>
          <div className='grid grid-cols-1 gap-4'>
            <div className='p-4 bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <Wallet className='w-4 h-4 text-blue-600' />
                <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                  Mainnet Balance
                </span>
              </div>
              <div className='text-2xl font-bold text-blue-900 dark:text-blue-100'>
                {mainnetBalance()}
              </div>
              <Muted className='text-blue-600! dark:text-blue-400!'>SPL Tokens</Muted>
            </div>

            <div className='p-4 bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200/50 dark:border-purple-800/50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <Shield className='w-4 h-4 text-purple-600' />
                <span className='text-sm font-medium text-purple-700 dark:text-purple-300'>
                  Private Balance
                </span>
              </div>
              <div className='text-2xl font-bold text-purple-900 dark:text-purple-100'>
                {ephemeralBalance()}
              </div>
              <Muted className='text-purple-600! dark:text-purple-400!'>
                {isDelegated ? 'Private' : 'Encrypted'}
              </Muted>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
