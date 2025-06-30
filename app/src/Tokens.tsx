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

import { TokenListEntry } from './Deposit';
import { useSubscription } from './hooks/use-subscription';
import { shortKey } from './libs';

interface TokenProps {
  setSelected: (entry: TokenListEntry) => void;
}

const Tokens: React.FC<TokenProps> = ({ setSelected }) => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [amount, setAmount] = useState(1000);
  const [balance, setBalance] = useState<number | undefined>();
  const [tokenList, setTokenList] = useLocalStorage<TokenListEntry[]>('token-list', []);
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | undefined>();
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

    const { blockhash } = await connection.getLatestBlockhash();

    const mintKp = Keypair.generate();
    const createTx = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: mintKp.publicKey,
        space: MINT_SIZE,
        lamports: await getMinimumBalanceForRentExemptMint(connection),
        programId: TOKEN_PROGRAM_ID,
      }),
    );
    createTx.recentBlockhash = blockhash;
    createTx.feePayer = wallet.publicKey;
    createTx.partialSign(mintKp);

    const createMintTx = new Transaction().add(
      createInitializeMint2Instruction(
        mintKp.publicKey,
        6,
        wallet.publicKey,
        null,
        TOKEN_PROGRAM_ID,
      ),
    );
    createMintTx.recentBlockhash = blockhash;
    createMintTx.feePayer = wallet.publicKey;

    const associatedTokenAccount = getAssociatedTokenAddressSync(
      mintKp.publicKey,
      wallet.publicKey,
      true,
      TOKEN_PROGRAM_ID,
    );

    const createAccountTx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        associatedTokenAccount,
        wallet.publicKey,
        mintKp.publicKey,
        TOKEN_PROGRAM_ID,
      ),
    );
    createAccountTx.recentBlockhash = blockhash;
    createAccountTx.feePayer = wallet.publicKey;

    const mintTx = new Transaction().add(
      createMintToCheckedInstruction(
        mintKp.publicKey,
        associatedTokenAccount,
        wallet.publicKey,
        amount * Math.pow(10, 6),
        6,
        [],
        TOKEN_PROGRAM_ID,
      ),
    );
    mintTx.recentBlockhash = blockhash;
    mintTx.feePayer = wallet.publicKey;

    const txs = await wallet.signAllTransactions([createTx, createMintTx, createAccountTx, mintTx]);

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

  const TokenSelect = () => {
    if (tokenList.length > 0) {
      return (
        <div className='token-select'>
          <select
            onChange={e => {
              const entry = tokenList.find(entry => entry.mint === e.target.value)!;
              setSelected(entry);
              setSelectedToken(entry);
            }}
            defaultValue={selectedToken?.mint}
          >
            {tokenList.map(token => (
              <option key={token.mint} value={token.mint}>
                {shortKey(token.mint)} ({shortKey(token.creator)})
              </option>
            ))}
          </select>
          <span>Current balance: {balance ?? 'Loading...'}</span>
        </div>
      );
    } else {
      return <div>No tokens created yet</div>;
    }
  };

  return (
    <div className='tokens-ui'>
      <TokenSelect />
      <div className='token-creator'>
        <h3>Create a new token</h3>
        <div className='token-creator-inputs'>
          <label htmlFor='amount'>Amount</label>
          <input
            id='amount'
            type='number'
            defaultValue={amount}
            onChange={e => setAmount(Number(e.target.value))}
          />
        </div>
        <button onClick={createToken}>Create Token</button>
      </div>
    </div>
  );
};

export default Tokens;
