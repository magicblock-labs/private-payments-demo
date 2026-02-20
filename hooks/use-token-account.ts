import { useEphemeralConnection } from '@/hooks/use-ephemeral-connection';
import { useSubscription } from '@/hooks/use-subscription';
import {
  DELEGATION_PROGRAM_ID,
  EphemeralAta,
  Permission,
  decodeEphemeralAta,
  deriveEphemeralAta,
  deserializePermission,
  permissionPdaFromAccount,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import { Account, getAssociatedTokenAddressSync, unpackAccount } from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface TokenAccountProps {
  user?: PublicKey;
  tokenMint?: PublicKey;
}

export interface TokenAccounts {
  user?: PublicKey;
  ata?: PublicKey;
  eata?: PublicKey;
  permissionPda?: PublicKey;
  mainnetAta: Account | null;
  mainnetEata: EphemeralAta | null;
  mainnetPermission: Permission | null;
  ephemeralAta: Account | null;
  ephemeralPermission: Permission | null;
  tokenAccount: Account | null;
  isDelegated: boolean;
  isPermissionDelegated: boolean;
  accessDenied: boolean;
  getAtas: () => Promise<void>;
}

export function useTokenAccount({ user, tokenMint }: TokenAccountProps): TokenAccounts {
  const { connection } = useConnection();
  const { ephemeralConnection } = useEphemeralConnection();
  const [ephemeralAta, setEphemeralAta] = useState<Account | null>(null);
  const [mainnetAta, setMainnetAta] = useState<Account | null>(null);
  const [mainnetEata, setMainnetEata] = useState<EphemeralAta | null>(null);
  const [mainnetPermission, setMainnetPermission] = useState<Permission | null>(null);
  const [ephemeralPermission, setEphemeralPermission] = useState<Permission | null>(null);
  const [isDelegated, setIsDelegated] = useState(false);
  const [isPermissionDelegated, setIsPermissionDelegated] = useState(false);
  const requestId = useRef(0);
  const tokenAccount = useMemo(() => {
    return isDelegated ? ephemeralAta : mainnetAta;
  }, [ephemeralAta, mainnetAta, isDelegated]);

  const ata = useMemo(() => {
    if (!user || !tokenMint) return;
    return getAssociatedTokenAddressSync(tokenMint, user, true);
  }, [user, tokenMint]);

  const eata = useMemo(() => {
    if (!user || !tokenMint) return;
    return deriveEphemeralAta(user, tokenMint)[0];
  }, [user, tokenMint]);

  const permissionPda = useMemo(() => {
    if (!eata) return;
    return permissionPdaFromAccount(eata);
  }, [eata]);

  const getAtas = useCallback(async () => {
    if (!user || !ata || !eata || !permissionPda || !ephemeralConnection) return;
    const currentRequestId = ++requestId.current;

    if (requestId.current !== currentRequestId) return;

    const mainnetSlot = await connection.getSlot();
    const ephemeralSlot = await ephemeralConnection.getSlot();

    try {
      const [ataInfo, eataInfo, permissionPdaInfo] = await connection.getMultipleAccountsInfo(
        [ata, eata, permissionPda],
        { minContextSlot: mainnetSlot },
      );

      if (permissionPdaInfo) {
        const delegated = permissionPdaInfo.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID));
        setIsPermissionDelegated(delegated);
        setMainnetPermission(deserializePermission(permissionPdaInfo.data));
      } else {
        setIsPermissionDelegated(false);
        setMainnetPermission(null);
      }

      try {
        if (ataInfo) {
          const decodedMainnetAta = unpackAccount(ata, ataInfo);
          setMainnetAta(decodedMainnetAta);
          setMainnetEata(eataInfo ? decodeEphemeralAta(eataInfo) : null);

          let ephemAtaInfo, ephemPermissionPdaInfo;
          try {
            const accounts = await ephemeralConnection.getMultipleAccountsInfo(
              [ata, permissionPda],
              {
                minContextSlot: ephemeralSlot,
              },
            );
            ephemAtaInfo = accounts[0];
            ephemPermissionPdaInfo = accounts[1];
          } catch (error) {
            console.error('Error getting ephemeral account info:', error);
          }

          if (ephemPermissionPdaInfo) {
            if (requestId.current !== currentRequestId) return;
            setEphemeralPermission(deserializePermission(ephemPermissionPdaInfo.data));
          }

          if (eataInfo?.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
            setIsDelegated(true);

            if (ephemAtaInfo) {
              if (requestId.current !== currentRequestId) return;
              const decodedEphemeralAta = unpackAccount(ata, ephemAtaInfo);
              setEphemeralAta(decodedEphemeralAta);
            } else {
              setEphemeralAta(null);
            }
          } else {
            setIsDelegated(false);
            setEphemeralAta(null);
          }
        } else {
          setMainnetAta(null);
          setMainnetEata(null);
          setEphemeralAta(null);
        }
      } catch (error) {
        console.error('Error decoding account info:', error);
      }
    } catch (error) {
      console.error('Error getting multiple accounts info:', error);
    }
  }, [user, ata, eata, connection, ephemeralConnection, permissionPda]);

  const handleAtaChange = useCallback(
    (mainnet: boolean, notification: AccountInfo<Buffer>) => {
      if (!ata) return;
      try {
        // Skipping owner check to account for undelegation on ER
        const decoded = unpackAccount(ata, notification, notification.owner);
        if (decoded) {
          if (mainnet) {
            setMainnetAta(decoded);
          } else {
            setEphemeralAta(decoded);
          }
        }
      } catch (error) {
        console.error('Error getting account info:', error, notification);
      }
    },
    [ata],
  );

  const handleEataChange = useCallback(async (notification: AccountInfo<Buffer>) => {
    if (notification.owner.equals(new PublicKey(DELEGATION_PROGRAM_ID))) {
      setIsDelegated(true);
    } else {
      setIsDelegated(false);
    }

    try {
      const decoded = decodeEphemeralAta(notification);
      if (decoded) {
        setMainnetEata(decoded);
      }
    } catch (error) {
      console.error('Error getting account info:', error);
    }
  }, []);

  const handlePermissionChange = useCallback(
    (mainnet: boolean, notification: AccountInfo<Buffer>) => {
      if (!permissionPda) return;
      try {
        const decoded = deserializePermission(notification.data);
        if (decoded) {
          if (mainnet) {
            setMainnetPermission(decoded);
          } else {
            setEphemeralPermission(decoded);
          }
        }
      } catch (error) {
        console.error('Error getting account info:', error);
      }
    },
    [permissionPda],
  );

  useSubscription(connection, ata, (notification: AccountInfo<Buffer>) =>
    handleAtaChange(true, notification),
  );
  useSubscription(ephemeralConnection, ata, (notification: AccountInfo<Buffer>) =>
    handleAtaChange(false, notification),
  );
  useSubscription(connection, eata, handleEataChange);
  useSubscription(connection, permissionPda, (notification: AccountInfo<Buffer>) =>
    handlePermissionChange(true, notification),
  );
  useSubscription(ephemeralConnection, permissionPda, (notification: AccountInfo<Buffer>) =>
    handlePermissionChange(false, notification),
  );

  // Initialize the deposit
  useEffect(() => {
    requestId.current += 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEphemeralAta(null);
    setMainnetAta(null);
    setMainnetEata(null);
    setMainnetPermission(null);
    setEphemeralPermission(null);
    setIsDelegated(false);
    setIsPermissionDelegated(false);
  }, [user, tokenMint]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void getAtas();
  }, [getAtas]);

  return {
    user,
    ata,
    eata,
    permissionPda,
    mainnetAta,
    mainnetEata,
    mainnetPermission,
    ephemeralAta,
    ephemeralPermission,
    tokenAccount,
    isDelegated,
    isPermissionDelegated,
    accessDenied: isDelegated && !ephemeralAta,
    getAtas,
  };
}
