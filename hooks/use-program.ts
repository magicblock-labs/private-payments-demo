import { useEphemeralConnection } from './use-ephemeral-connection';
import {
  createEataPermissionIx,
  delegateIx,
  deriveEphemeralAta,
  deriveVault,
  initEphemeralAtaIx,
  initVaultAtaIx,
  initVaultIx,
  transferToVaultIx,
  undelegateIx,
  withdrawSplIx,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import {
  TOKEN_PROGRAM_ID,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { useCallback } from 'react';

export function useProgram() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();

  const initializeEata = useCallback(
    async (user: PublicKey, tokenMint: PublicKey) => {
      if (!wallet?.publicKey) return;

      const [eata, eataBump] = deriveEphemeralAta(user, tokenMint)!;

      const initIx = initEphemeralAtaIx(eata, user, tokenMint, wallet.publicKey, eataBump);
      const createPermissionIx = createEataPermissionIx(eata, wallet.publicKey, eataBump);

      const transaction = new Transaction();
      transaction.add(initIx);
      transaction.add(createPermissionIx);

      const blockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      let signedTransaction = await wallet.signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);

      return signature;
    },
    [wallet, connection],
  );

  const modifyEataBalance = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number, isIncrease: boolean) => {
      if (!wallet?.publicKey) return;

      let [eata] = deriveEphemeralAta(user, tokenMint);
      let [vault, vaultBump] = deriveVault(tokenMint);
      let userAta = getAssociatedTokenAddressSync(tokenMint, user, true, TOKEN_PROGRAM_ID);
      let vaultAta = getAssociatedTokenAddressSync(tokenMint, vault, true, TOKEN_PROGRAM_ID);

      const amountBn = BigInt(Math.round(amount * Math.pow(10, 6)));

      let ix: TransactionInstruction;
      if (isIncrease) {
        ix = transferToVaultIx(eata, vault, tokenMint, userAta, vaultAta, user, amountBn);
      } else {
        ix = withdrawSplIx(user, tokenMint, amountBn);
      }

      const transaction = new Transaction();

      const isVaultCreated = await connection.getAccountInfo(vault);
      if (!isVaultCreated) {
        transaction.add(initVaultIx(vault, tokenMint, wallet.publicKey, vaultBump));
        transaction.add(initVaultAtaIx(wallet.publicKey, vaultAta, vault, tokenMint));
      }

      transaction.add(ix);

      const blockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      let signedTransaction = await wallet.signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);

      return signature;
    },
    [wallet, connection],
  );

  const deposit = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number) => {
      return modifyEataBalance(user, tokenMint, amount, true);
    },
    [modifyEataBalance],
  );

  const withdraw = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number) => {
      return modifyEataBalance(user, tokenMint, amount, false);
    },
    [modifyEataBalance],
  );

  const transfer = useCallback(
    async (tokenMint: PublicKey, amount: number, to: PublicKey, delegated: boolean) => {
      if (!wallet?.publicKey || (!connection && !delegated) || (!ephemeralConnection && delegated))
        return;

      const amountBn = BigInt(amount * Math.pow(10, 6));

      const fromAta = getAssociatedTokenAddressSync(
        tokenMint,
        wallet.publicKey,
        true,
        TOKEN_PROGRAM_ID,
      );
      const toAta = getAssociatedTokenAddressSync(tokenMint, to, true, TOKEN_PROGRAM_ID);
      const ix = createTransferCheckedInstruction(
        fromAta,
        tokenMint,
        toAta,
        wallet.publicKey,
        amountBn,
        6,
      );
      const transaction = new Transaction();
      transaction.add(ix);

      // NOTE: Safe to use ! because we check if the connection is valid above
      let conn = (delegated ? ephemeralConnection : connection)!;
      const blockhash = (await conn.getLatestBlockhash()).blockhash;
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      let signedTransaction = await wallet.signTransaction(transaction);

      const signature = await conn.sendRawTransaction(signedTransaction.serialize());
      await conn.confirmTransaction(signature);

      return signature;
    },
    [wallet, connection, ephemeralConnection],
  );

  const delegate = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, validator?: PublicKey) => {
      if (!wallet?.publicKey) return;

      let [eata, eataBump] = deriveEphemeralAta(user, tokenMint);

      const ix = delegateIx(wallet.publicKey, eata, eataBump, validator);
      const transaction = new Transaction();
      transaction.add(ix);

      const blockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      let signedTransaction = await wallet.signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);

      return signature;
    },
    [wallet, connection],
  );

  const undelegate = useCallback(
    async (tokenMint: PublicKey) => {
      if (!wallet?.publicKey) return;

      const ix = undelegateIx(wallet.publicKey, tokenMint);
      const transaction = new Transaction();
      transaction.add(ix);

      const blockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;
      let signedTransaction = await wallet.signTransaction(transaction);

      const signature = await connection.sendRawTransaction(signedTransaction.serialize());
      await connection.confirmTransaction(signature);

      return signature;
    },
    [wallet, connection],
  );

  return {
    initializeEata,
    deposit,
    withdraw,
    transfer,
    delegate,
    undelegate,
  };
}
