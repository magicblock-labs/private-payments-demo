import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useMemo, useState } from 'react';

import { useDeposit } from '@/hooks/use-deposit';
import { useProgram } from '@/hooks/use-program';
import { Ban, Loader2Icon } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { H3, Large } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export interface TokenListEntry {
  mint: string;
  creator: string;
}

interface DepositProps {
  user?: PublicKey;
  token?: TokenListEntry;
}

const ManageDeposit: React.FC<DepositProps> = ({ user, token }) => {
  const wallet = useAnchorWallet();
  const { initializeDeposit, deposit: depositTokens, delegate, undelegate } = useProgram();
  const [isCreating, setIsCreating] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isUndelegating, setIsUndelegating] = useState(false);
  const [amount, setAmount] = useState(0);
  const depositUser = useMemo(() => {
    return user || wallet?.publicKey;
  }, [user, wallet]);
  const isWalletOwner = useMemo(() => {
    return depositUser && wallet?.publicKey?.equals(depositUser);
  }, [wallet, depositUser]);
  const { deposit, isDelegated, accessDenied } = useDeposit(depositUser, token?.mint);

  const handleCreateDeposit = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsCreating(true);
    try {
      await initializeDeposit(depositUser, new PublicKey(token.mint));
      toast.success(`Deposit initialized for ${depositUser.toBase58()}`);
    } finally {
      setIsCreating(false);
    }
  }, [token, depositUser, initializeDeposit]);

  const handleDeposit = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsDepositing(true);
    try {
      await depositTokens(depositUser, new PublicKey(token.mint), amount);
      toast.success(`Deposited ${amount} tokens to ${depositUser.toBase58()}`);
    } finally {
      setIsDepositing(false);
    }
  }, [token, depositUser, amount, depositTokens]);

  const handleDelegate = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsDelegating(true);
    try {
      await delegate(depositUser, new PublicKey(token.mint));
      toast.success(`Delegated successfully`);
    } finally {
      setIsDelegating(false);
    }
  }, [token, depositUser, delegate]);

  const handleUndelegate = useCallback(async () => {
    if (!token) return;
    setIsUndelegating(true);
    try {
      await undelegate(new PublicKey(token.mint));
      toast.success(`Undelegated successfully`);
    } finally {
      setIsUndelegating(false);
    }
  }, [token, undelegate]);

  if (accessDenied) {
    return (
      <Card>
        <CardHeader>
          <H3>Access denied</H3>
        </CardHeader>
        <CardContent className='flex flex-row items-center justify-center h-full min-w-48'>
          <Ban className='h-auto w-16' />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {!deposit && (
        <>
          <CardHeader>
            <H3>Initialize deposit</H3>
          </CardHeader>
          <CardContent>
            <Button className='w-full' onClick={handleCreateDeposit} disabled={isCreating}>
              Create
              {isCreating && <Loader2Icon className='animate-spin' />}
            </Button>
          </CardContent>
        </>
      )}
      {deposit && (
        <>
          <CardHeader>{isWalletOwner ? <H3>Deposit tokens</H3> : <H3>View deposit</H3>}</CardHeader>
          <CardContent className='flex flex-col gap-4'>
            <Large>Current balance: {deposit.amount.toNumber() / Math.pow(10, 6)}</Large>

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
            <Button className='w-full' onClick={handleDeposit} disabled={isDepositing}>
              Deposit
              {isDepositing && <Loader2Icon className='animate-spin' />}
            </Button>
            {!isDelegated && (
              <Button className='w-full' onClick={handleDelegate} disabled={isDelegating}>
                Delegate
                {isDelegating && <Loader2Icon className='animate-spin' />}
              </Button>
            )}
            {isDelegated && isWalletOwner && (
              <Button className='w-full' onClick={handleUndelegate} disabled={isUndelegating}>
                Undelegate
                {isUndelegating && <Loader2Icon className='animate-spin' />}
              </Button>
            )}
          </CardFooter>
        </>
      )}
    </Card>
  );
};

export default ManageDeposit;
