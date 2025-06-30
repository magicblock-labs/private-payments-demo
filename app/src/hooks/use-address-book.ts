import { useLocalStorage } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useCallback } from 'react';

export function useAddressBook(exclude?: PublicKey | string) {
  const [addressBook, setAddressBook] = useLocalStorage<string[]>('address-book', []);

  const addAddress = useCallback(
    (address: string) => {
      new PublicKey(address);
      setAddressBook(prev => [...prev, address]);
    },
    [setAddressBook],
  );

  return {
    addressBook: addressBook.filter(addr => addr !== exclude?.toString()),
    addAddress,
  };
}
