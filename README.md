# Private Payments

A simple payments that works in a Private Ephemeral Rollup.

## Installation

```bash
yarn install
cd app
yarn install
```

## Run the app

```bash

```

## Test

You must have a MagicBlock validator and a test validator running locally: 
1. In MagicBlock validator's repo: `cargo run -- --remote-url http://localhost:8899 --remote-ws-url ws://localhost:8900 --rpc-addr 0.0.0.0 --rpc-port 7799`
2. `solana-test-validator`

```bash
anchor test --skip-local-validator --skip-deploy
```
