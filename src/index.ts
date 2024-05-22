import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import {
  Record,
  getAllDomains,
  getFavoriteDomain,
  getRecordV2,
  reverseLookup,
} from "@bonfida/spl-name-service";
import { createCanvas, loadImage } from "canvas";
import { toDataURL } from 'qrcode';


export type TransactionData = {
  sender: string;
  senderDomain: string | undefined;
  senderImageUrl: string | undefined;
  receiver: string;
  receiverDomain: string | undefined;
  receiverImageUrl: string | undefined;
  amount: number;
  transaction: string;
  timestamp: number;
};

/**
 * Fetches and enriches transaction data with domain and image information.
 * 
 * @param {string} signature - The transaction signature to pull the payslip data for.
 * @param {string} [rpcUrl] - Optional RPC URL - uses the default cluster urls if not set.
 * @param {boolean} [devnet=false] - Use devnet if true, default is false - still uses mainnet-beta cluster for sns lookups.
 * @returns {Promise<TransactionData | undefined>} The enriched transaction data.
 */
export async function getFullyEnrichedTransactionData(
  signature: string,
  rpcUrl?: string,
  devnet: boolean = false
) {
  let connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
  let bonfidaConnection = new Connection(
    clusterApiUrl("mainnet-beta"),
    "confirmed"
  );

  if (devnet) {
    connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  }

  if (rpcUrl) {
    connection = new Connection(rpcUrl, "confirmed");
    bonfidaConnection = new Connection(rpcUrl, "confirmed");
  }

  const basicData = await getBasicTransactionData(signature, connection);
  if (!basicData) {
    return undefined;
  }
  const enrichedData = await enrichTransactionData(
    basicData,
    bonfidaConnection
  );

  return enrichedData;
}

/**
 * Fetches basic transaction data including participants and balances.
 * 
 * @param {string} signature - The transaction signature.
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<TransactionData | undefined>} The basic transaction data.
 */
export async function getBasicTransactionData(
  signature: string,
  connection: Connection
) {
  try {
    // Fetch the transaction details
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    const preBalances: Map<string, number> = new Map();
    const postBalances: Map<string, number> = new Map();
    const participants: string[] = [];
    let result: TransactionData;

    if (transaction?.meta?.preTokenBalances) {
      for (const balance of transaction.meta.preTokenBalances) {
        if (balance.owner && balance.uiTokenAmount.uiAmount) {
          preBalances.set(balance.owner, balance.uiTokenAmount.uiAmount);
        }
      }
    }

    if (transaction?.meta?.postTokenBalances) {
      for (const balance of transaction.meta.postTokenBalances) {
        if (balance.owner && balance.uiTokenAmount.uiAmount) {
          participants.push(balance.owner);
          postBalances.set(balance.owner, balance.uiTokenAmount.uiAmount);
        }
      }
    }

    //assertion: always two participants
    const firstParticipantBefore = preBalances.get(participants[0]) || 0;
    const firstParticipantAfter = postBalances.get(participants[0]) || 0;

    const firstParticipantDifference =
      firstParticipantAfter - firstParticipantBefore;

    if (firstParticipantDifference < 0) {
      // console.log(`${participants[0]} sent ${firstParticipantDifference} to ${participants[1]}`);
      result = {
        sender: participants[0],
        senderDomain: undefined,
        senderImageUrl: undefined,
        receiver: participants[1],
        receiverDomain: undefined,
        receiverImageUrl: undefined,
        amount: -firstParticipantDifference,
        transaction: signature,
        timestamp: transaction?.blockTime || 0,
      };
    } else {
      // console.log(`${participants[1]} sent ${-firstParticipantDifference} to ${participants[0]}`);
      result = {
        sender: participants[1],
        senderDomain: undefined,
        senderImageUrl: undefined,
        receiver: participants[0],
        receiverDomain: undefined,
        receiverImageUrl: undefined,
        amount: firstParticipantDifference,
        transaction: signature,
        timestamp: transaction?.blockTime || 0,
      };
    }

    return result;
  } catch (error) {
    console.error("Error fetching transaction data:", error);
  }
}

/**
 * Enriches transaction data with domain and image information from solana name service (SNS) if available - leaves the fields empty if
 * it does not exist.
 * 
 * @param {TransactionData} data - The basic transaction data. Needs to contain sender and receiver to generate the 
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<TransactionData>} The enriched transaction data.
 */
export async function enrichTransactionData(
  data: TransactionData,
  connection: Connection
) {
  try {
    data.senderDomain = await getDomainForPubKey(data.sender, connection);
    if (data.senderDomain) {
      data.senderImageUrl = await getPicUrlForDomain(
        data.senderDomain,
        connection
      );
    }
  } catch (error) {
    //do nothing
  }

  try {
    data.receiverDomain = await getDomainForPubKey(data.receiver, connection);
    if (data.receiverDomain) {
      data.receiverImageUrl = await getPicUrlForDomain(
        data.receiverDomain,
        connection
      );
    }
  } catch (error) {
    //do nothing
  }
  return data;
}

/**
 * Retrieves the SNS domain name associated with a public key.
 * 
 * @param {string} pubKey - The public key as a string.
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<string>} The associated domain name.
 */
export async function getDomainForPubKey(
  pubKey: string,
  connection: Connection
) {
  const domainPubkey = new PublicKey(pubKey);
  let domain = (await getFavoriteDomain(connection, domainPubkey)).reverse;
  if (!domain) {
    const domains = await getAllDomains(connection, domainPubkey);
    domain = await reverseLookup(connection, domains[0]);
  }
  return domain;
}

/**
 * Retrieves the picture URL associated with a domain in SNS if available.
 * 
 * @param {string} domain - The domain name.
 * @param {Connection} connection - The Solana connection object.
 * @returns {Promise<string>} The URL of the picture.
 */
export async function getPicUrlForDomain(
  domain: string,
  connection: Connection
) {
  const recordV2Key = await getRecordV2(connection, domain, Record.Pic);
  const dataString = recordV2Key.retrievedRecord.data.toString();
  const picUrl = dataString.substring(dataString.indexOf("http"));
  return picUrl;
}

/**
 * Shortens a string to a maximum length, adding ellipsis in the middle if needed.
 * 
 * @param {string} str - The string to shorten.
 * @returns {string} The shortened string.
 */
function shortenString(str: string): string {
  if (str.length <= 8) {
    return str;
  }
  return `${str.slice(0, 4)}....${str.slice(-4)}`;
}

/**
 * Gets the user name based on wallet address and domain. If the domain is provided .sol 
 * 
 * @param {string} walletAddress - The wallet address.
 * @param {string} [domain] - The domain name.
 * @returns {string} The user name.
 */
function getUserName(walletAddress: string, domain?: string) {
  return domain ? `${domain}.sol` : shortenString(walletAddress);
}

/**
 * Generates an avatar for a given wallet address.
 * 
 * @param {string} walletAddress - The wallet address.
 * @returns {string} The avatar image as a base64 string.
 */
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

/**
 * Retrieves the user image based on wallet address and optional image URL.
 * 
 * @param {string} walletAddress - The wallet address.
 * @param {string} [imageUrl] - The image URL.
 * @returns {Promise<Canvas.Image>} The user image.
 */
async function getUserImage(walletAddress: string, imageUrl?: string) {
  return loadImage(imageUrl ?? generateAvatar(walletAddress));
}

/**
 * Creates an image representing the transaction details.
 * 
 * @param {TransactionData} transaction - The transaction data.
 * @returns {Promise<string>} The transaction image as a base64 string.
 */
export async function createTransactionImage(
  transaction: TransactionData
): Promise<string> {
  const width = 500;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  const explorer = "https://explorer.solana.com/tx/";
  const qrCodeDataURL = await toDataURL(
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
  ctx.fillText("$" + transaction.amount.toFixed(2), 20, 305);

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

/**
 * Creates a payslip image for a given USDC transfer transaction.
 * 
 * @param {string} transactionHash - The transaction hash.
 * @param {string} [rpcUrl] - Optional RPC URL - uses the default cluster urls if not set.
 * @param {boolean} [devnet=false] - Use devnet if true, default is false - still uses mainnet-beta cluster for sns lookups.
 * @returns {Promise<string>} The payslip image as a base64 string.
 * @throws {Error} If the transaction data is not found.
 */
export async function createPayslip(transactionHash: string, rpcUrl?: string, devnet: boolean = false) {
  const transactionData = await getFullyEnrichedTransactionData(
    transactionHash, rpcUrl, devnet
  );

  if (!transactionData) {
    throw new Error("Transaction data not found");
  }

  return await createTransactionImage(transactionData);
}
