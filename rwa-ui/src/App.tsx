import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import React from 'react';
import { MainLayout } from './components';
import MainPage from './MainPage';
import Onboarding from './Onboarding';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material';
import { theme } from './config/theme';
import { LocalStateProvider } from './contexts';
import { RuntimeConfigurationProvider, useRuntimeConfiguration } from './config/RuntimeConfiguration';
import { MidnightWalletProvider } from './components/MidnightWallet';
import * as pino from 'pino';
import { FAQ } from './components/FAQ';
import { type NetworkId, setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import {IssuerComponent} from "./components/IssuerComponent";
import {DexComponent} from "./components/DexComponent";

const AppWithLogger: React.FC = () => {
  const config = useRuntimeConfiguration();
  const logger = pino.pino({
    level: config.LOGGING_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  setNetworkId(config.NETWORK_ID as NetworkId);
  return (
    <LocalStateProvider logger={logger}>
      <MidnightWalletProvider logger={logger}>
        <BrowserRouter basename={process.env.PUBLIC_URL}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/faq" element={<FAQ />} />
              <Route index path="/" element={<MainPage logger={logger}>
                <IssuerComponent logger={logger} privateStateId={'issuer'}/>
              </MainPage>} />
              <Route index path="/dex" element={<MainPage logger={logger}>
                <DexComponent logger={logger} privateStateId={'dex'}/>
              </MainPage>} />
              <Route path="/onboarding" element={<Onboarding logger={logger} privateStateId={'dex'} />} />
              <Route path="*" element={<Navigate to="/" replace={true} />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </MidnightWalletProvider>
    </LocalStateProvider>
  );
};
const App: React.FC = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <CssBaseline />
      <RuntimeConfigurationProvider>
        <ThemeProvider theme={theme}>
          <AppWithLogger />
        </ThemeProvider>
      </RuntimeConfigurationProvider>
    </DndProvider>
  );
};

export default App;
