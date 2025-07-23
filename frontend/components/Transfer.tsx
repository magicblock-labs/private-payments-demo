'use client';

import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useState } from 'react';

import { TokenListEntry } from './Deposit';
import { useProgram } from '../hooks/use-program';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { H3 } from './ui/typography';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import { Loader2Icon } from 'lucide-react';

interface TransferProps {
  token?: TokenListEntry;
  address?: string;
}

const Transfer: React.FC<TransferProps> = ({ token, address }) => {
  const { transfer } = useProgram();
  const [isTransferring, setIsTransferring] = useState(false);
  const [amount, setAmount] = useState(0);

  const handleTransfer = useCallback(
    async (delegated: boolean) => {
      if (!token || !address) return;
      setIsTransferring(true);
      try {
        await transfer(new PublicKey(token.mint), amount, new PublicKey(address), delegated);
        toast.success(`Transferred ${amount} tokens to ${address}`);
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
      {address ? (
        <>
          <CardContent>
            <div className='flex flex-col gap-2 mb-4'>
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
              onClick={() => handleTransfer(false)}
              disabled={isTransferring}
            >
              Transfer
              {isTransferring && <Loader2Icon className='animate-spin' />}
            </Button>
            <Button
              className='w-full'
              onClick={() => handleTransfer(true)}
              disabled={isTransferring}
            >
              Delegated transfer
              {isTransferring && <Loader2Icon className='animate-spin' />}
            </Button>
          </CardFooter>
        </>
      ) : (
        <CardContent>
          <H3>No address selected</H3>
        </CardContent>
      )}
    </Card>
  );
};

export default Transfer;
