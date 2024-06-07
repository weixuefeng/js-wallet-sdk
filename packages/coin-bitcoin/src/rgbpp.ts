
import {
    Collector,
    genBtcTransferCkbVirtualTx,
    BtcJumpCkbVirtualTxResult,
    BtcTransferVirtualTxResult,
    genBtcJumpCkbVirtualTx,
    getXudtTypeScript,
    leToU128
} from '@rgbpp-sdk/ckb';
import {
    sendRgbppUtxos, DataSource, ECPair, bitcoin, NetworkType,
    tweakSigner
} from '@rgbpp-sdk/btc';
import { BtcAssetsApi, BtcAssetsApiError } from '@rgbpp-sdk/service';
import { blockchain, bytes } from '@ckb-lumos/lumos/codec';
import { serializeScript } from '@nervosnetwork/ckb-sdk-utils';

export const getCollector = (isMainnet: boolean) => {
    const collector = new Collector({
        ckbNodeUrl: isMainnet ? "https://api.bitstack.com/v1/0x3fUpL6bfQiybois33AustWo6LO3Lg5/fWVZIbSSVcIJBQCW7PN8rlIPnZUBKst8/CKB/mainnet" : 'https://testnet.ckb.dev/rpc',
        ckbIndexerUrl: isMainnet ? 'https://api.bitstack.com/v1/0x3fUpL6bfQiybois33AustWo6LO3Lg5/fWVZIbSSVcIJBQCW7PN8rlIPnZUBKst8/CKB/mainnet' : 'https://testnet.ckb.dev/indexer',
    });
    return collector
};

export const getRGBPlusPlusApi = (isMainnet: boolean) => {

    
    const API_ROOT_Product = "https://dapp.gateio.services/web3-bdm";
    const API_ROOT_Pre_Product = "https://pre-dapp.gateio.services/web3-bdm";
    const API_ROOT_Test = "https://web3-dapp-test.gatebigp.com";
    const mainnetProBtcAseetApiConfig = {
        url: `${API_ROOT_Product}/web3-api/v1/defi/ckb`,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZ2F0ZS13YWxsZXRwcF9uYW1lIiwiYXVkIjoiZ2F0ZS5pbyIsImp0aSI6ImZkNzU0ZDhiLTMzMDQtNDZiOS04NmZmLWY2Zjk3NThkMmNlMyIsImlhdCI6MTcxNjI3Mzk0MX0.ncvrfVZDnYWphpJ9ADOgYywmFyDUAolOzgozu17IrGE',
        origin: 'https://gate.io'
    };
    const mainNetOfficialBtcAseetApiConfig = {
        url: 'https://api.rgbpp.io',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZ2F0ZS13YWxsZXRwcF9uYW1lIiwiYXVkIjoiZ2F0ZS5pbyIsImp0aSI6ImZkNzU0ZDhiLTMzMDQtNDZiOS04NmZmLWY2Zjk3NThkMmNlMyIsImlhdCI6MTcxNjI3Mzk0MX0.ncvrfVZDnYWphpJ9ADOgYywmFyDUAolOzgozu17IrGE',
        origin: 'https://gate.io'
    };
    const testnetBtcAseetApiConfig = {
        url: 'https:btc-assets-api.testnet.mibao.pro',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJteS1hcHAiLCJhdWQiOiJidGMtYXNzZXRzLWFwaS50ZXN0bmV0Lm1pYmFvLnBybyIsImp0aSI6IjVjOWE5YzUzLTRmZjQtNDEyYi1iZTU0LTZmYTMzMmNiZjk2YSIsImlhdCI6MTcxMzQyNzgyOH0.9awJlqeh2l6XuW4eJ1OA0zccAaTcHY4iVftofB068Qk',
        origin: 'https:btc-assets-api.testnet.mibao.pro'
    };

    const config = isMainnet ? mainnetProBtcAseetApiConfig : testnetBtcAseetApiConfig;
    const api = BtcAssetsApi.fromToken(config.url, config.token, config.origin);
    return api
};


interface BuildRgbppPsbtTxPlanParams {
    from: string,
    toAddress: string,
    transferAmount: bigint,
    // ckbPrivateKey: string;
    isMainnet: boolean,
    xudtType: CKBScript,
    // xudtTypeArgs: string,
    // xudtTypeCodeHash: string,
    feeRate: number,
    /// 1000
    minUtxoSatoshi: number,
    fromPubkey: string | undefined
}

export interface CKBScript {
    codeHash: string;
    hashType: string;
    args: string;
}

interface BuildRgbppSignPsbtTxParams extends BuildRgbppPsbtTxPlanParams {
    btcPrivateKey: string;
}

export const buildRgbppPsbtTxPlan = async ({ from, toAddress, transferAmount, isMainnet, xudtType, feeRate, minUtxoSatoshi,
    fromPubkey
}: BuildRgbppPsbtTxPlanParams) => {
    const collector = getCollector(isMainnet);
    const isL2Tx = !(toAddress.startsWith('ckb') || toAddress.startsWith('ckt'));

    const networkType = isMainnet ? NetworkType.MAINNET : NetworkType.TESTNET;
    const service = getRGBPlusPlusApi(isMainnet);
    const source = new DataSource(service, networkType);
    const typeScript =  bytes.hexify(blockchain.Script.pack(xudtType as CKBComponents.Script));
    const rgbppCells = await service.getRgbppAssetsByBtcAddress(from, {
        type_script: typeScript
    });

    // console.log(JSON.stringify(rgbppCells, null, 2));

    const rgbppLockArgsList: string[] = []
    let existRgbppAmount = BigInt(0);
    for (const rgbppCell of rgbppCells) {
        existRgbppAmount +=  leToU128(rgbppCell.data);
        rgbppLockArgsList.push(rgbppCell.cellOutput.lock.args);
        if (existRgbppAmount >= transferAmount) {
            break;
        }
    }

    if (existRgbppAmount < transferAmount) {
        throw Error('Insufficient RGB++ Asset balance');
    }

    const xudtTypeScript: CKBComponents.Script = {
        codeHash: xudtType.codeHash,
        hashType: xudtType.hashType as CKBComponents.ScriptHashType,
        args: xudtType.args,
    };


    let ckbVirtualTxResult: BtcJumpCkbVirtualTxResult | BtcTransferVirtualTxResult;
    if (isL2Tx) {
        ckbVirtualTxResult = await genBtcTransferCkbVirtualTx({
            collector,
            rgbppLockArgsList,
            xudtTypeBytes: serializeScript(xudtTypeScript),
            transferAmount,
            isMainnet
        });
    } else {
        ckbVirtualTxResult = await genBtcJumpCkbVirtualTx({
            collector,
            rgbppLockArgsList,
            xudtTypeBytes: serializeScript(xudtTypeScript),
            transferAmount,
            toCkbAddress: toAddress,
            isMainnet,
        });
    }
    const { commitment, ckbRawTx, needPaymasterCell } = ckbVirtualTxResult;
    const tos = isL2Tx ? [toAddress] : [from];

    let pubkey = fromPubkey;
    if (pubkey != null && !pubkey.startsWith('0x')) {
        pubkey = `0x${pubkey}`;
    }
    // Send BTC tx
    const psbt = await sendRgbppUtxos({
        ckbVirtualTx: ckbRawTx,
        // paymaster: paymaster,
        commitment,
        tos: tos,
        ckbCollector: collector,
        from: from,
        source,
        feeRate: feeRate,
        minUtxoSatoshi: minUtxoSatoshi,
        rgbppMinUtxoSatoshi: 546,
        fromPubkey: pubkey,
        onlyConfirmedUtxos: true
    });


    return { unsignedPsbt: psbt, ckbVirtualTxResult }
};
export const buildRgbppSignPsbtTx = async ({ from, toAddress, transferAmount, btcPrivateKey, isMainnet, xudtType, feeRate, minUtxoSatoshi}: BuildRgbppSignPsbtTxParams) => {

    const network = isMainnet ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
    const keyPair = ECPair.fromWIF(btcPrivateKey, network);
    const publicKey = "0x" + keyPair.publicKey.toString('hex');
    const { unsignedPsbt, ckbVirtualTxResult } = await buildRgbppPsbtTxPlan({ from, toAddress, transferAmount, isMainnet, xudtType, feeRate, minUtxoSatoshi, fromPubkey: publicKey })
    if (from.startsWith("bc1p")) {
        const tweakedSigner = tweakSigner(keyPair, {
            network,
        });
        unsignedPsbt.signAllInputs(tweakedSigner);
    } else {
        unsignedPsbt.signAllInputs(keyPair);
    }
    unsignedPsbt.finalizeAllInputs();
    const signedPsbt = unsignedPsbt
    return { signedPsbt: signedPsbt, ckbVirtualTxResult }

};