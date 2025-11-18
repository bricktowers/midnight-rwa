import type { ImpureCircuitId, MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';
import { MidnightRwa } from './index'
import { RwaPrivateState } from './witnesses'

export type RwaCircuits = ImpureCircuitId<MidnightRwa.Contract<RwaPrivateState>>;

export type ContractId = string;

export type RwaProviders = MidnightProviders<RwaCircuits, ContractId, RwaPrivateState>;

export type MidnightRwaContract = MidnightRwa.Contract<RwaPrivateState>;

export type DeployedMidnightRwaContract = DeployedContract<MidnightRwaContract> | FoundContract<MidnightRwaContract>;

export type QuizResult = MidnightRwa.QuizResult;

export type SignedCredential<T> = MidnightRwa.SignedCredential<T>;

export type PassportData = MidnightRwa.PassportData;
