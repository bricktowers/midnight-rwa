import {
    type CircuitContext,
    constructorContext,
    ContractAddress,
    CurvePoint,
    decodeZswapLocalState,
    encodeContractAddress,
    QueryContext, Recipient,
    ZswapLocalState
} from "@midnight-ntwrk/compact-runtime";
import * as ocrt from '@midnight-ntwrk/onchain-runtime';
import {
    CoinInfo,
    Contract,
    Either,
    type Ledger,
    ledger,
    ZswapCoinPublicKey,
    ContractAddress as EncodedContractAddress
} from "../managed/midnight-rwa/contract/index.cjs";
import {type RwaPrivateState, witnesses} from "../witnesses.js";
import {PassportData, QuizResult, SignedCredential} from "../common-types";
import {TokenType} from "@midnight-ntwrk/zswap";


export class MidnightRwaSimulator {
    readonly contract: Contract<RwaPrivateState>;
    circuitContext: CircuitContext<RwaPrivateState>;

    constructor(
        rwaContractAddress: ContractAddress,
        initialPrivateState: RwaPrivateState,
        initNonce: Uint8Array,
        quizHash: Uint8Array,
        adminPk: Uint8Array,
        coinPublicKey: ocrt.CoinPublicKey,
        identityProviderPublicKey: CurvePoint,
        tokenContractAddress: ContractAddress
    ) {
        this.contract = new Contract<RwaPrivateState>(witnesses);
        const {
            currentPrivateState,
            currentContractState,
            currentZswapLocalState
        } = this.contract.initialState(
            constructorContext(initialPrivateState, coinPublicKey),
            initNonce,
            adminPk,
            quizHash,
            identityProviderPublicKey,
            {
                bytes: encodeContractAddress(tokenContractAddress)
            }
        );
        this.circuitContext = {
            currentPrivateState,
            currentZswapLocalState,
            originalState: currentContractState,
            transactionContext: new QueryContext(
                currentContractState.data,
                rwaContractAddress
            )
        };
    }

    public as(currentPrivateState: RwaPrivateState): MidnightRwaSimulator {
        this.circuitContext = {
            ...this.circuitContext,
            currentPrivateState: currentPrivateState
        }
        return this;
    }

    public getLedger(): Ledger {
        return ledger(this.circuitContext.transactionContext.state);
    }

    public mint(amount: bigint): Ledger {
        this.circuitContext = this.contract.impureCircuits.mintTHF(this.circuitContext, amount).context;
        return ledger(this.circuitContext.transactionContext.state);
    }

    public add(issuer: Uint8Array): Ledger {
        this.circuitContext = this.contract.impureCircuits.add(this.circuitContext, issuer).context;
        return ledger(this.circuitContext.transactionContext.state);
    }

    public isAllowedToSend(recipient_0: Either<ZswapCoinPublicKey, EncodedContractAddress>): Ledger {
        this.circuitContext = this.contract.circuits.isAuthorizedSend(this.circuitContext, recipient_0).context;
        return ledger(this.circuitContext.transactionContext.state);
    }

    public onboardUser(quiz: QuizResult, inputCoin: CoinInfo, identity: SignedCredential<PassportData>): Ledger {
        this.circuitContext = this.contract.impureCircuits.onboard(this.circuitContext, quiz, inputCoin, identity).context;
        return ledger(this.circuitContext.transactionContext.state);
    }

    public buyTHF(tBTCCoinInfo: CoinInfo) {
        this.circuitContext = this.contract.impureCircuits.buyTHF(this.circuitContext, tBTCCoinInfo).context;
        return ledger(this.circuitContext.transactionContext.state);
    }

    public sellTHF(tHFCoinInfo: CoinInfo) {
        this.circuitContext = this.contract.impureCircuits.sellTHF(this.circuitContext, tHFCoinInfo).context;
        return ledger(this.circuitContext.transactionContext.state);
    }

    public getPrivateState(): RwaPrivateState {
        return this.circuitContext.currentPrivateState;
    }

    public getZswapLocalState(): ZswapLocalState {
        return decodeZswapLocalState(this.circuitContext.currentZswapLocalState);
    }

    public getOutputByRecipient(recipient: ocrt.CoinPublicKey): ocrt.CoinInfo | undefined {
        const zswapLocalState = this.getZswapLocalState();
        const outputs = zswapLocalState.outputs.filter(output => output.recipient.left === recipient);
        if (outputs.length === 0) {
            return undefined;
        } else if (outputs.length > 1) {
            throw new Error(`Multiple outputs found for recipient, use getOutputsByRecipient instead`);
        }
        return outputs[0].coinInfo;
    }

    public getBalance(recipient: Recipient): Record<TokenType, bigint> {
        const zswapLocalState = this.getZswapLocalState();
        let balance: Record<TokenType, bigint> = {};
        for (const output of zswapLocalState.outputs) {
            if (recipient == output.recipient) {
                balance[output.coinInfo.type] = balance[output.coinInfo.type] ?? 0n + output.coinInfo.value;
            }
        }
        return balance;
    }
}
