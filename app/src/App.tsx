import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Provider } from "@coral-xyz/anchor";
import { SimpleProvider } from "./components/Wallet";
import {
  Commitment,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { hash } from "@coral-xyz/anchor/dist/cjs/utils/sha256";
import Counter from "./Counter";

const App: React.FC = () => {
  let { connection } = useConnection();
  const provider = useRef<Provider>(new SimpleProvider(connection));
  const { publicKey, sendTransaction } = useWallet();
  const tempKeypair1 = useRef<Keypair | null>(null);
  const tempKeypair2 = useRef<Keypair | null>(null);
  const [selectedKeypair1, setSelectedKeypair1] = useState<Keypair | null>(
    tempKeypair1.current || null
  );
  const [selectedKeypair2, setSelectedKeypair2] = useState<Keypair | null>(
    tempKeypair2.current || null
  );

  // Detect when publicKey is set/connected
  useEffect(() => {
    if (!publicKey) return;

    let seed1 = new Uint8Array(
      Buffer.from(hash(publicKey.toBase58() + "1"), "utf-8").subarray(0, 32)
    );
    let seed2 = new Uint8Array(
      Buffer.from(hash(publicKey.toBase58() + "2"), "utf-8").subarray(0, 32)
    );

    if (
      !publicKey ||
      Keypair.fromSeed(seed1).publicKey.equals(
        tempKeypair1.current?.publicKey || PublicKey.default
      ) ||
      Keypair.fromSeed(seed2).publicKey.equals(
        tempKeypair2.current?.publicKey || PublicKey.default
      )
    )
      return;
    console.log("Wallet connected with publicKey:", publicKey.toBase58());

    // Derive the temp keypair from the publicKey
    const newTempKeypair1 = Keypair.fromSeed(seed1);
    const newTempKeypair2 = Keypair.fromSeed(seed2);
    tempKeypair1.current = newTempKeypair1;
    tempKeypair2.current = newTempKeypair2;
    setSelectedKeypair1(newTempKeypair1);
    setSelectedKeypair2(newTempKeypair2);
  }, [connection, publicKey]);

  const submitTransaction = useCallback(
    async (
      transaction: Transaction,
      confirmCommitment: Commitment = "confirmed",
      keypair?: Keypair
    ): Promise<string | null> => {
      if (!publicKey) return null;

      let connection = provider.current.connection;
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        console.log("Submitting transaction...");
        if (!transaction.recentBlockhash)
          transaction.recentBlockhash = blockhash;
        if (!transaction.feePayer)
          keypair
            ? (transaction.feePayer = keypair.publicKey)
            : (transaction.feePayer = publicKey);
        if (keypair) transaction.sign(keypair);
        let signature;
        if (!keypair) {
          signature = await sendTransaction(transaction, connection);
        } else {
          signature = await connection.sendRawTransaction(
            transaction.serialize()
          );
        }
        await connection.confirmTransaction(signature, confirmCommitment);
        // Transaction was successful
        console.log(`Transaction confirmed: ${signature}`);
        return signature;
      } catch (error) {
        console.error(`Transaction failed: ${error}`);
      }
      return null;
    },
    [publicKey, sendTransaction]
  );

  /**
   * Transfer some SOL to temp keypair
   */
  const transferToTempKeypair = useCallback(
    async (keypair?: Keypair) => {
      if (!publicKey || !keypair) return;
      console.log(
        `Transfer some SOL from ${publicKey.toBase58()} to ${keypair.publicKey.toBase58()}`
      );
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: keypair.publicKey,
          lamports: 0.1 * LAMPORTS_PER_SOL,
        })
      );
      transaction.feePayer = publicKey;
      await submitTransaction(transaction, "confirmed");
    },
    [publicKey, submitTransaction]
  );

  useEffect(() => {
    const checkAndTransfer = async () => {
      for (const kp of [tempKeypair1.current, tempKeypair2.current]) {
        if (kp) {
          const accountTmpWallet = await connection.getAccountInfo(
            kp.publicKey
          );
          if (
            !accountTmpWallet ||
            accountTmpWallet.lamports <= 0.01 * LAMPORTS_PER_SOL
          ) {
            await transferToTempKeypair(kp);
          }
        }
      }
    };
    checkAndTransfer();
  }, [connection, transferToTempKeypair]);

  return (
    <div className="counter-ui">
      <div className="wallet-buttons">
        <WalletMultiButton />
      </div>

      {publicKey && tempKeypair1.current && tempKeypair2.current && (
        <div className="counters">
          <div className="counter-container">
            <Counter
              creator={tempKeypair1.current.publicKey}
              keypairs={[selectedKeypair1!, selectedKeypair2!]}
            />
          </div>
        </div>
      )}

      <img
        src={`${process.env.PUBLIC_URL}/magicblock_white.png`}
        alt="Magic Block Logo"
        className="magicblock-logo"
      />
    </div>
  );
};

export default App;
