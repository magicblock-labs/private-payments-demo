import { BN, Program } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Keypair } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { useCallback, useMemo } from 'react';
import {
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
  groupPdaFromId,
} from '@magicblock-labs/ephemeral-rollups-sdk/privacy';

import { VAULT_PDA_SEED, DEPOSIT_PDA_SEED } from '@/lib/constants';
import { PrivatePayments } from '@/program/private_payments';
import PrivatePaymentsIdl from '@/program/private_payments.json';

import { useProvider } from './use-provider';

export function useProgram() {
  const { provider, ephemeralProvider } = useProvider();
  const program = useMemo(() => {
    if (!provider) return;
    return new Program<PrivatePayments>(PrivatePaymentsIdl as any, provider);
  }, [provider]);
  const ephemeralProgram = useMemo(() => {
    if (!ephemeralProvider) return;
    return new Program<PrivatePayments>(PrivatePaymentsIdl as any, ephemeralProvider);
  }, [ephemeralProvider]);
  const wallet = useAnchorWallet();

  const getDepositPda = useCallback(
    (user: PublicKey, tokenMint: PublicKey) => {
      if (!program?.provider.publicKey) return;
      return PublicKey.findProgramAddressSync(
        [Buffer.from(DEPOSIT_PDA_SEED), user.toBuffer(), tokenMint.toBuffer()],
        program.programId,
      )[0];
    },
    [program],
  );

  const getVaultPda = useCallback(
    (tokenMint: PublicKey) => {
      if (!program?.provider.publicKey) return;
      return PublicKey.findProgramAddressSync(
        [Buffer.from(VAULT_PDA_SEED), tokenMint.toBuffer()],
        program.programId,
      )[0];
    },
    [program],
  );

  const initializeDeposit = useCallback(
    async (user: PublicKey, tokenMint: PublicKey) => {
      if (!program?.provider.publicKey || !wallet) return;

      const deposit = getDepositPda(user, tokenMint)!;

      const initIx = await program.methods
        .initializeDeposit()
        .accountsPartial({
          payer: program.provider.publicKey,
          user,
          deposit,
          tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      const id = Keypair.generate().publicKey;
      const permission = permissionPdaFromAccount(deposit);
      const group = groupPdaFromId(id);

      const createPermissionIx = await program.methods
        .createPermission(id)
        .accountsPartial({
          payer: program.provider.publicKey,
          user,
          deposit,
          permission,
          group,
          permissionProgram: PERMISSION_PROGRAM_ID,
        })
        .preInstructions([initIx])
        .rpc();

      return deposit;
    },
    [program, wallet, getDepositPda],
  );

  const modifyDeposit = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number, isIncrease: boolean) => {
      if (!program?.provider.publicKey) return;

      const deposit = getDepositPda(user, tokenMint)!;
      const vault = getVaultPda(tokenMint)!;

      await program.methods
        .modifyBalance({
          amount: new BN(amount * Math.pow(10, 6)),
          increase: isIncrease,
        })
        .accountsPartial({
          payer: program.provider.publicKey,
          user,
          vault,
          deposit: deposit,
          userTokenAccount: getAssociatedTokenAddressSync(
            tokenMint,
            program.provider.publicKey,
            true,
            TOKEN_PROGRAM_ID,
          ),
          vaultTokenAccount: getAssociatedTokenAddressSync(
            tokenMint,
            vault,
            true,
            TOKEN_PROGRAM_ID,
          ),
          tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      return deposit;
    },
    [program, getDepositPda],
  );

  const deposit = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number) => {
      return modifyDeposit(user, tokenMint, amount, true);
    },
    [modifyDeposit],
  );

  const withdraw = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, amount: number) => {
      return modifyDeposit(user, tokenMint, amount, false);
    },
    [modifyDeposit],
  );

  const transfer = useCallback(
    async (tokenMint: PublicKey, amount: number, to: PublicKey, delegated: boolean) => {
      const usedProgram = delegated ? ephemeralProgram : program;
      if (!usedProgram?.provider.publicKey) return;

      const sourceDeposit = getDepositPda(usedProgram.provider.publicKey, tokenMint)!;
      const destinationDeposit = getDepositPda(to, tokenMint)!;

      await usedProgram.methods
        .transferDeposit(new BN(amount * Math.pow(10, 6)))
        .accountsPartial({
          sessionToken: null,
          payer: usedProgram.provider.publicKey,
          user: usedProgram.provider.publicKey,
          sourceDeposit,
          destinationDeposit,
          tokenMint,
        })
        .rpc();
    },
    [program, ephemeralProgram, getDepositPda],
  );

  const delegate = useCallback(
    async (user: PublicKey, tokenMint: PublicKey, validator?: PublicKey) => {
      if (!program?.provider.publicKey) return;

      const deposit = getDepositPda(user, tokenMint)!;

      console.log({
        payer: program.provider.publicKey,
        user,
        deposit,
        otherDeposit: getDepositPda(program.provider.publicKey, tokenMint),
        tokenMint,
      });
      await program.methods
        .delegate(user, tokenMint)
        .accountsPartial({
          payer: program.provider.publicKey,
          validator,
          deposit,
        })
        .rpc();
    },
    [program, getDepositPda],
  );

  const undelegate = useCallback(
    async (tokenMint: PublicKey) => {
      if (!ephemeralProgram?.provider.publicKey) return;

      const deposit = getDepositPda(ephemeralProgram.provider.publicKey, tokenMint)!;

      await ephemeralProgram.methods
        .undelegate()
        .accountsPartial({
          sessionToken: null,
          user: ephemeralProgram.provider.publicKey,
          payer: ephemeralProgram.provider.publicKey,
          deposit,
        })
        .rpc();
    },
    [ephemeralProgram, getDepositPda],
  );

  return {
    program,
    ephemeralProgram,
    getDepositPda,
    getVaultPda,
    initializeDeposit,
    deposit,
    withdraw,
    transfer,
    delegate,
    undelegate,
  };
}
