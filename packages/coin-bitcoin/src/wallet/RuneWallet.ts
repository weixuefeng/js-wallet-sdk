import {cloneObject, SignTxParams} from "@okxweb3/coin-base";
import {BtcWallet} from "./BtcWallet";
import * as bitcoin from "../index"
import {networks, signBtc, utxoTx} from "../index"
import {buildRuneData} from "../rune";
import {BtcXrcTypes} from "../common";
import {base} from "@okxweb3/crypto-lib";

export class RuneWallet extends BtcWallet {

    convert2RuneTx(paramData: any): utxoTx {
        const clonedParamData = cloneObject(paramData)
        // Detects that the type of amount in data is converted to bigint
        for(let input of clonedParamData.inputs) {
            let dataArray = input.data;
            if (dataArray != null && dataArray instanceof Array) {
                for (let data of dataArray) {
                    if(typeof data["amount"] === "string") {
                        data["amount"] = BigInt(data["amount"]);
                    }
                }
            }
        }

        for(let output of clonedParamData.outputs) {
            let dataArray = output.data;
            if (dataArray != null && dataArray instanceof Array) {
                for (let data of dataArray) {
                    if(typeof data["amount"] === "string") {
                        data["amount"] = BigInt(data["amount"]);
                    }
                }
            }
        }

        // cal rune token input all amount
        let inputs = clonedParamData.inputs;
        const runeInputMap = new Map<string, bigint>();
        for (const input of inputs) {
            let dataArray = input.data;
            if (dataArray != null && dataArray instanceof Array) {
                for (const data of dataArray) {
                    let runeId: string = data["id"];
                    let runeAmount: bigint = BigInt(data["amount"]);
                    if (runeId == null || runeAmount == null) {
                        continue
                    }
                    let beforeAmount = runeInputMap.get(runeId);
                    if (beforeAmount == null) {
                        runeInputMap.set(runeId, runeAmount);
                    } else {
                        runeInputMap.set(runeId, (BigInt(beforeAmount) + BigInt(runeAmount)));
                    }
                }
            }
        }

        // cal rune output amount
        let outputs = clonedParamData.outputs;
        const runeSendMap = new Map<string, bigint>();
        for (const output of outputs) {
            let data = output.data;
            if (data != null) {
                let runeId: string = data["id"];
                let runeAmount: bigint = BigInt(data["amount"]);
                if (runeId == null || runeAmount == null) {
                    continue
                }
                let beforeAmount = runeSendMap.get(runeId);
                if (beforeAmount == null) {
                    runeSendMap.set(runeId, runeAmount);
                } else {
                    runeSendMap.set(runeId, (BigInt(beforeAmount) + BigInt(runeAmount)));
                }
            }
        }

        // where isChange ? if input > output yes, rune change put first output
        let isRuneChange = false;
        for (const id of runeInputMap.keys()) {
            let inputAmount = runeInputMap.get(id);
            let sendAmount = runeSendMap.get(id);
            if ((inputAmount != null && sendAmount != null && inputAmount > sendAmount) || (inputAmount != null && sendAmount == null)) {
                isRuneChange = true
            }
            isRuneChange = true //Phase I fix: always prepend rune change address to prevent unintended transfer
        }

        let outputIndex = 0;
        let updateOutputs = []
        if (isRuneChange) {
            // first output is rune change
            let runeChange = {
                address: clonedParamData.address,
                amount: 546
            }
            updateOutputs.push(runeChange)
            outputIndex++;
        }
        const typedEdicts: bitcoin.Edict[] = []
        for (const output of outputs) {
            let data = output.data;
            if (data != null) {
                let runeId: string = data["id"];
                let runeAmount: bigint = BigInt(data["amount"]);
                if (runeId == null || runeAmount == null) {
                    continue
                }
                const typedEdict: bitcoin.Edict = {
                    id: parseInt('0x' + runeId),
                    amount: BigInt(runeAmount),
                    output: outputIndex,
                }
                typedEdicts.push(typedEdict)
            }
            output.data = null
            updateOutputs.push(output)
            outputIndex++;
        }

        return {
            inputs: clonedParamData.inputs,
            // @ts-ignore
            outputs: updateOutputs,
            address: clonedParamData.address,
            feePerB: clonedParamData.feePerB,
            runeData: {
                edicts: typedEdicts,
                etching: clonedParamData.runeData!.etching,
                burn: clonedParamData.runeData!.burn
            },
        }
    }

    async signTransaction(param: SignTxParams): Promise<any> {
        const network = this.network()
        let txHex = null;
        try {
            const privateKey = param.privateKey;
            if (!param.data.runeData) {
                return Promise.reject("missing runeData");
            }
            const runeTx = this.convert2RuneTx(param.data);

            const opReturnOutput = this.getOpReturnOutput(network, runeTx.runeData!);
            runeTx.outputs.push(opReturnOutput as never)

            txHex = signBtc(runeTx, privateKey, network);
            return Promise.resolve(txHex);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    private getOpReturnOutput(network: bitcoin.Network, runeData: bitcoin.RuneData) {
        let isMainnet = false;
        if (networks.bitcoin === network) {
            isMainnet = true;
        }
        const opReturnScript = buildRuneData(isMainnet, runeData.edicts);
        const opReturnOutput = {address: '', amount: 0, omniScript: base.toHex(opReturnScript)};
        return opReturnOutput;
    }

    async estimateFee(param: SignTxParams): Promise<number> {
        try {
            if (!param.data.runeData) {
                return Promise.reject("missing runeData");
            }
            const runeTx = this.convert2RuneTx(param.data);
            const opReturnOutput = this.getOpReturnOutput(this.network(), runeTx.runeData!);
            runeTx.outputs.push(opReturnOutput as never)

            const fee = bitcoin.estimateBtcFee(runeTx, this.network());
            return Promise.resolve(fee);
        } catch (e) {
            return Promise.reject(e);
        }
    }

    buildTxParams(senderAddr: string, receiverAddr: string, runeId: string, runeBalance: string, transferAmount: string, runeUtxo: UtxoInfo, gasUtxos: UtxoInfo[], feeRate: number) : { [key: string] : any } {
        let remaining = parseInt(runeBalance) - parseInt(transferAmount);
        let params: any = {
            type: BtcXrcTypes.RUNE,
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

}

export class RuneTestWallet extends RuneWallet {
    network() {
        return bitcoin.networks.testnet;
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


