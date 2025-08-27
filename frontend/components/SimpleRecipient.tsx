'use client';

import { PublicKey } from '@solana/web3.js';
import React, { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3, Muted } from '@/components/ui/typography';
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useSubscription } from '@/hooks/use-subscription';
import { useConnection } from '@solana/wallet-adapter-react';
import { useDeposit } from '@/hooks/use-deposit';
import { TokenListEntry } from '@/lib/types';
import { User, Wallet, Shield } from 'lucide-react';
import { shortKey } from '@/lib/utils';

interface TransferProps {
  user?: string;
  token?: TokenListEntry;
}

export default function SimpleRecipient({ user, token }: TransferProps) {
  const userPk = useMemo(() => {
    if (!user) return;
    try {
      return new PublicKey(user);
    } catch (err) {}
  }, [user]);
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | undefined>();
  const { mainnetDeposit, ephemeralDeposit, isDelegated, accessDenied } = useDeposit(
    user,
    token?.mint,
  );
  const deposit = useMemo(() => {
    if (isDelegated) return ephemeralDeposit;
    return mainnetDeposit;
  }, [isDelegated, ephemeralDeposit, mainnetDeposit]);
  const userTokenAccount = useMemo(() => {
    if (!token || !userPk) return;
    return getAssociatedTokenAddressSync(
      new PublicKey(token?.mint),
      userPk,
      true,
      TOKEN_PROGRAM_ID,
    );
  }, [token, userPk]);

  useEffect(() => {
    const getBalance = async () => {
      if (!token || !userPk) return;
      try {
        const balance = await connection.getTokenAccountBalance(
          getAssociatedTokenAddressSync(new PublicKey(token.mint), userPk, true, TOKEN_PROGRAM_ID),
        );
        setBalance(Number(balance.value.uiAmount));
      } catch (error) {
        console.error('Error getting balance:', error);
        setBalance(0);
      }
    };
    getBalance();
  }, [token, userPk, connection]);

  useSubscription(connection, userTokenAccount, notification => {
    const account = AccountLayout.decode(Uint8Array.from(notification.data));
    setBalance(Number(account.amount) / Math.pow(10, 6));
  });

  return (
    <Card className='h-full bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50'>
      <CardHeader className='bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-b border-border/50'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-emerald-600/10 rounded-lg'>
            <User className='w-6 h-6 text-emerald-600' />
          </div>
          <div className='flex-1'>
            <H3 className='!border-none !pb-0 text-foreground'>Recipient</H3>
            <Muted className='!text-emerald-700 dark:!text-emerald-300'>{user ? shortKey(user) : 'None selected'}</Muted>
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-6'>
        <div className='space-y-4'>
          <div className='grid grid-cols-1 gap-4'>
            <div className='p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <Wallet className='w-4 h-4 text-blue-600' />
                <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>Mainnet Balance</span>
              </div>
              <div className='text-2xl font-bold text-blue-900 dark:text-blue-100'>
                {balance ?? '???'}
              </div>
              <Muted className='!text-blue-600 dark:!text-blue-400'>SPL Tokens</Muted>
            </div>

            <div className='p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200/50 dark:border-purple-800/50 rounded-lg'>
              <div className='flex items-center gap-2 mb-2'>
                <Shield className='w-4 h-4 text-purple-600' />
                <span className='text-sm font-medium text-purple-700 dark:text-purple-300'>Private Balance</span>
              </div>
              <div className='text-2xl font-bold text-purple-900 dark:text-purple-100'>
                {isDelegated
                  ? '***'
                  : deposit
                    ? Number(deposit?.amount.toNumber()) / Math.pow(10, 6)
                    : '0'}
              </div>
              <Muted className='!text-purple-600 dark:!text-purple-400'>
                {isDelegated ? 'Private' : 'Encrypted'}
              </Muted>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
