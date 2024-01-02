import * as bitcoin from '../src';
import {TBtcWallet, InscribeTxs, InscriptionData, PrevOutput, srcInscribe, SrcInscriptionRequest} from "../src";

describe('src20 test', () => {

    test("src20 inscribe", async () => {
        let network = bitcoin.networks.testnet;
        let privateKey = "cPnvkvUYyHcSSS26iD1dkrJdV7k1RoUqJLhn3CYxpo398PdLVE22"

        const commitTxPrevOutputList: PrevOutput[] = [];
        commitTxPrevOutputList.push({
            txId: "c865cd4dc206ccdaf1cff0fad4f0272f2075af5c975c670debbf8d56045391ad",
            vOut: 3,
            amount: 202000,
            address: "2NF33rckfiQTiE5Guk5ufUdwms8PgmtnEdc",
            privateKey: privateKey,
        });
        const inscriptionData: InscriptionData = {
            contentType: "stamp:",
            body: '{"p":"src-20","op":"deploy","tick":"coder","max":"21000000","lim":"1000","dec":"8"}',
            revealAddr: "2NF33rckfiQTiE5Guk5ufUdwms8PgmtnEdc",
        }
        const request: SrcInscriptionRequest = {
            commitTxPrevOutputList,
            commitFeeRate: 100,
            revealOutValue: 790,
            inscriptionData,
            changeAddress: "2NF33rckfiQTiE5Guk5ufUdwms8PgmtnEdc",
        };

        const txs: InscribeTxs = srcInscribe(network, request);
        console.log(JSON.stringify(txs));
        expect(txs.commitTxFee).toEqual(39400)
        expect(txs.revealTxs.length).toEqual(0)
        expect(txs.commitTx).toEqual('02000000000101ad915304568dbfeb0d675c975caf75202f27f0d4faf0cff1dacc06c24dcd65c803000000171600145c005c5532ce810ddf20f9d1d939631b47089ecdfdffffff04160300000000000017a914ef05515a0595d15eaf90d9f62fb85873a6d8c0b4871603000000000000695121034a54cfbca897d6e5bd94c8b03e0524e9849b8d5f19ac6eb79ec78ea402271d002102651491c55c5a27dc6838d312ca9e9350ae2cbdc02f4903bf0fcbf87ffc9096002102020202020202020202020202020202020202020202020202020202020202020253ae160300000000000069512103a964c52310e9976582c01d9705c7308949173d7e571df1e244ceb348b54a850021024a4637e826e37fb67470f97bcd954a0b5a4e20ef37d16f5b5d64cbc58081b8002102020202020202020202020202020202020202020202020202020202020202020253aee67102000000000017a914ef05515a0595d15eaf90d9f62fb85873a6d8c0b48702483045022100b003afdc1a22875686207bdd60d187f805bfa6823c533dd2f3b74bf59c7e6fa80220412bfc1d34e8f8d8e94d847b5ff951bf7b7062f3932a40c46953c8c88628430501210357bbb2d4a9cb8a2357633f201b9c518c2795ded682b7913c6beef3fe23bd6d2f00000000')
    });


    test("src20 deploy inscribe", async () => {
        let wallet = new TBtcWallet()

        let network = bitcoin.networks.testnet;
        let privateKey = "cPnvkvUYyHcSSS26iD1dkrJdV7k1RoUqJLhn3CYxpo398PdLVE22"

        const commitTxPrevOutputList: PrevOutput[] = [];
        commitTxPrevOutputList.push({
            txId: "c865cd4dc206ccdaf1cff0fad4f0272f2075af5c975c670debbf8d56045391ad",
            vOut: 3,
            amount: 202000,
            address: "2NF33rckfiQTiE5Guk5ufUdwms8PgmtnEdc",
            privateKey: privateKey,
        });
        const inscriptionData: InscriptionData = {
            contentType: "stamp:",
            body: '{"p":"src-20","op":"deploy","tick":"coder","max":"21000000","lim":"1000","dec":"8"}',
            revealAddr: "2NF33rckfiQTiE5Guk5ufUdwms8PgmtnEdc",
        }

        const request = {
            commitTxPrevOutputList,
            commitFeeRate: 100,
            revealOutValue: 790,
            inscriptionData,
            changeAddress: "2NF33rckfiQTiE5Guk5ufUdwms8PgmtnEdc",
            type: 101,
        };

        const txs: InscribeTxs =await wallet.signTransaction({privateKey: privateKey, data: request});
        console.log(JSON.stringify(txs));
        expect(txs.commitTxFee).toEqual(39400)
        expect(txs.revealTxs.length).toEqual(0)
        expect(txs.commitTx).toEqual('02000000000101ad915304568dbfeb0d675c975caf75202f27f0d4faf0cff1dacc06c24dcd65c803000000171600145c005c5532ce810ddf20f9d1d939631b47089ecdfdffffff04160300000000000017a914ef05515a0595d15eaf90d9f62fb85873a6d8c0b4871603000000000000695121034a54cfbca897d6e5bd94c8b03e0524e9849b8d5f19ac6eb79ec78ea402271d002102651491c55c5a27dc6838d312ca9e9350ae2cbdc02f4903bf0fcbf87ffc9096002102020202020202020202020202020202020202020202020202020202020202020253ae160300000000000069512103a964c52310e9976582c01d9705c7308949173d7e571df1e244ceb348b54a850021024a4637e826e37fb67470f97bcd954a0b5a4e20ef37d16f5b5d64cbc58081b8002102020202020202020202020202020202020202020202020202020202020202020253aee67102000000000017a914ef05515a0595d15eaf90d9f62fb85873a6d8c0b48702483045022100b003afdc1a22875686207bdd60d187f805bfa6823c533dd2f3b74bf59c7e6fa80220412bfc1d34e8f8d8e94d847b5ff951bf7b7062f3932a40c46953c8c88628430501210357bbb2d4a9cb8a2357633f201b9c518c2795ded682b7913c6beef3fe23bd6d2f00000000')

    });
})
