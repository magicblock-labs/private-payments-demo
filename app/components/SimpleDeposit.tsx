import React, { useState } from 'react';

import AddressBook from '@/components/AddressBook';
import { useAddressBook } from '@/hooks/use-address-book';
import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H2, Muted } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { CircleQuestionMark, Loader2Icon } from 'lucide-react';
import SimpleTransfer from '@/components/SimpleTransfer';
import { Separator } from './ui/separator';

export interface TokenListEntry {
  mint: string;
  creator: string;
}

interface SimpleDepositProps {
  token?: TokenListEntry;
}

export default function SimpleDeposit({ token }: SimpleDepositProps) {
  const { authToken, isAuthenticating, getToken } = usePrivateRollupAuth();
  const wallet = useAnchorWallet();
  const { addressBook } = useAddressBook(wallet?.publicKey);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(addressBook[0]);

  return (
    <Card>
      <CardHeader>
        <H2>Transfer</H2>
      </CardHeader>
      <CardContent className='flex flex-col gap-4 items-center max-w-5xl mx-auto'>
        <div className='flex flex-col gap-4'>
          <Muted>
            In this simplified version, you just select an address you want to send tokens to, the
            amount you want to send, and all the underlying details are handled seamlessly.
          </Muted>
        </div>
        {!authToken && (
          <Button className='w-full' onClick={getToken} disabled={isAuthenticating}>
            Authenticate
            {isAuthenticating && <Loader2Icon className='animate-spin' />}
          </Button>
        )}
        <div className='flex gap-4'>
          <AddressBook setSelectedAddress={setSelectedAddress} />
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
