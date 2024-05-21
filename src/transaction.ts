import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import {Record, getAllDomains, getFavoriteDomain, getRecordV2, reverseLookup } from "@bonfida/spl-name-service";

export type TransactionData = {
    sender: string
    senderDomain: string | undefined
    senderImageUrl: string | undefined
    receiver: string
    receiverDomain: string | undefined
    receiverImageUrl: string | undefined
    amount: number
    transaction: string
    timestamp: number
}

export async function getTransactionData(signature: string, rpcUrl?: string, devnet: boolean = false) {

    let connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    let bonfidaConnection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');

    if(devnet){
        connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    }

    if(rpcUrl){
        connection = new Connection(rpcUrl, 'confirmed');
        bonfidaConnection = new Connection(rpcUrl, 'confirmed');
    }

  try {
    // Fetch the transaction details
    const transaction = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });

    const preBalances: Map<string, number> = new Map();
    const postBalances: Map<string, number> = new Map();
    const participants: string[] = [];
    let result: TransactionData

    if(transaction?.meta?.preTokenBalances) {
        for (const balance of transaction.meta.preTokenBalances) {
            if(balance.owner && balance.uiTokenAmount.uiAmount){
                preBalances.set(balance.owner, balance.uiTokenAmount.uiAmount);
            } 
          }
    }

    if(transaction?.meta?.postTokenBalances) {
        for (const balance of transaction.meta.postTokenBalances) {
            if(balance.owner && balance.uiTokenAmount.uiAmount){
                participants.push(balance.owner);
                postBalances.set(balance.owner, balance.uiTokenAmount.uiAmount);
            } 
          }
    }

    //assertion: always two participants
    const firstParticipantBefore = preBalances.get(participants[0]) || 0;
    const firstParticipantAfter = postBalances.get(participants[0]) || 0;

    const firstParticipantDifference = firstParticipantAfter - firstParticipantBefore;

    if(firstParticipantDifference < 0){
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
            timestamp: transaction?.blockTime || 0
        }
    }else {
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
            timestamp: transaction?.blockTime || 0
        }
    }

    const senderPubKey = new PublicKey(result.sender);
    const receiverDomainKey = new PublicKey(result.receiver);
    try {
        result.senderDomain = (await getFavoriteDomain(bonfidaConnection, senderPubKey)).reverse;
        if(!result.senderDomain) {
            const domains = await getAllDomains(bonfidaConnection, senderPubKey);
            result.receiverDomain = await reverseLookup(bonfidaConnection, domains[0]);
        }
        if(result.senderDomain){
            const recordV2Key = await getRecordV2(bonfidaConnection, result.senderDomain, Record.Pic);
            const dataString = (recordV2Key.retrievedRecord.data.toString());
            const picUrl = dataString.substring(dataString.indexOf('http'))
            result.senderImageUrl = picUrl;
        }
        
    } catch (error) {
        //do nothing
    }

    try {
        result.receiverDomain = (await getFavoriteDomain(bonfidaConnection, receiverDomainKey)).reverse
        if(!result.receiverDomain) {
            const domains = await getAllDomains(bonfidaConnection, receiverDomainKey);
            result.receiverDomain = await reverseLookup(bonfidaConnection, domains[0]);
        }

        if(result.receiverDomain){
            const recordV2Key = await getRecordV2(bonfidaConnection, result.receiverDomain, Record.Pic);
            const dataString = (recordV2Key.retrievedRecord.data.toString());
            const picUrl = dataString.substring(dataString.indexOf('http'))
            result.receiverImageUrl = picUrl;
        }
    } catch (error) {
        //do nothing
    }

    return result;

  } catch (error) {
    console.error('Error fetching transaction data:', error);
  }
}