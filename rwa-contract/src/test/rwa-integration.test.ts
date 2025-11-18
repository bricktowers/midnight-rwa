import {afterAll, beforeAll, describe, expect, it} from "vitest";
import {
    createDefaultTestLogger,
    EnvironmentConfiguration,
    getTestEnvironment,
    type MidnightWalletProvider,
    TestEnvironment,
    waitForFinalizedBalance,
} from '@midnight-ntwrk/midnight-js-testing';
import path from "path";
import {WebSocket} from 'ws';

import {DeployedTBTCContract, TBTC, TBTCContract, TBTCProviders} from "@bricktowers/tbtc-contract"
import {MidnightRwa, type RwaPrivateState} from "../index";
import {witnesses} from "../witnesses.js";
import {ContractId, DeployedMidnightRwaContract, MidnightRwaContract, QuizResult, RwaProviders} from "../common-types"
import {deployContract, findDeployedContract} from "@midnight-ntwrk/midnight-js-contracts";
import {levelPrivateStateProvider} from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import {indexerPublicDataProvider} from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import {NodeZkConfigProvider} from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import {httpClientProofProvider} from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import {pad, randomBytes, toHex} from "./utils";
import {encodeContractAddress} from "@midnight-ntwrk/compact-runtime";
import {encodeTokenType, tokenType} from "@midnight-ntwrk/ledger";
import {identity1ProviderPublicKey, signedIdentity1} from "./testData";
import {TokenType} from "@midnight-ntwrk/zswap";

const currentDir = path.resolve(new URL(import.meta.url).pathname, '..');

const logger = await createDefaultTestLogger();

let testEnvironment: TestEnvironment;
let environmentConfiguration: EnvironmentConfiguration;
let walletProviders: MidnightWalletProvider[];
let rwaProviders: RwaProviders[];
let tbtcProviders: TBTCProviders[];
let deployedTBTCContract: DeployedTBTCContract;

// but won't try to overwrite the global property
// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

function configureRwaProvider(walletProvider: MidnightWalletProvider): RwaProviders {
    const contractConfig = {
        privateStateStoreName: 'rwa-private-state',
        zkConfigPath: path.resolve(currentDir, '..', 'managed', 'midnight-rwa'),
    };

    return {
        privateStateProvider: levelPrivateStateProvider<ContractId>({
            privateStateStoreName: contractConfig.privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(environmentConfiguration.indexer, environmentConfiguration.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider<'mintTHF' | 'onboard'>(contractConfig.zkConfigPath),
        proofProvider: httpClientProofProvider(environmentConfiguration.proofServer),
        walletProvider: walletProvider,
        midnightProvider: walletProvider,
    };
}

function configureTBTCProvider(walletProvider: MidnightWalletProvider): TBTCProviders {
    const contractConfig = {
        privateStateStoreName: 'tbtc-private-state',
        zkConfigPath: path.resolve(currentDir, '..', '..', '..', 'tbtc-contract', 'src', 'managed', 'tbtc'),
    };

    return {
        privateStateProvider: levelPrivateStateProvider<string>({
            privateStateStoreName: contractConfig.privateStateStoreName,
        }),
        publicDataProvider: indexerPublicDataProvider(environmentConfiguration.indexer, environmentConfiguration.indexerWS),
        zkConfigProvider: new NodeZkConfigProvider<'mint'>(contractConfig.zkConfigPath),
        proofProvider: httpClientProofProvider(environmentConfiguration.proofServer),
        walletProvider: walletProvider,
        midnightProvider: walletProvider,
    };
}

async function deployTBTContract() {
    logger.info("Deploying tBTC contract...");
    const tbtcContract: TBTCContract = new TBTC.Contract({});
    const tbtc: DeployedTBTCContract = await deployContract<TBTCContract>(tbtcProviders[0], {
        contract: tbtcContract,
        privateStateId: 'tbtc',
        initialPrivateState: {},
        args: [
            randomBytes(32)
        ]
    });
    logger.info("Deployed tBTC contract at " + tbtc.deployTxData.public.contractAddress);
    return tbtc;
}

async function printBalance(walletProvider: MidnightWalletProvider) {
    const state = await waitForFinalizedBalance(walletProvider.wallet)
    return printBalanceForRecord(state.balances);
}

export function printBalanceForRecord(r: Record<TokenType, bigint>) {
    logger.info('-----> Wallet balance:');
    for (const [color, value] of Object.entries(r)) {
        logger.info(`Color: ${color}, value: ${value}`);
    }
    logger.info('<----');
}

beforeAll(async () => {
    testEnvironment = getTestEnvironment(logger);
    environmentConfiguration = await testEnvironment.start();
    logger.info(`Test environment started with configuration: ${JSON.stringify(environmentConfiguration)}`);
    walletProviders = await testEnvironment.startMidnightWalletProviders(2);
    rwaProviders = [configureRwaProvider(walletProviders[0]), configureRwaProvider(walletProviders[1])];
    tbtcProviders = [configureTBTCProvider(walletProviders[0], ), configureTBTCProvider(walletProviders[1])];
    deployedTBTCContract = await deployTBTContract();
    logger.info("Minting tBTC for user...");
    await deployedTBTCContract.callTx.mint();
    logger.info("Minted tBTC for user.");
}, 120_000);

describe("Rwa contract integrated", () => {
    it("should pass the happy path", async () => {
        const tBTCContractAddress = deployedTBTCContract.deployTxData.public.contractAddress;

        const contractInstance: MidnightRwaContract = new MidnightRwa.Contract(witnesses);

        const adminSk = randomBytes(32);
        const deployerPrivateState: RwaPrivateState = {
            secretKey: adminSk,
        }
        const adminPk = MidnightRwa.pureCircuits.publicKey(adminSk);
        const correctQuizResult: QuizResult = {
            q1: BigInt(42),
            q2: BigInt(7),
            q3: BigInt(13),
            q4: BigInt(21),
            q5: BigInt(3),
            q6: BigInt(9),
        }
        const quizCommitment = MidnightRwa.pureCircuits.quizCommit(correctQuizResult);
        const nonce = randomBytes(32);
        const issuerContractInstance: DeployedMidnightRwaContract = await deployContract<MidnightRwaContract>(rwaProviders[0], {
            contract: contractInstance,
            privateStateId: 'contract1',
            initialPrivateState: deployerPrivateState,
            args: [
                nonce,
                adminPk,
                quizCommitment,
                identity1ProviderPublicKey,
                {bytes: encodeContractAddress(tBTCContractAddress)}
            ]
        });
        const contractAddress = issuerContractInstance.deployTxData.public.contractAddress;
        logger.info(`Deployed RWA contract at address: ${contractAddress}`);

        const btcCoinColor = encodeTokenType(tokenType(pad('brick-towers:coin:tbtc', 32), tBTCContractAddress));
        try {
            await issuerContractInstance.callTx.mintTHF(1000n);
        } catch (e) {
            logger.error(`Error minting tHF: ${(e as Error).message}`);
            throw e;
        }
        logger.info(`Minted 1000 tHF to the RWA contract`);
        try {
            await issuerContractInstance.callTx.provideTBTC({
                nonce: randomBytes(32),
                color: btcCoinColor,
                value: 1000n
            });
        } catch (e) {
            logger.error(`Error providing tBTC to the RWA contract: ${(e as Error).message}`);
            throw e;
        }
        logger.info(`Provided 1000 tBTC to the RWA contract for the liquidity pool`);

        const user1Sk = randomBytes(32);
        const user1PrivateState: RwaPrivateState = {
            secretKey: user1Sk,
        }

        const user1RwaInstance = await findDeployedContract<MidnightRwaContract>(rwaProviders[1], {
            contractAddress,
            contract: contractInstance,
            privateStateId: 'user1',
            initialPrivateState: user1PrivateState,
        });

        const tbtcContract: TBTCContract = new TBTC.Contract({});
        const user1BtcInstance = await findDeployedContract<TBTCContract>(tbtcProviders[1], {
            contractAddress: tBTCContractAddress,
            contract: tbtcContract,
            privateStateId: 'user1',
            initialPrivateState: {},
        });

        await printBalance(walletProviders[1]);
        await user1BtcInstance.callTx.mint();
        await printBalance(walletProviders[1]);

        logger.info(`User1 minted tBTC`);

        await expect(
            user1RwaInstance.callTx.buyTHF({
                nonce: randomBytes(32),
                color: btcCoinColor,
                value: 150n
            })
        ).rejects.toThrowError("Authorization not found in the ledger");

        await user1RwaInstance.callTx.onboard(correctQuizResult, {
            nonce: randomBytes(32),
            color: btcCoinColor,
            value: 150n
        }, signedIdentity1);

        await printBalance(walletProviders[1]);
        logger.info(`User1 onboarded to the RWA contract`);

        logger.info(`User1 calls buyTHF`);
        let coinInput = {
            nonce: randomBytes(32),
            color: btcCoinColor,
            value: 150n
        };
        logger.info(`User1 is buying tHF with tBTC coin: color=${toHex(coinInput.color)} value=${coinInput.value}`);
        await user1RwaInstance.callTx.buyTHF(coinInput);

        await printBalance(walletProviders[1]);
        logger.info(`User1 bought 150 tHF successfully`);

        const thfCoinColor = encodeTokenType(tokenType(pad('brick-towers:coin:thf', 32), contractAddress));
        await user1RwaInstance.callTx.sellTHF({
            nonce: randomBytes(32),
            color: thfCoinColor,
            value: 50n
        });
        await printBalance(walletProviders[1]);
        logger.info(`User1 sold 50 tHF successfully`);
    }, 15 * 60_000);
});

afterAll(async () => {
    await testEnvironment.shutdown();
});