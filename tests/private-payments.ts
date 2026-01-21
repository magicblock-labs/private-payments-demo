import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivatePayments } from "../target/types/private_payments";
import {
  getAuthToken,
  GetCommitmentSignature,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { DEPOSIT_PDA_SEED, VAULT_PDA_SEED } from "../frontend/lib/constants";
import privatePaymentsIdl from "../frontend/program/private_payments.json";
import {
  createAssociatedTokenAccountIdempotent,
  createMint,
  getAssociatedTokenAddressSync,
  mintToChecked,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { assert } from "chai";
import {
  Transaction,
  SystemProgram,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { sign } from "tweetnacl";

describe("private-payments", () => {
  const userKp = Keypair.generate();
  const wallet = new anchor.Wallet(userKp);
  const otherUserKp = Keypair.generate();

  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection("https://rpc.magicblock.app/devnet", {
      wsEndpoint: "wss://rpc.magicblock.app/devnet",
    }),
    wallet
  );
  anchor.setProvider(provider);

  const program = new Program<PrivatePayments>(privatePaymentsIdl, provider);
  let ephemeralProgramUser: Program<PrivatePayments>;
  let ephemeralProgramOtherUser: Program<PrivatePayments>;
  const user = userKp.publicKey;
  const otherUser = otherUserKp.publicKey;
  let tokenMint: PublicKey,
    userTokenAccount: PublicKey,
    vaultPda: PublicKey,
    vaultTokenAccount: PublicKey;
  const initialAmount = 1000000;
  let depositPda: PublicKey, otherDepositPda: PublicKey;

  before(async () => {
    let ephemeralRpcUrl = "https://tee.magicblock.app";
    const { token } = await getAuthToken(ephemeralRpcUrl, wallet.publicKey, async (message) => sign.detached(message, userKp.secretKey));
    const ephemeralProviderUser = new anchor.AnchorProvider(
      new anchor.web3.Connection("https://tee.magicblock.app?token=" + token, {
        wsEndpoint: "wss://tee.magicblock.app?token=" + token,
      }),
      wallet
    );
    ephemeralProgramUser = new Program<PrivatePayments>(
      privatePaymentsIdl,
      ephemeralProviderUser
    );

    const { token: otherToken } = await getAuthToken(ephemeralRpcUrl, otherUserKp.publicKey, async (message) => sign.detached(message, otherUserKp.secretKey));
    const ephemeralProviderOtherUser = new anchor.AnchorProvider(
      new anchor.web3.Connection("https://tee.magicblock.app?token=" + otherToken, {
        wsEndpoint: "wss://tee.magicblock.app?token=" + otherToken,
      }),
      new anchor.Wallet(otherUserKp)
    );
    ephemeralProgramOtherUser = new Program<PrivatePayments>(
      privatePaymentsIdl,
      ephemeralProviderOtherUser
    );

    const faucet = anchor.Wallet.local();

    // Airdrop SOL to the users
    for (const kp of [userKp, otherUserKp]) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: faucet.publicKey,
          toPubkey: kp.publicKey,
          lamports: 0.1 * LAMPORTS_PER_SOL,
        })
      );
      tx.recentBlockhash = (
        await provider.connection.getLatestBlockhash()
      ).blockhash;
      tx.feePayer = faucet.publicKey;
      let signedTx = await faucet.signTransaction(tx);
      let rawTx = signedTx.serialize();
      let sig = await provider.connection.sendRawTransaction(rawTx);
      await provider.connection.confirmTransaction(sig);
    }

    let balance = await provider.connection.getBalance(userKp.publicKey);
    console.log("Balance", balance);
    while (balance === 0) {
      console.log("Airdropping...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      balance = await provider.connection.getBalance(userKp.publicKey);
    }
    if (balance === 0) throw new Error("airdrop failed...");

    console.log("Creating mint...");
    tokenMint = await createMint(
      provider.connection,
      userKp,
      user,
      null,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    while ((await provider.connection.getAccountInfo(tokenMint)) === null) {
      console.log("Waiting for mint to be created...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    depositPda = PublicKey.findProgramAddressSync(
      [Buffer.from(DEPOSIT_PDA_SEED), user.toBuffer(), tokenMint.toBuffer()],
      program.programId
    )[0];
    otherDepositPda = PublicKey.findProgramAddressSync(
      [
        Buffer.from(DEPOSIT_PDA_SEED),
        otherUser.toBuffer(),
        tokenMint.toBuffer(),
      ],
      program.programId
    )[0];
    vaultPda = PublicKey.findProgramAddressSync(
      [Buffer.from(VAULT_PDA_SEED), tokenMint.toBuffer()],
      program.programId
    )[0];
    vaultTokenAccount = getAssociatedTokenAddressSync(
      tokenMint,
      vaultPda,
      true,
      TOKEN_PROGRAM_ID
    );

    console.log("Creating user token account...");
    userTokenAccount = await createAssociatedTokenAccountIdempotent(
      provider.connection,
      userKp,
      tokenMint,
      user,
      undefined,
      TOKEN_PROGRAM_ID
    );

    while (
      (await provider.connection.getAccountInfo(userTokenAccount)) === null
    ) {
      console.log("Waiting for user token account to be created...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("Minting tokens to user...");
    // Mint tokens to the user
    await mintToChecked(
      provider.connection,
      userKp,
      tokenMint,
      userTokenAccount,
      user,
      new anchor.BN(initialAmount) as any,
      6,
      undefined,
      undefined,
      TOKEN_PROGRAM_ID
    );

    console.log("User token account", userTokenAccount.toBase58());
    console.log("Vault token account", vaultTokenAccount.toBase58());
    console.log("Deposit PDA", depositPda.toBase58());
    console.log("Other deposit PDA", otherDepositPda.toBase58());
    console.log("User", user.toBase58());
    console.log("Other user", otherUser.toBase58());
    console.log("Token mint", tokenMint.toBase58());
  });

  it("Initialize deposits", async () => {
    await program.methods
      .initializeDeposit()
      .accountsPartial({
        user,
        deposit: depositPda,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });

    let deposit = await program.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), 0);

    const tx = await program.methods
      .initializeDeposit()
      .accountsPartial({
        user: otherUser,
        deposit: otherDepositPda,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });
    console.log("Initialize deposit tx", tx);
    await provider.connection.confirmTransaction(tx);

    deposit = await program.account.deposit.fetch(otherDepositPda);
    assert.equal(deposit.amount.toNumber(), 0);
  });

  it("Modify balance", async () => {
    let tx = await program.methods
      .modifyBalance({
        amount: new anchor.BN(initialAmount / 2),
        increase: true,
      })
      .accountsPartial({
        user,
        payer: user,
        deposit: depositPda,
        userTokenAccount,
        vault: vaultPda,
        vaultTokenAccount,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });
    console.log("Modify balance tx", tx);
    await provider.connection.confirmTransaction(tx);

    let deposit = await program.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 2);

    tx = await program.methods
      .modifyBalance({
        amount: new anchor.BN(initialAmount / 4),
        increase: false,
      })
      .accountsPartial({
        user,
        payer: user,
        deposit: depositPda,
        userTokenAccount,
        vault: vaultPda,
        vaultTokenAccount,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });
    console.log("Modify balance tx", tx);
    await provider.connection.confirmTransaction(tx);

    deposit = await program.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 4);

    tx = await program.methods
      .modifyBalance({
        amount: new anchor.BN((3 * initialAmount) / 4),
        increase: true,
      })
      .accountsPartial({
        user,
        payer: user,
        deposit: depositPda,
        userTokenAccount,
        vault: vaultPda,
        vaultTokenAccount,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });
    console.log("Modify balance tx", tx);
    await provider.connection.confirmTransaction(tx);

    deposit = await program.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount);
  });

  it("Create permission", async () => {
    for (const { deposit, kp } of [
      { deposit: depositPda, kp: userKp },
      { deposit: otherDepositPda, kp: otherUserKp },
    ]) {
      const permission = permissionPdaFromAccount(deposit);

      let tx = await program.methods
        .createPermission()
        .accountsPartial({
          payer: kp.publicKey,
          user: kp.publicKey,
          deposit,
          permission,
          permissionProgram: PERMISSION_PROGRAM_ID,
        })
        .signers([kp])
        .rpc({ skipPreflight: true });
      console.log("Create permission tx", tx);
      await provider.connection.confirmTransaction(tx);
    }
  });

  it("Delegate", async () => {
    for (const { deposit, kp } of [
      { deposit: depositPda, kp: userKp },
      { deposit: otherDepositPda, kp: otherUserKp },
    ]) {
      const tx = await program.methods
        .delegate(kp.publicKey, tokenMint)
        .accountsPartial({ payer: kp.publicKey, deposit, validator: new PublicKey("FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA") })
        .signers([kp])
        .rpc({ skipPreflight: true });
      console.log("Delegate tx", tx);
      await provider.connection.confirmTransaction(tx);
    }
  });

  it("Transfer", async () => {
    console.log("Ephemeral RPC endpoint", ephemeralProgramUser.provider.connection.rpcEndpoint);
    let tx = await ephemeralProgramUser.methods
      .transferDeposit(new anchor.BN(initialAmount / 2))
      .accountsPartial({
        user,
        sourceDeposit: depositPda,
        destinationDeposit: otherDepositPda,
        sessionToken: null,
        tokenMint,
      })
      .signers([userKp])
      .rpc({ skipPreflight: true });
    console.log("Ephemeral RPC endpoint", ephemeralProgramOtherUser.provider.connection.rpcEndpoint);
    console.log("Transfer tx", tx);

    let deposit = await ephemeralProgramUser.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 2);
    deposit = await ephemeralProgramOtherUser.account.deposit.fetch(otherDepositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 2);

    try {
      await ephemeralProgramUser.account.deposit.fetch(otherDepositPda);
      assert.fail("Deposit should not exist");
    } catch (error) {
      assert.isNotNull(error);
    }
    try {
      await ephemeralProgramOtherUser.account.deposit.fetch(depositPda);
      assert.fail("Deposit should not exist");
    } catch (error) {
      assert.isNotNull(error);
    }
  });

  it("Undelegate", async () => {
    console.log("Ephemeral RPC endpoint", ephemeralProgramUser.provider.connection.rpcEndpoint);
    let tx = await ephemeralProgramUser.methods
      .undelegate()
      .accountsPartial({
        user,
        deposit: depositPda,
        sessionToken: null,
      })
      .signers([userKp])
      .rpc({ skipPreflight: true });
    console.log("Undelegate tx", tx);
    await ephemeralProgramUser.provider.connection.confirmTransaction(tx);

    // Get commitment signature does not work for the PER
    let retries = 10;
    while (retries > 0) {
      try {
        let account = await provider.connection.getAccountInfo(depositPda);
        if (account?.owner.equals(program.programId)) {
          break;
        }
      } catch (error) {
        retries--;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    assert.isAbove(retries, 0, "Undelegate failed...");
  });
});
