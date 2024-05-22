import {RuneMainWallet} from "./RuneMainWallet"; 
import {BtcXrcTypes} from "../common"; 


export class RunesWallet extends RuneMainWallet {

    buildTxParams(senderAddr: string, receiverAddr: string, runeId: string, runeBalance: string, transferAmount: string, runeUtxo: UtxoInfo, gasUtxos: UtxoInfo[], feeRate: number) : { [key: string] : any } {
        let remaining = parseInt(runeBalance) - parseInt(transferAmount);
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
        for (let i = 0; i < gasUtxos.length; i++) {
            let utxo = gasUtxos[i];
            params.inputs.push({ 
                txId: utxo.txId,
                vOut: utxo.vOut,
                amount: utxo.amount,
                address: utxo.address,
            });
        }
        return params;
    }

    /*  
        Example:
            let from = "bc1pd4yu86vqspf7eg46na440lq9864vm8xkyvz4hwuk2v7uqgr255ysz8xhye"
            let to = "bc1pd4yu86vqspf7eg46na440lq9864vm8xkyvz4hwuk2v7uqgr255ysz8xhye"
            let runeId = "840603:4236"
            let amountToMint = "100"
            let timeOfRepetition = 3;
            let gasUtxos = [
                {
                    txId: "590f384a602247548ce3dc63b8fe1d5f58dfd962134f5a973d544b774f881940", 
                    vOut: 1,
                    amount: 3504, 
                    address: "bc1pd4yu86vqspf7eg46na440lq9864vm8xkyvz4hwuk2v7uqgr255ysz8xhye"
                },
                ......
            ]
            let feeRate = 35;
            this.buildMintingParams(from, to, runeId, amountToMint, timeOfRepetition, gasUtxos, feeRate);
    */
    buildMintingParams(from: string, to: string, runeId: string, amountToMint: string, timeOfRepetition: number, gasUtxos: UtxoInfo[], feeRate: number) { 
        let params: any = {
            type: BtcXrcTypes.RUNE,
            inputs: [],
            outputs: [],
            address: from,
            feePerB: feeRate,
            runeData: {
                "etching": null,
                "burn": false
            }
        };  
        for (let i = 0; i < gasUtxos.length; i++) {
            let utxo = gasUtxos[i];
            params.inputs.push({ 
                txId: utxo.txId,
                vOut: utxo.vOut,
                amount: utxo.amount,
                address: utxo.address,
            });
        }
        for (let k = 0; k < timeOfRepetition; k++) {
            params.outputs.push({ 
                address: to,
                amount: 546,
                data: {"id": runeId, "amount": amountToMint} 
            });
        }
        return params;
    } 


    /*  
        Example:
            let from = "bc1pd4yu86vqspf7eg46na440lq9864vm8xkyvz4hwuk2v7uqgr255ysz8xhye"
            let runeInfo = {
                spacedRune: "RUNES•WALLET•PRO",  
                supply: "10000",
                amountPerMint: "100"
            }
            let gasUtxos = [
                {
                    txId: "61b83b1c87fd929d0a7335bb2a86d3f71f00419699b963e9a75df4e44cf50ae2", 
                    vOut: 1,
                    amount: 123456, 
                    address: "bc1pd4yu86vqspf7eg46na440lq9864vm8xkyvz4hwuk2v7uqgr255ysz8xhye"
                },
                ......
            ]
            let feeRate = 165;
            this.buildEtchingParams(from, runeInfo, gasUtxos, feeRate);
    */
    buildEtchingParams(from: string, runeInfo: EtchRuneInfo, gasUtxos: UtxoInfo[], feeRate: number) { 
        let spacers = "•";
        let rune = runeInfo.spacedRune.replace(spacers, "");
        var symbol = runeInfo.symbol;
        if (!runeInfo.symbol) {
            symbol = rune.substring(0, 1).toUpperCase();
        }
        let params: any = {
          type: BtcXrcTypes.RUNE,
          inputs: [],
          outputs: [],
          address: from,
          feePerB: feeRate,
          runeData: {
              "etching": { 
                "spacedRune": runeInfo.spacedRune,
                "divisibility": 0,
                "symbol": symbol, 
                "premine": "0",
                "rune": rune,
                "spacers": spacers,
                "terms": {
                  "cap": runeInfo.supply,
                  "height": [null, null],
                  "amount": runeInfo.amountPerMint, 
                }
              },
              "burn": false
          }
        };
        for (let i = 0; i < gasUtxos.length; i++) {
            let utxo = gasUtxos[i];
            params.inputs.push({ 
                txId: utxo.txId,
                vOut: utxo.vOut,
                amount: utxo.amount,
                address: utxo.address,
            });
        }
        return params;  
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
