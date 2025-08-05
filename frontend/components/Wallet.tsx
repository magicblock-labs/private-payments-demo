'use client';

import { Provider } from '@coral-xyz/anchor';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection, PublicKey } from '@solana/web3.js';
import React, { FC, ReactNode, useMemo } from 'react';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletProps {
  children: ReactNode;
}

export class SimpleProvider implements Provider {
  readonly connection: Connection;
  readonly publicKey?: PublicKey;

  constructor(connection: Connection, publicKey?: PublicKey) {
    this.connection = connection;
    this.publicKey = publicKey;
  }
}

export const Wallet: FC<WalletProps> = ({ children }) => {
  // const endpoint = "https://rpc.magicblock.app/devnet";
  const endpoint = 'https://rpc.magicblock.app/devnet';

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
