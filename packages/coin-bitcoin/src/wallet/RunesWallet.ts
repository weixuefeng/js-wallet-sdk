import { AddressUserToSignInput, PublicKeyUserToSignInput, SignPsbtOptions, ToSignInput, UnspentOutput, txHelpers, utils } from '@unisat/wallet-sdk';
import { toPsbtNetwork } from '@unisat/wallet-sdk/lib/network';
import { SimpleKeyring }  from '@unisat/wallet-sdk/lib/keyring';
import bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import ecc from "tiny-secp256k1";
import { scriptPkToAddress } from '@unisat/wallet-sdk/lib/address';

export class RunesWallet { 

  /* Full code example:

    let fromWIF = "Your WIF string here"
    let from = "bc1pd4yu86vqspf7eg46na440lq9864vm8xkyvz4hwuk2v7uqgr255ysz8xhye"
    let fromPubKey = "03dd234c2b489178ec60475b04b6c9572e5873abf2fcd1039cac2372d64540aea6"
    let to = "1NMXVLbqFurzXUNKy9G9Xsw6X92Vs8zMwM" 

    let runeid = "842456:2416"
    let runeAmount = "1000"
    let feeRate = 20

    let assetUtxos = [
      {
        "addressType": 2,  // AddressType
        "satoshis": 546,
        "scriptPk":"51206d49c3e9808053eca2ba9f6b57fc053eaacd9cd623055bbb96533dc0206aa509",
        "txid":"36cce9cc8783a2194258243e90d53fc818493a6bf5c0610ca5fabd50472290ef",
        "vout":1,
        "runes":[
          {
            "rune":"RUNESMUSKBITCOIN",
            "runeid":"842456:2416",
            "spacedRune":"RUNES•MUSK•BITCOIN",
            "amount":"7000",
            "symbol":"M",
            "divisibility":0
          }
        ],
        "pubkey":"03dd234c2b489178ec60475b04b6c9572e5873abf2fcd1039cac2372d64540aea6"
      }
    ]
    let btcUtxos = [
      {
        "addressType":2, // AddressType
        "txid":"36cce9cc8783a2194258243e90d53fc818493a6bf5c0610ca5fabd50472290ef",
        "vout":3,
        "satoshis":191012,
        "scriptPk":"51206d49c3e9808053eca2ba9f6b57fc053eaacd9cd623055bbb96533dc0206aa509",
        "pubkey":"03dd234c2b489178ec60475b04b6c9572e5873abf2fcd1039cac2372d64540aea6",
      }
    ]

    let _runes = new RunesWallet();
    let r = await _runes.transfer(
      fromWIF,
      from,
      fromPubKey,
      to,
      runeid,
      runeAmount,
      feeRate,
      assetUtxos, 
      btcUtxos)

    console.log(r)
    // output: { rawTxHex: '0200000......', fee: 3738, feeRate: 20 }
  */
  async transfer(
    wif: string, 
    from: string, 
    fromPubKey: string, 
    to: string, 
    runeid: string, 
    runeAmount: string, 
    feeRate: number,
    assetUtxos: UnspentOutput[], 
    btcUtxos: UnspentOutput[]
  ) {
      let privateKey = this.getPrivateKeyByWIF(wif);
      const networkType = 0; // mainnet 
      const enableRBF = true; 

      assetUtxos = assetUtxos.map((v) => Object.assign(v, { inscriptions: [], atomicals: [] }) ); 
      btcUtxos = btcUtxos.map((v) => Object.assign(v, { inscriptions: [], atomicals: [] }) ); 

      const _assetUtxos = [];
      let total = BigInt(0);
      for (let i = 0; i < assetUtxos.length; i++) {
        const v = assetUtxos[i];
        v.runes?.forEach((r) => {
          if (r.runeid == runeid) {
            total = total + BigInt(r.amount);
          }
        });
        _assetUtxos.push(v);
        if (total >= BigInt(runeAmount)) {
          break;
        }
      }
      assetUtxos = _assetUtxos;
    
      let outputValue = 546 
    
      let { psbt, toSignInputs } = await txHelpers.sendRunes({
        assetUtxos,
        assetAddress: from,
        btcUtxos,
        btcAddress: from,
        toAddress: to,
        networkType,
        feeRate,
        enableRBF,
        runeid,
        runeAmount,
        outputValue
      });
    
      let autoFinalized = true;

      if (!toSignInputs) {
        // Compatibility with legacy code.
        toSignInputs = await this.formatOptionsToSignInputs(fromPubKey, from, psbt); 
      }

      const psbtNetwork = toPsbtNetwork(networkType)

      let addrType = this.getAddressType(from);
      psbt.data.inputs.forEach((v, index) => {
        const isNotSigned = !(v.finalScriptSig || v.finalScriptWitness);
        const isP2TR = addrType === this.AddressType.P2TR;
        const lostInternalPubkey = !v.tapInternalKey;
        // Special measures taken for compatibility with certain applications.
        if (isNotSigned && isP2TR && lostInternalPubkey) {
          const tapInternalKey = utils.toXOnly(Buffer.from(fromPubKey, 'hex'));
          const { output } = bitcoin.payments.p2tr({
            internalPubkey: tapInternalKey,
            network: psbtNetwork
          });
          if (v.witnessUtxo?.script.toString('hex') == output?.toString('hex')) {
            v.tapInternalKey = tapInternalKey;
          }
        }
      });

      let _keyring = new SimpleKeyring([privateKey]);
      let psbt1 = await _keyring.signTransaction(psbt, toSignInputs);
      if (autoFinalized) {
        toSignInputs.forEach((v) => {
          // psbt.validateSignaturesOfInput(v.index, validator);
          psbt.finalizeInput(v.index);
        });
      }  
      let rawTxHex = psbt1.extractTransaction().toHex();
      let fee = psbt1.getFee();
      return {rawTxHex, fee, feeRate};
  }


  async formatOptionsToSignInputs(pubkey: string, fromAddr: string, _psbt: string | bitcoin.Psbt, options?: SignPsbtOptions) {
    let toSignInputs: ToSignInput[] = [];
    if (options && options.toSignInputs) {
      // We expect userToSignInputs objects to be similar to ToSignInput interface,
      // but we allow address to be specified in addition to publicKey for convenience.
      toSignInputs = options.toSignInputs.map((input) => {
        const index = Number(input.index);
        if (isNaN(index)) throw new Error('invalid index in toSignInput');

        if (!(input as AddressUserToSignInput).address && !(input as PublicKeyUserToSignInput).publicKey) {
          throw new Error('no address or public key in toSignInput');
        }

        if ((input as AddressUserToSignInput).address && (input as AddressUserToSignInput).address != fromAddr) {
          throw new Error('invalid address in toSignInput');
        }

        if (
          (input as PublicKeyUserToSignInput).publicKey &&
          (input as PublicKeyUserToSignInput).publicKey != pubkey
        ) {
          throw new Error('invalid public key in toSignInput');
        }

        const sighashTypes = input.sighashTypes?.map(Number);
        if (sighashTypes?.some(isNaN)) throw new Error('invalid sighash type in toSignInput');

        return {
          index,
          publicKey: pubkey,
          sighashTypes,
          disableTweakSigner: input.disableTweakSigner
        };
      });
    } else {
      const networkType = 0; // MAINNET
      const psbtNetwork = toPsbtNetwork(networkType);

      const psbt =
        typeof _psbt === 'string'
          ? bitcoin.Psbt.fromHex(_psbt as string, { network: psbtNetwork })
          : (_psbt as bitcoin.Psbt);
      psbt.data.inputs.forEach((v, index) => {
        let script: any = null;
        let value = 0;
        if (v.witnessUtxo) {
          script = v.witnessUtxo.script;
          value = v.witnessUtxo.value;
        } else if (v.nonWitnessUtxo) {
          const tx = bitcoin.Transaction.fromBuffer(v.nonWitnessUtxo);
          const output = tx.outs[psbt.txInputs[index].index];
          script = output.script;
          value = output.value;
        }
        const isSigned = v.finalScriptSig || v.finalScriptWitness;
        if (script && !isSigned) {
          const address = scriptPkToAddress(script, networkType);
          if (fromAddr === address) {
            toSignInputs.push({
              index,
              publicKey: pubkey,
              sighashTypes: v.sighashType ? [v.sighashType] : undefined
            });
          }
        }
      });
    }
    return toSignInputs;
  }

  getAddressType(addr: string) {
    if (addr.startsWith("1")) return this.AddressType.P2PKH;
    if (addr.startsWith("bc1")) return this.AddressType.P2WPKH;
    if (addr.startsWith("bc1p")) return this.AddressType.P2TR;
    if (addr.startsWith("3")) return this.AddressType.P2SH_P2WPKH;
  }

  getPrivateKeyByWIF(wif: string) : string | undefined {
    const ECPair = ECPairFactory(ecc); 
    const keyPair = ECPair.fromWIF(wif, bitcoin.networks.bitcoin);   
    return keyPair.privateKey?.toString("hex"); 
  }

  // Correspondant à AddressType dans @unisat/wallet-sdk
  AddressType = {
    P2PKH : 0,       // p2pkh, legacy
    P2WPKH : 1,      // p2wpkh, Native Segwit
    P2TR : 2,        // Taproot, P2TR
    P2SH_P2WPKH : 3  // p2sh, Nested Segwit
  }
  
}
