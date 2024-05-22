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
