'use client';

import { PublicKey } from '@solana/web3.js';
import React, { useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3, Large } from '@/components/ui/typography';
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useSubscription } from '@/hooks/use-subscription';
import { useConnection } from '@solana/wallet-adapter-react';
import { useDeposit } from '@/hooks/use-deposit';
import { Separator } from './ui/separator';
import { TokenListEntry } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

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
    <Card>
      <CardHeader>
        <H3>Recipient</H3>
        <Separator />
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div>
          <Large>Balances</Large>
          <Accordion type='multiple' className='w-full' defaultValue={['item-1', 'item-2']}>
            <AccordionItem value='item-1'>
              <AccordionTrigger>Mainnet SPL Balance</AccordionTrigger>
              <AccordionContent className='flex flex-col gap-4 text-center text-2xl font-semibold'>
                {balance ?? '???'}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value='item-2'>
              <AccordionTrigger>Private balance</AccordionTrigger>
              <AccordionContent className='flex flex-col gap-4 text-center text-2xl font-semibold'>
                {isDelegated
                  ? '***'
                  : deposit
                    ? Number(deposit?.amount.toNumber()) / Math.pow(10, 6)
                    : '0'}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  );
}
