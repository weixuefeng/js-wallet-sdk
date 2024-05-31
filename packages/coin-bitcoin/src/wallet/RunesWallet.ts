import {RuneMainWallet} from "./RuneMainWallet"; 
import {BtcXrcTypes} from "../common";  
import * as bitcoin from "../index"


export class RunesWallet extends RuneMainWallet {

    buildParamsForTranferring(senderAddr: string, receiverAddr: string, runeId: string, transferAmount: string, runeUtxos: UtxoInfo[], btcUtxos: UtxoInfo[], feeRate: number) : { [key: string] : any } {
        const SEQUENCE = 0xfffffffd; // ENABLED FOR RBF
        let toAmount = BigInt(transferAmount);  
        let inputRuneList = [];
        let outputRuneList = [];
        for (let k = 0; k < runeUtxos.length; k++) {
            let utxo = runeUtxos[k] as any;
            if (utxo.runes && utxo.runes.length > 0) {
                let rune = utxo.runes[0];
                let balance = BigInt(rune.amount);
                if (utxo.runes.length == 1 && rune.runeid == runeId && balance >= toAmount) {  
                    inputRuneList.push({ 
                        txId: utxo.txId, 
                        vOut: utxo.vOut,
                        amount: utxo.amount,
                        address: senderAddr,
                        data: [{"id": runeId, "amount": balance.toString()}],
                        sequence: SEQUENCE, 
                    });
                    outputRuneList.push({  
                        amount: 546,
                        address: receiverAddr,
                        data: {"id": runeId, "amount": toAmount.toString()}
                    });
                    if (balance > toAmount) { 
                        outputRuneList.push({  
                            amount: 546,
                            address: senderAddr,
                            data: {"id": runeId, "amount": (balance - toAmount).toString()} 
                        });
                    } 
                    break;
                } else if (utxo.runes.length > 1) {
                    throw new Error("The data runes is too long!");
                }
            } else {
                throw new Error("No runes asset found!");
            }
        }
        if (inputRuneList && inputRuneList.length == 0) {
            let cumulativeAmount = BigInt(0);
            for (let m = 0; m < runeUtxos.length; m++) {
                let e = runeUtxos[m] as any;
                if (e.runes && e.runes.length > 0) {
                    let rune = e.runes[0];
                    let balance = BigInt(rune.amount);
                    if (rune.runeid == runeId) {
                        if (toAmount >= cumulativeAmount) {
                            cumulativeAmount += balance;
                            inputRuneList.push({ 
                                txId: e.txId, 
                                vOut: e.vOut,
                                amount: e.amount,
                                address: senderAddr,
                                data: [{"id": runeId, "amount": balance.toString()}],
                                sequence: SEQUENCE, 
                            });
                        } else { 
                            outputRuneList.push({  
                                amount: 546,
                                address: receiverAddr,
                                data: {"id": runeId, "amount": toAmount.toString()} 
                            });
                            if (cumulativeAmount > toAmount) { 
                                outputRuneList.push({  
                                    amount: 546,
                                    address: senderAddr,
                                    data: {"id": runeId, "amount": (cumulativeAmount - toAmount).toString()}
                                });
                            } 
                            break;
                        }
                    }
                }
            }
        }
        let params: any = { 
            inputs: inputRuneList,
            outputs: outputRuneList,
            address: senderAddr,
            feePerB: feeRate, 
        };  
        let cumulativeAmount = 0;
        for (let i = 0; i < btcUtxos.length; i++) {
            let utxo = btcUtxos[i];
            let amount = Number(utxo.amount);
            if (amount < 800) continue; // DUST
            cumulativeAmount += amount;
            params.inputs.push({ 
                txId: utxo.txId,
                vOut: utxo.vOut,
                amount: amount,
                address: senderAddr, 
                sequence: SEQUENCE, 
            });
            try {
                const networkFee = bitcoin.estimateBtcFee(params, this.network());
                if (cumulativeAmount > networkFee) {
                    break;
                }
            } catch (e) {

            }
        }
        params.type = BtcXrcTypes.RUNEMAIN;
        params.runeData = {
            "etching": null,
            "burn": false
        };
        return params;
    }

    // buildMintingParams(from: string, to: string, runeId: string, amountToMint: string, timeOfRepetition: number, gasUtxos: UtxoInfo[], feeRate: number) { 

    // } 

    // buildEtchingParams(from: string, runeInfo: EtchRuneInfo, gasUtxos: UtxoInfo[], feeRate: number) { 
        
    // }
}


export interface UtxoInfo {
    txId: String; 
    vOut: Number;
    amount: Number; 
}

