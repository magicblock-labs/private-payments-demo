import { useCallback } from 'react';
import { useProgram } from './use-program';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useEphemeralConnection } from './use-ephemeral-connection';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PAYMENTS_PROGRAM, VALIDATOR_PUBKEY } from '@/lib/constants';
import { BN, Program } from '@coral-xyz/anchor';
import { PrivatePayments } from '@/program/private_payments';
import {
  DELEGATION_PROGRAM_ID,
  GetCommitmentSignature,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import {
  groupPdaFromId,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
} from '@magicblock-labs/ephemeral-rollups-sdk/privacy';
import { DepositAccount } from '@/lib/types';
import { SessionTokenManager } from '@magicblock-labs/gum-sdk';

async function initializeDeposit({
  program,
  user,
  tokenMint,
  depositPda,
  transaction,
}: {
  program: Program<PrivatePayments>;
  user: PublicKey;
  tokenMint: PublicKey;
  depositPda: PublicKey;
  transaction: Transaction;
}) {
  let initIx = await program.methods
    .initializeDeposit()
    .accountsPartial({
      payer: program.provider.publicKey,
      user,
      deposit: depositPda,
      tokenMint: tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const id = Keypair.generate().publicKey;
  const permission = permissionPdaFromAccount(depositPda);
  const group = groupPdaFromId(id);

  let createPermissionIx = await program.methods
    .createPermission(id)
    .accountsPartial({
      payer: program.provider.publicKey,
      user,
      deposit: depositPda,
      permission,
      group,
      permissionProgram: PERMISSION_PROGRAM_ID,
    })
    .preInstructions([initIx])
    .instruction();

  transaction.add(initIx);
  transaction.add(createPermissionIx);

  return transaction;
}

export default function useSimpleTransfer() {
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const { program, ephemeralProgram, getDepositPda, getVaultPda } = useProgram();
  const wallet = useAnchorWallet();

  const transfer = useCallback(
    async (recipient: string, tokenMint: string, amount: number) => {
      if (
        !wallet?.publicKey ||
        !program ||
        !ephemeralProgram ||
        !connection ||
        !ephemeralConnection
      )
        return;

      let tokenAmount = new BN(Math.pow(10, 6) * amount);
      const recipientPk = new PublicKey(recipient);
      const tokenMintPk = new PublicKey(tokenMint);

      let preliminaryTx: Transaction | undefined;
      let mainnetTx: Transaction | undefined;

      const vaultPda = getVaultPda(tokenMintPk)!;

      const senderDepositPda = getDepositPda(wallet.publicKey, tokenMintPk)!;
      const senderDepositAccount = await connection.getAccountInfo(senderDepositPda);
      const ephemeralSenderDepositAccount =
        await ephemeralConnection.getAccountInfo(senderDepositPda);

      const senderIsDelegated = senderDepositAccount?.owner.equals(
        new PublicKey(DELEGATION_PROGRAM_ID),
      );

      // Compute the amount of tokens to deposit
      let amountToDeposit = tokenAmount;
      let mainnetSenderDepositAmount = senderDepositAccount
        ? (
            (await program.coder.accounts.decode(
              'deposit',
              senderDepositAccount.data,
            )) as DepositAccount
          ).amount
        : new BN(0);
      let ephemeralSenderDepositAmount = ephemeralSenderDepositAccount
        ? (
            (await program.coder.accounts.decode(
              'deposit',
              ephemeralSenderDepositAccount.data,
            )) as DepositAccount
          ).amount
        : new BN(0);

      if (senderIsDelegated) {
        amountToDeposit = amountToDeposit.sub(ephemeralSenderDepositAmount);
      } else {
        amountToDeposit = amountToDeposit.sub(mainnetSenderDepositAmount);
      }

      // Create a session for the ER
      const sessionKp = Keypair.generate();
      const sessionManager = new SessionTokenManager(wallet, connection);
      const sessionToken = PublicKey.findProgramAddressSync(
        [
          Buffer.from('session_token'),
          PAYMENTS_PROGRAM.toBuffer(),
          sessionKp.publicKey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        sessionManager.program.programId,
      )[0];
      const createSessionTx = await sessionManager.program.methods
        .createSession(true, null, null)
        .accountsPartial({
          sessionToken,
          sessionSigner: sessionKp.publicKey,
          authority: wallet.publicKey,
          targetProgram: PAYMENTS_PROGRAM,
        })
        .transaction();
      const revokeSessionTx = await sessionManager.program.methods
        .revokeSession()
        .accountsPartial({
          sessionToken,
          authority: wallet.publicKey,
        })
        .transaction();

      if (!senderDepositAccount) {
        mainnetTx = await initializeDeposit({
          program,
          user: wallet.publicKey,
          tokenMint: tokenMintPk,
          depositPda: senderDepositPda,
          transaction: new Transaction(),
        });
      } else {
        // If the sender has a deposit, we need to undelegate to transfer more tokens to it
        if (senderIsDelegated) {
          if (amountToDeposit.gt(new BN(0))) {
            let undelegateIx = await program.methods
              .undelegate()
              .accountsPartial({
                sessionToken,
                payer: sessionKp.publicKey,
                user: wallet.publicKey,
                deposit: senderDepositPda,
              })
              .instruction();
            preliminaryTx = new Transaction();
            preliminaryTx.add(undelegateIx);
          }
        }
      }

      // Check if the recipient has a deposit, create one if not
      const recipientDepositPda = getDepositPda(recipientPk, tokenMintPk)!;
      const recipientDepositAccount = await connection.getAccountInfo(recipientDepositPda);
      const recipientIsDelegated = recipientDepositAccount?.owner.equals(
        new PublicKey(DELEGATION_PROGRAM_ID),
      );
      let recipientInitTx: Transaction | undefined;
      if (!recipientDepositAccount) {
        recipientInitTx = await initializeDeposit({
          program,
          user: recipientPk,
          tokenMint: tokenMintPk,
          depositPda: recipientDepositPda,
          transaction: new Transaction(),
        });
      }

      console.log('delegation status:', senderIsDelegated, recipientIsDelegated);
      console.log('amountToDeposit:', amountToDeposit.toNumber() / Math.pow(10, 6));

      if (amountToDeposit.gt(new BN(0))) {
        console.log('depositing', amountToDeposit.toNumber() / Math.pow(10, 6));
        let depositIx = await program.methods
          .modifyBalance({ amount: amountToDeposit, increase: true })
          .accountsPartial({
            payer: program.provider.publicKey,
            user: wallet.publicKey,
            vault: vaultPda,
            deposit: senderDepositPda,
            userTokenAccount: getAssociatedTokenAddressSync(
              tokenMintPk,
              wallet.publicKey,
              true,
              TOKEN_PROGRAM_ID,
            ),
            vaultTokenAccount: getAssociatedTokenAddressSync(
              tokenMintPk,
              vaultPda,
              true,
              TOKEN_PROGRAM_ID,
            ),
            tokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(depositIx);
      }

      // Make sure both deposits are delegated
      if (!senderIsDelegated || preliminaryTx) {
        console.log('delegating sender');
        let delegateIx = await program.methods
          .delegate(wallet.publicKey, tokenMintPk)
          .accountsPartial({
            payer: wallet.publicKey,
            validator: VALIDATOR_PUBKEY,
            deposit: senderDepositPda,
          })
          .instruction();
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(delegateIx);
      }

      if (!recipientIsDelegated) {
        console.log('delegating recipient');
        let delegateIx = await program.methods
          .delegate(recipientPk, tokenMintPk)
          .accountsPartial({
            payer: wallet.publicKey,
            validator: VALIDATOR_PUBKEY,
            deposit: recipientDepositPda,
          })
          .instruction();
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(delegateIx);
      }

      // Transfer the amount from the sender to the recipient
      console.log('transferring', tokenAmount.toNumber() / Math.pow(10, 6));
      const ephemeralTx = await ephemeralProgram.methods
        .transferDeposit(tokenAmount)
        .accountsPartial({
          sessionToken,
          payer: sessionKp.publicKey,
          user: program.provider.publicKey,
          sourceDeposit: senderDepositPda,
          destinationDeposit: recipientDepositPda,
          tokenMint: tokenMintPk,
        })
        .signers([sessionKp])
        .transaction();

      let blockhash = (await connection.getLatestBlockhash()).blockhash;
      let ephemeralBlockhash = (await ephemeralConnection.getLatestBlockhash()).blockhash;

      let actions = [
        {
          name: 'createSessionTx',
          tx: createSessionTx,
          signedTx: createSessionTx,
          blockhash,
          connection,
        },
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
            await GetCommitmentSignature(signature, ephemeralConnection);
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
        {
          name: 'revokeSessionTx',
          tx: revokeSessionTx,
          signedTx: revokeSessionTx,
          blockhash,
          connection,
        },
      ]
        .filter(action => action.tx)
        .map(action => {
          let tx = action.tx!;
          tx.recentBlockhash = action.blockhash;
          tx.feePayer =
            action.blockhash === ephemeralBlockhash
              ? sessionKp.publicKey
              : program.provider.publicKey;
          return { ...action, tx };
        });

      for (let i = 0; i < actions.length; i++) {
        let action = actions[i];
        if (action.blockhash === ephemeralBlockhash || action.name === 'createSessionTx') {
          action.tx!.partialSign(sessionKp);
          actions[i].signedTx = action.tx!;
        }
      }

      let userSignedActions = actions.filter(action => action.blockhash !== ephemeralBlockhash);
      let txs = userSignedActions.map(action => action.tx!);
      let signedTxs = await wallet.signAllTransactions(txs);

      for (let i = 0; i < actions.length; i++) {
        let action = actions[i];
        if (action.blockhash === ephemeralBlockhash) {
          action.tx!.sign(sessionKp);
          actions[i].signedTx = action.tx!;
        } else {
          actions[i].signedTx = signedTxs[userSignedActions.findIndex(a => a.name === action.name)];
        }
      }

      for (let action of actions) {
        console.log(`Sending ${action.name} transaction`);
        let signature = await action.connection.sendRawTransaction(action.signedTx!.serialize());
        await action.connection.confirmTransaction(signature);
        await action.callback?.(signature);
      }
    },
    [wallet, program, ephemeralProgram, connection, ephemeralConnection, getDepositPda],
  );

  const withdraw = useCallback(
    async (tokenMint: string, amount: number) => {
      if (
        !wallet?.publicKey ||
        !program ||
        !ephemeralProgram ||
        !connection ||
        !ephemeralConnection
      )
        return;

      let tokenMintPk = new PublicKey(tokenMint);
      const vaultPda = getVaultPda(tokenMintPk)!;
      let tokenAmount = new BN(Math.pow(10, 6) * amount);

      let withdrawerDepositPda = getDepositPda(wallet.publicKey, tokenMintPk)!;
      let withdrawerDepositAccount = await connection.getAccountInfo(withdrawerDepositPda);
      const isDelegated = withdrawerDepositAccount?.owner.equals(
        new PublicKey(DELEGATION_PROGRAM_ID),
      );
      const withdrawerDepositAmount = withdrawerDepositAccount
        ? (
            (await ephemeralProgram.coder.accounts.decode(
              'deposit',
              withdrawerDepositAccount?.data,
            )) as DepositAccount
          ).amount
        : new BN(0);

      let ephemeralWithdrawerDepositAccount =
        await ephemeralConnection.getAccountInfo(withdrawerDepositPda);
      let ephemeralDepositAmount = ephemeralWithdrawerDepositAccount
        ? (
            (await ephemeralProgram.coder.accounts.decode(
              'deposit',
              ephemeralWithdrawerDepositAccount?.data,
            )) as DepositAccount
          ).amount
        : new BN(0);

      const actualBalance = isDelegated ? ephemeralDepositAmount : withdrawerDepositAmount;

      if (actualBalance.lt(tokenAmount)) {
        throw new Error('Not enough tokens to withdraw');
      }

      // Create a session for the ER
      const sessionKp = Keypair.generate();
      const sessionManager = new SessionTokenManager(wallet, connection);
      const sessionToken = PublicKey.findProgramAddressSync(
        [
          Buffer.from('session_token'),
          PAYMENTS_PROGRAM.toBuffer(),
          sessionKp.publicKey.toBuffer(),
          wallet.publicKey.toBuffer(),
        ],
        sessionManager.program.programId,
      )[0];
      const createSessionTx = await sessionManager.program.methods
        .createSession(true, null, null)
        .accountsPartial({
          sessionToken,
          sessionSigner: sessionKp.publicKey,
          authority: wallet.publicKey,
          targetProgram: PAYMENTS_PROGRAM,
        })
        .transaction();
      const revokeSessionTx = await sessionManager.program.methods
        .revokeSession()
        .accountsPartial({
          sessionToken,
          authority: wallet.publicKey,
        })
        .transaction();

      let undelegateTx: Transaction | undefined;
      if (withdrawerDepositAccount?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
        let undelegateIx = await ephemeralProgram.methods
          .undelegate()
          .accountsPartial({
            sessionToken,
            payer: sessionKp.publicKey,
            user: wallet.publicKey,
            deposit: withdrawerDepositPda,
          })
          .instruction();

        undelegateTx = new Transaction();
        undelegateTx.add(undelegateIx);
      }

      let withdrawIx = await program.methods
        .modifyBalance({ amount: tokenAmount, increase: false })
        .accountsPartial({
          payer: program.provider.publicKey,
          user: wallet.publicKey,
          vault: vaultPda,
          deposit: withdrawerDepositPda,
          userTokenAccount: getAssociatedTokenAddressSync(
            tokenMintPk,
            wallet.publicKey,
            true,
            TOKEN_PROGRAM_ID,
          ),
          vaultTokenAccount: getAssociatedTokenAddressSync(
            tokenMintPk,
            vaultPda,
            true,
            TOKEN_PROGRAM_ID,
          ),
          tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();
      let withdrawTx = new Transaction();
      withdrawTx.add(withdrawIx);

      let blockhash = (await connection.getLatestBlockhash()).blockhash;
      let ephemeralBlockhash = (await ephemeralConnection.getLatestBlockhash()).blockhash;

      withdrawTx.recentBlockhash = blockhash;
      withdrawTx.feePayer = program.provider.publicKey;

      if (undelegateTx) {
        createSessionTx.recentBlockhash = blockhash;
        createSessionTx.feePayer = program.provider.publicKey;
        createSessionTx.partialSign(sessionKp);

        undelegateTx.recentBlockhash = ephemeralBlockhash;
        undelegateTx.feePayer = sessionKp.publicKey;

        revokeSessionTx.recentBlockhash = blockhash;
        revokeSessionTx.feePayer = program.provider.publicKey;

        undelegateTx.sign(sessionKp);

        const [signedCreateSessionTx, signedWithdrawTx, signedRevokeSessionTx] =
          await wallet.signAllTransactions([createSessionTx, withdrawTx, revokeSessionTx]);

        let signature = await connection.sendRawTransaction(signedCreateSessionTx.serialize());
        await connection.confirmTransaction(signature);

        signature = await ephemeralConnection.sendRawTransaction(undelegateTx.serialize());
        await ephemeralConnection.confirmTransaction(signature);

        // Wait for the delegation
        await GetCommitmentSignature(signature, ephemeralConnection);

        // Timeout to be sure undelegation is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        signature = await connection.sendRawTransaction(signedWithdrawTx.serialize(), {
          skipPreflight: true,
        });
        await connection.confirmTransaction(signature);

        signature = await connection.sendRawTransaction(signedRevokeSessionTx.serialize());
        await connection.confirmTransaction(signature);
      } else {
        let [signedWithdrawTx] = await wallet.signAllTransactions([withdrawTx]);
        let signature = await connection.sendRawTransaction(signedWithdrawTx.serialize(), {
          skipPreflight: true,
        });
        await connection.confirmTransaction(signature);
      }
    },
    [wallet, program, ephemeralProgram, connection, ephemeralConnection, getDepositPda],
  );

  return {
    transfer,
    withdraw,
  };
}
