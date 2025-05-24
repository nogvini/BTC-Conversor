declare module '@ln-markets/api' {
  export interface RestClientOptions {
    key?: string;
    secret?: string;
    passphrase?: string;
    network?: 'mainnet' | 'testnet';
    headers?: Record<string, string>;
  }

  export interface RestClient {
    // User methods
    userGet(): Promise<any>;
    userUpdate(data: any): Promise<any>;
    userDeposit(data: any): Promise<any>;
    userDepositHistory(data?: any): Promise<any>;
    userWithdraw(data: any): Promise<any>;
    userWithdrawUsd(data: any): Promise<any>;
    userWithdrawHistory(data?: any): Promise<any>;
    
    // Futures methods
    futuresGetTicker(): Promise<any>;
    futuresNewTrade(data: any): Promise<any>;
    futuresUpdateTrade(data: any): Promise<any>;
    futuresCloseTrade(id: string): Promise<any>;
    futuresCloseAllTrades(): Promise<any>;
    futuresCancelTrade(id: string): Promise<any>;
    futuresCancelAllTrades(): Promise<any>;
    futuresCashinTrade(data: any): Promise<any>;
    futuresAddMarginTrade(data: any): Promise<any>;
    futuresGetTrades(data?: any): Promise<any>;
    futuresPriceHistory(data?: any): Promise<any>;
    futuresIndexHistory(data?: any): Promise<any>;
    futuresFixingHistory(data?: any): Promise<any>;
    futuresCarryFeesHistory(data?: any): Promise<any>;
    
    // Options methods
    optionsInstruments(): Promise<any>;
    optionsInstrument(data: any): Promise<any>;
    optionsMarket(): Promise<any>;
    optionsNewTrade(data: any): Promise<any>;
    optionsGetTrades(data?: any): Promise<any>;
    optionsCloseTrade(id: string): Promise<any>;
    optionsCloseAllTrades(): Promise<any>;
    optionsUpdateSettlement(data: any): Promise<any>;
    
    // Low-level request method
    request(options: {
      method: string;
      path: string;
      data?: any;
      requireAuth?: boolean;
    }): Promise<any>;
  }

  export function createRestClient(options?: RestClientOptions): RestClient;
} 