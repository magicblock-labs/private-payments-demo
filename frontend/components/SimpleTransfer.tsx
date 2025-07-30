'use client';

import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { H3, Large, Muted } from '@/components/ui/typography';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useSubscription } from '@/hooks/use-subscription';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Loader2Icon } from 'lucide-react';
import useSimpleTransfer from '@/hooks/use-simple-transfer';
import { useDeposit } from '@/hooks/use-deposit';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import { TokenListEntry } from '@/lib/types';

interface TransferProps {
  token?: TokenListEntry;
}

export default function SimpleTransfer({ token }: TransferProps) {
  const { transfer } = useSimpleTransfer();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [isTransferring, setIsTransferring] = useState(false);
  const [amount, setAmount] = useState(0);
  const [balance, setBalance] = useState<number | undefined>();
  const { deposit, isDelegated } = useDeposit(wallet?.publicKey, token?.mint);
  const userTokenAccount = useMemo(() => {
    if (!token || !wallet?.publicKey) return;
    return getAssociatedTokenAddressSync(
      new PublicKey(token?.mint),
      wallet.publicKey,
      true,
      TOKEN_PROGRAM_ID,
    );
  }, [token, wallet]);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        new PublicKey(e.target.value);
        setSelectedAddress?.(e.target.value);
      } catch (error) {
        toast.error('Invalid address');
      }
    },
    [setSelectedAddress],
  );

  const handleTransfer = useCallback(async () => {
    if (!token || !selectedAddress) return;
    setIsTransferring(true);
    try {
      await transfer(selectedAddress, token.mint, amount);
      toast.success(`Transferred ${amount} tokens to ${selectedAddress}`);
    } finally {
      setIsTransferring(false);
    }
  }, [token, transfer, amount, selectedAddress]);

  useEffect(() => {
    const getBalance = async () => {
      if (!token || !wallet?.publicKey) return;
      try {
        const balance = await connection.getTokenAccountBalance(
          getAssociatedTokenAddressSync(
            new PublicKey(token.mint),
            wallet.publicKey,
            true,
            TOKEN_PROGRAM_ID,
          ),
        );
        setBalance(Number(balance.value.uiAmount));
      } catch (error) {
        console.error('Error getting balance:', error);
        setBalance(0);
      }
    };
    getBalance();
  }, [token, wallet, connection]);

  useSubscription(connection, userTokenAccount, notification => {
    const account = AccountLayout.decode(Uint8Array.from(notification.data));
    setBalance(Number(account.amount) / Math.pow(10, 6));
  });

  return (
    <Card>
      <CardHeader>
        <H3>Transfer</H3>
        <Separator />
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div>
          <Large>Balance: {balance ?? '???'}</Large>
          <Muted>
            {isDelegated ? 'Delegated balance: ' : 'Deposit balance: '}{' '}
            {deposit ? deposit.amount.toNumber() / Math.pow(10, 6) : '???'}
          </Muted>
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='address'>Address</Label>
          <Input id='address' type='text' onChange={handleAddressChange} />
        </div>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='amount'>Amount</Label>
          <Input
            id='amount'
            type='number'
            defaultValue={amount}
            onChange={e => setAmount(Number(e.target.value))}
          />
        </div>
      </CardContent>
      <CardFooter className='flex flex-col gap-2 w-full'>
        <Button
          className='w-full'
          onClick={handleTransfer}
          disabled={isTransferring || !selectedAddress}
        >
          Transfer
          {isTransferring ? <Loader2Icon className='animate-spin' /> : null}
        </Button>
      </CardFooter>
    </Card>
  );
}
