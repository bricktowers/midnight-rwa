import type { Logger } from 'pino';

export interface LocalState {
  readonly setLaceAutoConnect: (value: boolean) => void;
  readonly isLaceAutoConnect: () => boolean;
}

export class BrowserLocalState implements LocalState {
  constructor(private readonly logger: Logger) {
  }

  isLaceAutoConnect(): boolean {
    return window.localStorage.getItem('brick_towers_midnight_lace_connect') === 'true';
  }

  setLaceAutoConnect(value: boolean): void {
    this.logger.trace(`Setting lace auto connect to ${value}`);
    window.localStorage.setItem('brick_towers_midnight_lace_connect', value.toString());
  }
}
