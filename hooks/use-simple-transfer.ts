import { useEphemeralConnection } from './use-ephemeral-connection';
import { TokenAccounts } from './use-token-account';
import { useBlockhashCache } from '@/contexts/BlockhashCacheContext';
import { VALIDATOR_PUBKEY } from '@/lib/constants';
import { logger } from '@/lib/log';
import { TokenListEntry } from '@/lib/types';
import {
  DELEGATION_PROGRAM_ID,
  createEataPermissionIx,
  delegateEataPermissionIx,
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
  Account,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  unpackAccount,
} from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { AccountInfo, PublicKey, Transaction } from '@solana/web3.js';
import { useCallback } from 'react';

async function initializeDeposit({
  user,
  tokenMint,
  transaction,
  payer,
}: {
  user: PublicKey;
  tokenMint: PublicKey;
  payer: PublicKey;
  transaction?: Transaction;
}) {
  const ata = getAssociatedTokenAddressSync(tokenMint, user, true, TOKEN_PROGRAM_ID);
  const [eata, eataBump] = deriveEphemeralAta(user, tokenMint);
  const initAta = createAssociatedTokenAccountIdempotentInstruction(payer, ata, user, tokenMint);
  const initIx = initEphemeralAtaIx(eata, user, tokenMint, payer, eataBump);
  const createPermissionIx = createEataPermissionIx(eata, payer, eataBump);
  transaction = transaction || new Transaction();
  transaction.add(initAta);
  transaction.add(initIx);
  transaction.add(createPermissionIx);
  return transaction;
}

interface SimpleTransferProps {
  senderAccounts: TokenAccounts;
  recipientAccounts: TokenAccounts;
  vaultInfo?: AccountInfo<Buffer>;
  vaultAtaAccount?: Account;
  token?: TokenListEntry;
}

export default function useSimpleTransfer({
  senderAccounts,
  recipientAccounts,
  token,
  vaultInfo,
  vaultAtaAccount,
}: SimpleTransferProps) {
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const { mainnet, ephemeral } = useBlockhashCache();
  const wallet = useAnchorWallet();

  const transfer = useCallback(
    async (amount: number) => {
      if (
        !wallet?.publicKey ||
        !connection ||
        !ephemeralConnection ||
        !recipientAccounts.user ||
        !token ||
        !ephemeral.blockhash ||
        !mainnet.blockhash
      )
        throw new Error('Transfer prerequisites not ready');

      logger.debug('Starting transfer:', senderAccounts, recipientAccounts);

      const tokenAmount = BigInt(Math.round(amount * 10 ** token.decimals));
      const recipientPk = recipientAccounts.user;
      const tokenMintPk = new PublicKey(token.mint);

      const waitForEphemeralAtaBalance = async (expectedAmount: bigint) => {
        let retries = 20;
        while (retries > 0) {
          try {
            const accountInfo = await ephemeralConnection.getAccountInfo(senderAta);
            if (accountInfo) {
              const decoded = unpackAccount(senderAta, accountInfo);
              if (decoded.amount === expectedAmount) {
                return;
              }
            }
          } catch (error) {
            console.error('Error getting ephemeral ATA balance:', error);
          }
          retries--;
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        throw new Error('Timed out waiting for ephemeral ATA balance');
      };

      let preliminaryTx: Transaction | undefined;
      let initTx: Transaction | undefined;
      let delegateTx: Transaction | undefined;

      const [vault, vaultBump] = deriveVault(tokenMintPk);
      const vaultAta = getAssociatedTokenAddressSync(tokenMintPk, vault, true, TOKEN_PROGRAM_ID);

      const [senderEata, senderEataBump] = deriveEphemeralAta(wallet.publicKey, tokenMintPk);
      const senderAta = getAssociatedTokenAddressSync(tokenMintPk, wallet.publicKey);

      const senderIsDelegated = senderAccounts?.isDelegated;

      // Compute the amount of tokens to deposit
      let amountToDeposit = tokenAmount;

      const availableBalance = senderAccounts.isDelegated
        ? (senderAccounts?.ephemeralAta?.amount ?? 0n)
        : (senderAccounts?.mainnetEata?.amount ?? 0n);
      amountToDeposit -= availableBalance;

      // If the vault does not exist, we need to initialize it
      if (!vaultInfo) {
        const vaultIx = initVaultIx(vault, tokenMintPk, wallet.publicKey, vaultBump);
        initTx = initTx || new Transaction();
        initTx.add(vaultIx);
      }
      if (!vaultAtaAccount) {
        const vaultAtaIx = initVaultAtaIx(wallet.publicKey, vaultAta, vault, tokenMintPk);
        initTx = initTx || new Transaction();
        initTx.add(vaultAtaIx);
      }

      if (!senderAccounts.mainnetEata) {
        // Sender EATA does not exist, we need to initialize it
        initTx = await initializeDeposit({
          payer: wallet.publicKey,
          user: wallet.publicKey,
          tokenMint: tokenMintPk,
          transaction: initTx,
        });
      } else {
        // If the sender has a deposit, we need to undelegate to transfer more tokens to it
        if (senderIsDelegated) {
          if (amountToDeposit > 0) {
            const undelegIx = undelegateIx(wallet.publicKey, tokenMintPk);
            preliminaryTx = new Transaction().add(undelegIx);
          }
        }
      }

      // Check if the recipient has a deposit, create one if not
      const [recipientEata, recipientEataBump] = deriveEphemeralAta(recipientPk, tokenMintPk);
      const recipientAta = getAssociatedTokenAddressSync(tokenMintPk, recipientPk, true);
      const recipientIsDelegated = recipientAccounts?.isDelegated;

      if (!recipientAccounts.mainnetEata) {
        initTx = await initializeDeposit({
          payer: wallet.publicKey,
          user: recipientPk,
          tokenMint: tokenMintPk,
          transaction: initTx,
        });
      }

      if (amountToDeposit > 0) {
        const depositIx = transferToVaultIx(
          senderEata,
          vault,
          tokenMintPk,
          senderAta,
          vaultAta,
          wallet.publicKey,
          amountToDeposit,
        );
        initTx = initTx || new Transaction();
        initTx.add(depositIx);
      }

      // Make sure both deposits are delegated
      if (!senderIsDelegated || preliminaryTx) {
        const delegIx = delegateIx(wallet.publicKey, senderEata, senderEataBump, VALIDATOR_PUBKEY);
        delegateTx = delegateTx || new Transaction();
        delegateTx.add(delegIx);
      }

      // Make sure the sender has permission to delegate
      if (!senderAccounts.isPermissionDelegated) {
        const delegIx = delegateEataPermissionIx(
          wallet.publicKey,
          senderEata,
          senderEataBump,
          VALIDATOR_PUBKEY,
        );
        delegateTx = delegateTx || new Transaction();
        delegateTx.add(delegIx);
      }

      // Make sure the recipient eata is delegated
      if (!recipientIsDelegated) {
        const delegIx = delegateIx(
          wallet.publicKey,
          recipientEata,
          recipientEataBump,
          VALIDATOR_PUBKEY,
        );
        delegateTx = delegateTx || new Transaction();
        delegateTx.add(delegIx);
      }

      // Make sure the recipient eata has permission to delegate
      if (!recipientAccounts.isPermissionDelegated) {
        const delegIx = delegateEataPermissionIx(
          wallet.publicKey,
          recipientEata,
          recipientEataBump,
          VALIDATOR_PUBKEY,
        );
        delegateTx = delegateTx || new Transaction();
        delegateTx.add(delegIx);
      }

      // Transfer the amount from the sender to the recipient
      // Uses regular ATAs
      const ephemeralTx = new Transaction().add(
        createTransferCheckedInstruction(
          senderAta,
          tokenMintPk,
          recipientAta,
          wallet.publicKey,
          tokenAmount,
          token.decimals,
        ),
      );

      const actions = [
        {
          name: 'preliminaryTx',
          tx: preliminaryTx,
          signedTx: preliminaryTx,
          blockhash: ephemeral.blockhash,
          connection: ephemeralConnection,
          callback: async () => {
            let retries = 15;
            while (retries > 0) {
              try {
                const accountInfo = await connection.getAccountInfo(senderEata);
                if (
                  accountInfo &&
                  !accountInfo.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))
                ) {
                  return;
                }
              } catch (error) {
                console.error('Error getting account info:', error);
              }
              retries--;
              await new Promise(resolve => setTimeout(resolve, 400));
            }
            throw new Error('Could not undelegate sender');
          },
        },
        {
          name: 'initTx',
          tx: initTx,
          signedTx: initTx,
          blockhash: mainnet.blockhash,
          connection,
          callback: (signature: string) => connection.confirmTransaction(signature),
        },
        {
          name: 'delegateTx',
          tx: delegateTx,
          signedTx: delegateTx,
          blockhash: mainnet.blockhash,
          connection,
          callback: async (signature: string) => {
            await connection.confirmTransaction(signature);
            await senderAccounts.getAtas();
            await recipientAccounts.getAtas();
          },
        },
        {
          name: 'ephemeralTx',
          tx: ephemeralTx,
          signedTx: ephemeralTx,
          blockhash: ephemeral.blockhash,
          connection: ephemeralConnection,
          callback: (signature: string) => ephemeralConnection.confirmTransaction(signature),
        },
      ]
        .filter(action => action.tx)
        .map(action => {
          const tx = action.tx!;
          tx.recentBlockhash = action.blockhash;
          tx.feePayer = wallet.publicKey;
          return { ...action, tx };
        });

      const txs = actions.map(action => action.tx!);
      const signedTxs = await wallet.signAllTransactions(txs);

      for (let i = 0; i < actions.length; i++) {
        actions[i].signedTx = signedTxs[i];
      }

      for (const action of actions) {
        logger.debug(`Sending transaction ${action.name}:`, action);
        if (action.name === 'ephemeralTx') {
          await waitForEphemeralAtaBalance(tokenAmount);
        }
        const signature = await action.connection.sendRawTransaction(action.signedTx!.serialize());
        await action.callback?.(signature);
      }
    },
    [
      wallet,
      connection,
      ephemeralConnection,
      senderAccounts,
      recipientAccounts,
      token,
      vaultInfo,
      vaultAtaAccount,
      ephemeral.blockhash,
      mainnet.blockhash,
    ],
  );

  const withdraw = useCallback(
    async (amount: number) => {
      if (
        !wallet?.publicKey ||
        !connection ||
        !ephemeralConnection ||
        !token ||
        !ephemeral.blockhash ||
        !mainnet.blockhash
      )
        throw new Error('Withdraw prerequisites not ready');

      const tokenAmount = BigInt(Math.round(amount * 10 ** token.decimals));

      const tokenMint = new PublicKey(token.mint);
      const [withdrawerEata] = deriveEphemeralAta(wallet.publicKey, tokenMint);
      const isDelegated = senderAccounts?.isDelegated;

      const actualBalance = isDelegated
        ? (senderAccounts?.ephemeralAta?.amount ?? 0n)
        : (senderAccounts?.mainnetEata?.amount ?? 0n);

      if (actualBalance < tokenAmount) {
        throw new Error('Not enough tokens to withdraw');
      }

      let undelegateTx: Transaction | undefined;
      if (isDelegated) {
        const undelegIx = undelegateIx(wallet.publicKey, tokenMint);
        undelegateTx = new Transaction();
        undelegateTx.add(undelegIx);
      }

      const withdrawIx = withdrawSplIx(wallet.publicKey, tokenMint, tokenAmount);
      const withdrawTx = new Transaction();
      withdrawTx.add(withdrawIx);

      withdrawTx.recentBlockhash = mainnet.blockhash;
      withdrawTx.feePayer = wallet.publicKey;

      if (undelegateTx) {
        undelegateTx.recentBlockhash = ephemeral.blockhash;
        undelegateTx.feePayer = wallet.publicKey;

        const [signedUndelegateTx, signedWithdrawTx] = await wallet.signAllTransactions([
          undelegateTx,
          withdrawTx,
        ]);

        let signature = await ephemeralConnection.sendRawTransaction(
          signedUndelegateTx.serialize(),
        );
        await ephemeralConnection.confirmTransaction(signature);

        // Wait for the undelegation
        // await GetCommitmentSignature(signature, ephemeralConnection); // Does not work without logs
        let retries = 10;
        while (retries > 0) {
          try {
            const accountInfo = await connection.getAccountInfo(withdrawerEata);
            if (accountInfo && !accountInfo.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
              break;
            }
          } catch (error) {
            console.error('Error getting account info:', error);
          }
          retries--;
          await new Promise(resolve => setTimeout(resolve, 400));
          if (retries === 0) {
            throw new Error('Could not undelegate sender');
          }
        }

        signature = await connection.sendRawTransaction(signedWithdrawTx.serialize());
        await connection.confirmTransaction(signature);
      } else {
        const [signedWithdrawTx] = await wallet.signAllTransactions([withdrawTx]);
        const signature = await connection.sendRawTransaction(signedWithdrawTx.serialize());
        await connection.confirmTransaction(signature);
      }
    },
    [
      wallet,
      connection,
      ephemeralConnection,
      token,
      senderAccounts,
      mainnet.blockhash,
      ephemeral.blockhash,
    ],
  );

  return {
    transfer,
    withdraw,
  };
}
