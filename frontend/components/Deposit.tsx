import { PublicKey } from '@solana/web3.js';
import React, { useState } from 'react';

import { usePrivateRollupAuth } from '../hooks/use-private-rollup-auth';
import ManageDeposit from './ManageDeposit';
import Transfer from './Transfer';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { H2, Muted } from '@/components/ui/typography';
import { Button } from './ui/button';
import { CircleQuestionMark, Loader2Icon } from 'lucide-react';
import { useTokens } from '@/hooks/use-tokens';

const Deposit: React.FC = () => {
  const { authToken, isAuthenticating, getToken } = usePrivateRollupAuth();
  const { selectedToken: token } = useTokens();
  const wallet = useAnchorWallet();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

  return (
    <>
      <Card>
        <CardHeader>
          <H2>Public Solana</H2>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 items-center w-3xl mx-auto'>
          <div className='flex gap-4'>
            {wallet?.publicKey ? (
              <ManageDeposit token={token} isMainnet />
            ) : (
              <Loader2Icon className='animate-spin' />
            )}
            <Transfer token={token} setSelectedAddress={setSelectedAddress} isMainnet />
            {selectedAddress ? (
              <ManageDeposit token={token} user={new PublicKey(selectedAddress)} isMainnet />
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
      <Card>
        <CardHeader>
          <H2>Private Ephemeral Rollup</H2>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 items-center max-w-5xl mx-auto'>
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
            <Transfer token={token} setSelectedAddress={setSelectedAddress} />
            {selectedAddress ? (
              <ManageDeposit token={token} user={new PublicKey(selectedAddress)} />
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
    </>
  );
};

export default Deposit;
