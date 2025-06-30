import { PublicKey } from '@solana/web3.js';
import React, { useState } from 'react';

import AddressBook from './AddressBook';
import { useAddressBook } from './hooks/use-address-book';
import { usePrivateRollupAuth } from './hooks/use-private-rollup-auth';
import ManageDeposit from './ManageDeposit';
import Transfer from './Transfer';

export interface TokenListEntry {
  mint: string;
  creator: string;
}

interface DepositProps {
  token?: TokenListEntry;
}

const Deposit: React.FC<DepositProps> = ({ token }) => {
  const { authToken, getToken } = usePrivateRollupAuth();
  const { addressBook } = useAddressBook();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(addressBook[0]);

  return (
    <div className='deposit-ui'>
      <h2>Your deposit</h2>
      {!authToken && <button onClick={getToken}>Authenticate</button>}
      <div className='deposit-container'>
        <ManageDeposit token={token} />
        <AddressBook setSelectedAddress={setSelectedAddress} />
        <Transfer token={token} address={selectedAddress} />
        {selectedAddress && <ManageDeposit token={token} user={new PublicKey(selectedAddress)} />}
      </div>
    </div>
  );
};

export default Deposit;
