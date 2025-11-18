import {type MidnightProviders} from '@midnight-ntwrk/midnight-js-types';
import {type FoundContract} from '@midnight-ntwrk/midnight-js-contracts';
import {MidnightRwa, RwaPrivateState} from '@bricktowers/rwa-contract';

export type RwaContract = MidnightRwa.Contract<RwaPrivateState, MidnightRwa.Witnesses<RwaPrivateState>>;

export type RwaCircuitKeys = Exclude<keyof RwaContract['impureCircuits'], number | symbol>;

export type RwaMidnightProviders = MidnightProviders<RwaCircuitKeys, string, RwaPrivateState>;

export type DeployedRwaContract = FoundContract<RwaContract>;

export type RwaContractDerivedState = {
    readonly secretKey: string;
    readonly publicKey: string;
    readonly thfBalance: bigint;
    readonly tbtcBalance: bigint;
};

export const emptyState: RwaContractDerivedState = {
    publicKey: 'unknown',
    secretKey: 'unknown',
    thfBalance: 0n,
    tbtcBalance: 0n,
};
