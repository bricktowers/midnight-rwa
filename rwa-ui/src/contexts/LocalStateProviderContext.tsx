import React, { createContext, type PropsWithChildren } from 'react';
import { BrowserLocalState, type LocalState } from './BrowserLocalState';
import { type Logger } from 'pino';

export const LocalStateProviderContext = createContext<LocalState | undefined>(undefined);

export type LocalStateProviderProps = PropsWithChildren<{
  logger: Logger;
}>;

export const LocalStateProvider: React.FC<Readonly<LocalStateProviderProps>> = ({ children, logger }) => {
  return (
    <LocalStateProviderContext.Provider value={new BrowserLocalState(logger)}>
      {children}
    </LocalStateProviderContext.Provider>
  );
};
