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
function parseTimestamp(timestamp: string | undefined | null, context: string = 'unknown'): Date {
  console.log(`[parseTimestamp] Context: ${context}, Timestamp recebido:`, timestamp, typeof timestamp);
  
  if (!timestamp) {
    console.warn(`[parseTimestamp] ${context}: Timestamp ausente, usando data atual`);
    return new Date();
  }
  
  // Tentar parsear o timestamp
  let date: Date;
  
  // Se for um número (timestamp em milissegundos ou segundos)
  if (typeof timestamp === 'number' || /^\d+$/.test(timestamp)) {
    const numericTimestamp = typeof timestamp === 'number' ? timestamp : parseInt(timestamp);
    
    // Se for timestamp em segundos (< ano 2100), converter para milissegundos
    if (numericTimestamp < 4102444800) {
      date = new Date(numericTimestamp * 1000);
    } else {
      date = new Date(numericTimestamp);
    }
  } else {
    // Tentar parsear como string de data
    date = new Date(timestamp);
  }
  
  console.log(`[parseTimestamp] ${context}: Data parseada:`, date, 'Válida:', !isNaN(date.getTime()));
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn(`[parseTimestamp] ${context}: Timestamp inválido:`, timestamp, 'usando data atual');
    return new Date();
  }
  
  return date;
}

/**
 * Converte trade LN Markets para registro de lucro/perda
 */
export function convertTradeToProfit(trade: LNMarketsTrade) {
  console.log('[convertTradeToProfit] Trade completo recebido:', trade);
  console.log('[convertTradeToProfit] Campos de data disponíveis:', {
    id: trade.id,
    uid: trade.uid,
    created_at: trade.created_at,
    updated_at: trade.updated_at,
    closed_at: trade.closed_at,
    closed: trade.closed,
    pl: trade.pl
  });

  // Identificar todos os possíveis campos de data
  const possibleDateFields = {
    closed_at: trade.closed_at,
    updated_at: trade.updated_at,
    created_at: trade.created_at
  };

  console.log('[convertTradeToProfit] Campos de data encontrados:', possibleDateFields);

  // Priorizar closed_at para trades fechados, senão updated_at, senão created_at
  let timestampToUse: string | undefined;
  let dateSource: string;

  if (trade.closed && trade.closed_at) {
    timestampToUse = trade.closed_at;
    dateSource = 'closed_at';
  } else if (trade.updated_at) {
    timestampToUse = trade.updated_at;
    dateSource = 'updated_at';
  } else if (trade.created_at) {
    timestampToUse = trade.created_at;
    dateSource = 'created_at';
  }

  console.log('[convertTradeToProfit] Timestamp selecionado:', timestampToUse, 'da fonte:', dateSource);

  const tradeDate = parseTimestamp(timestampToUse, `convertTradeToProfit-${dateSource}`);
  
  const result = {
    id: `lnm_trade_${trade.uid || trade.id}`, // Usar uid se disponível, senão id
    originalId: (trade.uid || trade.id).toString(),
    date: tradeDate.toISOString().split('T')[0],
    amount: Math.abs(trade.pl),
    unit: 'SATS' as const,
    isProfit: trade.pl > 0,
    // Adicionar metadados para debug
    _debug: {
      originalTimestamp: timestampToUse,
      dateSource: dateSource,
      tradeId: trade.id,
      tradeUid: trade.uid,
      closed: trade.closed
    }
  };
  
  console.log('[convertTradeToProfit] Resultado da conversão:', result);
  return result;
}

/**
 * Converte depósito LN Markets para investimento
 */
export function convertDepositToInvestment(deposit: LNMarketsDeposit) {
  console.log('[convertDepositToInvestment] Depósito completo recebido:', deposit);
  console.log('[convertDepositToInvestment] Campos de data disponíveis:', {
    id: deposit.id,
    created_at: deposit.created_at,
    updated_at: deposit.updated_at,
    amount: deposit.amount,
    status: deposit.status,
    deposit_type: deposit.deposit_type,
    txid: deposit.txid
  });

  // Validação básica dos dados de entrada
  if (!deposit.id) {
    console.error('[convertDepositToInvestment] ID do depósito ausente');
    throw new Error('ID do depósito é obrigatório');
  }

  if (!deposit.amount || deposit.amount <= 0) {
    console.error('[convertDepositToInvestment] Valor do depósito inválido:', deposit.amount);
    throw new Error('Valor do depósito deve ser maior que zero');
  }

  if (deposit.status !== 'confirmed') {
    console.warn('[convertDepositToInvestment] Depósito não confirmado:', deposit.status);
    // Não vamos mais lançar erro aqui, deixar o código principal decidir
  }

  // Escolher a melhor data disponível (priorizar created_at)
  const possibleDateFields = {
    created_at: deposit.created_at,
    updated_at: deposit.updated_at
  };

  console.log('[convertDepositToInvestment] Campos de data encontrados:', possibleDateFields);

  let timestampToUse: string | undefined;
  let dateSource: string;

  if (deposit.created_at) {
    timestampToUse = deposit.created_at;
    dateSource = 'created_at';
  } else if (deposit.updated_at) {
    timestampToUse = deposit.updated_at;
    dateSource = 'updated_at';
  }

  console.log('[convertDepositToInvestment] Timestamp selecionado:', timestampToUse, 'da fonte:', dateSource);

  const depositDate = parseTimestamp(timestampToUse, `convertDepositToInvestment-${dateSource}`);
  
  console.log('[convertDepositToInvestment] Data parseada:', {
    originalTimestamp: timestampToUse,
    parsedDate: depositDate,
    formattedDate: depositDate.toISOString().split('T')[0],
    dateSource: dateSource
  });
  
  const result = {
    id: `lnm_deposit_${deposit.id}`,
    originalId: deposit.id.toString(),
    date: depositDate.toISOString().split('T')[0],
    amount: deposit.amount,
    unit: 'SATS' as const,
    // Adicionar metadados para debug
    _debug: {
      originalTimestamp: timestampToUse,
      dateSource: dateSource,
      depositId: deposit.id,
      status: deposit.status
    }
  };
  
  console.log('[convertDepositToInvestment] Resultado da conversão:', result);
  
  // Validação final do resultado
  if (!result.id || !result.originalId || !result.date || !result.amount || !result.unit) {
    console.error('[convertDepositToInvestment] Resultado da conversão incompleto:', result);
    throw new Error('Falha na conversão do depósito: resultado incompleto');
  }
  
  return result;
}

/**
 * Converte saque LN Markets para registro de saque
 */
export function convertWithdrawalToRecord(withdrawal: LNMarketsWithdrawal) {
  console.log('[convertWithdrawalToRecord] Saque completo recebido:', withdrawal);
  console.log('[convertWithdrawalToRecord] Campos de data disponíveis:', {
    id: withdrawal.id,
    created_at: withdrawal.created_at,
    updated_at: withdrawal.updated_at,
    amount: withdrawal.amount,
    status: withdrawal.status,
    withdrawal_type: withdrawal.withdrawal_type,
    fees: withdrawal.fees,
    txid: withdrawal.txid
  });

  // Escolher a melhor data disponível (priorizar created_at)
  const possibleDateFields = {
    created_at: withdrawal.created_at,
    updated_at: withdrawal.updated_at
  };

  console.log('[convertWithdrawalToRecord] Campos de data encontrados:', possibleDateFields);

  let timestampToUse: string | undefined;
  let dateSource: string;

  if (withdrawal.created_at) {
    timestampToUse = withdrawal.created_at;
    dateSource = 'created_at';
  } else if (withdrawal.updated_at) {
    timestampToUse = withdrawal.updated_at;
    dateSource = 'updated_at';
  }

  console.log('[convertWithdrawalToRecord] Timestamp selecionado:', timestampToUse, 'da fonte:', dateSource);

  const withdrawalDate = parseTimestamp(timestampToUse, `convertWithdrawalToRecord-${dateSource}`);
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
    // Adicionar metadados para debug
    _debug: {
      originalTimestamp: timestampToUse,
      dateSource: dateSource,
      withdrawalId: withdrawal.id,
      status: withdrawal.status,
      withdrawalType: withdrawal.withdrawal_type
    }
  };
  
  console.log('[convertWithdrawalToRecord] Resultado da conversão:', result);
  return result;
} 