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
 * Função auxiliar para validar e sanitizar valores numéricos
 */
function sanitizeNumericValue(value: any, fieldName: string, context: string): number {
  console.log(`[sanitizeNumericValue] ${context}: Validando ${fieldName}:`, value, typeof value);
  
  if (value === null || value === undefined) {
    console.warn(`[sanitizeNumericValue] ${context}: ${fieldName} é null/undefined, usando 0`);
    return 0;
  }
  
  // Se for string, tentar converter
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      console.warn(`[sanitizeNumericValue] ${context}: ${fieldName} string inválida "${value}", usando 0`);
      return 0;
    }
    console.log(`[sanitizeNumericValue] ${context}: ${fieldName} convertido de string "${value}" para ${parsed}`);
    return parsed;
  }
  
  // Se for número, verificar se é válido
  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      console.warn(`[sanitizeNumericValue] ${context}: ${fieldName} número inválido ${value}, usando 0`);
      return 0;
    }
    return value;
  }
  
  console.warn(`[sanitizeNumericValue] ${context}: ${fieldName} tipo não suportado ${typeof value}, usando 0`);
  return 0;
}

/**
 * Função auxiliar para validar IDs únicos
 */
function validateAndSanitizeId(id: any, fallbackId: any, context: string): string {
  console.log(`[validateAndSanitizeId] ${context}: Validando IDs:`, { id, fallbackId });
  
  // Priorizar uid se disponível e válido
  if (id && (typeof id === 'string' || typeof id === 'number')) {
    const sanitizedId = String(id).trim();
    if (sanitizedId.length > 0) {
      console.log(`[validateAndSanitizeId] ${context}: Usando ID principal: ${sanitizedId}`);
      return sanitizedId;
    }
  }
  
  // Usar fallback se ID principal inválido
  if (fallbackId && (typeof fallbackId === 'string' || typeof fallbackId === 'number')) {
    const sanitizedFallback = String(fallbackId).trim();
    if (sanitizedFallback.length > 0) {
      console.log(`[validateAndSanitizeId] ${context}: Usando ID fallback: ${sanitizedFallback}`);
      return sanitizedFallback;
    }
  }
  
  // Gerar ID único se ambos falharem
  const generatedId = `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.warn(`[validateAndSanitizeId] ${context}: Gerando ID único: ${generatedId}`);
  return generatedId;
}

/**
 * Função auxiliar para parsear timestamp de forma segura e criteriosa
 */
function parseTimestamp(timestamp: string | number | undefined | null, context: string = 'unknown'): Date {
  console.log(`[parseTimestamp] Context: ${context}, Timestamp recebido:`, timestamp, typeof timestamp);
  
  if (!timestamp && timestamp !== 0) {
    console.warn(`[parseTimestamp] ${context}: Timestamp ausente, usando data atual`);
    return new Date();
  }
  
  let date: Date;
  
  // Se for um número (timestamp em milissegundos ou segundos)
  if (typeof timestamp === 'number') {
    // Se for timestamp em segundos (< ano 2100), converter para milissegundos
    if (timestamp < 4102444800) {
      date = new Date(timestamp * 1000);
      console.log(`[parseTimestamp] ${context}: Convertido de segundos para milissegundos:`, timestamp, '->', timestamp * 1000);
    } else {
      date = new Date(timestamp);
      console.log(`[parseTimestamp] ${context}: Usado como milissegundos:`, timestamp);
    }
  } else if (typeof timestamp === 'string') {
    // Se for string numérica
    if (/^\d+$/.test(timestamp)) {
      const numericTimestamp = parseInt(timestamp);
      // Se for timestamp em segundos (< ano 2100), converter para milissegundos
      if (numericTimestamp < 4102444800) {
        date = new Date(numericTimestamp * 1000);
        console.log(`[parseTimestamp] ${context}: String numérica convertida de segundos:`, timestamp, '->', numericTimestamp * 1000);
      } else {
        date = new Date(numericTimestamp);
        console.log(`[parseTimestamp] ${context}: String numérica usada como milissegundos:`, timestamp);
      }
    } else {
      // Tentar parsear como string de data ISO
      date = new Date(timestamp);
      console.log(`[parseTimestamp] ${context}: Parseado como string de data:`, timestamp);
    }
  } else {
    console.warn(`[parseTimestamp] ${context}: Tipo de timestamp não suportado:`, typeof timestamp, timestamp);
    return new Date();
  }
  
  console.log(`[parseTimestamp] ${context}: Data parseada:`, date, 'Válida:', !isNaN(date.getTime()));
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn(`[parseTimestamp] ${context}: Timestamp inválido:`, timestamp, 'usando data atual');
    return new Date();
  }
  
  // Verificar se a data não é muito antiga (antes de 2010) ou muito futura (depois de 2030)
  const year = date.getFullYear();
  if (year < 2010 || year > 2030) {
    console.warn(`[parseTimestamp] ${context}: Data suspeita (${year}):`, date, 'timestamp original:', timestamp);
    // Não vamos usar data atual aqui, mas vamos logar o aviso
  }
  
  return date;
}

/**
 * Função auxiliar para selecionar a melhor data disponível com prioridade criteriosa
 */
function selectBestTimestamp(
  possibleFields: Record<string, string | number | undefined | null>,
  priorityOrder: string[],
  context: string
): { timestamp: string | number | undefined; source: string } {
  console.log(`[selectBestTimestamp] ${context}: Campos disponíveis:`, possibleFields);
  console.log(`[selectBestTimestamp] ${context}: Ordem de prioridade:`, priorityOrder);
  
  for (const fieldName of priorityOrder) {
    const value = possibleFields[fieldName];
    if (value !== undefined && value !== null && value !== '') {
      console.log(`[selectBestTimestamp] ${context}: Selecionado campo '${fieldName}' com valor:`, value);
      return { timestamp: value, source: fieldName };
    }
  }
  
  console.warn(`[selectBestTimestamp] ${context}: Nenhum campo de data válido encontrado, usando data atual`);
  return { timestamp: Date.now(), source: 'fallback_current_time' };
}

/**
 * Converte trade LN Markets para registro de lucro/perda
 */
export function convertTradeToProfit(trade: LNMarketsTrade) {
  console.log('[convertTradeToProfit] Trade completo recebido:', trade);
  
  // Validação básica dos dados de entrada
  if (!trade) {
    console.error('[convertTradeToProfit] Trade é null/undefined');
    throw new Error('Trade é obrigatório para conversão');
  }

  console.log('[convertTradeToProfit] Campos de data disponíveis:', {
    id: trade.id,
    uid: trade.uid,
    created_at: trade.created_at,
    updated_at: trade.updated_at,
    closed_at: trade.closed_at,
    ts: trade.ts,
    closed: trade.closed,
    pl: trade.pl,
    side: trade.side,
    quantity: trade.quantity
  });

  // Validar e sanitizar ID único
  const tradeIdentifier = validateAndSanitizeId(trade.uid, trade.id, 'convertTradeToProfit');

  // Validar e sanitizar valor do PL
  const sanitizedPL = sanitizeNumericValue(trade.pl, 'pl', 'convertTradeToProfit');
  if (sanitizedPL === 0 && trade.pl !== 0) {
    console.error('[convertTradeToProfit] Valor PL inválido após sanitização:', trade.pl);
    throw new Error('Trade deve ter valor PL válido');
  }

  // Identificar todos os possíveis campos de data com prioridade criteriosa
  const possibleDateFields = {
    closed_at: trade.closed_at,     // Data de fechamento (mais importante para trades fechados)
    ts: trade.ts,                   // Timestamp preciso (novos formatos)
    updated_at: trade.updated_at,   // Data de atualização
    created_at: trade.created_at    // Data de criação (fallback)
  };

  console.log('[convertTradeToProfit] Campos de data encontrados:', possibleDateFields);

  // Prioridade criteriosa: closed_at (se fechado) > ts > updated_at > created_at
  const priorityOrder = trade.closed && trade.closed_at 
    ? ['closed_at', 'ts', 'updated_at', 'created_at']
    : ['ts', 'closed_at', 'updated_at', 'created_at'];

  const { timestamp: timestampToUse, source: dateSource } = selectBestTimestamp(
    possibleDateFields,
    priorityOrder,
    'convertTradeToProfit'
  );

  console.log('[convertTradeToProfit] Timestamp selecionado:', timestampToUse, 'da fonte:', dateSource);

  const tradeDate = parseTimestamp(timestampToUse, `convertTradeToProfit-${dateSource}`);
  
  console.log('[convertTradeToProfit] Data parseada:', {
    originalTimestamp: timestampToUse,
    parsedDate: tradeDate,
    formattedDate: tradeDate.toISOString().split('T')[0],
    dateSource: dateSource,
    tradeStatus: trade.closed ? 'fechado' : 'aberto'
  });

  const result = {
    id: `lnm_trade_${tradeIdentifier}`, // Usar uid se disponível, senão id
    originalId: `trade_${tradeIdentifier}`, // Prefixo para evitar conflitos
    date: tradeDate.toISOString().split('T')[0],
    amount: Math.abs(sanitizedPL),
    unit: 'SATS' as const,
    isProfit: sanitizedPL > 0,
    // Adicionar metadados para debug
    _debug: {
      originalTimestamp: timestampToUse,
      dateSource: dateSource,
      tradeId: trade.id,
      tradeUid: trade.uid,
      closed: trade.closed,
      side: trade.side,
      quantity: trade.quantity,
      originalPL: trade.pl,
      sanitizedPL: sanitizedPL,
      allTimestamps: {
        closed_at: trade.closed_at,
        ts: trade.ts,
        updated_at: trade.updated_at,
        created_at: trade.created_at
      }
    }
  };
  
  console.log('[convertTradeToProfit] Resultado da conversão:', result);
  
  // Validação final do resultado
  if (!result.id || !result.originalId || !result.date || result.amount === undefined || !result.unit) {
    console.error('[convertTradeToProfit] Resultado da conversão incompleto:', result);
    throw new Error('Falha na conversão do trade: resultado incompleto');
  }
  
  return result;
}

/**
 * Converte depósito LN Markets para investimento
 */
export function convertDepositToInvestment(deposit: LNMarketsDeposit) {
  console.log('[convertDepositToInvestment] Depósito completo recebido:', deposit);
  
  // Validação básica dos dados de entrada
  if (!deposit) {
    console.error('[convertDepositToInvestment] Depósito é null/undefined');
    throw new Error('Depósito é obrigatório para conversão');
  }

  console.log('[convertDepositToInvestment] Campos de data disponíveis:', {
    id: deposit.id,
    type: deposit.type,
    created_at: deposit.created_at,
    updated_at: deposit.updated_at,
    ts: deposit.ts,
    amount: deposit.amount,
    status: deposit.status,
    deposit_type: deposit.deposit_type,
    txid: deposit.txid,
    tx_id: deposit.tx_id,
    from_username: deposit.from_username,
    is_confirmed: deposit.is_confirmed,
    isConfirmed: deposit.isConfirmed,
    success: deposit.success
  });

  // Validar e sanitizar ID único
  const depositIdentifier = validateAndSanitizeId(deposit.id, null, 'convertDepositToInvestment');

  // Validar e sanitizar valor do depósito
  const sanitizedAmount = sanitizeNumericValue(deposit.amount, 'amount', 'convertDepositToInvestment');
  if (sanitizedAmount <= 0) {
    console.error('[convertDepositToInvestment] Valor do depósito inválido após sanitização:', deposit.amount);
    throw new Error('Valor do depósito deve ser maior que zero');
  }

  // Escolher a melhor data disponível com prioridade criteriosa
  const possibleDateFields = {
    ts: deposit.ts,                     // Timestamp mais preciso (usado em novos formatos)
    created_at: deposit.created_at,     // Data de criação tradicional
    updated_at: deposit.updated_at      // Data de atualização como fallback
  };

  console.log('[convertDepositToInvestment] Campos de data encontrados:', possibleDateFields);

  // Prioridade: ts > created_at > updated_at
  const { timestamp: timestampToUse, source: dateSource } = selectBestTimestamp(
    possibleDateFields,
    ['ts', 'created_at', 'updated_at'],
    'convertDepositToInvestment'
  );

  console.log('[convertDepositToInvestment] Timestamp selecionado:', timestampToUse, 'da fonte:', dateSource);

  const depositDate = parseTimestamp(timestampToUse, `convertDepositToInvestment-${dateSource}`);
  
  console.log('[convertDepositToInvestment] Data parseada:', {
    originalTimestamp: timestampToUse,
    parsedDate: depositDate,
    formattedDate: depositDate.toISOString().split('T')[0],
    dateSource: dateSource,
    depositType: deposit.type || deposit.deposit_type
  });
  
  const result = {
    id: `lnm_deposit_${depositIdentifier}`,
    originalId: `deposit_${depositIdentifier}`, // Prefixo para evitar conflitos
    date: depositDate.toISOString().split('T')[0],
    amount: sanitizedAmount,
    unit: 'SATS' as const,
    // Adicionar metadados para debug
    _debug: {
      originalTimestamp: timestampToUse,
      dateSource: dateSource,
      depositId: deposit.id,
      status: deposit.status,
      type: deposit.type || deposit.deposit_type,
      is_confirmed: deposit.is_confirmed,
      isConfirmed: deposit.isConfirmed,
      success: deposit.success,
      originalAmount: deposit.amount,
      sanitizedAmount: sanitizedAmount
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
  
  // Validação básica dos dados de entrada
  if (!withdrawal) {
    console.error('[convertWithdrawalToRecord] Saque é null/undefined');
    throw new Error('Saque é obrigatório para conversão');
  }

  console.log('[convertWithdrawalToRecord] Campos de data disponíveis:', {
    id: withdrawal.id,
    type: withdrawal.type,
    created_at: withdrawal.created_at,
    updated_at: withdrawal.updated_at,
    ts: withdrawal.ts,
    amount: withdrawal.amount,
    status: withdrawal.status,
    withdrawal_type: withdrawal.withdrawal_type,
    fees: withdrawal.fees,
    txid: withdrawal.txid,
    tx_id: withdrawal.tx_id
  });

  // Validar e sanitizar ID único
  const withdrawalIdentifier = validateAndSanitizeId(withdrawal.id, null, 'convertWithdrawalToRecord');

  // Validar e sanitizar valor do saque
  const sanitizedAmount = sanitizeNumericValue(withdrawal.amount, 'amount', 'convertWithdrawalToRecord');
  if (sanitizedAmount <= 0) {
    console.error('[convertWithdrawalToRecord] Valor do saque inválido após sanitização:', withdrawal.amount);
    throw new Error('Valor do saque deve ser maior que zero');
  }

  // Validar e sanitizar taxa
  const sanitizedFee = sanitizeNumericValue(withdrawal.fees, 'fees', 'convertWithdrawalToRecord');

  // Escolher a melhor data disponível com prioridade criteriosa
  const possibleDateFields = {
    ts: withdrawal.ts,                     // Timestamp mais preciso (usado em novos formatos)
    created_at: withdrawal.created_at,     // Data de criação tradicional
    updated_at: withdrawal.updated_at      // Data de atualização como fallback
  };

  console.log('[convertWithdrawalToRecord] Campos de data encontrados:', possibleDateFields);

  // Prioridade: ts > created_at > updated_at
  const { timestamp: timestampToUse, source: dateSource } = selectBestTimestamp(
    possibleDateFields,
    ['ts', 'created_at', 'updated_at'],
    'convertWithdrawalToRecord'
  );

  console.log('[convertWithdrawalToRecord] Timestamp selecionado:', timestampToUse, 'da fonte:', dateSource);

  const withdrawalDate = parseTimestamp(timestampToUse, `convertWithdrawalToRecord-${dateSource}`);
  
  // Determinar tipo de saque com mais flexibilidade
  let withdrawalType: 'lightning' | 'onchain' = 'onchain'; // padrão
  if (withdrawal.withdrawal_type === 'ln' || withdrawal.type === 'lightning') {
    withdrawalType = 'lightning';
  } else if (withdrawal.withdrawal_type === 'onchain' || withdrawal.type === 'bitcoin' || withdrawal.txid || withdrawal.tx_id) {
    withdrawalType = 'onchain';
  }
  
  console.log('[convertWithdrawalToRecord] Data parseada:', {
    originalTimestamp: timestampToUse,
    parsedDate: withdrawalDate,
    formattedDate: withdrawalDate.toISOString().split('T')[0],
    dateSource: dateSource,
    withdrawalType: withdrawalType,
    originalType: withdrawal.type || withdrawal.withdrawal_type
  });
  
  const result = {
    id: `lnm_withdrawal_${withdrawalIdentifier}`,
    originalId: `withdrawal_${withdrawalIdentifier}`, // Prefixo para evitar conflitos
    date: withdrawalDate.toISOString().split('T')[0],
    amount: sanitizedAmount,
    unit: 'SATS' as const,
    fee: sanitizedFee,
    type: withdrawalType,
    txid: withdrawal.txid || withdrawal.tx_id,
    // Adicionar metadados para debug
    _debug: {
      originalTimestamp: timestampToUse,
      dateSource: dateSource,
      withdrawalId: withdrawal.id,
      status: withdrawal.status,
      type: withdrawal.type,
      withdrawalType: withdrawal.withdrawal_type,
      originalAmount: withdrawal.amount,
      sanitizedAmount: sanitizedAmount,
      originalFees: withdrawal.fees,
      sanitizedFee: sanitizedFee,
      allTimestamps: {
        ts: withdrawal.ts,
        created_at: withdrawal.created_at,
        updated_at: withdrawal.updated_at
      }
    }
  };
  
  console.log('[convertWithdrawalToRecord] Resultado da conversão:', result);
  
  // Validação final do resultado
  if (!result.id || !result.originalId || !result.date || !result.amount || !result.unit) {
    console.error('[convertWithdrawalToRecord] Resultado da conversão incompleto:', result);
    throw new Error('Falha na conversão do saque: resultado incompleto');
  }
  
  return result;
} 