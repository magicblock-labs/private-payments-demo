import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import React, { useCallback, useMemo, useState } from 'react';

import { useDeposit } from './hooks/use-deposit';
import { useProgram } from './hooks/use-program';

export interface TokenListEntry {
  mint: string;
  creator: string;
}

interface DepositProps {
  user?: PublicKey;
  token?: TokenListEntry;
}

const ManageDeposit: React.FC<DepositProps> = ({ user, token }) => {
  const wallet = useAnchorWallet();
  const { initializeDeposit, deposit: depositTokens, delegate, undelegate } = useProgram();
  const [isCreating, setIsCreating] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isDelegating, setIsDelegating] = useState(false);
  const [isUndelegating, setIsUndelegating] = useState(false);
  const [amount, setAmount] = useState(0);
  const depositUser = useMemo(() => {
    return user || wallet?.publicKey;
  }, [user, wallet]);
  const isWalletOwner = useMemo(() => {
    return depositUser && wallet?.publicKey?.equals(depositUser);
  }, [wallet, depositUser]);
  const { deposit, isDelegated, accessDenied } = useDeposit(depositUser, token?.mint);

  const handleCreateDeposit = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsCreating(true);
    try {
      await initializeDeposit(depositUser, new PublicKey(token.mint));
    } finally {
      setIsCreating(false);
    }
  }, [token, depositUser, initializeDeposit]);

  const handleDeposit = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsDepositing(true);
    try {
      await depositTokens(depositUser, new PublicKey(token.mint), amount);
    } finally {
      setIsDepositing(false);
    }
  }, [token, depositUser, amount, depositTokens]);

  const handleDelegate = useCallback(async () => {
    if (!token || !depositUser) return;
    setIsDelegating(true);
    try {
      await delegate(depositUser, new PublicKey(token.mint));
    } finally {
      setIsDelegating(false);
    }
  }, [token, depositUser, delegate]);

  const handleUndelegate = useCallback(async () => {
    if (!token) return;
    setIsUndelegating(true);
    try {
      await undelegate(new PublicKey(token.mint));
    } finally {
      setIsUndelegating(false);
    }
  }, [token, undelegate]);

  if (accessDenied) {
    return (
      <div className='deposit-container'>
        <div className='deposit-box'>
          <h3>Access denied</h3>
        </div>
      </div>
    );
  }

  return (
    <div className='deposit-container'>
      <div className='deposit-box'>
        {!deposit && (
          <>
            <h3>Initialize deposit</h3>
            <button onClick={handleCreateDeposit} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </>
        )}
        {deposit && (
          <>
            {isWalletOwner ? <h3>Deposit tokens</h3> : <h3>View deposit</h3>}
            <span>Current balance: {deposit.amount.toNumber() / Math.pow(10, 6)}</span>
            <div className='amount-input'>
              <label htmlFor='amount'>Amount</label>
              <input
                id='amount'
                type='number'
                defaultValue={amount}
                onChange={e => setAmount(Number(e.target.value))}
              />
            </div>
            <button onClick={handleDeposit} disabled={isDepositing}>
              {isDepositing ? 'Depositing...' : 'Deposit'}
            </button>
            {!isDelegated && (
              <button onClick={handleDelegate} disabled={isDelegating}>
                {isDelegating ? 'Delegating...' : 'Delegate'}
              </button>
            )}
            {isDelegated && isWalletOwner && (
              <button onClick={handleUndelegate} disabled={isUndelegating}>
                {isUndelegating ? 'Undelegating...' : 'Undelegate'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ManageDeposit;
