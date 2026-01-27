import { PublicKey } from '@solana/web3.js';
import React, { useState } from 'react';

import { usePrivateRollupAuth } from '../hooks/use-private-rollup-auth';
import ManageDeposit from './ManageDeposit';
import Transfer from './Transfer';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { H2, H3, Muted } from '@/components/ui/typography';
import { Button } from './ui/button';
import { CircleQuestionMark, Loader2Icon } from 'lucide-react';
import { useTokens } from '@/hooks/use-tokens';
import MissingAddressCard from './MissingAddressCard';

const Deposit: React.FC = () => {
  const { authToken, isAuthenticating, getToken } = usePrivateRollupAuth();
  const { selectedToken: token } = useTokens();
  const wallet = useAnchorWallet();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

  return (
    <>
      <Card className='p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200/50 dark:border-blue-800/50 rounded-lg'>
        <CardHeader>
          <H2>Public Solana</H2>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 items-center w-full'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 w-full'>
            {wallet?.publicKey ? (
              <ManageDeposit token={token} isMainnet />
            ) : (
              <Loader2Icon className='animate-spin' />
            )}
            <Transfer
              token={token}
              setSelectedAddress={setSelectedAddress}
              user={wallet?.publicKey?.toBase58()}
              isMainnet
            />
            {selectedAddress ? (
              <ManageDeposit token={token} user={new PublicKey(selectedAddress)} isMainnet />
            ) : (
              <Card>
                <CardHeader>
                  <H3>Select an address</H3>
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
      <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200/50 dark:border-purple-800/50 rounded-lg">
        <CardHeader>
          <H2>Private Ephemeral Rollup</H2>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 items-center w-full'>
          {!authToken && (
            <Button className='w-full' onClick={getToken} disabled={isAuthenticating}>
              Authenticate
              {isAuthenticating && <Loader2Icon className='animate-spin' />}
            </Button>
          )}
          <div className='grid grid-cols-1 md:grid-cols-3  gap-4 w-full'>
            {wallet?.publicKey ? (
              <ManageDeposit token={token} />
            ) : (
              <Loader2Icon className='animate-spin' />
            )}
            <Transfer token={token} setSelectedAddress={setSelectedAddress} />
            {selectedAddress ? (
              <ManageDeposit token={token} user={new PublicKey(selectedAddress)} />
            ) : (
              <MissingAddressCard />
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Deposit;
