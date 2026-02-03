'use client';

import { useTokenAccountContext } from '@/contexts/TokenAccountContext';
import { useProgram } from '../hooks/use-program';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { H3 } from './ui/typography';
import { TokenListEntry } from '@/lib/types';
import { PublicKey } from '@solana/web3.js';
import { Loader2Icon } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface TransferProps {
  token?: TokenListEntry;
  isMainnet?: boolean;
  user?: string;
}

const Transfer: React.FC<TransferProps> = ({ token, user, isMainnet }) => {
  const { transfer } = useProgram();
  const [isTransferring, setIsTransferring] = useState(false);
  const [amount, setAmount] = useState(0);
  const { selectedAddress, setSelectedAddress } = useTokenAccountContext();

  const handleTransfer = useCallback(
    async (delegated: boolean) => {
      if (!token || !selectedAddress) return;
      setIsTransferring(true);
      try {
        await transfer(
          new PublicKey(token.mint),
          amount,
          new PublicKey(selectedAddress),
          delegated,
        );
        toast.success(`Transferred ${amount} tokens to ${selectedAddress}`);
      } catch (error) {
        toast.error(`Error transferring tokens: ${error}`);
      } finally {
        setIsTransferring(false);
      }
    },
    [token, transfer, amount, selectedAddress],
  );

  return (
    <Card>
      <CardHeader>
        <H3>Transfer</H3>
        <Separator />
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='address'>Address</Label>
          <Input id='address' type='text' onChange={e => setSelectedAddress(e.target.value)} />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='amount'>Amount</Label>
          <Input
            id='amount'
            type='number'
            defaultValue={amount}
            onChange={e => setAmount(Number(e.target.value))}
          />
        </div>
        {isMainnet ? (
          <Button
            className='w-full'
            onClick={() => handleTransfer(false)}
            disabled={isTransferring || !selectedAddress || user === selectedAddress}
          >
            Transfer
            {isTransferring && <Loader2Icon className='animate-spin' />}
          </Button>
        ) : (
          <Button
            className='w-full'
            onClick={() => handleTransfer(true)}
            disabled={isTransferring || !selectedAddress || user === selectedAddress}
          >
            Delegated transfer
            {isTransferring && <Loader2Icon className='animate-spin' />}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default Transfer;
