import {RuneMainWallet} from "./RuneMainWallet"; 
import {BtcXrcTypes} from "../common";  


export class RunesWallet extends RuneMainWallet {

    buildParamsForTranferring(senderAddr: string, receiverAddr: string, runeId: string, runeBalance: string, transferAmount: string, runeUtxo: UtxoInfo, btcUtxos: UtxoInfo[], feeRate: number) : { [key: string] : any } {
        let remaining = BigInt(runeBalance) - BigInt(transferAmount);
        let params: any = {
            type: BtcXrcTypes.RUNEMAIN,
            inputs: [ 
                { 
                    txId: runeUtxo.txId, 
                    vOut: runeUtxo.vOut,
                    amount: runeUtxo.amount,
                    address: runeUtxo.address,
                    data: [{"id": runeId, "amount": runeBalance}] 
                },  
            ],
            outputs: [
                { 
                    address: receiverAddr,
                    amount: 546,
                    data: {"id": runeId, "amount": transferAmount} 
                },
                { 
                    address: senderAddr,
                    amount: 546,
                    data: {"id": runeId, "amount": remaining.toString()} 
                },
            ],
            address: senderAddr,
            feePerB: feeRate,
            runeData: {
                "etching": null,
                "burn": false
            }
        };  
        for (let i = 0; i < btcUtxos.length; i++) {
            let utxo = btcUtxos[i];
            params.inputs.push({ 
                txId: utxo.txId,
                vOut: utxo.vOut,
                amount: utxo.amount,
                address: utxo.address,
            });
        }
        return params;
    }

    buildMintingParams(from: string, to: string, runeId: string, amountToMint: string, timeOfRepetition: number, gasUtxos: UtxoInfo[], feeRate: number) { 

    } 

    buildEtchingParams(from: string, runeInfo: EtchRuneInfo, gasUtxos: UtxoInfo[], feeRate: number) { 
        
    }
}


export interface UtxoInfo {
    txId: String; 
    vOut: Number;
    amount: Number;
    address: String; 
}

export interface EtchRuneInfo { 
    spacedRune: String; 
    symbol: String | null; 
    supply: String;
    amountPerMint: String;
}
