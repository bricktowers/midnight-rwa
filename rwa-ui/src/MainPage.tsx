import React, {type PropsWithChildren, useState} from 'react';
import {Button, Snackbar, Typography} from '@mui/material';
import './my-battles.css';
import {useMidnightWallet} from './components/MidnightWallet';
import {useRuntimeConfiguration} from './config/RuntimeConfiguration';
import type {Logger} from 'pino';
import {useNavigate} from 'react-router-dom';

export type MainPageProps = PropsWithChildren<{
    logger: Logger;
    children: React.ReactNode;
}>;

const MainPage: React.FC<MainPageProps> = ({logger, children}) => {
    const midnight = useMidnightWallet();
    const config = useRuntimeConfiguration();
    const [snackBarOpen, setSnackBarOpen] = useState(false);
    const [snackBarText, setSnackBarText] = useState('');

    const navigate = useNavigate();

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {midnight.widget}

            <Button
                onClick={() => {
                    navigate('/onboarding')
                }}
                size="small"
                variant={'outlined'}
                sx={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                }}
            >
                Onboarding
            </Button>
            <Button
                onClick={() => {
                    navigate('/')
                }}
                size="small"
                variant={'outlined'}
                sx={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                }}
            >
                Issuer
            </Button>
            <Button
                onClick={() => {
                    navigate('/dex')
                }}
                size="small"
                variant={'outlined'}
                sx={{
                    cursor: 'pointer',
                    textDecoration: 'none',
                }}
            >
                Dex
            </Button>
            <Snackbar
                open={snackBarOpen}
                autoHideDuration={2000}
                onClose={() => {
                    setSnackBarOpen(false);
                }}
                message={snackBarText}
                anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
            />
            <Typography align="justify" variant="body1" color="cornsilk" sx={{paddingRight: '10%', paddingLeft: '10%'}}>
                To use the dApp you need a Midnight Lace Wallet with some tDUST and tBTC (Brick Tower Coin) tokens.
            </Typography>
            {children}
        </div>
    );
};

export default MainPage;
