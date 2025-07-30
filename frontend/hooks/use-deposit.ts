import { DELEGATION_PROGRAM_ID } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DEPOSIT_PDA_SEED, PERMISSION_PROGRAM_ID, PERMISSION_SEED } from '@/lib/constants';
import { DepositAccount } from '@/lib/types';

import { useEphemeralConnection } from '@/hooks/use-ephemeral-connection';
import { useProgram } from '@/hooks/use-program';
import { useSubscription } from '@/hooks/use-subscription';

export function useDeposit(user?: PublicKey | string, tokenMint?: PublicKey | string) {
  const { program } = useProgram();
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const [deposit, setDeposit] = useState<DepositAccount | null>(null);
  const [ephemeralDeposit, setEphemeralDeposit] = useState<DepositAccount | null>(null);
  const [mainnetDeposit, setMainnetDeposit] = useState<DepositAccount | null>(null);
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

  const permissionPda = useMemo(() => {
    if (!depositPda) return;
    return PublicKey.findProgramAddressSync(
      [PERMISSION_SEED, depositPda.toBuffer()],
      PERMISSION_PROGRAM_ID,
    )[0];
  }, [depositPda]);

  const getDeposit = useCallback(async () => {
    if (!tokenMint || !user || !program || !depositPda) return;
    setDeposit(null);
    setEphemeralDeposit(null);
    setMainnetDeposit(null);

    try {
      let depositAccount = await connection.getAccountInfo(depositPda);

      if (depositAccount) {
        setMainnetDeposit(program.coder.accounts.decode('deposit', depositAccount?.data));
        if (depositAccount.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
          setIsDelegated(true);

          depositAccount = (await ephemeralConnection?.getAccountInfo(depositPda)) ?? null;
          if (depositAccount) {
            const deposit = program.coder.accounts.decode('deposit', depositAccount?.data);
            console.log('deposit', depositAccount);
            setEphemeralDeposit(deposit);
            setDeposit(deposit);
          } else {
            setDeposit(null);
            setEphemeralDeposit(null);
          }
        } else {
          setIsDelegated(false);

          const deposit = program.coder.accounts.decode('deposit', depositAccount?.data);
          setDeposit(deposit);
        }
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
          setDeposit(decoded);
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
        setDeposit(decoded);
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

  return {
    deposit,
    mainnetDeposit,
    ephemeralDeposit,
    depositPda,
    permissionPda,
    isDelegated,
    accessDenied: isDelegated && !deposit,
  };
}
