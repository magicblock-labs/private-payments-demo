import { useCallback } from 'react';
import { useProgram } from './use-program';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { useEphemeralConnection } from './use-ephemeral-connection';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { EPHEMERAL_RPC_URL, GROUP_SEED } from '@/lib/constants';
import { PERMISSION_PROGRAM_ID } from '@/lib/constants';
import { PERMISSION_SEED } from '@/lib/constants';
import { BN, Program } from '@coral-xyz/anchor';
import { PrivatePayments } from '@/program/private_payments';
import {
  DELEGATION_PROGRAM_ID,
  GetCommitmentSignature,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import { DepositAccount } from '@/lib/types';

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
  const permission = PublicKey.findProgramAddressSync(
    [PERMISSION_SEED, depositPda.toBuffer()],
    PERMISSION_PROGRAM_ID,
  )[0];
  const group = PublicKey.findProgramAddressSync(
    [GROUP_SEED, id.toBuffer()],
    PERMISSION_PROGRAM_ID,
  )[0];

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
      const ephemeralTx = new Transaction();

      const vaultPda = getVaultPda(tokenMintPk)!;

      // Check if the sender has a deposit, create one if not
      const senderDepositPda = getDepositPda(wallet.publicKey, tokenMintPk)!;
      const senderDepositAccount = await connection.getAccountInfo(senderDepositPda);
      const ephemeralSenderDepositAccount =
        await ephemeralConnection.getAccountInfo(senderDepositPda);

      // Compute the amount of tokens to deposit
      let amountToDeposit = tokenAmount;
      if (ephemeralSenderDepositAccount) {
        let senderDeposit: DepositAccount = await program.coder.accounts.decode(
          'deposit',
          ephemeralSenderDepositAccount.data,
        );
        amountToDeposit = amountToDeposit.sub(senderDeposit.amount);
      }

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
        if (senderDepositAccount.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
          if (amountToDeposit.gt(new BN(0))) {
            let undelegateIx = await program.methods
              .undelegate()
              .accountsPartial({
                payer: wallet.publicKey,
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
      if (!recipientDepositAccount) {
        mainnetTx = await initializeDeposit({
          program,
          user: recipientPk,
          tokenMint: tokenMintPk,
          depositPda: recipientDepositPda,
          transaction: mainnetTx || new Transaction(),
        });
      }

      if (amountToDeposit.gt(new BN(0))) {
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
      if (
        !senderDepositAccount?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID)) ||
        preliminaryTx
      ) {
        let delegateIx = await program.methods
          .delegate(wallet.publicKey, tokenMintPk)
          .accountsPartial({
            payer: wallet.publicKey,
            deposit: senderDepositPda,
          })
          .instruction();
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(delegateIx);
      }

      if (!recipientDepositAccount?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
        let delegateIx = await program.methods
          .delegate(recipientPk, tokenMintPk)
          .accountsPartial({
            payer: wallet.publicKey,
            deposit: recipientDepositPda,
          })
          .instruction();
        mainnetTx = mainnetTx || new Transaction();
        mainnetTx.add(delegateIx);
      }

      // Transfer the amount from the sender to the recipient
      let transferIx = await ephemeralProgram.methods
        .transferDeposit(tokenAmount)
        .accountsPartial({
          user: program.provider.publicKey,
          sourceDeposit: senderDepositPda,
          destinationDeposit: recipientDepositPda,
          tokenMint: tokenMintPk,
        })
        .instruction();
      ephemeralTx.add(transferIx);

      let blockhash = (await connection.getLatestBlockhash()).blockhash;
      let ephemeralBlockhash = (await ephemeralConnection.getLatestBlockhash()).blockhash;

      ephemeralTx.recentBlockhash = ephemeralBlockhash;
      ephemeralTx.feePayer = program.provider.publicKey;

      if (preliminaryTx && mainnetTx) {
        preliminaryTx.recentBlockhash = ephemeralBlockhash;
        preliminaryTx.feePayer = program.provider.publicKey;

        mainnetTx.recentBlockhash = blockhash;
        mainnetTx.feePayer = program.provider.publicKey;

        let [signedPreliminaryTx, signedMainnetTx, signedEphemeralTx] =
          await wallet.signAllTransactions([preliminaryTx, mainnetTx, ephemeralTx]);

        let signature = await ephemeralConnection.sendRawTransaction(
          signedPreliminaryTx.serialize(),
        );
        await ephemeralConnection.confirmTransaction(signature);

        // Manually check permissions
        // Wait for the permission to be caught by the RPC
        await new Promise(resolve => setTimeout(resolve, 4000));
        await fetch(`${EPHEMERAL_RPC_URL}/permission?pubkey=${senderDepositPda.toString()}`);
        await fetch(`${EPHEMERAL_RPC_URL}/permission?pubkey=${recipientDepositPda.toString()}`);

        // Wait for the delegation
        await GetCommitmentSignature(signature, ephemeralConnection);

        // Timeout to be sure undelegation is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        signature = await connection.sendRawTransaction(signedMainnetTx.serialize());
        await connection.confirmTransaction(signature);
        signature = await ephemeralConnection.sendRawTransaction(signedEphemeralTx.serialize());
        await ephemeralConnection.confirmTransaction(signature);
      } else if (!preliminaryTx && mainnetTx) {
        mainnetTx.recentBlockhash = blockhash;
        mainnetTx.feePayer = program.provider.publicKey;

        let [signedMainnetTx, signedEphemeralTx] = await wallet.signAllTransactions([
          mainnetTx,
          ephemeralTx,
        ]);

        let signature = await connection.sendRawTransaction(signedMainnetTx.serialize());
        await connection.confirmTransaction(signature);

        // Manually check permissions
        // Wait for the permission to be caught by the RPC
        await new Promise(resolve => setTimeout(resolve, 4000));
        await fetch(`${EPHEMERAL_RPC_URL}/permission?pubkey=${senderDepositPda.toString()}`);
        await fetch(`${EPHEMERAL_RPC_URL}/permission?pubkey=${recipientDepositPda.toString()}`);

        signature = await ephemeralConnection.sendRawTransaction(signedEphemeralTx.serialize());
        await ephemeralConnection.confirmTransaction(signature);
      } else if (!preliminaryTx && !mainnetTx) {
        let [signedEphemeralTx] = await wallet.signAllTransactions([ephemeralTx]);
        let signature = await ephemeralConnection.sendRawTransaction(signedEphemeralTx.serialize());
        await ephemeralConnection.confirmTransaction(signature);
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

      if (ephemeralDepositAmount.lt(tokenAmount)) {
        throw new Error('Not enough tokens to withdraw');
      }

      let undelegateTx: Transaction | undefined;
      if (withdrawerDepositAccount?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
        let undelegateIx = await ephemeralProgram.methods
          .undelegate()
          .accountsPartial({
            payer: wallet.publicKey,
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
        undelegateTx.recentBlockhash = ephemeralBlockhash;
        undelegateTx.feePayer = program.provider.publicKey;

        let [signedUndelegateTx, signedWithdrawTx] = await wallet.signAllTransactions([
          undelegateTx,
          withdrawTx,
        ]);

        let signature = await ephemeralConnection.sendRawTransaction(
          signedUndelegateTx.serialize(),
        );
        await ephemeralConnection.confirmTransaction(signature);

        // Wait for the delegation
        await GetCommitmentSignature(signature, ephemeralConnection);

        // Timeout to be sure undelegation is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        signature = await connection.sendRawTransaction(signedWithdrawTx.serialize());
        await connection.confirmTransaction(signature);
      } else {
        let [signedWithdrawTx] = await wallet.signAllTransactions([withdrawTx]);
        let signature = await connection.sendRawTransaction(signedWithdrawTx.serialize());
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
