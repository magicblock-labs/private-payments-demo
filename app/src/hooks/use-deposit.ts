import { DELEGATION_PROGRAM_ID } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEPOSIT_PDA_SEED } from '../constants';
import { DepositAccount } from '../libs/types';

import { useEphemeralConnection } from './use-ephemeral-connection';
import { useProgram } from './use-program';
import { useSubscription } from './use-subscription';

export function useDeposit(user?: PublicKey | string, tokenMint?: PublicKey | string) {
  const { program } = useProgram();
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const [deposit, setDeposit] = useState<DepositAccount | null>(null);
  const [isDelegated, setIsDelegated] = useState(false);

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

  const getDeposit = useCallback(async () => {
    if (!tokenMint || !user || !program || !depositPda) return;
    try {
      let depositAccount = await connection.getAccountInfo(depositPda);

      if (depositAccount) {
        if (depositAccount.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
          setIsDelegated(true);

          depositAccount = await ephemeralConnection.getAccountInfo(depositPda);
          if (depositAccount) {
            const deposit = program.coder.accounts.decode('deposit', depositAccount?.data);
            setDeposit(deposit);
          } else {
            setDeposit(null);
          }
        } else {
          setIsDelegated(false);

          const deposit = program.coder.accounts.decode('deposit', depositAccount?.data);
          setDeposit(deposit);
        }
      } else {
        setDeposit(null);
      }
    } catch (error) {
      setDeposit(null);
    }
  }, [tokenMint, user, program, depositPda, connection, ephemeralConnection]);

  useSubscription(connection, depositPda, notification => {
    console.log('Received notification', notification);
    if (notification.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
      setIsDelegated(true);
    } else {
      setIsDelegated(false);
      const decoded = program?.coder.accounts.decode('deposit', notification.data);
      if (decoded) {
        setDeposit(decoded);
      }
    }
  });

  try {
    useSubscription(ephemeralConnection, depositPda, notification => {
      console.log('Received ephemeral notification', notification);
      const decoded = program?.coder.accounts.decode('deposit', notification.data);
      if (decoded) {
        setDeposit(decoded);
      }
    });
  } catch (error) {
    console.error(error);
  }

  // Initialize the deposit
  useEffect(() => {
    getDeposit();
  }, [getDeposit]);

  return {
    deposit,
    isDelegated,
    accessDenied: isDelegated && !deposit,
  };
}
