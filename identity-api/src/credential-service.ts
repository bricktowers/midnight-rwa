import {MidnightRwa} from '@bricktowers/rwa-contract';
import {ecMulGenerator} from "@midnight-ntwrk/compact-runtime";
import {FIELD_MODULUS, KeyPair, PassportData, SignedPassportData} from "./types";

type CircuitInput<T extends Record<string, unknown>> = {
    [K in keyof T]: bigint;
};

function toCircuitInput<T extends Record<string, unknown>>(credential: T): CircuitInput<T> {
    for (const [key, value] of Object.entries(credential)) {
        if (typeof value !== 'bigint') {
            throw new TypeError(`Field "${key}" must be a bigint, received ${typeof value}`);
        }
    }

    return credential as CircuitInput<T>;
}

export class CredentialService {
    private keyPair: KeyPair;

    constructor(keyPair: KeyPair) {
        this.keyPair = keyPair;
    }

    async sign<T extends PassportData>(credential: T): Promise<SignedPassportData> {
        const circuitInput = toCircuitInput<T>(credential);
        const k = MidnightRwa.pureCircuits.generateDeterministicK(this.keyPair.privateKey, circuitInput);
        const moduloK = k % FIELD_MODULUS;
        const r = ecMulGenerator(moduloK);
        const c = MidnightRwa.pureCircuits.computeChallengeForCredential(r, this.keyPair.publicKey, circuitInput);
        const moduloC = c % FIELD_MODULUS;
        const s = (moduloK + moduloC * this.keyPair.privateKey);
        const moduloS = s % FIELD_MODULUS;

        const signature = {
            r: {x: r.x, y: r.y},
            s: moduloS
        };

        return {
            credential: circuitInput,
            signature,
            pk: this.keyPair.publicKey
        };
    }
}