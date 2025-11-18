import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Button, CircularProgress, Container, Snackbar, Typography,} from '@mui/material';
import {useMidnightWallet} from './MidnightWallet';
import {RwaAPI, RwaContractDerivedState, type RwaMidnightProviders} from '@bricktowers/rwa-api';
import {from, mergeMap} from 'rxjs';
import {useRuntimeConfiguration} from '../config/RuntimeConfiguration';
import type {Logger} from 'pino';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import {providers} from "./providers";

export interface RwaComponentProps {
    logger: Logger;
    privateStateId: string
}

export const DexComponent: React.FC<RwaComponentProps> = ({logger, privateStateId}) => {
    const midnight = useMidnightWallet();
    const config = useRuntimeConfiguration();
    const [buyTHFProgress, setBuyTHFProgress] = React.useState(false);
    const [sellTHFProgress, setSellTHFProgress] = React.useState(false);
    const [rwaContractDerivedState, setRwaContractDerivedState] = React.useState<RwaContractDerivedState | undefined>(undefined);

    const midnightProviders: RwaMidnightProviders | undefined = useMemo(() => {
        if (!midnight.isConnected) {
            midnight.shake();
            return undefined;
        }
        if (!midnight.walletAPI) {
            return undefined;
        }

        return providers(
            midnight.publicDataProvider,
            midnight.walletProvider,
            midnight.midnightProvider,
            midnight.walletAPI,
            midnight.callback,
        )
    }, [midnight]);

    useEffect(() => {
        if (!midnightProviders) {
            return () => {};
        }
        if (window.localStorage.getItem('brick_towers_deploy')) {
            return undefined;
        }
        const subscription = from(RwaAPI.subscribe(
            config.BRICK_TOWERS_TOKEN_ADDRESS,
            midnightProviders,
            config.BRICK_TOWERS_RWA_ADDRESS,
            logger,
            privateStateId,
        ))
            .pipe(mergeMap(value => value.state$))
            .subscribe(value => setRwaContractDerivedState(value))
        return () => {
            subscription.unsubscribe();
        };

    }, [midnightProviders]);

    function isReady() {
        if (!midnight.isConnected) {
            midnight.shake();
            return false;
        }
        if (!midnightProviders) {
            midnight.shake();
            return false;
        }
        if (!midnight.walletAPI) {
            setSnackBarText(
                'Wallet API is not available.',
            );
            midnight.shake();
            return false;
        }
        return true;
    }

    const onBuyTHF: () => Promise<void> = async () => {
        if (!isReady()) {
            midnight.shake();
            return;
        }
        setBuyTHFProgress(true);
        try {
            const api = await RwaAPI.subscribe(
                config.BRICK_TOWERS_TOKEN_ADDRESS,
                midnightProviders!,
                config.BRICK_TOWERS_RWA_ADDRESS,
                logger,
                privateStateId,
            );
            await api.buyTHF(50n);
            setSnackBarText(
                'Your order to provide liqudity of 300 tBTC has been submitted.',
            );
        } catch (e) {
            logger.error(e, 'Failed registration');
            setSnackBarText('An unknown error occurred.');
        } finally {
            setBuyTHFProgress(false);
        }
    };

    const onSellTHF: () => Promise<void> = async () => {
        if (!isReady()) {
            midnight.shake();
            return;
        }
        setSellTHFProgress(true);
        try {
            const api = await RwaAPI.subscribe(
                config.BRICK_TOWERS_TOKEN_ADDRESS,
                midnightProviders!,
                config.BRICK_TOWERS_RWA_ADDRESS,
                logger,
                privateStateId,
            );
            await api.mint(50n);
            setSnackBarText(
                'Your order to provide liquidity of 300 tBTC has been submitted.',
            );
        } catch (e) {
            logger.error(e, 'Failed registration');
            setSnackBarText('An unknown error occurred.');
        } finally {
            setSellTHFProgress(false);
        }
    };

    const onDeploy: () => Promise<void> = async () => {
        if (!isReady()) {
            midnight.shake();
            return;
        }
        setBuyTHFProgress(true);
        try {
            if (midnight.walletAPI) {
                const api = await RwaAPI.deploy(config.BRICK_TOWERS_TOKEN_ADDRESS, midnightProviders!, logger, privateStateId);
                logger.info('deployed at', api.deployedContractAddress);
            }
        } catch (e) {
            logger.error(e, 'Failed to Deploy');
        } finally {
            setBuyTHFProgress(false);
        }
    };


    const [snackBarText, setSnackBarText] = useState<string | undefined>(undefined);

    if (window.localStorage.getItem('brick_towers_deploy')) {
        // hidden button to deploy
        return (
            <Button onClick={onDeploy} disabled={buyTHFProgress}>
                Deploy Rwa Contract
            </Button>
        );
    } else {
        return (
            <Container>
                <Typography variant="h1" gutterBottom>
                    Welcome to Dex
                </Typography>


                <Snackbar
                    autoHideDuration={null}
                    open={snackBarText !== undefined}
                    anchorOrigin={{vertical: 'bottom', horizontal: 'right'}}
                >
                    {snackBarText && snackBarText.includes('has been submitted') ? (
                        <Alert severity="info">{snackBarText}</Alert>
                    ) : (
                        <Alert severity="error">{snackBarText}</Alert>
                    )}
                </Snackbar>

                <Typography variant="body1" gutterBottom>
                    tBTC liquidity: {(rwaContractDerivedState?.tbtcBalance ?? 0n).toString()}
                </Typography>

                <Typography variant="body1" gutterBottom>
                    tHF liquidity: {(rwaContractDerivedState?.thfBalance ?? 0n).toString()}
                </Typography>

                <Button
                    sx={{marginRight: '30px', textTransform: 'none'}}
                    size="small"
                    variant={'outlined'}
                    onClick={onBuyTHF}
                    disabled={buyTHFProgress}
                    startIcon={buyTHFProgress ? <CircularProgress size={16}/> : <AttachMoneyIcon/>}
                >
                    Buy tHF
                </Button>

                <Button
                    sx={{marginRight: '30px', textTransform: 'none'}}
                    size="small"
                    variant={'outlined'}
                    onClick={onSellTHF}
                    disabled={sellTHFProgress}
                    startIcon={sellTHFProgress ? <CircularProgress size={16}/> : <AttachMoneyIcon/>}
                >
                    Sell tHF
                </Button>
            </Container>
        );
    }
};
