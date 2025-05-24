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
 * Converte trade LN Markets para registro de lucro/perda
 */
export function convertTradeToProfit(trade: LNMarketsTrade) {
  return {
    id: `lnm_trade_${trade.id}`,
    originalId: trade.id.toString(),
    date: new Date(trade.closed_at || trade.updated_at).toISOString().split('T')[0],
    amount: Math.abs(trade.pl),
    unit: 'SATS' as const,
    isProfit: trade.pl > 0,
  };
}

/**
 * Converte depósito LN Markets para investimento
 */
export function convertDepositToInvestment(deposit: LNMarketsDeposit) {
  return {
    id: `lnm_deposit_${deposit.id}`,
    originalId: deposit.id.toString(),
    date: new Date(deposit.created_at).toISOString().split('T')[0],
    amount: deposit.amount,
    unit: 'SATS' as const,
  };
}

/**
 * Converte saque LN Markets para registro de saque
 */
export function convertWithdrawalToRecord(withdrawal: LNMarketsWithdrawal) {
  const withdrawalType = withdrawal.withdrawal_type === 'ln' ? 'lightning' : 'onchain';
  
  return {
    id: `lnm_withdrawal_${withdrawal.id}`,
    originalId: withdrawal.id.toString(),
    date: new Date(withdrawal.created_at).toISOString().split('T')[0],
    amount: withdrawal.amount,
    unit: 'SATS' as const,
    fee: withdrawal.fees || 0,
    type: withdrawalType as 'lightning' | 'onchain',
    txid: withdrawal.txid,
  };
} 