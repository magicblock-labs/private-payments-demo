import React, { useCallback, useState } from 'react';

import { useAddressBook } from './hooks/use-address-book';
import { shortKey } from './libs';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Spinner } from './components/Spinner';

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
  }, [address, addAddress]);

  if (!wallet?.publicKey)
    return (
      <div>
        <Spinner />
      </div>
    );

  return (
    <div className='deposit-box'>
      <h3>Address book</h3>
      {addressBook.length > 0 ? (
        <div className='address-book'>
          <label htmlFor='address-book'>Address</label>
          <select
            id='address-book'
            defaultValue={addressBook[0]}
            onChange={e => setSelectedAddress(e.target.value)}
          >
            {addressBook.map(address => (
              <option key={address} value={address}>
                {shortKey(address)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <span>No addresses in address book</span>
      )}
      <div className='amount-input'>
        <label htmlFor='address'>Address</label>
        <input
          id='address'
          type='text'
          defaultValue={address}
          onChange={e => setAddress(e.target.value)}
        />
      </div>
      <button onClick={handleAddAddress}>Add address</button>
    </div>
  );
};

export default AddressBook;
