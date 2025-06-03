import React, { useCallback, useEffect, useRef, useState } from "react";
import Button from "./components/Button";
import Square from "./components/Square";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Alert from "./components/Alert";
import { Program, Provider } from "@coral-xyz/anchor";
import { SimpleProvider } from "./components/Wallet";
import {
  AccountInfo,
  Commitment,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { PrivateMagicClicker } from "./program/private_magic_clicker";
import PrivateMagicClickerIdl from "./program/private_magic_clicker.json";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { sign } from "tweetnacl";
import {
  COUNTER_PROGRAM,
  EPHEMERAL_RPC_URL,
  GROUP_SEED,
  PERMISSION_PROGRAM_ID,
  PERMISSION_SEED,
} from "./constants";
import { COUNTER_PDA_SEED } from "./constants";

function shortKey(key: PublicKey) {
  return key.toBase58().slice(0, 4) + "..." + key.toBase58().slice(-4);
}

interface CounterProps {
  creator: PublicKey;
  keypairs: Keypair[];
}

const Counter: React.FC<CounterProps> = ({ creator, keypairs }) => {
  let { connection } = useConnection();
  const ephemeralConnection = useRef<Connection | null>(null);
  const provider = useRef<Provider>(new SimpleProvider(connection));
  const { publicKey, sendTransaction } = useWallet();
  const [keypair, setKeypair] = useState<Keypair>(keypairs[0]);
  const [currentKeypair, setCurrentKeypair] = useState<string>(
    keypairs[0].publicKey.toString()
  );
  const [counter, setCounter] = useState<number>();
  const [ephemeralCounter, setEphemeralCounter] = useState<number>();
  const [isDelegated, setIsDelegated] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [transactionSuccess, setTransactionSuccess] = useState<string | null>(
    null
  );
  const [authToken, setAuthToken] = useState<string | null>(null);
  const counterProgramClient = useRef<Program<PrivateMagicClicker> | null>(
    null
  );
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from(COUNTER_PDA_SEED), creator.toBuffer()],
    COUNTER_PROGRAM
  );
  let counterSubscriptionId = useRef<number | null>(null);
  let ephemeralCounterSubscriptionId = useRef<number | null>(null);

  // Define callbacks function to handle account changes
  const handleCounterChange = useCallback(
    (accountInfo: AccountInfo<Buffer>) => {
      console.log("Devnet counter changed", accountInfo);
      if (!counterProgramClient.current) return;
      const decodedData = counterProgramClient.current.coder.accounts.decode(
        "counter",
        accountInfo.data
      );
      setIsDelegated(
        !accountInfo.owner.equals(counterProgramClient.current.programId)
      );
      setCounter(Number(decodedData.count));
    },
    [counterProgramClient, setIsDelegated, setCounter]
  );

  const handleEphemeralCounterChange = useCallback(
    (accountInfo: AccountInfo<Buffer>) => {
      console.log("Ephemeral counter changed", accountInfo);
      if (!counterProgramClient.current) return;
      const decodedData = counterProgramClient.current.coder.accounts.decode(
        "counter",
        accountInfo.data
      );
      setEphemeralCounter(Number(decodedData.count));
    },
    []
  );

  // Subscribe to the counters updates
  const subscribeToCounter = useCallback(async (): Promise<void> => {
    if (counterSubscriptionId && counterSubscriptionId.current)
      await connection.removeAccountChangeListener(
        counterSubscriptionId.current
      );
    console.log("Subscribing to counter", counterPda.toBase58());
    // Subscribe to counter changes
    counterSubscriptionId.current = connection.onAccountChange(
      counterPda,
      handleCounterChange,
      "processed"
    );
  }, [connection, counterPda, handleCounterChange]);

  // Subscribe to the ephemeral counter updates
  const subscribeToEphemeralCounter = useCallback(async (): Promise<void> => {
    if (!ephemeralConnection.current) return;
    console.log("Subscribing to ephemeral counter", counterPda.toBase58());
    if (
      ephemeralCounterSubscriptionId &&
      ephemeralCounterSubscriptionId.current
    )
      await ephemeralConnection.current.removeAccountChangeListener(
        ephemeralCounterSubscriptionId.current
      );
    // Subscribe to ephemeral counter changes
    ephemeralCounterSubscriptionId.current =
      ephemeralConnection.current.onAccountChange(
        counterPda,
        handleEphemeralCounterChange,
        "confirmed"
      );
  }, [counterPda, handleEphemeralCounterChange]);

  const submitTransaction = useCallback(
    async (
      transaction: Transaction,
      useTempKeypair: boolean = false,
      ephemeral: boolean = false,
      confirmCommitment: Commitment = "processed"
    ): Promise<string | null> => {
      if (!keypair.publicKey) return null;
      if (!publicKey) return null;
      if (!ephemeralConnection.current) return null;
      //if (isSubmitting) return null;
      setIsSubmitting(true);
      setTransactionError(null);
      setTransactionSuccess(null);
      let connection = ephemeral
        ? ephemeralConnection.current
        : provider.current.connection;
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        console.log("Submitting transaction...");
        if (!transaction.recentBlockhash)
          transaction.recentBlockhash = blockhash;
        if (!transaction.feePayer)
          useTempKeypair
            ? (transaction.feePayer = keypair.publicKey)
            : (transaction.feePayer = publicKey);
        if (useTempKeypair) transaction.sign(keypair);
        let signature;
        if (!ephemeral && !useTempKeypair) {
          signature = await sendTransaction(transaction, connection);
        } else {
          signature = await connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: true }
          );
        }
        await connection.confirmTransaction(signature, confirmCommitment);

        // Transaction was successful
        console.log(`Transaction confirmed: ${signature}`);
        setTransactionSuccess(`Transaction confirmed`);
        return signature;
      } catch (error) {
        setTransactionError(`Transaction failed: ${error}`);
      } finally {
        setIsSubmitting(false);
      }
      return null;
    },
    [publicKey, sendTransaction, keypair]
  );

  const updateEphemeralCounter = useCallback(async () => {
    if (isDelegated) {
      try {
        console.log(
          "Updating ephemeral counter:",
          ephemeralConnection.current?.rpcEndpoint
        );
        const counterData = await ephemeralConnection.current?.getAccountInfo(
          counterPda
        );
        if (!counterData) return;
        const ephemeralCounter =
          await counterProgramClient.current?.coder.accounts.decode(
            "counter",
            counterData.data
          );
        console.log("Ephemeral counter", ephemeralCounter);
        setEphemeralCounter(Number(ephemeralCounter?.count.valueOf()));
      } catch (error) {
        console.error("Error updating ephemeral counter", error);
        setEphemeralCounter(undefined);
      }
    }
  }, [ephemeralConnection, counterPda, isDelegated]);

  /**
   * Increase counter transaction
   */
  const increaseCounterTx = useCallback(async () => {
    if (!keypair.publicKey) return;

    const transaction = await counterProgramClient.current?.methods
      .increment()
      .accountsPartial({
        user: keypair.publicKey,
        counter: counterPda,
      })
      .transaction()!;

    // Add instruction to print to the noop program and and make the transaction unique
    const noopInstruction = new TransactionInstruction({
      programId: new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"),
      keys: [],
      data: Buffer.from(crypto.getRandomValues(new Uint8Array(5))),
    });
    transaction.add(noopInstruction);

    await submitTransaction(transaction, true, isDelegated);

    updateEphemeralCounter();
  }, [
    isDelegated,
    counterPda,
    submitTransaction,
    keypair.publicKey,
    updateEphemeralCounter,
  ]);

  /**
   * Transactions
   */
  const delegatePdaTx = useCallback(async () => {
    console.log("Delegate PDA transaction");
    console.log(keypair.publicKey);
    if (!keypair.publicKey) return;

    const transaction = (await counterProgramClient.current?.methods
      .delegate(keypair.publicKey)
      .accountsPartial({
        payer: keypair.publicKey,
        counter: counterPda,
      })
      .transaction()) as Transaction;
    setEphemeralCounter(Number(counter));
    await submitTransaction(transaction, true, false, "confirmed");
  }, [counterPda, counter, keypair, submitTransaction]);

  const undelegatePdaTx = useCallback(async () => {
    if (!keypair.publicKey) return;
    console.log("Undelegate PDA transaction");
    const transaction = (await counterProgramClient.current?.methods
      .undelegate()
      .accountsPartial({
        user: keypair.publicKey,
        counter: counterPda,
      })
      .transaction()) as Transaction;

    await submitTransaction(transaction, true, true);
  }, [keypair, counterPda, submitTransaction]);

  const delegateTx = useCallback(async () => {
    await delegatePdaTx();
  }, [delegatePdaTx]);

  const undelegateTx = useCallback(async () => {
    await undelegatePdaTx();
  }, [undelegatePdaTx]);

  const initializeEphemeralConnection = useCallback(async () => {
    if (
      !authToken ||
      ephemeralConnection.current ||
      counterProgramClient.current == null
    )
      return;

    const cluster = `${EPHEMERAL_RPC_URL}?token=${authToken}`;

    ephemeralConnection.current = new Connection(cluster);

    // Airdrop to trigger lazy reload
    try {
      await ephemeralConnection.current?.requestAirdrop(counterPda, 1);
    } catch (_) {
      console.log("Refreshed account in the ephemeral");
    }

    const accountInfo = await ephemeralConnection.current.getAccountInfo(
      counterPda
    );
    if (accountInfo) {
      const counter = await counterProgramClient.current.coder.accounts.decode(
        "counter",
        accountInfo.data
      );
      setEphemeralCounter(Number(counter.count.valueOf()));
      await subscribeToCounter();
    }
    await subscribeToEphemeralCounter();
  }, [
    authToken,
    counterPda,
    counterProgramClient,
    ephemeralConnection,
    subscribeToCounter,
    subscribeToEphemeralCounter,
  ]);

  const initializeAuthToken = useCallback(async () => {
    setAuthToken(null);

    const challengeResponse = await fetch(
      `${EPHEMERAL_RPC_URL}/auth/challenge?pubkey=${keypair.publicKey.toBase58()}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "cors",
      }
    );
    const challengeJson = await challengeResponse.json();

    const signedMessage = sign.detached(
      new Uint8Array(Buffer.from(challengeJson.challenge)),
      keypair.secretKey
    );
    const signedMessageBase58 = bs58.encode(signedMessage);

    const loginResponse = await fetch(`${EPHEMERAL_RPC_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      body: JSON.stringify({
        pubkey: keypair.publicKey.toBase58(),
        signed_message: signedMessageBase58,
        message: challengeJson.challenge,
      }),
    });
    const loginJson = await loginResponse.json();
    console.log("Updated token:", loginJson);

    setAuthToken(loginJson.token);
  }, [keypair]);

  /**
   * Effects
   */

  useEffect(() => {
    initializeAuthToken().catch(console.error);
  }, [initializeAuthToken]);

  useEffect(() => {
    const initializeProgramClient = async () => {
      if (counterProgramClient.current) return;

      console.log(provider.current);
      counterProgramClient.current = new Program<PrivateMagicClicker>(
        PrivateMagicClickerIdl as any,
        provider.current
      );
      const accountInfo = await provider.current.connection.getAccountInfo(
        counterPda
      );
      if (accountInfo) {
        const counter =
          await counterProgramClient.current.account.counter.fetch(counterPda);
        setCounter(Number(counter.count.valueOf()));
        setIsDelegated(!accountInfo.owner.equals(COUNTER_PROGRAM));
        await subscribeToCounter();
      } else {
        console.log("Initializing counter");
        const tx = await counterProgramClient.current.methods
          .initialize()
          .accountsPartial({
            counter: counterPda,
            user: keypair.publicKey,
          })
          .transaction();
        const sig = await provider.current.connection.sendTransaction(tx, [
          keypair,
        ]);
        await provider.current.connection.confirmTransaction(sig);

        const counter =
          await counterProgramClient.current.account.counter.fetch(counterPda);
        setCounter(Number(counter.count.valueOf()));
        setIsDelegated(false);
        await subscribeToCounter();
      }

      // Create permission
      const permission = PublicKey.findProgramAddressSync(
        [PERMISSION_SEED, counterPda.toBuffer()],
        PERMISSION_PROGRAM_ID
      )[0];
      let permissionAccount = await provider.current.connection.getAccountInfo(
        permission
      );
      if (!permissionAccount) {
        const groupId = Keypair.generate().publicKey;
        const group = PublicKey.findProgramAddressSync(
          [GROUP_SEED, groupId.toBuffer()],
          PERMISSION_PROGRAM_ID
        )[0];
        const tx = await counterProgramClient.current?.methods
          .createPermission(groupId)
          .accountsPartial({
            user: keypair.publicKey,
            counter: counterPda,
            permission,
            group,
            permissionProgram: PERMISSION_PROGRAM_ID,
          })
          .transaction();
        const sig = await provider.current.connection.sendTransaction(tx, [
          keypair,
        ]);
        await provider.current.connection.confirmTransaction(sig);
      }
    };
    initializeProgramClient().catch(console.error);
  }, [connection, counterPda, keypair, subscribeToCounter]);

  useEffect(() => {
    initializeEphemeralConnection().catch(console.error);
  }, [initializeEphemeralConnection]);

  // Reinitialize the ephemeral counter when the keypair changes
  useEffect(() => {
    if (keypair.publicKey.toString() !== currentKeypair) {
      setCurrentKeypair(keypair.publicKey.toString());
      setAuthToken(null);
      setEphemeralCounter(undefined);

      if (
        ephemeralConnection.current !== null &&
        ephemeralCounterSubscriptionId.current !== null
      ) {
        console.log("Remove account change listener");
        ephemeralConnection.current.removeAccountChangeListener(
          ephemeralCounterSubscriptionId.current
        );
      }

      ephemeralConnection.current = null;
      ephemeralCounterSubscriptionId.current = null;
    }
  }, [keypair.publicKey, currentKeypair, initializeAuthToken]);

  // update ephemeral counter when it's undefined
  useEffect(() => {
    if (isDelegated && ephemeralCounter === undefined) {
      updateEphemeralCounter();
    }
  }, [isDelegated, ephemeralCounter, updateEphemeralCounter]);

  return (
    <div className="counter-container">
      <h1>Ephemeral Counter</h1>
      <p>Creator: {creator.toBase58()}</p>
      <p>Pubkey: {counterPda.toBase58()}</p>

      <div className="button-container">
        <Button
          title={"Delegate"}
          resetGame={delegateTx}
          disabled={isDelegated}
        />
        <Button
          title={"Undelegate"}
          resetGame={undelegateTx}
          disabled={!isDelegated}
        />
      </div>

      <div className="game">
        <Square
          key="0"
          ind={Number(0)}
          updateSquares={() => !isDelegated && increaseCounterTx()}
          clsName={isDelegated ? "" : counter?.toString() ?? "?"}
        />
        <Square
          key="1"
          ind={Number(1)}
          updateSquares={() => isDelegated && increaseCounterTx()}
          clsName={isDelegated ? ephemeralCounter?.toString() ?? "?" : ""}
        />
      </div>
      <select
        onChange={(e) => {
          setKeypair(
            keypairs.find((kp) => kp.publicKey.toBase58() === e.target.value)!
          );
        }}
        defaultValue={keypair.publicKey.toBase58()}
      >
        {keypairs.map((keypair) => (
          <option
            key={keypair.publicKey.toBase58()}
            value={`${keypair.publicKey.toBase58()}`}
          >
            {shortKey(keypair.publicKey)}{" "}
            {keypair.publicKey.toBase58() === creator.toBase58()
              ? " (has access)"
              : " (does not have access)"}
          </option>
        ))}
      </select>
      {isSubmitting && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            position: "fixed",
            bottom: "20px",
            left: 0,
            width: "100%",
            zIndex: 1000,
          }}
        >
          <div className="spinner"></div>
        </div>
      )}

      {transactionError && (
        <Alert
          type="error"
          message={transactionError}
          onClose={() => setTransactionError(null)}
        />
      )}

      {transactionSuccess && (
        <Alert
          type="success"
          message={transactionSuccess}
          onClose={() => setTransactionSuccess(null)}
        />
      )}
    </div>
  );
};

export default Counter;
