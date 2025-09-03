'use client';

import {
  AccountLayout,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useSubscription } from '@/hooks/use-subscription';
import { shortKey } from '@/lib/utils';
import { Card, CardContent, CardHeader } from './ui/card';
import { H3, Muted } from '@/components/ui/typography';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2Icon, PlusCircle, Coins, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useTokens } from '@/hooks/use-tokens';
import { useProgram } from '@/hooks/use-program';
import { BN } from '@coral-xyz/anchor';
import {
  groupPdaFromId,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
} from '@magicblock-labs/ephemeral-rollups-sdk/privacy';

const Tokens: React.FC<{ deposit?: boolean }> = ({ deposit = false }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const { program, getDepositPda, getVaultPda } = useProgram();
  const [amount, setAmount] = useState(1000);
  const [balance, setBalance] = useState<number | null>(null);
  const { tokenList, setTokens, selectedToken, setToken } = useTokens();
  const [isCreating, setIsCreating] = useState(false);
  const userTokenAccount = useMemo(() => {
    if (!selectedToken || !wallet?.publicKey) return;
    return getAssociatedTokenAddressSync(
      new PublicKey(selectedToken?.mint),
      wallet.publicKey,
      true,
      TOKEN_PROGRAM_ID,
    );
  }, [selectedToken, wallet]);

  const createToken = useCallback(
    async (mintKp: Keypair, deposit: boolean) => {
      if (!wallet?.publicKey || !program) return;

      setIsCreating(true);

      try {
        const { blockhash } = await connection.getLatestBlockhash();

        const createIx = SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: mintKp.publicKey,
          space: MINT_SIZE,
          lamports: await getMinimumBalanceForRentExemptMint(connection),
          programId: TOKEN_PROGRAM_ID,
        });

        const createMintIx = createInitializeMint2Instruction(
          mintKp.publicKey,
          6,
          wallet.publicKey,
          null,
          TOKEN_PROGRAM_ID,
        );

        const associatedTokenAccount = getAssociatedTokenAddressSync(
          mintKp.publicKey,
          wallet.publicKey,
          true,
          TOKEN_PROGRAM_ID,
        );

        const createAccountIx = createAssociatedTokenAccountIdempotentInstruction(
          wallet.publicKey,
          associatedTokenAccount,
          wallet.publicKey,
          mintKp.publicKey,
          TOKEN_PROGRAM_ID,
        );

        const mintIx = createMintToCheckedInstruction(
          mintKp.publicKey,
          associatedTokenAccount,
          wallet.publicKey,
          amount * Math.pow(10, 6),
          6,
          [],
          TOKEN_PROGRAM_ID,
        );

        const depositPda = getDepositPda(wallet.publicKey, mintKp.publicKey)!;
        const vaultPda = getVaultPda(mintKp.publicKey)!;
        const initIx = await program.methods
          .initializeDeposit()
          .accountsPartial({
            payer: program.provider.publicKey,
            user: wallet.publicKey,
            deposit: depositPda,
            tokenMint: mintKp.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        const id = Keypair.generate().publicKey;
        const permission = permissionPdaFromAccount(depositPda);
        const group = groupPdaFromId(id);

        const createPermissionIx = await program.methods
          .createPermission(id)
          .accountsPartial({
            payer: program.provider.publicKey,
            user: wallet.publicKey,
            deposit: depositPda,
            permission,
            group,
            permissionProgram: PERMISSION_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction();

        let depositIx = null;
        if (deposit) {
          depositIx = await program.methods
            .modifyBalance({ amount: new BN(amount * Math.pow(10, 6)), increase: true })
            .accountsPartial({
              payer: program.provider.publicKey,
              user: wallet.publicKey,
              vault: vaultPda,
              deposit: depositPda,
              userTokenAccount: getAssociatedTokenAddressSync(
                mintKp.publicKey,
                wallet.publicKey,
                true,
                TOKEN_PROGRAM_ID,
              ),
              vaultTokenAccount: getAssociatedTokenAddressSync(
                mintKp.publicKey,
                vaultPda,
                true,
                TOKEN_PROGRAM_ID,
              ),
              tokenMint: mintKp.publicKey,
              tokenProgram: TOKEN_PROGRAM_ID,
            })
            .instruction();
        }

        const finalTx = new Transaction().add(
          createIx,
          createMintIx,
          createAccountIx,
          mintIx,
          initIx,
          createPermissionIx,
        );
        console.log(finalTx);
        if (deposit) {
          finalTx.add(depositIx!);
        }
        finalTx.recentBlockhash = blockhash;
        finalTx.feePayer = wallet.publicKey;
        finalTx.partialSign(mintKp);

        const txs = await wallet.signAllTransactions([finalTx]);
        const simulation = await connection.simulateTransaction(finalTx);
        console.log(simulation);

        // Use a for loop to preserve order of transactions
        const sigs = [];
        for (const tx of txs) {
          const sig = await connection.sendRawTransaction(tx.serialize());
          sigs.push(sig);
        }

        // Wait for all transactions to be confirmed
        await Promise.all(
          sigs.map(async sig => {
            await connection.confirmTransaction(sig);
          }),
        );

        await new Promise(resolve => setTimeout(resolve, 1000));

        setTokens([
          ...tokenList,
          {
            mint: mintKp.publicKey.toString(),
            creator: wallet.publicKey.toString(),
          },
        ]);
        // Reset token to refresh components
        setToken(undefined);
        setToken({
          mint: mintKp.publicKey.toString(),
          creator: wallet.publicKey.toString(),
        });
        toast.success(`Token ${mintKp.publicKey.toString()} created successfully`);
      } finally {
        setIsCreating(false);
      }
    },
    [amount, wallet, connection, tokenList, setTokens, setToken],
  );

  useEffect(() => {
    const getBalance = async () => {
      if (!selectedToken || !wallet?.publicKey) return;
      try {
        const balance = await connection.getTokenAccountBalance(
          getAssociatedTokenAddressSync(
            new PublicKey(selectedToken.mint),
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
  }, [selectedToken, wallet, connection]);

  // Set default selected token
  useEffect(() => {
    if (tokenList.length > 0 && !selectedToken) {
      setToken(tokenList[0]);
    }
  }, [tokenList, setToken, selectedToken]);

  useSubscription(connection, userTokenAccount, notification => {
    const account = AccountLayout.decode(Uint8Array.from(notification.data));
    setBalance(Number(account.amount) / Math.pow(10, 6));
  });

  useEffect(() => {
    if (wallet?.publicKey) {
      setBalance(null);
    }
  }, [wallet?.publicKey]);

  const EmptyState = () => (
    <div className='text-center py-6 px-6'>
      <div className='mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full flex items-center justify-center mb-6'>
        <Coins className='w-12 h-12 text-blue-600 dark:text-blue-400' />
      </div>
      <div className='space-y-3'>
        <h3 className='text-lg font-semibold text-foreground'>No tokens created yet</h3>
        <p className='text-muted-foreground max-w-md mx-auto'>
          Create your first token and start building your Web3 ecosystem. Set the supply and launch
          your project to the blockchain.
        </p>
      </div>
    </div>
  );

  const TokenStats = () => (
    <div className='grid grid-cols-3 gap-4 p-6 border-t border-border'>
      <div className='text-center'>
        <div className='flex items-center justify-center mb-2'>
          <Coins className='w-5 h-5 text-blue-600 mr-2' />
          <span className='text-2xl font-bold text-foreground'>{tokenList.length}</span>
        </div>
        <p className='text-sm text-muted-foreground'>Total Tokens</p>
      </div>
      <div className='text-center'>
        <div className='flex items-center justify-center mb-2'>
          <DollarSign className='w-5 h-5 text-green-600 mr-2' />
          <span className='text-2xl font-bold text-foreground'>$0</span>
        </div>
        <p className='text-sm text-muted-foreground'>Total Value</p>
      </div>
      <div className='text-center'>
        <div className='flex items-center justify-center mb-2'>
          <TrendingUp className='w-5 h-5 text-purple-600 mr-2' />
          <span className='text-2xl font-bold text-foreground'>0%</span>
        </div>
        <p className='text-sm text-muted-foreground'>Growth</p>
      </div>
    </div>
  );

  const TokenSelect = () => {
    if (tokenList.length > 0) {
      return (
        <div className='flex flex-col gap-3'>
          <Label className='text-sm font-medium text-foreground'>
            Select Token{' '}
            {balance !== null && (
              <span className='text-muted-foreground font-normal'>(Balance: {balance})</span>
            )}
          </Label>
          <Select
            defaultValue={selectedToken?.mint}
            onValueChange={value => {
              const token = tokenList.find(token => token.mint === value);
              if (token) {
                setToken(token);
              }
            }}
          >
            <SelectTrigger className='w-[280px] bg-background border-border'>
              <SelectValue placeholder='Select a token' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Your Tokens</SelectLabel>
                {tokenList.map(token => (
                  <SelectItem key={token.mint} value={token.mint}>
                    <div className='flex items-center gap-2'>
                      <div className='w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full'></div>
                      <span>{shortKey(token.mint)}</span>
                      <span className='text-muted-foreground'>({shortKey(token.creator)})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      );
    } else {
      return <EmptyState />;
    }
  };

  const TokenCreation = () => {
    return (
      <>
        <div className='w-full md:w-auto flex flex-col gap-2 min-w-[200px]'>
          <Label htmlFor='amount' className='text-sm font-medium text-foreground'>
            Initial Supply
          </Label>
          <div className='relative'>
            <Input
              id='amount'
              type='number'
              value={amount || undefined}
              onChange={e => setAmount(Number(e.target.value))}
              className='bg-background border-border text-foreground pr-12'
              placeholder='1000'
            />
            <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
              <Coins className='w-4 h-4 text-muted-foreground' />
            </div>
          </div>
        </div>

        <Button
          onClick={() => createToken(Keypair.generate(), deposit)}
          disabled={isCreating}
          className='w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 text-white font-medium px-8 py-2 h-auto rounded-lg transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100'
        >
          {isCreating ? (
            <>
              <Loader2Icon className='animate-spin mr-2 w-4 h-4' />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className='mr-2 w-4 h-4' />
              Create Token
            </>
          )}
        </Button>
      </>
    );
  };

  return (
    <Card className='gap-3 overflow-hidden bg-white/80 dark:bg-card/80 backdrop-blur-sm border-border/50 shadow-xl p-0!'>
      <CardHeader className='p-2! bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-b border-border/50'>
        <div className='flex items-center gap-3'>
          <div className='p-2 bg-blue-600/10 rounded-lg'>
            <Coins className='w-6 h-6 text-blue-600' />
          </div>
          <H3 className='!border-none !pb-0 text-foreground'>Tokens</H3>
        </div>
      </CardHeader>
      <CardContent className='p-0'>
        {tokenList.length > 0 ? (
          <div className='p-6'>
            <div className='flex flex-col md:flex-row gap-2 md:items-end'>
              <TokenSelect />
              <TokenCreation />
            </div>
          </div>
        ) : (
          <div>
            <EmptyState />
            <div className='px-6 pb-6'>
              <div className='flex flex-col sm:flex-row gap-4 items-end justify-center'>
                <TokenCreation />
              </div>
            </div>
          </div>
        )}
        <TokenStats />
      </CardContent>
    </Card>
  );
};

export default Tokens;
