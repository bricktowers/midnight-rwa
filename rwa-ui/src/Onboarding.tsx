import React, {type PropsWithChildren, useMemo, useState} from 'react';
import type {Logger} from 'pino';
import {useMidnightWallet} from './components/MidnightWallet';
import {Alert, Button, CircularProgress, Snackbar, Typography} from '@mui/material';
import {useNavigate} from 'react-router-dom';
import {RwaAPI, RwaMidnightProviders} from "@bricktowers/rwa-api";
import {providers} from "./components/providers";
import {useRuntimeConfiguration} from "./config/RuntimeConfiguration";
import {PassportData, QuizResult, SignedCredential} from "@bricktowers/rwa-contract";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";

export type IDPProps = PropsWithChildren<{
    logger: Logger;
    privateStateId: string
}>;

const Onboarding: React.FC<IDPProps> = ({logger, privateStateId}) => {
    const midnight = useMidnightWallet();
    const navigate = useNavigate();
    const config = useRuntimeConfiguration();
    const [snackBarText, setSnackBarText] = useState<string | undefined>(undefined);
    const [onboardProgress, setOnboardProgress] = React.useState(false);
    const [quizResult, setQuizResult] = React.useState<undefined | QuizResult>(undefined);

    const backToDex: () => void = () => {
        navigate('/');
    };

    const customStringify = (obj: any): string => {
        return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2);
    };

    async function reSignUserPassportData() {
        const response = await fetch('http://localhost:3000/sign', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: customStringify({}),
        });
        return await response.json() as SignedCredential<PassportData>;
    }

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

    const onOnboard: () => Promise<void> = async () => {
        if (!isReady()) {
            midnight.shake();
            return;
        }
        setOnboardProgress(true);
        try {
            const api = await RwaAPI.subscribe(
                config.BRICK_TOWERS_TOKEN_ADDRESS,
                midnightProviders!,
                config.BRICK_TOWERS_RWA_ADDRESS,
                logger,
                privateStateId,
            );
            const data = await reSignUserPassportData();
            const userBalance = 101n; //wallet is goign to fail tx if not enough balance
            await api.onboard(quizResult!, userBalance, data);
            setSnackBarText(
                'You are an eligible investor now.',
            );
        } catch (e) {
            logger.error(e, 'Failed registration');
            setSnackBarText('An unknown error occurred.');
        } finally {
            setOnboardProgress(false);
        }
    };

    const handleSelect = (question: keyof QuizResult, value: bigint) => {
        setQuizResult(prev => ({...prev, [question]: value} as QuizResult));
    };

    const isSelected = (question: keyof QuizResult, value: bigint) =>
        quizResult && quizResult[question] === value;

    const answerButtonSx = (selected: boolean) => ({
        textTransform: 'none',
        minWidth: '90px',
        ...(selected && {
            fontWeight: 600,
        }),
    });

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {midnight.widget}

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

            <Button
                onClick={backToDex}
                sx={{
                    cursor: 'pointer',
                    color: 'cornsilk',
                    textDecoration: 'underline',
                }}
            >
                Back to Dex
            </Button>

            {/* QUIZ */}
            <div style={{display: "flex", flexDirection: "column", gap: "20px"}}>
                {/* Q1 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <Typography align="justify" variant="body1" color="cornsilk"
                                sx={{paddingRight: '10%', paddingLeft: '10%'}}>
                        Q1
                    </Typography>
                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        {[1n, 2n, 3n].map((val) => {
                            const selected = isSelected("q1", val) ?? false;
                            return (
                                <Button
                                    key={val.toString()}
                                    size="small"
                                    variant={selected ? 'contained' : 'outlined'}
                                    sx={answerButtonSx(selected)}
                                    onClick={() => handleSelect("q1", val)}
                                >
                                    {`Answer ${val.toString()}`}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Q2 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <Typography align="justify" variant="body1" color="cornsilk"
                                sx={{paddingRight: '10%', paddingLeft: '10%'}}>
                        Q2
                    </Typography>

                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        {[1n, 2n, 3n].map((val) => {
                            const selected = isSelected("q2", val) ?? false;
                            return (
                                <Button
                                    key={val.toString()}
                                    size="small"
                                    variant={selected ? 'contained' : 'outlined'}
                                    sx={answerButtonSx(selected)}
                                    onClick={() => handleSelect("q2", val)}
                                >
                                    {`Answer ${val.toString()}`}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Q3 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <Typography align="justify" variant="body1" color="cornsilk"
                                sx={{paddingRight: '10%', paddingLeft: '10%'}}>
                        Q3
                    </Typography>

                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        {[1n, 2n, 3n, 4n].map((val) => {
                            const selected = isSelected("q3", val) ?? false;
                            return (
                                <Button
                                    key={val.toString()}
                                    size="small"
                                    variant={selected ? 'contained' : 'outlined'}
                                    sx={answerButtonSx(selected)}
                                    onClick={() => handleSelect("q3", val)}
                                >
                                    {`Answer ${val.toString()}`}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Q4 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <Typography align="justify" variant="body1" color="cornsilk"
                                sx={{paddingRight: '10%', paddingLeft: '10%'}}>
                        Q4
                    </Typography>

                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        {[1n, 2n, 3n].map((val) => {
                            const selected = isSelected("q4", val) ?? false;
                            return (
                                <Button
                                    key={val.toString()}
                                    size="small"
                                    variant={selected ? 'contained' : 'outlined'}
                                    sx={answerButtonSx(selected)}
                                    onClick={() => handleSelect("q4", val)}
                                >
                                    {`Answer ${val.toString()}`}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                {/* Q5 */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <Typography align="justify" variant="body1" color="cornsilk"
                                sx={{paddingRight: '10%', paddingLeft: '10%'}}>
                        Q5
                    </Typography>
                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                        {[1n, 2n, 3n].map((val) => {
                            const selected = isSelected("q5", val) ?? false;
                            return (
                                <Button
                                    key={val.toString()}
                                    size="small"
                                    variant={selected ? 'contained' : 'outlined'}
                                    sx={answerButtonSx(selected)}
                                    onClick={() => handleSelect("q5", val)}
                                >
                                    {`Answer ${val.toString()}`}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <Button
                sx={{marginRight: '30px', textTransform: 'none'}}
                size="small"
                variant={'outlined'}
                onClick={onOnboard}
                disabled={onboardProgress}
                startIcon={onboardProgress ? <CircularProgress size={16}/> : <AttachMoneyIcon/>}
            >
                Submit
            </Button>

        </div>
    );
};

export default Onboarding;
