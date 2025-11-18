import { MidnightRwa } from '@bricktowers/rwa-contract';

export const FIELD_MODULUS = 6554484396890773809930967563523245729705921265872317281365359162392183254199n;

export interface PublicKey {
    x: bigint;
    y: bigint;
}

export interface KeyPair {
    privateKey: bigint;
    publicKey: PublicKey;
}

export type PassportData = MidnightRwa.PassportData;
export type SignedPassportData = MidnightRwa.SignedCredential<PassportData>;
