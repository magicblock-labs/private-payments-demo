import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useMemo, useState } from 'react';

import { useDeposit } from '@/hooks/use-deposit';
import { useProgram } from '@/hooks/use-program';
import { Ban, Loader2Icon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3 } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Separator } from './ui/separator';
import DepositDialog from './DepositDialog';
import DepositActions from './DepositActions';
import { TokenListEntry } from '@/lib/types';

interface DepositProps {
  user?: PublicKey;
  token?: TokenListEntry;
  isMainnet?: boolean;
}

const ManageDeposit: React.FC<DepositProps> = ({ user, token, isMainnet }) => {
  const wallet = useAnchorWallet();
  const { initializeDeposit } = useProgram();
  const [isCreating, setIsCreating] = useState(false);
  const depositUser = useMemo(() => {
    return user || wallet?.publicKey;
  }, [user, wallet]);
  const isWalletOwner = useMemo(() => {
    return depositUser && wallet?.publicKey?.equals(depositUser);
  }, [wallet, depositUser]);
  const { mainnetDeposit, ephemeralDeposit, depositPda, permissionPda, isDelegated, accessDenied } =
    useDeposit(depositUser, token?.mint);
  const deposit = useMemo(() => {
    return isMainnet ? mainnetDeposit : ephemeralDeposit;
  }, [mainnetDeposit, ephemeralDeposit, isMainnet]);

  const handleCreateDeposit = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsCreating(true);
    try {
      await initializeDeposit(depositUser, new PublicKey(token.mint));
      toast.success(`Deposit initialized for ${depositUser.toBase58()}`);
    } finally {
      setIsCreating(false);
    }
  }, [token, depositUser, initializeDeposit]);

  const title = useMemo(() => {
    if (!deposit && !accessDenied && (isWalletOwner || isMainnet)) return 'Create deposit';
    if (isWalletOwner) return 'My deposit';
    return 'Recipient';
  }, [accessDenied, deposit, isWalletOwner]);

  return (
    <Card className='min-w-56'>
      <CardHeader>
        <div className='w-full flex flex-row'>
          <div className='w-full'>
            <H3>{title}</H3>
          </div>
          {depositPda && token && depositUser && permissionPda && (
            <DepositDialog
              depositPda={depositPda}
              token={token}
              depositUser={depositUser}
              permissionPda={permissionPda}
            />
          )}
        </div>
        <Separator />
      </CardHeader>
      {!deposit && isMainnet ? (
        <CardContent className='flex flex-row items-center justify-center h-full '>
          <Button className='w-full' onClick={handleCreateDeposit} disabled={isCreating}>
            Create
            {isCreating && <Loader2Icon className='animate-spin' />}
          </Button>
        </CardContent>
      ) : (
        <>
          <CardContent className='flex flex-col gap-4 h-full justify-between'>
            <div />
            <div className='flex flex-row gap-2 items-center justify-center-safe text-5xl font-bold text-center hyphens-auto'>
              {!accessDenied || isMainnet
                ? (deposit?.amount.toNumber() || 0) / Math.pow(10, 6)
                : '***'}
            </div>

            {token && depositUser && !accessDenied ? (
              <DepositActions
                token={token}
                depositUser={depositUser}
                isMainnet={isMainnet}
                isDelegated={isDelegated}
                isWalletOwner={isWalletOwner}
              />
            ) : (
              <div className='h-[52px]' /> // HACK: this is to align balance of deposits without actions
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
};

export default ManageDeposit;
