# Roadslip SDK

## Description

Roadslip SDK renders a human-readable receipt (payslip) for a given transaction hash on the Solana blockchain.

## Features

- Generate transaction images with QR codes.
- Fetch and display user domains and avatars.
- Supports Solana mainnet and devnet.

## Installation

```bash
npm install roadslip-sdk
```

## Usage

```typescript
import { createPayslip } from "roadslip-sdk";

async function generatePayslip(transactionHash: string) {
  try {
    const payslip = await createPayslip(transactionHash);
    console.log("Payslip generated:", payslip);
  } catch (error) {
    console.error("Error generating payslip:", error);
  }
}

generatePayslip("your-transaction-hash");
```

## API

### `createPayslip(transactionHash: string, rpcUrl?: string, devnet?: boolean): Promise<string>`

Generates a payslip image for the given transaction hash.

### `getFullyEnrichedTransactionData(signature: string, rpcUrl?: string, devnet?: boolean): Promise<TransactionData | undefined>`

Fetches and enriches transaction data.

## Types

### `TransactionData`

```typescript
type TransactionData = {
  sender: string;
  senderDomain?: string;
  senderImageUrl?: string;
  receiver: string;
  receiverDomain?: string;
  receiverImageUrl?: string;
  amount: number;
  transaction: string;
  timestamp: number;
};
```

## License

MIT
