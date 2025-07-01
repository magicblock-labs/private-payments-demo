import React, { useState } from 'react';

import AddressBook from '@/components/AddressBook';
import { useAddressBook } from '@/hooks/use-address-book';
import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H2 } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Loader2Icon } from 'lucide-react';
import SimpleTransfer from '@/components/SimpleTransfer';

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
      <CardContent className='flex flex-col gap-4'>
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
            <Loader2Icon className='animate-spin' />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
