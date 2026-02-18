'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { H3, Muted } from '@/components/ui/typography';
import { useTokenAccountContext } from '@/contexts/TokenAccountContext';
import { useTokensContext } from '@/contexts/TokensContext';
import { useProgram } from '@/hooks/use-program';
import useSimpleTransfer from '@/hooks/use-simple-transfer';
import { useSubscription } from '@/hooks/use-subscription';
import { TokenListEntry } from '@/lib/types';
import { AccountLayout, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Eye,
  EyeOff,
  Loader2Icon,
  Shield,
  Wallet,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface TransferProps {
  token?: TokenListEntry;
}

export default function SimpleTransfer({ token }: TransferProps) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { selectedToken } = useTokensContext();
  const [isTransferring, setIsTransferring] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isUpdatingPermission, setIsUpdatingPermission] = useState(false);
  const [amount, setAmount] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [balance, setBalance] = useState<number | undefined>();
  const {
    walletAccounts,
    recipientAccounts,
    selectedAddress,
    setSelectedAddress,
    vaultInfo,
    vaultAtaAccount,
  } = useTokenAccountContext();
  const { updatePermission } = useProgram();
  const { transfer, withdraw } = useSimpleTransfer({
    senderAccounts: walletAccounts,
    recipientAccounts,
    token,
    vaultInfo,
    vaultAtaAccount,
  });
  const { mainnetEata, ephemeralAta, isDelegated } = walletAccounts;

  const userTokenAccount = useMemo(() => {
    if (!token || !wallet?.publicKey) return;
    return getAssociatedTokenAddressSync(
      new PublicKey(token?.mint),
      wallet.publicKey,
      true,
      TOKEN_PROGRAM_ID,
    );
  }, [token, wallet]);

  const withdrawableBalance = useMemo(() => {
    if (!selectedToken) return 0;
    if (isDelegated) {
      return Number(ephemeralAta?.amount ?? 0n) / 10 ** selectedToken.decimals;
    } else {
      return Number(mainnetEata?.amount ?? 0n) / 10 ** selectedToken.decimals;
    }
  }, [isDelegated, ephemeralAta, mainnetEata, selectedToken]);

  const isPublic = useMemo(() => {
    if (!walletAccounts?.isPermissionDelegated && walletAccounts?.mainnetPermission)
      return walletAccounts.mainnetPermission.members === undefined;
    if (walletAccounts?.isPermissionDelegated && walletAccounts?.ephemeralPermission)
      return walletAccounts.ephemeralPermission.members === undefined;
    return false;
  }, [walletAccounts]);

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedAddress?.(undefined);
      try {
        new PublicKey(e.target.value);
        setSelectedAddress?.(e.target.value);
        toast.success('Address set');
      } catch {}
    },
    [setSelectedAddress],
  );

  const handleTransfer = useCallback(async () => {
    if (!token || !selectedAddress) return;
    setIsTransferring(true);
    try {
      await transfer(amount);
      walletAccounts.getAtas();
      recipientAccounts.getAtas();
      toast.success(`Transferred ${amount} tokens to ${selectedAddress}`);
    } catch (error) {
      console.error(error);
      toast.error(`Error transferring tokens: ${error}`);
    } finally {
      setIsTransferring(false);
    }
  }, [token, transfer, amount, selectedAddress, walletAccounts, recipientAccounts]);

  const handleWithdraw = useCallback(async () => {
    if (!token) return;
    setIsWithdrawing(true);
    try {
      await withdraw(withdrawAmount);
      walletAccounts.getAtas();
      toast.success(`Withdrawn ${withdrawAmount} tokens`);
    } catch (error) {
      console.error(error);
      toast.error(`Error withdrawing tokens: ${error}`);
    } finally {
      setIsWithdrawing(false);
    }
  }, [token, withdraw, withdrawAmount, walletAccounts]);

  const handleTogglePrivate = useCallback(async () => {
    if (!token?.mint) return;
    try {
      setIsUpdatingPermission(true);
      await updatePermission(new PublicKey(token?.mint), !isPublic);
      toast.success('Permission updated');
    } catch (error) {
      console.error(error);
      toast.error(`Error updating permission: ${error}`);
    } finally {
      setIsUpdatingPermission(false);
    }
  }, [isPublic, updatePermission, token?.mint]);

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
      } catch {
        setBalance(0);
      }
    };
    getBalance();
  }, [token, wallet, connection]);

  useSubscription(connection, userTokenAccount, notification => {
    const account = AccountLayout.decode(Uint8Array.from(notification.data));
    if (selectedToken) {
      setBalance(Number(account.amount) / 10 ** selectedToken.decimals);
    }
  });

  const shadow = (condition: boolean) => {
    return condition ? 'shadow-[0_0_10px_rgba(255,255,255,0.2)]' : '';
  };

  return (
    <div className='space-y-4'>
      {/* Balance Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
        <Card
          className={`bg-linear-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200/50 dark:border-blue-800/50 ${shadow(!isDelegated)}`}
        >
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
              {(balance ?? 0).toFixed(2)}
            </div>
            <Muted className='text-blue-600! dark:text-blue-400!'>SPL Tokens</Muted>
          </CardContent>
        </Card>

        <Card
          className={`bg-linear-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50 ${shadow(isDelegated)}`}
        >
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
              {withdrawableBalance.toFixed(2)}
            </div>
            <div className='flex flex-row items-center gap-2'>
              <Muted className='text-purple-600! dark:text-purple-400!'>
                {isPublic ? 'Public' : 'Private'}
              </Muted>
              {walletAccounts?.isPermissionDelegated && (
                <>
                  {isUpdatingPermission ? (
                    <Loader2Icon className='animate-spin mr-2 w-4 h-4' />
                  ) : (
                    <span className='relative group cursor-pointer'>
                      {isPublic ? (
                        <EyeOff className='w-4 h-4 text-purple-600' onClick={handleTogglePrivate} />
                      ) : (
                        <Eye className='w-4 h-4 text-purple-600' onClick={handleTogglePrivate} />
                      )}
                      <span className='pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-800 text-white text-xs rounded px-2 py-1 z-10'>
                        Toggle between public and private
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transfer Section */}
      <Card className='bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50'>
        <CardHeader>
          <div className='flex items-center gap-2'>
            <ArrowUpRight className='w-5 h-5 text-green-600' />
            <H3 className='border-none! pb-0!'>Send Tokens</H3>
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
              value={amount || ''}
              onChange={e => setAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder='0'
              step='any'
              className='bg-background border-border'
            />
          </div>

          <Button
            className='w-full bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 font-medium py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100'
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
            <H3 className='border-none! pb-0!'>Withdraw</H3>
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
              value={withdrawAmount || ''}
              onChange={e => setWithdrawAmount(e.target.value === '' ? 0 : Number(e.target.value))}
              placeholder='0'
              step='any'
              className='bg-background border-border'
            />
            <Muted>Available: {withdrawableBalance.toFixed(2)} tokens</Muted>
          </div>

          <Button
            className='w-full bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 font-medium py-3 rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100'
            onClick={handleWithdraw}
            disabled={isWithdrawing || withdrawAmount <= 0 || withdrawAmount > withdrawableBalance}
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
