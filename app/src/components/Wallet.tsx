// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

import { Provider } from '@coral-xyz/anchor';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey } from '@solana/web3.js';
import React, { FC, ReactNode, useMemo } from 'react';

interface WalletProps {
  app: ReactNode;
}

export class SimpleProvider implements Provider {
  readonly connection: Connection;
  readonly publicKey?: PublicKey;

  constructor(connection: Connection, publicKey?: PublicKey) {
    this.connection = connection;
    this.publicKey = publicKey;
  }
}

export const Wallet: FC<WalletProps> = ({ app }) => {
  // const endpoint = "https://rpc.magicblock.app/devnet";
  const endpoint = 'https://api.devnet.solana.com';

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{app}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
