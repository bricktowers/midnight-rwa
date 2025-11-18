import {
    type CircuitContext,
    constructorContext,
    decodeZswapLocalState,
    QueryContext,
    ZswapLocalState
} from "@midnight-ntwrk/compact-runtime";
import * as ocrt from '@midnight-ntwrk/onchain-runtime';
import {BrickTowersCoinPrivateState, TBTC, TBTCContract} from "@bricktowers/tbtc-contract"
import {ContractAddress, TokenType} from "@midnight-ntwrk/zswap";


export class BrickTowersCoinSimulator {
    readonly contract: TBTCContract;
    circuitContext: CircuitContext<BrickTowersCoinPrivateState>;

    constructor(
        contractAddress: ContractAddress,
        initNonce: Uint8Array,
        coinPublicKey: ocrt.CoinPublicKey,
    ) {
        this.contract = new TBTC.Contract<BrickTowersCoinPrivateState>({});
        const {
            currentPrivateState,
            currentContractState,
            currentZswapLocalState
        } = this.contract.initialState(
            constructorContext({}, coinPublicKey),
            initNonce,
        );
        this.circuitContext = {
            currentPrivateState,
            currentZswapLocalState,
            originalState: currentContractState,
            transactionContext: new QueryContext(
                currentContractState.data,
                contractAddress
            )
        };
    }

    public as(currentPrivateState: BrickTowersCoinPrivateState): BrickTowersCoinSimulator {
        this.circuitContext = {
            ...this.circuitContext,
            currentPrivateState: currentPrivateState
        }
        return this;
    }

    public getLedger(): TBTC.Ledger {
        return TBTC.ledger(this.circuitContext.transactionContext.state);
    }

    public mint(): TBTC.Ledger {
        this.circuitContext = this.contract.impureCircuits.mint(this.circuitContext).context;
        return TBTC.ledger(this.circuitContext.transactionContext.state);
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
}
