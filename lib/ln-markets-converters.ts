import type {
  LNMarketsTrade,
  LNMarketsDeposit,
  LNMarketsWithdrawal
} from '@/components/types/ln-markets-types';

/**
 * Função auxiliar para converter valores para BTC
 */
function convertToBtc(amount: number, unit: 'SATS' | 'BTC' | 'USD' | 'BRL'): number {
  switch (unit) {
    case 'SATS':
      return amount / 100000000; // 1 BTC = 100,000,000 satoshis
    case 'BTC':
      return amount;
    case 'USD':
    case 'BRL':
      // Para USD/BRL, não podemos converter sem taxa de câmbio
      // Retornamos 0 ou poderíamos lançar erro
      return 0;
    default:
      return 0;
  }
}

/**
 * Função auxiliar para parsear timestamp de forma segura
 */
function parseTimestamp(timestamp: string | undefined | null): Date {
  if (!timestamp) {
    console.warn('[convertTradeToProfit] Timestamp ausente, usando data atual');
    return new Date();
  }
  
  // Tentar parsear o timestamp
  const date = new Date(timestamp);
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn('[convertTradeToProfit] Timestamp inválido:', timestamp, 'usando data atual');
    return new Date();
  }
  
  return date;
}

/**
 * Converte trade LN Markets para registro de lucro/perda
 */
export function convertTradeToProfit(trade: LNMarketsTrade) {
  console.log('[convertTradeToProfit] Convertendo trade:', {
    id: trade.id,
    closed_at: trade.closed_at,
    updated_at: trade.updated_at,
    pl: trade.pl
  });

  // Usar closed_at se disponível, senão updated_at, senão data atual
  const timestampToUse = trade.closed_at || trade.updated_at;
  const tradeDate = parseTimestamp(timestampToUse);
  
  const result = {
    id: `lnm_trade_${trade.id}`,
    originalId: trade.id.toString(),
    date: tradeDate.toISOString().split('T')[0],
    amount: Math.abs(trade.pl),
    unit: 'SATS' as const,
    isProfit: trade.pl > 0,
  };
  
  console.log('[convertTradeToProfit] Resultado da conversão:', result);
  return result;
}

/**
 * Converte depósito LN Markets para investimento
 */
export function convertDepositToInvestment(deposit: LNMarketsDeposit) {
  console.log('[convertDepositToInvestment] Convertendo depósito:', {
    id: deposit.id,
    created_at: deposit.created_at,
    amount: deposit.amount
  });

  const depositDate = parseTimestamp(deposit.created_at);
  
  const result = {
    id: `lnm_deposit_${deposit.id}`,
    originalId: deposit.id.toString(),
    date: depositDate.toISOString().split('T')[0],
    amount: deposit.amount,
    unit: 'SATS' as const,
  };
  
  console.log('[convertDepositToInvestment] Resultado da conversão:', result);
  return result;
}

/**
 * Converte saque LN Markets para registro de saque
 */
export function convertWithdrawalToRecord(withdrawal: LNMarketsWithdrawal) {
  console.log('[convertWithdrawalToRecord] Convertendo saque:', {
    id: withdrawal.id,
    created_at: withdrawal.created_at,
    amount: withdrawal.amount,
    withdrawal_type: withdrawal.withdrawal_type
  });

  const withdrawalDate = parseTimestamp(withdrawal.created_at);
  const withdrawalType = withdrawal.withdrawal_type === 'ln' ? 'lightning' : 'onchain';
  
  const result = {
    id: `lnm_withdrawal_${withdrawal.id}`,
    originalId: withdrawal.id.toString(),
    date: withdrawalDate.toISOString().split('T')[0],
    amount: withdrawal.amount,
    unit: 'SATS' as const,
    fee: withdrawal.fees || 0,
    type: withdrawalType as 'lightning' | 'onchain',
    txid: withdrawal.txid,
  };
  
  console.log('[convertWithdrawalToRecord] Resultado da conversão:', result);
  return result;
} 