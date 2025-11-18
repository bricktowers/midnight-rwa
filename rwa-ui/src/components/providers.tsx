import {type ProviderCallbackAction, type WalletAPI} from './MidnightWallet';
import {type RwaCircuitKeys, type RwaMidnightProviders} from '@bricktowers/rwa-api';
import {type PrivateStateProvider, type PublicDataProvider} from '@midnight-ntwrk/midnight-js-types';
import {levelPrivateStateProvider} from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import type {ProofProvider} from '@midnight-ntwrk/midnight-js-types/dist/proof-provider';
import type {WalletProvider} from '@midnight-ntwrk/midnight-js-types/dist/wallet-provider';
import type {MidnightProvider} from '@midnight-ntwrk/midnight-js-types/dist/midnight-provider';
import {proofClient} from './proofClient';
import {CachedFetchZkConfigProvider} from './zkConfigProvider';
import {type RwaPrivateState} from '@bricktowers/rwa-contract';

export const providers: (
    publicDataProvider: PublicDataProvider,
    walletProvider: WalletProvider,
    midnightProvider: MidnightProvider,
    walletAPI: WalletAPI,
    callback: (action: ProviderCallbackAction) => void,
) => RwaMidnightProviders = (
    publicDataProvider: PublicDataProvider,
    walletProvider: WalletProvider,
    midnightProvider: MidnightProvider,
    walletAPI: WalletAPI,
    callback: (action: ProviderCallbackAction) => void,
) => {
    const privateStateProvider: PrivateStateProvider<string, RwaPrivateState> = levelPrivateStateProvider({
        privateStateStoreName: 'rwa-private-state',
    });
    const proofProvider: ProofProvider<RwaCircuitKeys> = proofClient(walletAPI.uris.proverServerUri, callback);
    return {
        privateStateProvider,
        publicDataProvider,
        zkConfigProvider: new CachedFetchZkConfigProvider<RwaCircuitKeys>(
            window.location.origin,
            fetch.bind(window),
            callback,
        ),
        proofProvider,
        walletProvider,
        midnightProvider,
    };
};
