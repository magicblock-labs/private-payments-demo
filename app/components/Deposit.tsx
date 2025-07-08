import { PublicKey } from '@solana/web3.js';
import React, { useState } from 'react';

import AddressBook from './AddressBook';
import { useAddressBook } from '../hooks/use-address-book';
import { usePrivateRollupAuth } from '../hooks/use-private-rollup-auth';
import ManageDeposit from './ManageDeposit';
import Transfer from './Transfer';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { H2 } from '@/components/ui/typography';
import { Button } from './ui/button';
import { Loader2Icon } from 'lucide-react';

export interface TokenListEntry {
  mint: string;
  creator: string;
}

interface DepositProps {
  token?: TokenListEntry;
}

const Deposit: React.FC<DepositProps> = ({ token }) => {
  const { authToken, isAuthenticating, getToken } = usePrivateRollupAuth();
  const wallet = useAnchorWallet();
  const { addressBook } = useAddressBook(wallet?.publicKey);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(addressBook[0]);

  return (
    <Card>
      <CardHeader>
        <H2>Your deposit</H2>
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {!authToken && (
          <Button className='w-full' onClick={getToken} disabled={isAuthenticating}>
            Authenticate
            {isAuthenticating && <Loader2Icon className='animate-spin' />}
          </Button>
        )}
        <div className='flex gap-4'>
          {wallet?.publicKey ? (
            <ManageDeposit token={token} />
          ) : (
            <Loader2Icon className='animate-spin' />
          )}
          <AddressBook setSelectedAddress={setSelectedAddress} />
          <Transfer token={token} address={selectedAddress} />
          {selectedAddress ? (
            <ManageDeposit token={token} user={new PublicKey(selectedAddress)} />
          ) : (
            <Loader2Icon className='animate-spin' />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Deposit;
