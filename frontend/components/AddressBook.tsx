import React, { useCallback, useState } from 'react';

import { useAddressBook } from '../hooks/use-address-book';
import { shortKey } from '@/lib/utils';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Spinner } from './ui/spinner';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { H3, Muted } from './ui/typography';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { toast } from 'sonner';
import { Separator } from './ui/separator';

interface AddressBookProps {
  setSelectedAddress: (address: string) => void;
}

const AddressBook: React.FC<AddressBookProps> = ({ setSelectedAddress }) => {
  const wallet = useAnchorWallet();
  const { addressBook, addAddress } = useAddressBook(wallet?.publicKey);
  const [address, setAddress] = useState('');

  const handleAddAddress = useCallback(() => {
    if (!address) return;
    addAddress(address);
    setAddress('');

    if (addressBook.length === 0) {
      setSelectedAddress(address);
    }

    toast.success(`Address ${address} added to address book`);
  }, [address, addAddress]);

  if (!wallet?.publicKey)
    return (
      <div>
        <Spinner />
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <H3>Address book</H3>
        <Separator />
      </CardHeader>
      <CardContent>
        <div className='mt-[-10px]'>
          {addressBook.length > 0 ? (
            <div className='flex flex-col items-stretch'>
              <Label htmlFor='address-book' className='m-1'>
                Address
              </Label>
              <Select
                defaultValue={addressBook[0]}
                onValueChange={value => setSelectedAddress(value)}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select an address' />
                </SelectTrigger>
                <SelectContent id='address-book'>
                  <SelectGroup>
                    <SelectLabel>Addresses</SelectLabel>
                    {addressBook.map(address => (
                      <SelectItem key={address} value={address}>
                        {shortKey(address)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Muted>No addresses in the address book</Muted>
          )}
        </div>
      </CardContent>
      <CardFooter className='flex flex-col gap-2'>
        <div className='w-full'>
          <Label htmlFor='address' className='m-1'>
            Address
          </Label>
          <Input
            id='address'
            type='text'
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
        </div>
        <Button className='w-full' onClick={handleAddAddress}>
          Add address
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddressBook;
