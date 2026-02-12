import DepositActions from './DepositActions';
import DepositDialog from './DepositDialog';
import { Separator } from './ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3 } from '@/components/ui/typography';
import { useTokenAccountContext } from '@/contexts/TokenAccountContext';
import { useProgram } from '@/hooks/use-program';
import { TokenListEntry } from '@/lib/types';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Loader2Icon } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface DepositProps {
  user?: PublicKey;
  token?: TokenListEntry;
  isMainnet?: boolean;
}

const ManageDeposit: React.FC<DepositProps> = ({ user, token, isMainnet }) => {
  const wallet = useAnchorWallet();
  const { initializeEata } = useProgram();
  const [isCreating, setIsCreating] = useState(false);
  const owner = useMemo(() => {
    return user || wallet?.publicKey;
  }, [user, wallet]);
  const isWalletOwner = useMemo(() => {
    return owner && wallet?.publicKey?.equals(owner);
  }, [wallet, owner]);
  const { walletAccounts, recipientAccounts } = useTokenAccountContext();
  const {
    mainnetAta,
    mainnetEata,
    accessDenied,
    ata,
    eata,
    permissionPda,
    ephemeralAta,
    isDelegated,
  } = useMemo(() => {
    return isWalletOwner ? walletAccounts : recipientAccounts;
  }, [walletAccounts, recipientAccounts, isWalletOwner]);

  const displayAmount = useMemo(() => {
    if (isMainnet) {
      return mainnetEata?.amount ?? 0n;
    } else {
      return ephemeralAta?.amount ?? 0n;
    }
  }, [isMainnet, mainnetEata, ephemeralAta]);

  const handleCreateEata = useCallback(async () => {
    if (!token || !owner) return;
    setIsCreating(true);
    try {
      await initializeEata(owner, new PublicKey(token.mint));
      toast.success(`Deposit initialized for ${owner.toBase58()}`);
    } catch (error) {
      toast.error(`Failed to initialize deposit: ${error}`);
    } finally {
      setIsCreating(false);
    }
  }, [token, owner, initializeEata]);

  const title = useMemo(() => {
    if (!accessDenied && (isWalletOwner || isMainnet) && !mainnetAta) return 'Create deposit';
    if (isWalletOwner) return 'My account';
    return 'Recipient';
  }, [accessDenied, isWalletOwner, isMainnet, mainnetAta]);

  return (
    <Card className='min-w-56'>
      <CardHeader>
        <div className='w-full flex flex-row'>
          <div className='w-full'>
            <H3>{title}</H3>
          </div>
          {ata && eata && token && owner && permissionPda && (
            <DepositDialog
              ata={ata}
              eata={eata}
              token={token}
              owner={owner}
              permissionPda={permissionPda}
            />
          )}
        </div>
        <Separator />
      </CardHeader>
      {!mainnetAta && isMainnet ? (
        <CardContent className='flex flex-row items-center justify-center h-full '>
          <Button className='w-full' onClick={handleCreateEata} disabled={isCreating}>
            Create
            {isCreating && <Loader2Icon className='animate-spin' />}
          </Button>
        </CardContent>
      ) : (
        <>
          <CardContent className='flex flex-col gap-4 h-full justify-between'>
            <div />
            <div className='flex flex-row gap-2 items-center justify-center-safe text-5xl font-bold text-center hyphens-auto'>
              {!accessDenied || isMainnet ? Number(displayAmount) / 10 ** 6 || 0 : '***'}
            </div>

            {token && owner && !accessDenied ? (
              <DepositActions
                token={token}
                owner={owner}
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
