import { useEphemeralConnection } from './use-ephemeral-connection';
import { useBlockhashCache } from '@/contexts/BlockhashCacheContext';
import { useTokenAccountContext } from '@/contexts/TokenAccountContext';
import { VALIDATOR_PUBKEY } from '@/lib/constants';
import {
  AUTHORITY_FLAG,
  createEataPermissionIx,
  createUpdatePermissionInstruction,
  delegateEataPermissionIx,
  delegateIx,
  deriveEphemeralAta,
  deriveVault,
  initEphemeralAtaIx,
  initVaultAtaIx,
  initVaultIx,
  resetEataPermissionIx,
  transferToVaultIx,
  undelegateIx,
  withdrawSplIx,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
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
  const { mainnet, ephemeral } = useBlockhashCache();
  const { walletAccounts, recipientAccounts } = useTokenAccountContext();

  const sendTransaction = useCallback(
    async (isEphemeral: boolean, transaction: Transaction) => {
      if (!wallet?.publicKey) return;

      const conn = isEphemeral ? ephemeralConnection : connection;
      if (!conn) return;

      const blockhash = isEphemeral ? ephemeral?.blockhash : mainnet?.blockhash;
      if (!blockhash) return;

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = wallet.publicKey;

      const signedTransaction = await wallet.signTransaction(transaction);
      const signature = await conn.sendRawTransaction(signedTransaction.serialize());
      const status = await conn.confirmTransaction(signature, 'confirmed');
      if (status.value?.err !== null) {
        console.error('Transaction failed:', status);
        throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
      }
      return signature;
    },
    [wallet, connection, ephemeralConnection, mainnet?.blockhash, ephemeral?.blockhash],
  );

  const initializeEata = useCallback(
    async (user: PublicKey, tokenMint: PublicKey) => {
      if (!wallet?.publicKey) return;

      const [eata, eataBump] = deriveEphemeralAta(user, tokenMint)!;

      const ataIx = createAssociatedTokenAccountIdempotentInstruction(
        wallet.publicKey,
        getAssociatedTokenAddressSync(tokenMint, user, true),
        user,
        tokenMint,
      );
      const initIx = initEphemeralAtaIx(eata, user, tokenMint, wallet.publicKey, eataBump);
      const createPermissionIx = createEataPermissionIx(eata, wallet.publicKey, eataBump);

      const transaction = new Transaction();
      transaction.add(ataIx);
      transaction.add(initIx);
      transaction.add(createPermissionIx);

      return sendTransaction(false, transaction);
    },
    [wallet, sendTransaction],
  );

  const modifyEataBalance = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number, isIncrease: boolean) => {
      if (!wallet?.publicKey) return;

      const [eata] = deriveEphemeralAta(user, tokenMint);
      const [vault, vaultBump] = deriveVault(tokenMint);
      const userAta = getAssociatedTokenAddressSync(tokenMint, user, true, TOKEN_PROGRAM_ID);
      const vaultAta = getAssociatedTokenAddressSync(tokenMint, vault, true, TOKEN_PROGRAM_ID);

      const amountBn = BigInt(Math.round(amount * 10 ** 6));

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

      return sendTransaction(false, transaction);
    },
    [wallet, connection, sendTransaction],
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
      if (!wallet?.publicKey) return;

      const amountBn = BigInt(Math.round(amount * 10 ** 6));

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

      return sendTransaction(delegated, transaction);
    },
    [wallet, sendTransaction],
  );

  const delegate = useCallback(
    async (user: PublicKey, tokenMint: PublicKey) => {
      if (!wallet?.publicKey) return;

      const [eata, eataBump] = deriveEphemeralAta(user, tokenMint);

      const ix = delegateIx(wallet.publicKey, eata, eataBump, VALIDATOR_PUBKEY);
      const permissionIx = delegateEataPermissionIx(
        wallet.publicKey,
        eata,
        eataBump,
        VALIDATOR_PUBKEY,
      );
      const transaction = new Transaction();
      transaction.add(ix);

      const accounts =
        walletAccounts.user && user.equals(walletAccounts.user)
          ? walletAccounts
          : recipientAccounts.user && user.equals(recipientAccounts.user)
            ? recipientAccounts
            : undefined;
      if (accounts && !accounts.isPermissionDelegated) {
        transaction.add(permissionIx);
      }

      const signature = await sendTransaction(false, transaction);

      // Refresh data of the delegate account
      await accounts?.getAtas();

      return signature;
    },
    [wallet, sendTransaction, walletAccounts, recipientAccounts],
  );

  const undelegate = useCallback(
    async (tokenMint: PublicKey) => {
      if (!wallet?.publicKey) return;

      const ix = undelegateIx(wallet.publicKey, tokenMint);
      const transaction = new Transaction();
      transaction.add(ix);

      const signature = await sendTransaction(true, transaction);

      // Refresh data of the undelegate account
      const accounts = wallet.publicKey === walletAccounts.user ? walletAccounts : undefined;
      await accounts?.getAtas();

      return signature;
    },
    [wallet, sendTransaction, walletAccounts],
  );

  const updatePermission = useCallback(
    async (tokenMint: PublicKey, isPublic: boolean) => {
      if (!wallet?.publicKey) return;

      const [eata, eataBump] = deriveEphemeralAta(wallet.publicKey, tokenMint);
      let ix;
      if (isPublic) {
        ix = createUpdatePermissionInstruction(
          {
            authority: [wallet.publicKey, true],
            permissionedAccount: [eata, false],
          },
          { members: isPublic ? null : [{ flags: AUTHORITY_FLAG, pubkey: wallet.publicKey }] },
        );
      } else {
        ix = resetEataPermissionIx(eata, wallet.publicKey, eataBump, 0);
      }
      const transaction = new Transaction();
      transaction.add(ix);

      return sendTransaction(true, transaction);
    },
    [wallet, sendTransaction],
  );

  return {
    initializeEata,
    deposit,
    withdraw,
    transfer,
    delegate,
    undelegate,
    updatePermission,
  };
}
