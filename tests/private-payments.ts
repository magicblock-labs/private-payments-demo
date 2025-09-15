import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PrivatePayments } from "../target/types/private_payments";
import {
  groupPdaFromId,
  PERMISSION_PROGRAM_ID,
  permissionPdaFromAccount,
} from "@magicblock-labs/ephemeral-rollups-sdk/privacy";
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

describe("private-payments", () => {
  const userKp = Keypair.generate();
  const wallet = new anchor.Wallet(userKp);
  const otherUserKp = Keypair.generate();

  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection("https://api.devnet.solana.com", {
      wsEndpoint: "wss://api.devnet.solana.com",
    }),
    wallet
  );
  const ephemeralProvider = new anchor.AnchorProvider(
    new anchor.web3.Connection("http://0.0.0.0:8899", {
      wsEndpoint: "ws://0.0.0.0:8900",
    }),
    wallet
  );
  anchor.setProvider(provider);

  const program = new Program<PrivatePayments>(privatePaymentsIdl, provider);
  const ephemeralProgram = new Program<PrivatePayments>(
    privatePaymentsIdl,
    ephemeralProvider
  );
  const user = userKp.publicKey;
  const otherUser = otherUserKp.publicKey;
  let tokenMint: PublicKey,
    userTokenAccount: PublicKey,
    vaultPda: PublicKey,
    vaultTokenAccount: PublicKey;
  const initialAmount = 1000000;
  const groupId = PublicKey.unique();
  const otherGroupId = PublicKey.unique();
  let depositPda: PublicKey, otherDepositPda: PublicKey;

  before(async () => {
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
    console.log("Group ID", groupId.toBase58());
    console.log("Other group ID", otherGroupId.toBase58());
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

    await program.methods
      .initializeDeposit()
      .accountsPartial({
        user: otherUser,
        deposit: otherDepositPda,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ skipPreflight: true });

    deposit = await program.account.deposit.fetch(otherDepositPda);
    assert.equal(deposit.amount.toNumber(), 0);
  });

  it("Modify balance", async () => {
    await program.methods
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

    let deposit = await program.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 2);

    await program.methods
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
    deposit = await program.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 4);

    await program.methods
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
    deposit = await program.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount);
  });

  it("Create permission", async () => {
    for (const { deposit, kp, id } of [
      { deposit: depositPda, kp: userKp, id: groupId },
      { deposit: otherDepositPda, kp: otherUserKp, id: otherGroupId },
    ]) {
      const permission = permissionPdaFromAccount(deposit);
      const group = groupPdaFromId(id);

      await program.methods
        .createPermission(id)
        .accountsPartial({
          payer: kp.publicKey,
          user: kp.publicKey,
          deposit,
          permission,
          group,
          permissionProgram: PERMISSION_PROGRAM_ID,
        })
        .signers([kp])
        .rpc({ skipPreflight: true });
    }
  });

  it("Delegate", async () => {
    for (const { deposit, kp } of [
      { deposit: depositPda, kp: userKp },
      { deposit: otherDepositPda, kp: otherUserKp },
    ]) {
      const tx = await program.methods
        .delegate(kp.publicKey, tokenMint)
        .accountsPartial({ payer: kp.publicKey, deposit })
        .signers([kp])
        .rpc({ skipPreflight: true });
    }
  });

  it("Transfer", async () => {
    // Used to force fetching accounts from the base validator
    await ephemeralProvider.connection.requestAirdrop(depositPda, 1000);
    await ephemeralProvider.connection.requestAirdrop(otherDepositPda, 1000);

    ephemeralProgram.methods
      .transferDeposit(new anchor.BN(initialAmount / 2))
      .accountsPartial({
        user,
        sourceDeposit: depositPda,
        destinationDeposit: otherDepositPda,
        tokenMint,
      })
      .signers([userKp])
      .rpc({ skipPreflight: true });

    let deposit = await ephemeralProgram.account.deposit.fetch(depositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 2);

    deposit = await ephemeralProgram.account.deposit.fetch(otherDepositPda);
    assert.equal(deposit.amount.toNumber(), initialAmount / 2);
  });
});
