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
import { useAnchorWallet, useConnection, useLocalStorage } from '@solana/wallet-adapter-react';
import { Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useSubscription } from '@/hooks/use-subscription';
import { shortKey } from '@/lib/utils';
import { Card, CardContent, CardHeader } from './ui/card';
import { H2, Muted } from '@/components/ui/typography';
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
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { TokenListEntry } from '@/lib/types';

interface TokenProps {
  setSelected: (entry: TokenListEntry) => void;
}

const Tokens: React.FC<TokenProps> = ({ setSelected }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [amount, setAmount] = useState(1000);
  const [balance, setBalance] = useState<number | null>(null);
  const [tokenList, setTokenList] = useLocalStorage<TokenListEntry[]>('token-list', []);
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | undefined>();
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

  const createToken = useCallback(async () => {
    if (!wallet?.publicKey) return;

    setIsCreating(true);

    try {
      const { blockhash } = await connection.getLatestBlockhash();

      const mintKp = Keypair.generate();
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

      const finalTx = new Transaction().add(createIx, createMintIx, createAccountIx, mintIx);
      finalTx.recentBlockhash = blockhash;
      finalTx.feePayer = wallet.publicKey;
      finalTx.partialSign(mintKp);

      const txs = await wallet.signAllTransactions([finalTx]);

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

      setTokenList([
        ...tokenList,
        {
          mint: mintKp.publicKey.toString(),
          creator: wallet.publicKey.toString(),
        },
      ]);
      toast.success(`Token ${mintKp.publicKey.toString()} created successfully`);
    } finally {
      setIsCreating(false);
    }
  }, [amount, wallet, connection, tokenList, setTokenList]);

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
    if (tokenList.length > 0) {
      setSelected(tokenList[0]);
      setSelectedToken(tokenList[0]);
    }
  }, [tokenList, setSelected]);

  useSubscription(connection, userTokenAccount, notification => {
    console.log('Received notification', notification);
    const account = AccountLayout.decode(Uint8Array.from(notification.data));
    setBalance(Number(account.amount) / Math.pow(10, 6));
  });

  useEffect(() => {
    if (wallet?.publicKey) {
      setBalance(null);
    }
  }, [wallet?.publicKey]);

  const TokenSelect = () => {
    if (tokenList.length > 0) {
      return (
        <div className='flex flex-col gap-2'>
          <Label>
            Select a token {balance !== null && <Muted>(Current balance: {balance})</Muted>}
          </Label>
          <Select
            defaultValue={selectedToken?.mint}
            onValueChange={value => {
              const token = tokenList.find(token => token.mint === value);
              if (token) {
                setSelected(token);
                setSelectedToken(token);
              }
            }}
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Select a fruit' />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Tokens</SelectLabel>
                {tokenList.map(token => (
                  <SelectItem key={token.mint} value={token.mint}>
                    {shortKey(token.mint)} ({shortKey(token.creator)})
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      );
    } else {
      return <div>No tokens created yet</div>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <H2>Tokens</H2>
      </CardHeader>
      <CardContent className='flex flex-col gap-4 w-3xl mx-auto my-[-10px]'>
        <div className='flex flex-row w-full items-end justify-between'>
          <div className='flex flex-col'>
            <TokenSelect />
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor='amount'>Supply</Label>
            <Input
              id='amount'
              type='number'
              defaultValue={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          </div>
          <Button onClick={createToken} disabled={isCreating}>
            Create Token
            {isCreating && <Loader2Icon className='animate-spin' />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Tokens;
