import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import React, { useState } from 'react';

import Deposit, { TokenListEntry } from './Deposit';
import Tokens from './Tokens';
import VerificationToast from './VerificationToast';

const App: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<TokenListEntry | null>(null);

  return (
    <div className='payments-ui'>
      <div className='wallet-buttons'>
        <WalletMultiButton />
      </div>

      {selectedToken && <Deposit token={selectedToken} />}
      <Tokens setSelected={setSelectedToken} />

      <VerificationToast />

      <img
        src={`${process.env.PUBLIC_URL}/magicblock_white.png`}
        alt='Magic Block Logo'
        className='magicblock-logo'
      />
    </div>
  );
};

export default App;
