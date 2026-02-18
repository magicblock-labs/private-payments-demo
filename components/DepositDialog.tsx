import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { TokenListEntry } from '@/lib/types';
import { PublicKey } from '@solana/web3.js';
import { LucideCircleQuestionMark } from 'lucide-react';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

interface DepositDialogProps {
  ata: PublicKey;
  eata: PublicKey;
  token: TokenListEntry;
  owner: PublicKey;
  permissionPda: PublicKey;
}

export default function DepositDialog({
  ata,
  eata,
  token,
  owner,
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
              <Label htmlFor='ata-address'>ATA address</Label>
              <div className='flex flex-row'>
                <Input
                  id='ata-address'
                  name='ata'
                  className='rounded-r-none'
                  defaultValue={ata.toBase58()}
                  disabled
                />
                <Button
                  variant='outline'
                  className='rounded-l-none'
                  onClick={() => {
                    navigator.clipboard.writeText(ata.toBase58());
                    toast.info('Copied to clipboard');
                  }}
                >
                  <CopyIcon />
                </Button>
              </div>
            </div>
            <div className='grid gap-3'>
              <Label htmlFor='eata-address'>EATA address</Label>
              <div className='flex flex-row'>
                <Input
                  id='eata-address'
                  name='eata'
                  className='rounded-r-none'
                  defaultValue={eata.toBase58()}
                  disabled
                />
                <Button
                  variant='outline'
                  className='rounded-l-none'
                  onClick={() => {
                    navigator.clipboard.writeText(eata.toBase58());
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
              <Label htmlFor='username'>Owner</Label>
              <div className='flex flex-row'>
                <Input
                  id='username'
                  name='username'
                  className='rounded-r-none'
                  defaultValue={owner?.toBase58()}
                  disabled
                />
                <Button
                  variant='outline'
                  className='rounded-l-none'
                  onClick={() => {
                    navigator.clipboard.writeText(owner?.toBase58() ?? '');
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
