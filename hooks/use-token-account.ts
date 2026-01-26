import {
  decodeEphemeralAta,
  DELEGATION_PROGRAM_ID,
  deriveEphemeralAta,
  EphemeralAta,
  permissionPdaFromAccount,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import { useConnection } from '@solana/wallet-adapter-react';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useEphemeralConnection } from '@/hooks/use-ephemeral-connection';
import { useSubscription } from '@/hooks/use-subscription';
import { Account, getAssociatedTokenAddressSync, unpackAccount } from '@solana/spl-token';

export function useTokenAccount(user?: PublicKey | string, tokenMint?: PublicKey | string) {
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const [ephemeralAta, setEphemeralAta] = useState<Account | null>(null);
  const [mainnetAta, setMainnetAta] = useState<Account | null>(null);
  const [mainnetEata, setMainnetEata] = useState<EphemeralAta | null>(null);
  const [isDelegated, setIsDelegated] = useState(false);
  const tokenAccount = useMemo(() => {
    return isDelegated ? ephemeralAta : mainnetAta;
  }, [ephemeralAta, mainnetAta, isDelegated]);

  const ata = useMemo(() => {
    if (!user || !tokenMint) return;
    return getAssociatedTokenAddressSync(new PublicKey(tokenMint), new PublicKey(user), true);
  }, [user, tokenMint]);

  const eata = useMemo(() => {
    if (!user || !tokenMint) return;
    return deriveEphemeralAta(new PublicKey(user), new PublicKey(tokenMint))[0];
  }, [user, tokenMint]);

  const permissionPda = useMemo(() => {
    if (!eata) return;
    return permissionPdaFromAccount(eata);
  }, [eata]);

  const getAta = useCallback(async () => {
    if (!user || !ata || !eata) return;
    setEphemeralAta(null);
    setMainnetAta(null);

    try {
      let [ataInfo, eataInfo] = await connection.getMultipleAccountsInfo([ata, eata]);

      if (ataInfo) {
        let mainnetAta = unpackAccount(ata, ataInfo);
        setMainnetAta(mainnetAta);
        setMainnetEata(eataInfo ? decodeEphemeralAta(eataInfo) : null);
        if (eataInfo?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
          setIsDelegated(true);

          let ephemeralAtaInfo = null;
          try {
            ephemeralAtaInfo = await ephemeralConnection?.getAccountInfo(ata);
          } catch (error) {
            console.log('ephemeral connection error', error);
          }
          if (ephemeralAtaInfo) {
            const ephemeralAta = unpackAccount(ata, ephemeralAtaInfo);
            setEphemeralAta(ephemeralAta);
          } else {
            setEphemeralAta(null);
          }
        } else {
          setIsDelegated(false);
        }
      } else {
        setMainnetAta(null);
        setEphemeralAta(null);
      }
    } catch (error) {
      console.log('getDeposit error', error);
    }
  }, [user, ata, eata, connection, ephemeralConnection]);

  const handleAtaChange = useCallback(
    (mainnet: boolean, notification: AccountInfo<Buffer>) => {
      const decoded = unpackAccount(ata!, notification);
      if (decoded) {
        if (mainnet) {
          setMainnetAta(decoded);
        } else {
          setEphemeralAta(decoded);
        }
      }
    },
    [ata],
  );

  const handleEataChange = useCallback((notification: AccountInfo<Buffer>) => {
    if (notification.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
      setIsDelegated(true);
    } else {
      setIsDelegated(false);
      const decoded = decodeEphemeralAta(notification);
      if (decoded) {
        setMainnetEata(decoded);
      }
    }
  }, []);

  useSubscription(connection, ata, (notification: AccountInfo<Buffer>) =>
    handleAtaChange(true, notification),
  );
  useSubscription(ephemeralConnection, ata, (notification: AccountInfo<Buffer>) =>
    handleAtaChange(false, notification),
  );
  useSubscription(connection, eata, handleEataChange);

  // Initialize the deposit
  useEffect(() => {
    const f = async () => {
      await getAta();
    };
    f();
  }, [getAta]);

  return {
    ata,
    eata,
    permissionPda,
    mainnetAta,
    mainnetEata,
    ephemeralAta,
    tokenAccount,
    isDelegated,
    accessDenied: isDelegated && !!!ephemeralAta,
  };
}
