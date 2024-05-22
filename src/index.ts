import { createCanvas, loadImage } from "canvas";
import { getFullyEnrichedTransactionData } from "roadslip-sdk";
import { TransactionData } from "roadslip-sdk";
import fs from "fs";
import QRCode from "qrcode";

function shortenString(str: string): string {
  if (str.length <= 8) {
    return str;
  }
  return `${str.slice(0, 4)}....${str.slice(-4)}`;
}

function getUserName(walletAddress: string, domain?: string) {
  return domain ? `${domain}.sol` : shortenString(walletAddress);
}

function generateAvatar(walletAddress: string): string {
  const canvas = createCanvas(300, 300);
  const ctx = canvas.getContext("2d");

  // Create a circle clipping path
  ctx.beginPath();
  ctx.arc(150, 150, 150, 0, Math.PI * 2, true);
  ctx.clip();

  // Base color
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 300, 300);

  // Simple hash function to map characters to colors
  const colors = ["#FF5733", "#33FF57", "#3357FF", "#F333FF", "#33FFF3"];
  let x = 0,
    y = 0,
    size = 50;

  for (let i = 0; i < walletAddress.length; i++) {
    const charIndex = walletAddress.charCodeAt(i) % colors.length;
    ctx.fillStyle = colors[charIndex];
    // Adjust positioning and size for visual variety
    size = 30 + (charIndex % 21); // Vary size between 30 and 50
    x = (i % 5) * 60 + 15; // Adjust spacing based on index
    y = Math.floor(i / 5) * 60 + 15;
    ctx.fillRect(x, y, size, size); // Draw square
  }

  return canvas.toDataURL(); // Returns a base64 PNG
}

async function getUserImage(walletAddress: string, imageUrl?: string) {
  return loadImage(imageUrl ?? generateAvatar(walletAddress));
}

export async function createTransactionImage(
  transaction: TransactionData
): Promise<string> {
  const width = 500;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const explorer = "https://explorer.solana.com/tx/";
  const qrCodeDataURL = await QRCode.toDataURL(
    explorer + transaction.transaction,
    {
      width: 250,
    }
  );

  const qrCode = await loadImage(qrCodeDataURL);

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Content
  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.fillText("Payment Completed", 20, 25);
  ctx.font = "14px Arial";
  ctx.fillText(new Date(transaction.timestamp * 1000).toLocaleString(), 20, 50);
  ctx.fillRect(20, 75, width - 40, 2);

  // Sender Details
  ctx.drawImage(
    await getUserImage(transaction.sender, transaction.senderImageUrl),
    20,
    100,
    50,
    50
  );
  ctx.font = "bold 14px Arial";
  ctx.fillText(
    getUserName(transaction.sender, transaction.senderDomain),
    90,
    130
  );

  ctx.font = "24px Arial";
  ctx.fillText("↓", 40, 180);

  // Recipient Details
  ctx.drawImage(
    await getUserImage(transaction.receiver, transaction.receiverImageUrl),
    20,
    200,
    50,
    50
  );
  ctx.font = "bold 14px Arial";
  ctx.fillText(
    getUserName(transaction.receiver, transaction.receiverDomain),
    90,
    230
  );

  // Amount
  ctx.font = "bold 16px Arial";
  ctx.fillText("Amount:", 20, 280);
  ctx.font = "16px Arial";
  ctx.fillText("$5.13", 20, 305);

  // QR Code
  ctx.drawImage(qrCode, width - 135, 200, 123, 123);
  ctx.font = "12px Arial";
  ctx.fillText("Scan to verify", width - 110, 330);

  // Transaction ID
  ctx.fillRect(20, 355, width - 40, 2);
  ctx.font = "bold 16px Arial";
  ctx.fillText("Transaction ID:", 20, 380);
  ctx.font = "12px Arial";

  const maxLineLength = 55;
  let yOffset = 405;

  for (let i = 0; i < transaction.transaction.length; i += maxLineLength) {
    ctx.fillText(
      transaction.transaction.slice(i, i + maxLineLength),
      20,
      yOffset
    );
    yOffset += 20;
  }

  const image = canvas.toBuffer("image/jpeg", { quality: 1.0 });

  return image.toString("base64");
}

async function main() {
  try {
    const transaction = await getFullyEnrichedTransactionData(
      "59tkXRD9d2dD8FzUHvEFmwnuzxMMUm2HztYrtL1e7EGdnAyaSQ3XBfAo6rCtUKtnZK2YH9hq7yi7vRNU7sN9h7uD"
    );

    if (!transaction) throw new Error("No transaction data");

    console.log(transaction);
    await createTransactionImage(transaction);
  } catch (error) {
    console.error("Error creating image:", error);
  }
}

main();
