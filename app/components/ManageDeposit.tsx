import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useMemo, useState } from 'react';

import { useDeposit } from '@/hooks/use-deposit';
import { useProgram } from '@/hooks/use-program';
import { Ban, CopyIcon, Loader2Icon, LucideCircleQuestionMark } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { H3, Large } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';

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
  const { deposit, depositPda, permissionPda, isDelegated, accessDenied } = useDeposit(
    depositUser,
    token?.mint,
  );

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

  const title = useMemo(() => {
    if (accessDenied) return 'Access denied';
    if (!deposit) return 'Create deposit';
    if (isWalletOwner) return 'Deposit tokens';
    return 'View deposit';
  }, [accessDenied, deposit, isWalletOwner]);

  return (
    <Card>
      <CardHeader>
        <div className='w-full flex flex-row'>
          <div className='w-full'>
            <H3>{title}</H3>
          </div>
          <Dialog>
            <form>
              <DialogTrigger asChild>
                <Button variant='ghost'>
                  <LucideCircleQuestionMark />
                </Button>
              </DialogTrigger>
              <DialogContent className='sm:max-w-[425px]'>
                <DialogHeader>
                  <DialogTitle>Deposit information</DialogTitle>
                  <DialogDescription>Addresses of the related accounts.</DialogDescription>
                </DialogHeader>
                <div className='grid gap-4'>
                  <div className='grid gap-3'>
                    <Label htmlFor='deposit-address'>Deposit address</Label>
                    <div className='flex flex-row'>
                      <Input
                        id='deposit-address'
                        name='name'
                        className='rounded-r-none'
                        defaultValue={depositPda?.toBase58() ?? '???'}
                        disabled
                      />
                      <Button
                        variant='outline'
                        className='rounded-l-none'
                        onClick={() => {
                          navigator.clipboard.writeText(depositPda?.toBase58() ?? '');
                          toast.info('Copied to clipboard');
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                  <div className='grid gap-3'>
                    <Label htmlFor='token'>Token</Label>
                    <div className='flex flex-row'>
                      <Input id='token' name='token' defaultValue={token?.mint} disabled />
                      <Button
                        variant='outline'
                        className='rounded-l-none'
                        onClick={() => {
                          navigator.clipboard.writeText(token?.mint ?? '');
                          toast.info('Copied to clipboard');
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                  <div className='grid gap-3'>
                    <Label htmlFor='username'>Deposit owner</Label>
                    <div className='flex flex-row'>
                      <Input
                        id='username'
                        name='username'
                        className='rounded-r-none'
                        defaultValue={depositUser?.toBase58()}
                        disabled
                      />
                      <Button
                        variant='outline'
                        className='rounded-l-none'
                        onClick={() => {
                          navigator.clipboard.writeText(depositUser?.toBase58() ?? '');
                          toast.info('Copied to clipboard');
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                  <div className='grid gap-3'>
                    <Label htmlFor='permission'>Permission</Label>
                    <div className='flex flex-row'>
                      <Input
                        id='permission'
                        name='name'
                        className='rounded-r-none'
                        defaultValue={permissionPda?.toBase58() ?? '???'}
                        disabled
                      />
                      <Button
                        variant='outline'
                        className='rounded-l-none'
                        onClick={() => {
                          navigator.clipboard.writeText(permissionPda?.toBase58() ?? '');
                          toast.info('Copied to clipboard');
                        }}
                      >
                        <CopyIcon />
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </form>
          </Dialog>
        </div>
        <Separator />
      </CardHeader>
      {!deposit && !accessDenied ? (
        <CardContent>
          <Button className='w-full' onClick={handleCreateDeposit} disabled={isCreating}>
            Create
            {isCreating && <Loader2Icon className='animate-spin' />}
          </Button>
        </CardContent>
      ) : !deposit && accessDenied ? (
        <CardContent className='flex flex-row items-center justify-center h-full min-w-56'>
          <Ban className='h-auto w-16' />
        </CardContent>
      ) : (
        <>
          <CardContent className='flex flex-col gap-4'>
            <Large>Current balance: {deposit!.amount.toNumber() / Math.pow(10, 6)}</Large>

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
