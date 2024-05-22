// import htmlToImage from "node-html-to-image";

import nodeHtmlToImage from "node-html-to-image";
import { TransactionData } from "./types/transactionDataType";
import fs from "fs";
import path from "path";

// Read the image file and convert it to a base64 string
const imagePath = path.resolve(__dirname, "../src/assets/payslip.jpg");
const imageBase64 = fs.readFileSync(imagePath, "base64");

const transactionData: TransactionData = {
  sender: "J9RaTBYQ7C8y5ZMfy9zc9Sjnoixik1Bj23wQ26TdTRZt",
  senderDomain: "bjoern",
  senderImageUrl:
    "https://cloudflare-ipfs.com/ipfs/Qmd7SET4ZrM2G6MSfyZhiPMkafDpN8BAbvHs7BSrYPbLhi",
  receiver: "2c1gtAYfw8MRvRw6wKcSQ2V4zrSymvE5FdmwR8mVxcNn",
  receiverDomain: undefined,
  receiverImageUrl: undefined,
  amount: 10,
  transaction:
    "59tkXRD9d2dD8FzUHvEFmwnuzxMMUm2HztYrtL1e7EGdnAyaSQ3XBfAo6rCtUKtnZK2YH9hq7yi7vRNU7sN9h7uD",
  timestamp: 1716159999,
};

async function createTransactionImage(transactionData: TransactionData) {
  const html = `
  <html>
  <head>
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, sans-serif;
        background-color: #fff;
      }
      .container {
        width: 390px;
        height: 750px;
        position: relative;
        background-color: #ffffff;
        box-sizing: border-box;
        border: 1px solid #000;
      }
      .header {
        background-color: #000;
        color: #fff;
        text-align: center;
        padding: 20px;
      }
      .header img {
        width: 80px;
        height: auto;
      }
      .header h1 {
        margin: 0;
        font-size: 24px;
      }
      .content {
        padding: 20px;
      }
      .content h2 {
        margin: 0;
        font-size: 18px;
        font-weight: bold;
      }
      .content p {
        margin: 5px 0;
        font-size: 14px;
      }
      .content .amount {
        font-size: 16px;
        font-weight: bold;
      }
      .content .transaction-id {
        font-size: 12px;
        word-break: break-all;
      }
      .qr-code {
        text-align: right;
        padding: 20px;
      }
      .qr-code img {
        width: 80px;
        height: auto;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <img src="path-to-logo.png" alt="Logo" />
        <h1>Roadslip</h1>
      </div>
      <div class="content">
        <h2>Payment Completed</h2>
        <p>7 March 2024, 8:41 PM</p>
        <hr />
        <div>
          <img src="path-to-user-image.png" alt="User" style="width: 40px; height: 40px; border-radius: 50%;" />
          <span>tara.sol</span>
          <p>Roadslip (xxxxxx)</p>
        </div>
        <div style="text-align: center;">
          <p>→</p>
        </div>
        <div>
          <img src="path-to-recipient-image.png" alt="Recipient" style="width: 40px; height: 40px; border-radius: 50%;" />
          <span>mcdonalds.sol</span>
          <p>True Money (xxxxxx)</p>
        </div>
        <p class="amount">Amount: $5.13</p>
        <div class="qr-code">
          <img src="path-to-qr-code.png" alt="QR Code" />
          <p>Scan to verify</p>
        </div>
        <p class="transaction-id">Transaction ID: 0x123234983729487293298347</p>
      </div>
    </div>
  </body>
  </html>
`;

  const image = await nodeHtmlToImage({
    html,
    type: "jpeg",
    encoding: "base64",
    puppeteerArgs: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  return image;
}

createTransactionImage(transactionData)
  .then((image) => {
    console.log("Image created successfully", image);
  })
  .catch((error) => {
    console.error("Error creating image:", error);
  });
