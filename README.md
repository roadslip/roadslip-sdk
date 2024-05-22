# Roadslip SDK

## Description

Roadslip SDK renders a human-readable receipt (payslip) for a given transaction hash of a USDC transfer on the Solana blockchain.

## Features

- Generate human readable transaction images with QR codes to verify the transaction on a block explorer if needed.
- Fetch and display user domains and avatars by leveraging SNS.

## Installation

```bash
npm install roadslip-sdk
```

## Usage

```typescript
import { createPayslip } from 'roadslip-sdk';
import * as fs from 'fs';

function saveBase64Image(base64Data: string, filePath: string) {
    // Remove the data URL prefix if present
    const base64Prefix = /^data:image\/jpeg;base64,/;
    if (base64Prefix.test(base64Data)) {
        base64Data = base64Data.replace(base64Prefix, '');
    }

    // Convert the base64 string to a Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Write the Buffer to a file
    fs.writeFile(filePath, imageBuffer, (err) => {
        if (err) {
            console.error('Error saving the image:', err);
        } else {
            console.log('Image saved successfully to', filePath);
        }
    });
}

async function main() {
    const transactionSignature = 'insert-your-usdc-transfer-transaction-hash-here'
    const imageData = await createPayslip(transactionSignature, undefined, true); //for testnet transaction with sns resolution on mainnet - for mainnet just remove last two parameters - use second parameter if you want to use custom rpc url
    saveBase64Image(imageData, 'output.jpeg');
}

main();
```

## API

### `createPayslip(transactionHash: string, rpcUrl?: string, devnet?: boolean): Promise<string>`

Generates a payslip image for the given transaction hash.

### `getFullyEnrichedTransactionData(signature: string, rpcUrl?: string, devnet?: boolean): Promise<TransactionData | undefined>`

Fetches and enriches transaction data. Useful if you just want the info but do the rendering yourself.

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

## Dependencies

```
@solana/web3.js
@bonfida/spl-name-service
canvas
qrcode
```

## License

MIT
