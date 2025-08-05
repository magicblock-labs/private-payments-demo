import React, { useState } from 'react';

import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H2, Muted } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Loader2Icon } from 'lucide-react';
import SimpleTransfer from '@/components/SimpleTransfer';
import { useTokens } from '@/hooks/use-tokens';
import SimpleRecipient from './SimpleRecipient';
import MissingAddressCard from './MissingAddressCard';

export default function SimpleDeposit() {
  const { authToken, isAuthenticating, getToken } = usePrivateRollupAuth();
  const { selectedToken: token } = useTokens();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

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
        {!authToken && (
          <Button className='w-full' onClick={getToken} disabled={isAuthenticating}>
            Authenticate
            {isAuthenticating && <Loader2Icon className='animate-spin' />}
          </Button>
        )}
        <div className='flex gap-4'>
          <SimpleTransfer
            token={token}
            selectedAddress={selectedAddress}
            setSelectedAddress={setSelectedAddress}
          />
          {selectedAddress ? (
            <SimpleRecipient user={selectedAddress} token={token} />
          ) : (
            <MissingAddressCard />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
