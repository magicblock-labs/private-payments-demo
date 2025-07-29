import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import { LucideCircleQuestionMark } from 'lucide-react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';
import { PublicKey } from '@solana/web3.js';
import { TokenListEntry } from '@/lib/types';

interface DepositDialogProps {
  depositPda: PublicKey;
  token: TokenListEntry;
  depositUser: PublicKey;
  permissionPda: PublicKey;
}

export default function DepositDialog({
  depositPda,
  token,
  depositUser,
  permissionPda,
}: DepositDialogProps) {
  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button variant='ghost'>
            <LucideCircleQuestionMark />
          </Button>
        </DialogTrigger>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Deposit information</DialogTitle>
            <DialogDescription>Addresses of the related accounts.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-4'>
            <div className='grid gap-3'>
              <Label htmlFor='deposit-address'>Deposit address</Label>
              <div className='flex flex-row'>
                <Input
                  id='deposit-address'
                  name='name'
                  className='rounded-r-none'
                  defaultValue={depositPda?.toBase58() ?? '???'}
                  disabled
                />
                <Button
                  variant='outline'
                  className='rounded-l-none'
                  onClick={() => {
                    navigator.clipboard.writeText(depositPda?.toBase58() ?? '');
                    toast.info('Copied to clipboard');
                  }}
                >
                  <CopyIcon />
                </Button>
              </div>
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='token'>Token</Label>
              <div className='flex flex-row'>
                <Input id='token' name='token' defaultValue={token?.mint} disabled />
                <Button
                  variant='outline'
                  className='rounded-l-none'
                  onClick={() => {
                    navigator.clipboard.writeText(token?.mint ?? '');
                    toast.info('Copied to clipboard');
                  }}
                >
                  <CopyIcon />
                </Button>
              </div>
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='username'>Deposit owner</Label>
              <div className='flex flex-row'>
                <Input
                  id='username'
                  name='username'
                  className='rounded-r-none'
                  defaultValue={depositUser?.toBase58()}
                  disabled
                />
                <Button
                  variant='outline'
                  className='rounded-l-none'
                  onClick={() => {
                    navigator.clipboard.writeText(depositUser?.toBase58() ?? '');
                    toast.info('Copied to clipboard');
                  }}
                >
                  <CopyIcon />
                </Button>
              </div>
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='permission'>Permission</Label>
              <div className='flex flex-row'>
                <Input
                  id='permission'
                  name='name'
                  className='rounded-r-none'
                  defaultValue={permissionPda?.toBase58() ?? '???'}
                  disabled
                />
                <Button
                  variant='outline'
                  className='rounded-l-none'
                  onClick={() => {
                    navigator.clipboard.writeText(permissionPda?.toBase58() ?? '');
                    toast.info('Copied to clipboard');
                  }}
                >
                  <CopyIcon />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </form>
    </Dialog>
  );
}
