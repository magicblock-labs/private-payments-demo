'use client';

import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3, Large, Muted } from '@/components/ui/typography';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AccountLayout, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useSubscription } from '@/hooks/use-subscription';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import {
  Link,
  Loader2Icon,
  Wallet,
  Shield,
  ArrowDownUp,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import useSimpleTransfer from '@/hooks/use-simple-transfer';
import { useDeposit } from '@/hooks/use-deposit';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import { TokenListEntry } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

interface TransferProps {
  token?: TokenListEntry;
  selectedAddress?: string;
  setSelectedAddress: (address: string | undefined) => void;
}

export default function SimpleTransfer({
  token,
  selectedAddress,
  setSelectedAddress,
}: TransferProps) {
  const { transfer, withdraw } = useSimpleTransfer();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [isTransferring, setIsTransferring] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [amount, setAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [balance, setBalance] = useState<number | undefined>();
  const { mainnetDeposit, ephemeralDeposit, isDelegated } = useDeposit(
    wallet?.publicKey,
    token?.mint,
  );
  const deposit = useMemo(() => {
    if (isDelegated) return ephemeralDeposit;
    return mainnetDeposit;
  }, [isDelegated, ephemeralDeposit, mainnetDeposit]);
  const userTokenAccount = useMemo(() => {
    if (!token || !wallet?.publicKey) return;
    return getAssociatedTokenAddressSync(
      new PublicKey(token?.mint),
      wallet.publicKey,
      true,
      TOKEN_PROGRAM_ID,
    );
  }, [token, wallet]);

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedAddress?.(undefined);
      try {
        new PublicKey(e.target.value);
        setSelectedAddress?.(e.target.value);
      } catch (error) {
        setSelectedAddress?.(undefined);
        toast.error('Invalid address');
      }
    },
    [setSelectedAddress],
  );

  const handleTransfer = useCallback(async () => {
    if (!token || !selectedAddress) return;
    setIsTransferring(true);
    try {
      await transfer(selectedAddress, token.mint, amount);
      toast.success(`Transferred ${amount} tokens to ${selectedAddress}`);
    } catch (error) {
      toast.error(`Error transferring tokens: ${error}`);
      console.error('Error transferring tokens:', error);
    } finally {
      setIsTransferring(false);
    }
  }, [token, transfer, amount, selectedAddress]);

  const handleWithdraw = useCallback(async () => {
    if (!token) return;
    setIsWithdrawing(true);
    try {
      await withdraw(token.mint, withdrawAmount);
      toast.success(`Withdrawn ${withdrawAmount} tokens`);
    } catch (error) {
      toast.error(`Error withdrawing tokens: ${error}`);
      console.error('Error withdrawing tokens:', error);
    } finally {
      setIsWithdrawing(false);
    }
  }, [token, withdraw, withdrawAmount]);

  useEffect(() => {
    const getBalance = async () => {
      if (!token || !wallet?.publicKey) return;
      try {
        const balance = await connection.getTokenAccountBalance(
          getAssociatedTokenAddressSync(
            new PublicKey(token.mint),
            wallet.publicKey,
            true,
            TOKEN_PROGRAM_ID,
          ),
        );
        setBalance(Number(balance.value.uiAmount));
      } catch (error) {
        console.error('Error getting balance:', error);
        setBalance(0);
      }
    };
    getBalance();
  }, [token, wallet, connection]);

  useSubscription(connection, userTokenAccount, notification => {
    const account = AccountLayout.decode(Uint8Array.from(notification.data));
    setBalance(Number(account.amount) / Math.pow(10, 6));
  });

  return (
    <div className='space-y-4'>
      {/* Balance Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <Card className='bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200/50 dark:border-blue-800/50'>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <Wallet className='w-4 h-4 text-blue-600' />
              <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                Mainnet Balance
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-900 dark:text-blue-100'>
              {balance ?? 0}
            </div>
            <Muted className='!text-blue-600 dark:!text-blue-400'>SPL Tokens</Muted>
          </CardContent>
        </Card>

        <Card className='bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50'>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <Shield className='w-4 h-4 text-purple-600' />
              <span className='text-sm font-medium text-purple-700 dark:text-purple-300'>
                Private Balance
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-purple-900 dark:text-purple-100'>
              {deposit
                ? Number(deposit?.amount.toNumber()) / Math.pow(10, 6)
                : isDelegated
                  ? '***'
                  : '0'}
            </div>
            <Muted className='!text-purple-600 dark:!text-purple-400'>Encrypted</Muted>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Section */}
      <Card className='bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <ArrowUpRight className='w-5 h-5 text-green-600' />
            <H3 className='!border-none !pb-0'>Send Tokens</H3>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='address' className='text-sm font-medium'>
              Recipient Address
            </Label>
            <Input
              id='address'
              type='text'
              onChange={handleAddressChange}
              placeholder='Enter recipient public key...'
              className='bg-background border-border'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='amount' className='text-sm font-medium'>
              Amount
            </Label>
            <Input
              id='amount'
              type='number'
              value={amount || undefined}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder='0'
              className='bg-background border-border'
            />
          </div>

          <Button
            className='w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 font-medium py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100'
            onClick={handleTransfer}
            disabled={
              isTransferring ||
              !selectedAddress ||
              selectedAddress === wallet?.publicKey?.toString() ||
              amount <= 0
            }
          >
            {isTransferring ? (
              <>
                <Loader2Icon className='animate-spin mr-2 w-4 h-4' />
                Sending...
              </>
            ) : (
              <>
                <ArrowUpRight className='mr-2 w-4 h-4' />
                Send Tokens
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Withdraw Section */}
      <Card className='bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <ArrowDownLeft className='w-5 h-5 text-orange-600' />
            <H3 className='!border-none !pb-0'>Withdraw</H3>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='withdrawAmount' className='text-sm font-medium'>
              Amount to Withdraw
            </Label>
            <Input
              id='withdrawAmount'
              type='number'
              value={withdrawAmount || undefined}
              onChange={e => setWithdrawAmount(Number(e.target.value))}
              placeholder='0'
              className='bg-background border-border'
            />
            <Muted>
              Available:{' '}
              {deposit ? (Number(deposit?.amount.toNumber()) / Math.pow(10, 6)).toFixed(2) : '0'}{' '}
              tokens
            </Muted>
          </div>

          <Button
            className='w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 font-medium py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100'
            onClick={handleWithdraw}
            disabled={
              isWithdrawing ||
              withdrawAmount <= 0 ||
              withdrawAmount > (deposit ? Number(deposit?.amount.toNumber()) / Math.pow(10, 6) : 0)
            }
          >
            {isWithdrawing ? (
              <>
                <Loader2Icon className='animate-spin mr-2 w-4 h-4' />
                Withdrawing...
              </>
            ) : (
              <>
                <ArrowDownLeft className='mr-2 w-4 h-4' />
                Withdraw
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
