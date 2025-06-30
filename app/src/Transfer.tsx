import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useState } from 'react';

import { TokenListEntry } from './Deposit';
import { useProgram } from './hooks/use-program';

interface TransferProps {
  token?: TokenListEntry;
  address?: string;
}

const Transfer: React.FC<TransferProps> = ({ token, address }) => {
  const { transfer } = useProgram();
  const [isTransferring, setIsTransferring] = useState(false);
  const [amount, setAmount] = useState(0);

  const handleTransfer = useCallback(
    async (delegated: boolean) => {
      if (!token || !address) return;
      setIsTransferring(true);
      try {
        await transfer(new PublicKey(token.mint), amount, new PublicKey(address), delegated);
      } finally {
        setIsTransferring(false);
      }
    },
    [token, transfer, amount, address],
  );

  return (
    <div className='deposit-box'>
      <h3>Transfer</h3>
      {address ? (
        <>
          <div className='amount-input'>
            <label htmlFor='amount'>Amount</label>
            <input
              id='amount'
              type='number'
              defaultValue={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          </div>
          <div className='amount-input'>
            <button onClick={() => handleTransfer(false)} disabled={isTransferring}>
              {isTransferring ? 'Transferring...' : 'Transfer'}
            </button>
            <button onClick={() => handleTransfer(true)} disabled={isTransferring}>
              {isTransferring ? 'Transferring...' : 'Delegated transfer'}
            </button>
          </div>
        </>
      ) : (
        <span>No address selected</span>
      )}
    </div>
  );
};

export default Transfer;
