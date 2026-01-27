import React, { useState } from 'react';

import { usePrivateRollupAuth } from '@/hooks/use-private-rollup-auth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3, Muted } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Loader2Icon, Send, Info, Shield, ArrowRight } from 'lucide-react';
import SimpleTransfer from '@/components/SimpleTransfer';
import { useTokens } from '@/hooks/use-tokens';
import SimpleRecipient from './SimpleRecipient';
import MissingAddressCard from './MissingAddressCard';

export default function SimpleDeposit() {
  const { authToken, isAuthenticating, getToken } = usePrivateRollupAuth();
  const { selectedToken: token } = useTokens();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

  return (
    <Card className='gap-3 overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50 shadow-xl p-0!'>
      <CardHeader className='p-2! bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-b border-border/50'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-purple-600/10 rounded-lg'>
            <Send className='w-6 h-6 text-purple-600' />
          </div>
          <H3 className='!border-none !pb-0 text-foreground'>Transfer</H3>
        </div>
      </CardHeader>
      <CardContent className='p-6 space-y-6'>
        <div className='space-y-1 mt-[-25px]'>
          <div className='flex items-center gap-3 p-2'>
            <Info className='w-5 h-5 text-gray-700 flex-shrink-0' />
            <Muted className='text-muted-foreground'>
              In this simplified version, you just select an address you want to send tokens to, the
              amount you want to send, and all the underlying details are handled seamlessly.
            </Muted>
          </div>
        </div>

        {!authToken && (
          <div className='text-center py-6'>
            <div className='space-y-4'>
              <div className='mx-auto w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mb-4'>
                <Shield className='w-8 h-8 text-purple-600 dark:text-purple-400' />
              </div>
              <div className='space-y-2'>
                <h4 className='font-semibold text-foreground'>Authentication Required</h4>
                <p className='text-muted-foreground text-sm max-w-md mx-auto'>
                  Authenticate to securely access private payment features and start transferring
                  tokens.
                </p>
              </div>
              <Button
                className='bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 text-white font-medium px-8 py-3 h-auto rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100'
                onClick={getToken}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <Loader2Icon className='animate-spin mr-2 w-4 h-4' />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className='mr-2 w-4 h-4' />
                    Authenticate
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {authToken && (
          <div className='grid gap-6 lg:grid-cols-2'>
            <div className='lg:col-span-1'>
              <SimpleTransfer
                token={token}
                selectedAddress={selectedAddress}
                setSelectedAddress={setSelectedAddress}
              />
            </div>

            <div className='lg:col-span-1'>
              {selectedAddress ? (
                <SimpleRecipient user={selectedAddress} token={token} />
              ) : (
                <MissingAddressCard />
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
