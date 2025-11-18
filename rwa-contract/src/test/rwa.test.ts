import {MidnightRwaSimulator} from "./midnight-rwa-simulator.js";
import {NetworkId, setNetworkId} from "@midnight-ntwrk/midnight-js-network-id";
import {beforeEach, describe, expect, it} from "vitest";
import {pad, randomBytes, toHex} from "./utils";
import {MidnightRwa, type RwaPrivateState} from "../index";
import {QuizResult} from "../common-types";
import {encodeCoinInfo, encodeTokenType, tokenType} from "@midnight-ntwrk/ledger";
import {BrickTowersCoinSimulator} from "./midnight-tbtc-simulator";
import {sampleContractAddress, ZswapLocalState} from "@midnight-ntwrk/compact-runtime";
import {ContractAddress, TokenType} from "@midnight-ntwrk/zswap";
import {identity1ProviderPublicKey, recipient1, signedIdentity1, unallowedCountryIdentity} from "./testData";


setNetworkId(NetworkId.Undeployed);

describe("RWA contract", () => {
    let simulator: MidnightRwaSimulator;
    let tbtcSimulator: BrickTowersCoinSimulator;
    let tbtcContractAddress: ContractAddress;
    let rwaConractAddress: ContractAddress;
    let btcCoinColor: TokenType
    let thfCoinColor: TokenType
    const adminSk = randomBytes(32);
    const deployerPrivateState: RwaPrivateState = {
        secretKey: adminSk,
    }
    const userSk = randomBytes(32);
    const userPrivateState: RwaPrivateState = {
        secretKey: userSk,
    }
    const deployerCoinPublicKey = "0".repeat(64)
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
    const adminPk = MidnightRwa.pureCircuits.publicKey(adminSk);

    function printOutputs(zswapLocalState: ZswapLocalState) {
        console.log('-----> Outputs:');
        for (const output of zswapLocalState.outputs) {
            let recipient = "contract:" + output.recipient.right;
            if (output.recipient.is_left) {
                recipient = "user:" + output.recipient.left;
            }
            let color = output.coinInfo.type;
            if (output.coinInfo.type === btcCoinColor) {
                color = 'tBTC';
            } else if (output.coinInfo.type === thfCoinColor) {
                color = 'tHF';
            }
            console.log(`Color: ${color}, value: ${output.coinInfo.value} recipient: ${recipient}`);
        }
        console.log('<----');
    }

    beforeEach(() => {
        console.log("adminPk=" + toHex(adminPk));
        tbtcContractAddress = sampleContractAddress();
        rwaConractAddress = sampleContractAddress();
        console.log("tbtcContractAddress=" + tbtcContractAddress);
        console.log("rwaConractAddress=" + rwaConractAddress);

        btcCoinColor = tokenType(pad('brick-towers:coin:tbtc', 32), tbtcContractAddress);
        thfCoinColor = tokenType(pad('brick-towers:coin:thf', 32), rwaConractAddress);

        tbtcSimulator = new BrickTowersCoinSimulator(
            tbtcContractAddress,
            nonce,
            deployerCoinPublicKey,
        )

        simulator = new MidnightRwaSimulator(
            rwaConractAddress,
            deployerPrivateState,
            nonce,
            quizCommitment,
            adminPk,
            deployerCoinPublicKey,
            identity1ProviderPublicKey,
            tbtcContractAddress
        );
    });

    it("should pass the happy path", () => {
        tbtcSimulator.as(deployerPrivateState).mint();
        printOutputs(tbtcSimulator.as(userPrivateState).getZswapLocalState());

        const receivedCoin = tbtcSimulator.getOutputByRecipient(deployerCoinPublicKey)
        expect(receivedCoin?.value).toEqual(1000n);

        simulator.as(deployerPrivateState).mint(1000n);

        expect(() => {
            simulator.as(userPrivateState).isAllowedToSend(recipient1)
        }).toThrowError("Authorization not found in the ledger");

        simulator.as(userPrivateState).onboardUser(correctQuizResult, encodeCoinInfo(receivedCoin!!), signedIdentity1);

        expect(() => {
            simulator.as(userPrivateState).isAllowedToSend(recipient1)
        }).not.toThrowError();

        simulator.as(userPrivateState).buyTHF({
            value: 100n,
            nonce: randomBytes(32),
            color: encodeTokenType(btcCoinColor)
        });

        simulator.as(userPrivateState).sellTHF({
            value: 50n,
            nonce: randomBytes(32),
            color: encodeTokenType(thfCoinColor)
        });
    });

    it("should fail to onboard with insufficient balance", () => {
        expect(() => {
            simulator.as(userPrivateState).onboardUser(correctQuizResult, encodeCoinInfo({
                type: btcCoinColor,
                value: 10n,
                nonce: toHex(randomBytes(32)),
            }), signedIdentity1);
        }).toThrowError("The coin supplied for verification has a value less than 100 tBTC");
    });

    it("should fail to onboard with tampered credential", () => {
        const identity = {
            ...signedIdentity1,
            credential: {
                ...signedIdentity1.credential,
                expiryDate: 0n
            }
        };
        expect(() => {
            simulator.as(userPrivateState).onboardUser(correctQuizResult, encodeCoinInfo({
                type: btcCoinColor,
                value: 101n,
                nonce: toHex(randomBytes(32)),
            }), identity);
        }).toThrowError("The supplied identity is not signed by the supplied public key");
    });

    it("should fail to onboard from not allowed country", () => {
        expect(() => {
            simulator.as(userPrivateState).onboardUser(correctQuizResult, encodeCoinInfo({
                type: btcCoinColor,
                value: 101n,
                nonce: toHex(randomBytes(32)),
            }), unallowedCountryIdentity);
        }).toThrowError("The holder of the identity is not from an allowed country");
    });

    it("should fail on wrong quiz result", () => {
        const quizResult = {
            ...correctQuizResult,
            q1: 0n
        };
        expect(() => {
            simulator.as(userPrivateState).onboardUser(quizResult, encodeCoinInfo({
                type: btcCoinColor,
                value: 101n,
                nonce: toHex(randomBytes(32)),
            }), signedIdentity1);
        }).toThrowError("Quiz has some incorrect answers");
    });

});
