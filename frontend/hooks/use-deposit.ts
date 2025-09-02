import { DELEGATION_PROGRAM_ID } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DEPOSIT_PDA_SEED,
  EPHEMERAL_RPC_URL,
} from '@/lib/constants';
import { DepositAccount } from '@/lib/types';

import { useEphemeralConnection } from '@/hooks/use-ephemeral-connection';
import { useProgram } from '@/hooks/use-program';
import { useSubscription } from '@/hooks/use-subscription';
import { permissionPdaFromAccount } from '@magicblock-labs/ephemeral-rollups-sdk/privacy';

export function useDeposit(user?: PublicKey | string, tokenMint?: PublicKey | string) {
  const { program } = useProgram();
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const [ephemeralDeposit, setEphemeralDeposit] = useState<DepositAccount | null>(null);
  const [mainnetDeposit, setMainnetDeposit] = useState<DepositAccount | null>(null);
  const [isDelegated, setIsDelegated] = useState(false);
  const deposit = useMemo(() => {
    return isDelegated ? ephemeralDeposit : mainnetDeposit;
  }, [ephemeralDeposit, mainnetDeposit, isDelegated]);

  const depositPda = useMemo(() => {
    if (!program || !user || !tokenMint) return;
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(DEPOSIT_PDA_SEED),
        new PublicKey(user).toBuffer(),
        new PublicKey(tokenMint).toBuffer(),
      ],
      program.programId,
    )[0];
  }, [program, user, tokenMint]);

  const permissionPda = useMemo(() => {
    if (!depositPda) return;
    return permissionPdaFromAccount(depositPda);
  }, [depositPda]);

  const getDeposit = useCallback(async () => {
    if (!user || !program || !depositPda) return;
    setEphemeralDeposit(null);
    setMainnetDeposit(null);

    try {
      let depositAccount = await connection.getAccountInfo(depositPda);

      if (depositAccount) {
        const mainnetDeposit = program.coder.accounts.decode('deposit', depositAccount?.data);
        setMainnetDeposit(mainnetDeposit);
        if (depositAccount.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
          setIsDelegated(true);

          depositAccount = null;
          try {
            depositAccount = (await ephemeralConnection?.getAccountInfo(depositPda)) ?? null;
          } catch (error) {
            console.log('ephemeral connection error', error);
          }
          if (depositAccount) {
            const deposit = program.coder.accounts.decode('deposit', depositAccount?.data);
            setEphemeralDeposit(deposit);
          } else {
            setEphemeralDeposit(null);
          }
        } else {
          setIsDelegated(false);
        }
      } else {
        setMainnetDeposit(null);
        setEphemeralDeposit(null);
      }
    } catch (error) {
      console.log('getDeposit error', error);
    }
  }, [tokenMint, user, program, depositPda, connection, ephemeralConnection]);

  const handleDepositChange = useCallback(
    (notification: AccountInfo<Buffer>) => {
      if (notification.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
        setIsDelegated(true);
      } else {
        setIsDelegated(false);
        const decoded = program?.coder.accounts.decode('deposit', notification.data);
        if (decoded) {
          setMainnetDeposit(decoded);
        }
      }
    },
    [program],
  );

  const handleEphemeralDepositChange = useCallback(
    (notification: AccountInfo<Buffer>) => {
      const decoded = program?.coder.accounts.decode('deposit', notification.data);
      if (decoded) {
        setEphemeralDeposit(decoded);
      }
    },
    [program],
  );

  useSubscription(connection, depositPda, handleDepositChange);
  useSubscription(ephemeralConnection, depositPda, handleEphemeralDepositChange);

  // Initialize the deposit
  useEffect(() => {
    getDeposit();
  }, [getDeposit]);

  useEffect(() => {
    if (isDelegated && depositPda) {
      fetch(`${EPHEMERAL_RPC_URL}/permission?pubkey=${depositPda.toBase58()}`);
    }
  }, [depositPda, getDeposit]);

  return {
    deposit,
    mainnetDeposit,
    ephemeralDeposit,
    depositPda,
    permissionPda,
    isDelegated,
    accessDenied: isDelegated && !!!ephemeralDeposit,
  };
}
