import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Loader2Icon } from 'lucide-react';
import { useState } from 'react';
import { useCallback } from 'react';
import { useProgram } from '@/hooks/use-program';
import { toast } from 'sonner';
import { PublicKey } from '@solana/web3.js';
import { TokenListEntry } from '@/lib/types';

interface DepositActionsProps {
  token: TokenListEntry;
  depositUser: PublicKey;
  isMainnet?: boolean;
  isDelegated: boolean;
  isWalletOwner?: boolean;
}

export default function DepositActions({
  token,
  depositUser,
  isMainnet,
  isDelegated,
  isWalletOwner,
}: DepositActionsProps) {
  const { deposit: depositTokens, withdraw, delegate, undelegate } = useProgram();
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isUndelegating, setIsUndelegating] = useState(false);
  const [amount, setAmount] = useState(0);

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

  const handleWithdraw = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsWithdrawing(true);
    try {
      await withdraw(depositUser, new PublicKey(token.mint), amount);
      toast.success(`Withdrawn ${amount} tokens from ${depositUser.toBase58()}`);
    } finally {
      setIsWithdrawing(false);
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

  return (
    <Accordion type='single' collapsible className='w-full'>
      <AccordionItem value='item-1'>
        <AccordionTrigger>Actions</AccordionTrigger>
        <AccordionContent className='flex flex-col gap-2'>
          {isMainnet && isWalletOwner && !isDelegated && (
            <>
              <div className='flex flex-col gap-2'>
                <Label htmlFor='amount'>Amount</Label>
                <Input
                  id='amount'
                  type='number'
                  defaultValue={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                />
              </div>
              <Button className='w-full' onClick={handleDeposit} disabled={isDepositing}>
                Deposit
                {isDepositing && <Loader2Icon className='animate-spin' />}
              </Button>
              <Button className='w-full' onClick={handleWithdraw} disabled={isWithdrawing}>
                Withdraw
                {isWithdrawing && <Loader2Icon className='animate-spin' />}
              </Button>
            </>
          )}
          {!isDelegated && isMainnet && (
            <Button className='w-full' onClick={handleDelegate} disabled={isDelegating}>
              Delegate
              {isDelegating && <Loader2Icon className='animate-spin' />}
            </Button>
          )}
          {isDelegated && isWalletOwner && !isMainnet && (
            <Button className='w-full' onClick={handleUndelegate} disabled={isUndelegating}>
              Undelegate
              {isUndelegating && <Loader2Icon className='animate-spin' />}
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
