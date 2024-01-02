import {
    KeyType,
    WaxWallet,
    getNewAddress,
    createAccount,
    toAssetString,
    transfer,
    stringToPrivateKey,
    privateKeyToLegacyString,
    stringToPublicKey,
    publicKeyToString,
    publicKeyToLegacyString,
    signMessage,
    verifySignature,
} from '../src';
import {base, signUtil} from '@okxweb3/crypto-lib';

describe("wax", () => {
    test('private key', async () => {
        let wallet = new WaxWallet()
        let key = await wallet.getRandomPrivateKey()
        console.log(key)
    })

    test("address", async () => {
        const privateKey = stringToPrivateKey("5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj")
        console.info(privateKey)

        const result = privateKeyToLegacyString(privateKey)
        console.info(result)

        const publicKey = stringToPublicKey("EOS6sWWrSmaagPSxyvrqBKNd4Ta91PGbNVhG9oMK9kNwwzxpDuusu")
        console.info(publicKey)

        const result2 = publicKeyToLegacyString(publicKey)
        console.info(result2)
    });

    test('getAmountString WAX', async () => {
        let wallet = new WaxWallet()

        let amount = await wallet.getAmountString("12345678")
        expect(amount).toBe("0.12345678 WAX")

        amount = await wallet.getAmountString("12345678", undefined, undefined)
        expect(amount).toBe("0.12345678 WAX")

        amount = await wallet.getAmountString("12345678", 6, "WAXTOKEN")
        expect(amount).toBe("12.345678 WAXTOKEN")
    })

    test("transferToken2", async () => {
        const t = transfer({
            from: "account1",
            to: "account2",
            amount: toAssetString(100000000, 8, "WAX"),
            memo: "test",
            common: {
                chainId: "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
                privateKey: ["5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj"],
                compression: true,
                refBlockNumber: 161052609,
                refBlockId: "099977c1eecfd285461732ac745468341af6db935638dba8927dc525af6b0ad0",
                refBlockTimestamp: "2022-06-28T08:55:09.500",
                expireSeconds: 600
            }
        })
        // {"signatures":["SIG_K1_K8vqJQTdrV6ohsdZTCVoE1NrrSrf9ivVV28DrQSTeraxuiGnCabLgJjKUgkQZWQrXtBR9Qv83css6EeiEd4BRpDJsPBAc6"],"compression":true,"packed_context_free_data":"78DA030000000001","packed_trx":"78DA733BB22BE960B99BB8D11A0620606458D664C2FCCA2014C80ED7B5397B9631E084C0C14833DFDF20D9156F8D8C14E1022FA1F4C3AFAC20498E70C70806300000869F19C2"}
        console.info(JSON.stringify(t))

        const t2 = transfer({
            from: "account1",
            to: "account2",
            amount: toAssetString(500000000, 8, "WAX"),
            memo: "test",
            common: {
                chainId: "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
                privateKey: ["5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj"],
                compression: true,
                refBlockNumber: 161087501,
                refBlockId: "099a000daf6df26a8ef6e3d34340b92d35bd939b34f4b000b69f91a091801abe",
                refBlockTimestamp: "2022-06-28T13:45:57.000",
                expireSeconds: 600
            }
        })
        // {"signatures":["SIG_K1_JxPHx6GA3Ju5SfADJNMhFoZa6VUyseMmQWGD5b1fEZJRk7ZU8eW1WjT2LN9RDYnoN7dPqdNTk6sLTHqnWB5QHsER7uMpSw"],"compression":true,"packed_context_free_data":"78DA030000000001","packed_trx":"78DACBE5D89DC4CBD0F7EDF1650620606458D664C2FCCA2014C80ED7B5397B9631E084C0C14833DFDF20D9156F8D8C146102024E1C1089D4B3B220498E70C7080630000079C918D7"}
        console.info(JSON.stringify(t2))

        const t3 = transfer({
            from: "account2",
            to: "account1",
            memo: "test",
            amount: toAssetString(100000000, 8, "WAX"),
            common: {
                chainId: "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
                privateKey: ["5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj"],
                compression: true,
                refBlockNumber: 161087501,
                refBlockId: "099a000daf6df26a8ef6e3d34340b92d35bd939b34f4b000b69f91a091801abe",
                refBlockTimestamp: "2022-06-28T13:45:57.000",
                expireSeconds: 600
            }
        })
        console.info(JSON.stringify(t3))
    });

    // creator: AccountName
    // newAccount: AccountName
    // pubKey: string
    // buyRam: BuyRAMParam
    // delegate: DelegateParam
    test("createAccount", async () => {
        const newPrivateKey = base.fromHex("7f90612a7214632cfed0daee44cc9c8d2cfac8d6968976841d07b1b2596ab109")
        const publicKey = signUtil.secp256k1.publicKeyCreate(newPrivateKey, true)

        const legacyKey = privateKeyToLegacyString({type: KeyType.k1, data: newPrivateKey})
        console.info(legacyKey)

        const account1 = "account1"
        const account2 = "account2"
        const t = createAccount({
            creator: account1,
            newAccount: account2,
            pubKey: publicKeyToString({
                type: KeyType.k1,
                data: publicKey,
            }),
            buyRam: {
                payer: account1,
                receiver: account2,
                quantity: toAssetString(100000000, 8, "WAX"),
            },
            delegate: {
                from: account1,
                receiver: account2,
                stakeNet: toAssetString(100000000, 8, "WAX"),
                stakeCPU: toAssetString(100000000, 8, "WAX"),
                transfer: false
            },
            common: {
                chainId: "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
                privateKey: ["5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj"],
                compression: true,
                refBlockNumber: 161086853,
                refBlockId: "0999fd853cc7e589c975e2555f4245de6bdf6ca5c9edba265ca2d599139b04c4",
                refBlockTimestamp: "2022-06-28T13:40:34.000",
                expireSeconds: 600
            }
        })
        // {"signatures":["SIG_K1_Keig1AyTVeNbGmLvS3N46goCakypBLyA6D9mioFmSkTD1QExiYdksGnZG4MRPCkKYTk8ffgkoCPjAfF6uwWUFWDPJXKffd"],"compression":true,"packed_context_free_data":"78DA030000000001","packed_trx":"78DAD362DF9DD4FAF764E9A35006206006110CAF0C42191CE6CD524AD9318B31E084C0C14833DFDF20F1156F8D8CD26002024E1C609A1128C1C8C0B43AE4AAC88B9063DBAF369DF99B681367B69669B9DD7EF67B1F9CD73B7C9CF2FAC4218832A295C2DDC160AF25BD6C9117863B0CD1DDC1F0F02B2B489223DC3102AC1B9D8F309281C1A378AF1D86910A048D0400549763BC"}
        console.info(JSON.stringify(t))
    });

    test("getNewAddress", async () => {
        const account1 = "account1"
        const account2 = "account2"
        const t = getNewAddress(account1,
            account2,
            "5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj",
            100000000,
            100000000,
            100000000,
            false,
            8,
            "WAX",
            {
                chainId: "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
                privateKey: ["5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj"],
                compression: true,
                refBlockNumber: 161086853,
                refBlockId: "0999fd853cc7e589c975e2555f4245de6bdf6ca5c9edba265ca2d599139b04c4",
                refBlockTimestamp: "2022-06-28T13:40:34.000",
                expireSeconds: 600
            })
        console.info(JSON.stringify(t))
    });

    test("signMessage", async () => {
        const sig = signMessage(
            "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
            "5KXHUFNZGMsNEFzzrCis1RJdtg5wjL941a1vAwAjmgHEektrZBj",
            "0x1234")
        console.info(sig)

        const pub = verifySignature(
            "f16b1833c747c43682f4386fca9cbb327929334a762755ebec17f6f23c9b8a12",
            sig,
            "0x1234")
        console.info(pub)
        expect(pub).toStrictEqual("EOS5uHXgWKzQExL2Lhu9y8716B4dkYL4T6oUq8J9FrY6EDB79naYF")
    });
});
