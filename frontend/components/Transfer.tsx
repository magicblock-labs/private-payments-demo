'use client';

import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useState } from 'react';

import { useProgram } from '../hooks/use-program';
import { Card, CardContent, CardHeader } from './ui/card';
import { H3, Muted } from './ui/typography';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import { Loader2Icon } from 'lucide-react';
import { TokenListEntry } from '@/lib/types';

interface TransferProps {
  token?: TokenListEntry;
  setSelectedAddress?: (address: string | undefined) => void;
  isMainnet?: boolean;
  user?: string;
}

const Transfer: React.FC<TransferProps> = ({ token, setSelectedAddress, user, isMainnet }) => {
  const { transfer } = useProgram();
  const [isTransferring, setIsTransferring] = useState(false);
  const [amount, setAmount] = useState(0);
  const [address, setAddress] = useState<string | undefined>(undefined);

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      try {
        new PublicKey(e.target.value);
        setAddress(e.target.value);
        setSelectedAddress?.(e.target.value);
      } catch (error) {
        setSelectedAddress?.(undefined);
        toast.error('Invalid address');
      }
    },
    [setSelectedAddress],
  );

  const handleTransfer = useCallback(
    async (delegated: boolean) => {
      if (!token || !address) return;
      setIsTransferring(true);
      try {
        await transfer(new PublicKey(token.mint), amount, new PublicKey(address), delegated);
        toast.success(`Transferred ${amount} tokens to ${address}`);
      } catch (error) {
        toast.error(`Error transferring tokens: ${error}`);
      } finally {
        setIsTransferring(false);
      }
    },
    [token, transfer, amount, address],
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
          <Input id='address' type='text' onChange={handleAddressChange} />
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
            disabled={isTransferring || !address || user === address}
          >
            Transfer
            {isTransferring && <Loader2Icon className='animate-spin' />}
          </Button>
        ) : (
          <Button
            className='w-full'
            onClick={() => handleTransfer(true)}
            disabled={isTransferring || !address || user === address}
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
