import type {ImpureCircuitId, MidnightProviders} from '@midnight-ntwrk/midnight-js-types';
import type {DeployedContract, FoundContract} from '@midnight-ntwrk/midnight-js-contracts';
import {TBTC} from './index'

export interface BrickTowersCoinPrivateState {
}

export type TBTCCircuits = ImpureCircuitId<TBTC.Contract<BrickTowersCoinPrivateState>>;

export type TBTCProviders = MidnightProviders<TBTCCircuits, string, BrickTowersCoinPrivateState>;

export type TBTCContract = TBTC.Contract<BrickTowersCoinPrivateState>;

export type DeployedTBTCContract = DeployedContract<TBTCContract> | FoundContract<TBTCContract>;

export type Contract<T> = TBTC.Contract<T>;