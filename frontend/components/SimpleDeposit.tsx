import React, { useCallback, useState } from 'react';

import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H2, Muted } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { CircleQuestionMark, Loader2Icon } from 'lucide-react';
import SimpleTransfer from '@/components/SimpleTransfer';
import { TokenListEntry } from '@/lib/types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';

interface SimpleDepositProps {
  token?: TokenListEntry;
}

export default function SimpleDeposit({ token }: SimpleDepositProps) {
  const { authToken, isAuthenticating, getToken } = usePrivateRollupAuth();
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

  return (
    <Card>
      <CardHeader>
        <H2>Transfer</H2>
      </CardHeader>
      <CardContent className='flex flex-col gap-4 items-center w-3xl mx-auto'>
        <div className='flex flex-col gap-4'>
          <Muted>
            In this simplified version, you just select an address you want to send tokens to, the
            amount you want to send, and all the underlying details are handled seamlessly.
          </Muted>
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='address'>Address</Label>
          <Input id='address' type='text' onChange={handleAddressChange} />
        </div>
        {!authToken && (
          <Button className='w-full' onClick={getToken} disabled={isAuthenticating}>
            Authenticate
            {isAuthenticating && <Loader2Icon className='animate-spin' />}
          </Button>
        )}
        <div className='flex gap-4'>
          {selectedAddress ? (
            <SimpleTransfer token={token} address={selectedAddress} />
          ) : (
            <Card>
              <CardHeader>
                <H2>Select an address</H2>
              </CardHeader>
              <CardContent className='flex flex-col gap-4 items-center my-auto text-center'>
                <CircleQuestionMark />
                <Muted>Select an address to continue.</Muted>
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
