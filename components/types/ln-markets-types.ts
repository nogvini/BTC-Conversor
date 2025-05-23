// Tipos para LN Markets API
export interface LNMarketsCredentials {
  apiKey: string;
  apiSecret: string;
  apiPassphrase: string;
  network: 'mainnet' | 'testnet';
  isConfigured: boolean;
}

// Tipo para trade da LN Markets
export interface LNMarketsTrade {
  id: string;
  uid: string;
  type: 'm' | 'l'; // market ou limit
  side: 'b' | 's'; // buy ou sell
  opening_fee: number;
  closing_fee: number;
  maintenance_margin: number;
  quantity: number;
  margin: number;
  leverage: number;
  price: number;
  liquidation: number;
  stoploss: number;
  takeprofit: number;
  exit_price: number;
  pl: number; // profit/loss
  creation_ts: number;
  market_filled_ts: number;
  closed_ts: number;
  entry_price: number | null;
  entry_margin: number | null;
  open: boolean;
  running: boolean;
  canceled: boolean;
  closed: boolean;
  sum_carry_fees: number;
}

// Tipo para depósito da LN Markets
export interface LNMarketsDeposit {
  id: string;
  amount: number;
  status: string;
  created_at: number;
  updated_at: number;
  txid?: string;
  type: 'onchain' | 'lightning';
}

// Tipo para saque da LN Markets
export interface LNMarketsWithdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: number;
  updated_at: number;
  txid?: string;
  type: 'onchain' | 'lightning';
  fee?: number;
}

// Tipo para configuração do cliente LN Markets
export interface LNMarketsClientConfig {
  network: 'mainnet' | 'testnet';
  key: string;
  secret: string;
  passphrase: string;
  version?: string;
}

// Tipo para resposta da API
export interface LNMarketsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Enum para status de importação
export enum ImportStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Tipo para estatísticas de importação LN Markets
export interface LNMarketsImportStats {
  trades: {
    total: number;
    imported: number;
    duplicated: number;
    errors: number;
  };
  deposits: {
    total: number;
    imported: number;
    duplicated: number;
    errors: number;
  };
  withdrawals: {
    total: number;
    imported: number;
    duplicated: number;
    errors: number;
  };
} 