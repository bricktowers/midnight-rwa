import {type ContractAddress, encodeContractAddress, tokenType} from '@midnight-ntwrk/compact-runtime';
import {type Logger} from 'pino';
import {
    type DeployedRwaContract,
    emptyState,
    type RwaContract,
    type RwaContractDerivedState,
    type RwaMidnightProviders,
} from './common-types.js';
import {
    MidnightRwa,
    PassportData,
    QuizResult,
    RwaPrivateState,
    SignedCredential,
    witnesses,
} from '@bricktowers/rwa-contract';
import * as utils from './utils/index.js';
import {deployContract, findDeployedContract} from '@midnight-ntwrk/midnight-js-contracts';
import {combineLatest, concat, defer, from, map, type Observable, retry, scan, Subject} from 'rxjs';
import {toHex} from '@midnight-ntwrk/midnight-js-utils';
import type {PrivateStateProvider} from '@midnight-ntwrk/midnight-js-types/dist/private-state-provider';
import {encodeCoinInfo} from '@midnight-ntwrk/ledger';
import {randomBytes} from "./utils";

const contract: RwaContract = new MidnightRwa.Contract(witnesses);

export interface DeployedRwaAPI {
    readonly deployedContractAddress: ContractAddress;
    readonly state$: Observable<RwaContractDerivedState>;

    mint(amount: bigint): Promise<void>;

    coinTBTC(value: bigint): MidnightRwa.CoinInfo

    coinTF(value: bigint): MidnightRwa.CoinInfo

    provideTBTC(amount: bigint): Promise<void>

    buyTHF(amount: bigint): Promise<void>

    sellTHF(amount: bigint): Promise<void>

    onboard(
        quizResult: QuizResult,
        userBalance: bigint,
        identity: SignedCredential<PassportData>
    ): Promise<void>
}

export class RwaAPI implements DeployedRwaAPI {
    private constructor(
        public readonly tokenContractAddress: ContractAddress,
        public readonly deployedContract: DeployedRwaContract,
        public readonly providers: RwaMidnightProviders,
        private readonly logger: Logger,
        private readonly privateStateId: string,
    ) {
        const combine = (acc: RwaContractDerivedState, value: RwaContractDerivedState): RwaContractDerivedState => {
            return {
                publicKey: value.publicKey,
                secretKey: value.secretKey,
                thfBalance: value.thfBalance,
                tbtcBalance: value.tbtcBalance,
            };
        };

        this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
        this.privateStates$ = new Subject<RwaPrivateState>();
        this.state$ = combineLatest(
            [
                providers.publicDataProvider
                    .contractStateObservable(this.deployedContractAddress, {type: 'all'})
                    .pipe(map((contractState) => MidnightRwa.ledger(contractState.data))),
                concat(
                    from(defer(() => providers.privateStateProvider.get(privateStateId) as Promise<RwaPrivateState>)),
                    this.privateStates$,
                ),
            ],
            (ledgerState, privateState) => {
                const result: RwaContractDerivedState = {
                    secretKey: toHex(privateState.secretKey),
                    publicKey: toHex(MidnightRwa.pureCircuits.publicKey(privateState.secretKey)),
                    thfBalance: ledgerState.tHF.value,
                    tbtcBalance: ledgerState.tBTC.value
                };
                return result;
            },
        ).pipe(
            scan(combine, emptyState),
            retry({
                // sometimes websocket fails which is why we retry
                delay: 500,
            }),
        );
    }

    readonly deployedContractAddress: ContractAddress;

    readonly state$: Observable<RwaContractDerivedState>;

    readonly privateStates$: Subject<RwaPrivateState>;

    async mint(amount: bigint): Promise<void> {
        await this.deployedContract.callTx.mintTHF(1000n);
    }

    async provideTBTC(amount: bigint): Promise<void> {
        await this.deployedContract.callTx.provideTBTC(this.coinTBTC(amount));
    }

    async buyTHF(amount: bigint): Promise<void> {
        await this.deployedContract.callTx.buyTHF(this.coinTBTC(amount));
    }

    async sellTHF(amount: bigint): Promise<void> {
        await this.deployedContract.callTx.sellTHF(this.coinTF(amount));
    }

    async onboard(quizResult: QuizResult, userBalance: bigint, identity: SignedCredential<PassportData>): Promise<void> {
        await this.deployedContract.callTx.onboard(quizResult, this.coinTBTC(userBalance), identity);
    }

    coinTBTC(value: bigint): MidnightRwa.CoinInfo {
        return encodeCoinInfo({
            type: tokenType(utils.pad('brick-towers:coin:tbtc', 32), this.tokenContractAddress),
            nonce: toHex(utils.randomBytes(32)),
            value,
        });
    }

    coinTF(value: bigint): MidnightRwa.CoinInfo {
        return encodeCoinInfo({
            type: tokenType(utils.pad('brick-towers:coin:thf', 32), this.deployedContractAddress),
            nonce: toHex(utils.randomBytes(32)),
            value,
        });
    }

    static async deploy(
        tbtcContractAddress: string,
        providers: RwaMidnightProviders,
        logger: Logger,
        privateStateId: string,
    ): Promise<RwaAPI> {
        const correctQuizResult: QuizResult = {
            q1: BigInt(42),
            q2: BigInt(7),
            q3: BigInt(13),
            q4: BigInt(21),
            q5: BigInt(3),
            q6: BigInt(9),
        }
        const quizCommitment = MidnightRwa.pureCircuits.quizCommit(correctQuizResult);
        const identity1ProviderPublicKey = {
            x: 43812792349252743837835600206320630279382719512257386748251693919975321166387n,
            y: 41407619889938320009195859806815249190164661574397387710805607319299297262215n
        };

        const initNonce = randomBytes(32);
        const privateState = await RwaAPI.getPrivateState(privateStateId, providers.privateStateProvider, privateStateId);
        const adminPk = MidnightRwa.pureCircuits.publicKey(privateState.secretKey);
        console.log('deploying contract', toHex(adminPk), toHex(quizCommitment));
        const deployedContract = await deployContract(providers, {
            privateStateId: privateStateId,
            contract,
            initialPrivateState: privateState,
            args: [
                initNonce,
                adminPk,
                quizCommitment,
                identity1ProviderPublicKey,
                {bytes: encodeContractAddress(tbtcContractAddress)}
            ],
        });

        return new RwaAPI(tbtcContractAddress, deployedContract, providers, logger, privateStateId);
    }

    static async subscribe(
        tokenContractAddress: ContractAddress,
        providers: RwaMidnightProviders,
        contractAddress: ContractAddress,
        logger: Logger,
        privateStateId: string,
    ): Promise<RwaAPI> {
        console.log('setting private state');
        const state = await this.getOrCreateInitialPrivateState(providers.privateStateProvider, privateStateId);
        console.log('setting private state', state);

        const deployedContract = await findDeployedContract(providers, {
            contractAddress,
            contract,
            privateStateId: privateStateId,
            initialPrivateState: state,
        });

        return new RwaAPI(tokenContractAddress, deployedContract, providers, logger, privateStateId);
    }

    static async getOrCreateInitialPrivateState(
        privateStateProvider: PrivateStateProvider<string, RwaPrivateState>,
        privateStateId: string,
    ): Promise<RwaPrivateState> {
        let state = await privateStateProvider.get(privateStateId);
        if (state === null) {
            state = {
                secretKey: randomBytes(32)
            };
            await privateStateProvider.set(privateStateId, state);
        }
        return state;
    }

    static async contractExists(providers: RwaMidnightProviders, contractAddress: ContractAddress): Promise<boolean> {
        // here we are forced by the API to create a private state to check if the contract exists
        try {
            const state = await providers.publicDataProvider.queryContractState(contractAddress);
            if (state === null) {
                return false;
            }
            void MidnightRwa.ledger(state.data); // try to parse it
            return true;
        } catch (e) {
            return false;
        }
    }

    private static async getPrivateState(
        privateStateKey: string,
        providers: PrivateStateProvider<string, RwaPrivateState>,
        privateStateId: string,
    ): Promise<RwaPrivateState> {
        const existingPrivateState = await providers.get(privateStateKey);
        const initialState = await this.getOrCreateInitialPrivateState(providers, privateStateId);
        return existingPrivateState ?? initialState;
    }
}

export * as utils from './utils/index.js';
export * from './common-types.js';
