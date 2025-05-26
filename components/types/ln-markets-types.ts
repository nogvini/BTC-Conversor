// Tipos para LN Markets API
export interface LNMarketsCredentials {
  key: string;
  secret: string;
  passphrase: string;
  network: 'mainnet' | 'testnet';
  isConfigured: boolean;
}

// Enum para status de importação
export enum ImportStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Tipo para estatísticas de categoria de importação
export interface ImportCategoryStats {
  total: number;
  imported: number;
  duplicated: number;
  errors: number;
}

// NOVO: Configuração individual da API LN Markets
export interface LNMarketsAPIConfig {
  id: string; // UUID único
  name: string; // Nome dado pelo usuário (ex: "Conta Principal", "Trading Account")
  description?: string; // Descrição opcional
  credentials: LNMarketsCredentials;
  isActive: boolean; // Se a configuração está ativa
  createdAt: string; // Data de criação
  updatedAt: string; // Data da última atualização
  lastUsed?: string; // Data do último uso
}

// NOVO: Gerenciador de múltiplas configurações
export interface LNMarketsMultipleConfig {
  configs: LNMarketsAPIConfig[];
  defaultConfigId?: string; // ID da configuração padrão
  lastUpdated: string;
}

// NOVO: Estado de importação por configuração
export interface LNMarketsConfigImportStats {
  configId: string;
  configName: string;
  trades: ImportCategoryStats;
  deposits: ImportCategoryStats;
  withdrawals: ImportCategoryStats;
  lastImport?: string;
}

// Tipo para trade da LN Markets
export interface LNMarketsTrade {
  id: number;
  uid: string;
  type: 'm' | 'l'; // market ou limit
  side: 'b' | 's'; // buy ou sell
  opening_fee: number;
  closing_fee: number;
  quantity: number;
  margin: number;
  leverage: number;
  price: number;
  liquidation: number;
  stoploss?: number;
  takeprofit?: number;
  exit_price?: number;
  pl: number; // profit/loss
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  closed_at?: string; // ISO date string
  ts?: number; // Timestamp preciso em milissegundos
  entry_price: number | null;
  open: boolean;
  running: boolean;
  canceled: boolean;
  closed: boolean;
  sum_carry_fees?: number;
}

// Tipo para depósito da LN Markets
export interface LNMarketsDeposit {
  id: number | string;
  amount: number;
  status?: string;
  type?: string; // Tipo do depósito: 'bitcoin', 'internal', 'lightning'
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  ts?: number; // Timestamp preciso em milissegundos
  txid?: string;
  tx_id?: string; // ID da transação (formato alternativo)
  deposit_type?: string;
  from_username?: string; // Para depósitos internos
  // Diferentes atributos de confirmação
  isConfirmed?: boolean; // Formato tradicional
  is_confirmed?: boolean; // Formato on-chain
  success?: boolean; // Formato interno
}

// Tipo para saque da LN Markets
export interface LNMarketsWithdrawal {
  id: number | string;
  amount: number;
  status?: string;
  type?: string; // Tipo do saque: 'bitcoin', 'lightning'
  created_at?: string; // ISO date string
  updated_at?: string; // ISO date string
  ts?: number; // Timestamp preciso em milissegundos
  txid?: string;
  tx_id?: string; // ID da transação (formato alternativo)
  withdrawal_type?: string;
  fees?: number;
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

// Tipo para estatísticas de importação LN Markets (versão simplificada para compatibilidade)
export interface LNMarketsImportStats {
  trades: ImportCategoryStats;
  deposits: ImportCategoryStats;
  withdrawals: ImportCategoryStats;
} 