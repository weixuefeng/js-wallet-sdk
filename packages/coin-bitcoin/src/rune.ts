import * as bscript from './bitcoinjs-lib/script';
import {OPS} from './bitcoinjs-lib/ops';
import {Edict} from "./type";

function encode(n: bigint): Uint8Array {
    let payload: number[] = [];
    encodeToVec(n, payload);
    return new Uint8Array(payload);
}

function encodeToVec(n: bigint, payload: number[]): void {
    let i = 18;
    const out = new Array(19).fill(0);

    out[i] = Number(n & BigInt(0x7F));

    while (n > BigInt(0x7F)) {
        n = n / BigInt(128) - BigInt(1);
        i--;
        out[i] = Number(n & BigInt(0xFF)) | 0x80;
    }

    payload.push(...out.slice(i));
}

function decode(buffer: Uint8Array): [bigint, number] {
    let n = BigInt(0);
    let i = 0;

    while (true) {
        const b = BigInt(buffer[i]);

        if (b < BigInt(128)) {
            return [n + b, i + 1];
        }

        n += b - BigInt(127);
        n = n * BigInt(128);
        i++;

        if (i >= buffer.length) {
            throw new Error("Varint decoding error: buffer overflow");
        }
    }
}

export {encode as toVarInt, encodeToVec, decode as fromVarInt};

const TAG_BODY = BigInt(0)

export function buildRuneData(isMainnet: boolean, edicts: Edict[]): Buffer {
    let payload: number[] = []
    for(let edict of edicts) {
        if(typeof edict.amount === "string") {
            edict.amount = BigInt(edict.amount);
        }
    }

    if (edicts.length > 0) {
        encodeToVec(TAG_BODY, payload)

        edicts.sort((a, b) => a.id - b.id)

        let id = 0
        for (const edict of edicts) {
            encodeToVec(BigInt(edict.id - id), payload)
            encodeToVec(BigInt(edict.amount), payload)
            encodeToVec(BigInt(edict.output), payload)
            id = edict.id
        }
    }

    let prefix
    if (isMainnet) {
        prefix = OPS.OP_13
    } else {
        prefix = Buffer.from('RUNE_TEST')
    }
    /*
        Link for doc https://docs.ordinals.com/runes.html#runestones

        NOTE: A runestone output's script pubkey begins with an OP_RETURN, followed by OP_13, 
        followed by zero or more data pushes. These data pushes are concatenated 
        and decoded into a sequence of 128-bit integers, and finally parsed into a runestone.
    */ 
    return bscript.compile([OPS.OP_RETURN, prefix, Buffer.from(payload)])
}
