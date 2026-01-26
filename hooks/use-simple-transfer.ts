import { useCallback } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useEphemeralConnection } from './use-ephemeral-connection';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  unpackAccount,
} from '@solana/spl-token';
import { VALIDATOR_PUBKEY } from '@/lib/constants';
import {
  createEataPermissionIx,
  delegateIx,
  DELEGATION_PROGRAM_ID,
  deriveEphemeralAta,
  deriveVault,
  GetCommitmentSignature,
  initEphemeralAtaIx,
  initVaultAtaIx,
  initVaultIx,
  transferToVaultIx,
  undelegateIx,
  withdrawSplIx,
} from '@magicblock-labs/ephemeral-rollups-sdk';

async function initializeDeposit({
  user,
  tokenMint,
  transaction,
  payer,
}: {
  user: PublicKey;
  tokenMint: PublicKey;
  transaction: Transaction;
  payer: PublicKey;
}) {
  let ata = getAssociatedTokenAddressSync(tokenMint, user, true, TOKEN_PROGRAM_ID);
  let [eata, eataBump] = deriveEphemeralAta(user, tokenMint);
  let initAta = createAssociatedTokenAccountIdempotentInstruction(payer, ata, user, tokenMint);
  let initIx = initEphemeralAtaIx(eata, user, tokenMint, payer, eataBump);
  let createPermissionIx = createEataPermissionIx(eata, payer, eataBump);
  transaction.add(initAta);
  transaction.add(initIx);
  transaction.add(createPermissionIx);
  return transaction;
}

export default function useSimpleTransfer() {
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const wallet = useAnchorWallet();

  const transfer = useCallback(
    async (recipient: string, tokenMint: string, amount: number) => {
      if (!wallet?.publicKey || !connection || !ephemeralConnection) return;

      let tokenAmount = BigInt(Math.pow(10, 6) * amount);
      const recipientPk = new PublicKey(recipient);
      const tokenMintPk = new PublicKey(tokenMint);

      let preliminaryTx: Transaction | undefined;
      let mainnetTx: Transaction | undefined;

      const [vault, vaultBump] = deriveVault(tokenMintPk);
      const vaultAta = getAssociatedTokenAddressSync(tokenMintPk, vault, true, TOKEN_PROGRAM_ID);

      const [senderEata, senderEataBump] = deriveEphemeralAta(wallet.publicKey, tokenMintPk);
      const senderAta = getAssociatedTokenAddressSync(tokenMintPk, wallet.publicKey);
      const [senderAtaInfo, senderEataInfo, vaultInfo, vaultAtaInfo] =
        await connection.getMultipleAccountsInfo([senderAta, senderEata, vault, vaultAta]);
      const ephemeralSenderAtaInfo = await ephemeralConnection.getAccountInfo(senderAta);

      const senderIsDelegated = senderEataInfo?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID));
      console.log('senderIsDelegated:', senderIsDelegated);
      console.log('senderEataInfo:', senderEataInfo);
      console.log('ephemeralSenderAtaInfo:', ephemeralSenderAtaInfo);
      console.log('senderAtaInfo:', senderAtaInfo);
      console.log('senderAta:', senderAta.toString());
      console.log('senderEata:', senderEata.toString());

      // Compute the amount of tokens to deposit
      let amountToDeposit = tokenAmount;
      const mainnetSenderAtaBalance = senderAtaInfo
        ? unpackAccount(senderAta, senderAtaInfo).amount
        : 0n;
      const ephemeralSenderAtaBalance = ephemeralSenderAtaInfo
        ? unpackAccount(senderAta, ephemeralSenderAtaInfo).amount
        : 0n;

      if (senderIsDelegated) {
        amountToDeposit -= ephemeralSenderAtaBalance;
      } else {
        amountToDeposit -= mainnetSenderAtaBalance;
      }

      // If the vault does not exist, we need to initialize it
      console.log('vaultInfo:', vaultInfo, vaultAtaInfo);
      if (!vaultInfo) {
        const vaultIx = initVaultIx(vault, tokenMintPk, wallet.publicKey, vaultBump);
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(vaultIx);
      }
      if (!vaultAtaInfo) {
        const vaultAtaIx = initVaultAtaIx(wallet.publicKey, vaultAta, vault, tokenMintPk);
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(vaultAtaIx);
      }

      if (!senderEataInfo) {
        // Sender EATA does not exist, we need to initialize it
        mainnetTx = await initializeDeposit({
          payer: wallet.publicKey,
          user: wallet.publicKey,
          tokenMint: tokenMintPk,
          transaction: mainnetTx || new Transaction(),
        });
      } else {
        // If the sender has a deposit, we need to undelegate to transfer more tokens to it
        if (senderIsDelegated) {
          if (amountToDeposit > 0) {
            let undelegIx = undelegateIx(wallet.publicKey, tokenMintPk);
            preliminaryTx = new Transaction().add(undelegIx);
          }
        }
      }

      // Check if the recipient has a deposit, create one if not
      const [recipientEata, recipientEataBump] = deriveEphemeralAta(recipientPk, tokenMintPk);
      const recipientAta = getAssociatedTokenAddressSync(tokenMintPk, recipientPk, true);
      const [recipientEataInfo] = await connection.getMultipleAccountsInfo([recipientEata]);
      const recipientIsDelegated = recipientEataInfo?.owner.equals(
        new PublicKey(DELEGATION_PROGRAM_ID),
      );
      console.log('recipientEataInfo:', recipientEataInfo);
      console.log('recipientEata:', recipientEata.toString());
      console.log('recipientAta:', recipientAta.toString());
      console.log('recipientPk:', recipientPk.toString());
      console.log('wallet.publicKey:', wallet.publicKey);
      console.log('recipientIsDelegated:', recipientIsDelegated);

      let recipientInitTx: Transaction | undefined;
      if (!recipientEataInfo) {
        recipientInitTx = await initializeDeposit({
          payer: wallet.publicKey,
          user: recipientPk,
          tokenMint: tokenMintPk,
          transaction: new Transaction(),
        });
      }

      console.log('delegation status:', senderIsDelegated, recipientIsDelegated);
      console.log('amountToDeposit:', Number(amountToDeposit) / Math.pow(10, 6));

      if (amountToDeposit > 0) {
        console.log('depositing', Number(amountToDeposit) / Math.pow(10, 6));
        let depositIx = transferToVaultIx(
          senderEata,
          vault,
          tokenMintPk,
          senderAta,
          vaultAta,
          wallet.publicKey,
          amountToDeposit,
        );
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(depositIx);
      }

      // Make sure both deposits are delegated
      if (!senderIsDelegated || preliminaryTx) {
        console.log('delegating sender');
        let delegIx = delegateIx(wallet.publicKey, senderEata, senderEataBump, VALIDATOR_PUBKEY);
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(delegIx);
      }

      if (!recipientIsDelegated) {
        console.log('delegating recipient');
        let delegIx = delegateIx(
          wallet.publicKey,
          recipientEata,
          recipientEataBump,
          VALIDATOR_PUBKEY,
        );
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(delegIx);
      }

      // Transfer the amount from the sender to the recipient
      console.log('transferring', Number(tokenAmount) / Math.pow(10, 6));
      const ephemeralTx = new Transaction().add(
        createTransferCheckedInstruction(
          senderAta,
          tokenMintPk,
          recipientAta,
          wallet.publicKey,
          tokenAmount,
          6,
        ),
      );

      let blockhash = (await connection.getLatestBlockhash()).blockhash;
      let ephemeralBlockhash = (await ephemeralConnection.getLatestBlockhash()).blockhash;

      let actions = [
        {
          name: 'recipientInitTx',
          tx: recipientInitTx,
          signedTx: recipientInitTx,
          blockhash,
          connection,
          callback: () => new Promise(resolve => setTimeout(resolve, 3000)),
        },
        {
          name: 'preliminaryTx',
          tx: preliminaryTx,
          signedTx: preliminaryTx,
          blockhash: ephemeralBlockhash,
          connection: ephemeralConnection,
          callback: async (signature: string) => {
            let retries = 5;
            while (retries > 0) {
              try {
                await GetCommitmentSignature(signature, ephemeralConnection);
              } catch {
                retries--;
              }
            }
            return new Promise(resolve => setTimeout(resolve, 1000));
          },
        },
        {
          name: 'mainnetTx',
          tx: mainnetTx,
          signedTx: mainnetTx,
          blockhash,
          connection,
        },
        {
          name: 'ephemeralTx',
          tx: ephemeralTx,
          signedTx: ephemeralTx,
          blockhash: ephemeralBlockhash,
          connection: ephemeralConnection,
          callback: (signature: string) => ephemeralConnection.confirmTransaction(signature),
        },
      ]
        .filter(action => action.tx)
        .map(action => {
          let tx = action.tx!;
          tx.recentBlockhash = action.blockhash;
          tx.feePayer = wallet.publicKey;
          return { ...action, tx };
        });

      let txs = actions.map(action => action.tx!);
      let signedTxs = await wallet.signAllTransactions(txs);

      for (let i = 0; i < actions.length; i++) {
        actions[i].signedTx = signedTxs[actions.findIndex(a => a.name === actions[i].name)];
      }

      for (let action of actions) {
        console.log(`Sending ${action.name} transaction`, action);
        let signature = await action.connection.sendRawTransaction(action.signedTx!.serialize(), {
          // skipPreflight: true,
        });
        console.log('signature:', signature);
        await action.connection.confirmTransaction(signature);
        await action.callback?.(signature);
        console.log('confirmed');
      }
    },
    [wallet, connection, ephemeralConnection],
  );

  const withdraw = useCallback(
    async (tokenMint: string, amount: number) => {
      if (!wallet?.publicKey || !connection || !ephemeralConnection) return;

      let tokenMintPk = new PublicKey(tokenMint);
      let tokenAmount = BigInt(Math.pow(10, 6) * amount);

      let [withdrawerEata] = deriveEphemeralAta(wallet.publicKey, tokenMintPk);
      let withdrawerAta = getAssociatedTokenAddressSync(tokenMintPk, wallet.publicKey);
      let [mainnetWithdrawerAtaInfo, mainnetWithdrawerEataInfo] =
        await connection.getMultipleAccountsInfo([withdrawerAta, withdrawerEata]);
      let [ephemeralWithdrawerAtaInfo] = await ephemeralConnection.getMultipleAccountsInfo([
        withdrawerAta,
      ]);
      const isDelegated = mainnetWithdrawerEataInfo?.owner.equals(
        new PublicKey(DELEGATION_PROGRAM_ID),
      );
      const mainnetWithdrawerAtaBalance = mainnetWithdrawerAtaInfo
        ? unpackAccount(withdrawerAta, mainnetWithdrawerAtaInfo).amount
        : 0n;
      const ephemeralWithdrawerAtaBalance = ephemeralWithdrawerAtaInfo
        ? unpackAccount(withdrawerAta, ephemeralWithdrawerAtaInfo).amount
        : 0n;
      console.log('mainnetWithdrawerAtaBalance:', mainnetWithdrawerAtaBalance);
      console.log('ephemeralWithdrawerAtaBalance:', ephemeralWithdrawerAtaBalance);
      console.log('tokenAmount:', tokenAmount);
      console.log('isDelegated:', isDelegated);
      console.log('withdrawerAta:', withdrawerAta.toString());
      console.log('withdrawerEata:', withdrawerEata.toString());
      console.log('wallet.publicKey:', wallet.publicKey.toString());
      console.log('tokenMintPk:', tokenMintPk.toString());

      const actualBalance = isDelegated
        ? ephemeralWithdrawerAtaBalance
        : mainnetWithdrawerAtaBalance;

      if (actualBalance < tokenAmount) {
        throw new Error('Not enough tokens to withdraw');
      }

      let undelegateTx: Transaction | undefined;
      if (isDelegated) {
        let undelegIx = undelegateIx(wallet.publicKey, tokenMintPk);
        undelegateTx = new Transaction();
        undelegateTx.add(undelegIx);
      }

      let withdrawIx = withdrawSplIx(wallet.publicKey, tokenMintPk, tokenAmount);
      let withdrawTx = new Transaction();
      withdrawTx.add(withdrawIx);

      let blockhash = (await connection.getLatestBlockhash()).blockhash;
      let ephemeralBlockhash = (await ephemeralConnection.getLatestBlockhash()).blockhash;

      withdrawTx.recentBlockhash = blockhash;
      withdrawTx.feePayer = wallet.publicKey;

      if (undelegateTx) {
        undelegateTx.recentBlockhash = ephemeralBlockhash;
        undelegateTx.feePayer = wallet.publicKey;

        const [signedUndelegateTx, signedWithdrawTx] = await wallet.signAllTransactions([
          undelegateTx,
          withdrawTx,
        ]);

        let signature = await ephemeralConnection.sendRawTransaction(
          signedUndelegateTx.serialize(),
        );
        console.log('signature:', signature);
        await ephemeralConnection.confirmTransaction(signature);

        // Wait for the delegation
        // await GetCommitmentSignature(signature, ephemeralConnection); // Does not work without logs
        let retries = 5;
        while (retries > 0) {
          try {
            let accountInfo = await ephemeralConnection.getAccountInfo(withdrawerEata);
            if (accountInfo?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
              break;
            }
          } catch {}
          retries--;
        }

        // Timeout to be sure undelegation is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        signature = await connection.sendRawTransaction(signedWithdrawTx.serialize());
        console.log('signature:', signature);
        await connection.confirmTransaction(signature);
      } else {
        let [signedWithdrawTx] = await wallet.signAllTransactions([withdrawTx]);
        let signature = await connection.sendRawTransaction(signedWithdrawTx.serialize(), {
          skipPreflight: true,
        });
        await connection.confirmTransaction(signature);
      }
    },
    [wallet, connection, ephemeralConnection],
  );

  return {
    transfer,
    withdraw,
  };
}
