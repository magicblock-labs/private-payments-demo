import DepositActions from './DepositActions';
import DepositDialog from './DepositDialog';
import { Separator } from './ui/separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { H3 } from '@/components/ui/typography';
import { useProgram } from '@/hooks/use-program';
import { useTokenAccount } from '@/hooks/use-token-account';
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
  const depositUser = useMemo(() => {
    return user || wallet?.publicKey;
  }, [user, wallet]);
  const isWalletOwner = useMemo(() => {
    return depositUser && wallet?.publicKey?.equals(depositUser);
  }, [wallet, depositUser]);
  const { ata, permissionPda, mainnetAta, ephemeralAta, isDelegated, accessDenied } =
    useTokenAccount({ user: depositUser, tokenMint: token?.mint });

  const handleCreateEata = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsCreating(true);
    try {
      await initializeEata(depositUser, new PublicKey(token.mint));
      toast.success(`Deposit initialized for ${depositUser.toBase58()}`);
    } catch (error) {
      toast.error(`Failed to initialize deposit: ${error}`);
    } finally {
      setIsCreating(false);
    }
  }, [token, depositUser, initializeEata]);

  const title = useMemo(() => {
    if (!accessDenied && (isWalletOwner || isMainnet) && !mainnetAta) return 'Create deposit';
    if (isWalletOwner) return 'My deposit';
    return 'Recipient';
  }, [accessDenied, isWalletOwner, isMainnet, mainnetAta]);

  return (
    <Card className='min-w-56'>
      <CardHeader>
        <div className='w-full flex flex-row'>
          <div className='w-full'>
            <H3>{title}</H3>
          </div>
          {ata && token && depositUser && permissionPda && (
            <DepositDialog
              ata={ata}
              token={token}
              depositUser={depositUser}
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
              {!accessDenied || isMainnet
                ? Number((isMainnet ? mainnetAta : ephemeralAta)?.amount) / 10 ** 6 || 0
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
