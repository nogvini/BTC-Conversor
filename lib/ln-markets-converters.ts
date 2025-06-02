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
 * Função auxiliar para parsear timestamp de forma segura e criteriosa
 * Baseada na documentação da API LN Markets que usa timestamps em milissegundos
 */
function parseTimestamp(timestamp: string | number | undefined | null, context: string = 'unknown'): Date {
  console.log(`[parseTimestamp] Context: ${context}, Timestamp recebido:`, timestamp, typeof timestamp);
  
  if (!timestamp && timestamp !== 0) {
    console.warn(`[parseTimestamp] ${context}: Timestamp ausente, usando data atual`);
    return new Date();
  }
  
  let date: Date;
  
  // Se for um número (timestamp em milissegundos conforme documentação LN Markets)
  if (typeof timestamp === 'number') {
    // A API LN Markets usa timestamps em milissegundos
    // Verificar se é um timestamp válido (entre 2010 e 2030)
    const testDate = new Date(timestamp);
    const year = testDate.getFullYear();
    
    if (year >= 2010 && year <= 2030) {
      date = testDate;
      console.log(`[parseTimestamp] ${context}: Usado como milissegundos:`, timestamp);
    } else {
      // Se não for válido como milissegundos, tentar como segundos
      date = new Date(timestamp * 1000);
      console.log(`[parseTimestamp] ${context}: Convertido de segundos para milissegundos:`, timestamp, '->', timestamp * 1000);
    }
  } else if (typeof timestamp === 'string') {
    // Se for string numérica
    if (/^\d+$/.test(timestamp)) {
      const numericTimestamp = parseInt(timestamp);
      
      // Verificar se é um timestamp válido em milissegundos
      const testDate = new Date(numericTimestamp);
      const year = testDate.getFullYear();
      
      if (year >= 2010 && year <= 2030) {
        date = testDate;
        console.log(`[parseTimestamp] ${context}: String numérica usada como milissegundos:`, timestamp);
      } else {
        // Se não for válido como milissegundos, tentar como segundos
        date = new Date(numericTimestamp * 1000);
        console.log(`[parseTimestamp] ${context}: String numérica convertida de segundos:`, timestamp, '->', numericTimestamp * 1000);
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
  
  // Verificar se a data está em um range razoável
  const year = date.getFullYear();
  if (year < 2010 || year > 2030) {
    console.warn(`[parseTimestamp] ${context}: Data fora do range esperado (${year}):`, date, 'timestamp original:', timestamp);
    // Ainda retornamos a data, mas logamos o aviso
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
  
  // Primeiro passo: verificar se há campos válidos não vazios
  const nonEmptyFields = Object.entries(possibleFields).filter(([key, value]) => {
    const isValid = value !== undefined && value !== null && value !== '' && value !== 0;
    if (!isValid && value !== undefined) {
      console.log(`[selectBestTimestamp] ${context}: Campo '${key}' inválido/vazio:`, value, typeof value);
    }
    return isValid;
  });
  
  console.log(`[selectBestTimestamp] ${context}: Campos não vazios encontrados:`, nonEmptyFields.map(([k, v]) => `${k}: ${v}`));
  
  for (const fieldName of priorityOrder) {
    const value = possibleFields[fieldName];
    if (value !== undefined && value !== null && value !== '' && value !== 0) {
      console.log(`[selectBestTimestamp] ${context}: ✅ Selecionado campo '${fieldName}' com valor:`, value, typeof value);
      return { timestamp: value, source: fieldName };
    } else {
      console.log(`[selectBestTimestamp] ${context}: ❌ Campo '${fieldName}' inválido:`, value, typeof value);
    }
  }
  
  // Se chegou aqui, não há campos válidos
  console.error(`[selectBestTimestamp] ${context}: ⚠️ PROBLEMA: Nenhum campo de data válido encontrado!`);
  console.error(`[selectBestTimestamp] ${context}: Campos recebidos:`, JSON.stringify(possibleFields, null, 2));
  console.error(`[selectBestTimestamp] ${context}: Usando data atual como fallback - ISTO PODE ESTAR CAUSANDO O PROBLEMA DAS DATAS!`);
  
  return { timestamp: Date.now(), source: 'fallback_current_time' };
}

/**
 * Converte trade LN Markets para registro de lucro/perda
 */
export function convertTradeToProfit(trade: LNMarketsTrade, sourceInfo?: { configId: string; configName: string }) {
  console.log('[convertTradeToProfit] Trade completo recebido:', trade);
  console.log('[convertTradeToProfit] Campos de data disponíveis:', {
    id: trade.id,
    uid: trade.uid,
    creation_ts: trade.creation_ts,
    market_filled_ts: trade.market_filled_ts,
    closed_ts: trade.closed_ts,
    last_update_ts: trade.last_update_ts,
    closed: trade.closed,
    pl: trade.pl,
    opening_fee: trade.opening_fee,
    closing_fee: trade.closing_fee,
    side: trade.side,
    quantity: trade.quantity
  });

  // Para trades fechados, usar SEMPRE closed_ts como prioridade absoluta
  // Para trades abertos, usar market_filled_ts ou creation_ts
  let timestampToUse: string | number | undefined;
  let dateSource: string;

  if (trade.closed && trade.closed_ts) {
    // Trade fechado: usar closed_ts obrigatoriamente
    timestampToUse = trade.closed_ts;
    dateSource = 'closed_ts';
    console.log('[convertTradeToProfit] Trade fechado - usando closed_ts:', timestampToUse);
  } else {
    // Trade aberto ou sem closed_ts: usar fallback
  const possibleDateFields = {
      market_filled_ts: trade.market_filled_ts,
      creation_ts: trade.creation_ts,
      last_update_ts: trade.last_update_ts
    };

    const { timestamp, source } = selectBestTimestamp(
    possibleDateFields,
      ['market_filled_ts', 'creation_ts', 'last_update_ts'],
      'convertTradeToProfit-fallback'
  );

    timestampToUse = timestamp;
    dateSource = source;
    console.log('[convertTradeToProfit] Trade aberto/sem closed_ts - usando fallback:', timestampToUse, 'da fonte:', dateSource);
  }

  const tradeDate = parseTimestamp(timestampToUse, `convertTradeToProfit-${dateSource}`);
  
  console.log('[convertTradeToProfit] Data parseada:', {
    originalTimestamp: timestampToUse,
    parsedDate: tradeDate,
    formattedDate: tradeDate.toISOString().split('T')[0],
    dateSource: dateSource,
    tradeStatus: trade.closed ? 'fechado' : 'aberto'
  });

  // Validar e criar ID único - CORRIGIDO!
  let tradeIdentifier = trade.uid || trade.id;
  if (!tradeIdentifier) {
    console.error('[convertTradeToProfit] Trade sem identificador válido:', trade);
    throw new Error('Trade deve ter uid ou id válido');
  }

  // CORREÇÃO CRÍTICA: Se o ID já tiver o prefixo "trade_", remover para evitar duplicação
  if (typeof tradeIdentifier === 'string' && tradeIdentifier.startsWith('trade_')) {
    tradeIdentifier = tradeIdentifier.substring(6); // Remover o prefixo 'trade_'
    console.log('[convertTradeToProfit] ID já tem prefixo, removendo:', tradeIdentifier);
  }

  // CORREÇÃO AMPLIADA: Cálculo mais flexível do valor PL
  // Calcular PL com base nos dados disponíveis
  let plValue: number;
  
  // CASO 1: PL está disponível diretamente
  if (trade.pl !== undefined && trade.pl !== null) {
    // Converter para número
    plValue = Number(trade.pl);
    
    // Se o PL está como string, tentar extrair valor numérico
    if (isNaN(plValue) && typeof trade.pl === 'string') {
      try {
        // Remover caracteres não numéricos
        const cleanedString = trade.pl.replace(/[^0-9.-]+/g, '');
        plValue = parseFloat(cleanedString);
        console.log('[convertTradeToProfit] PL extraído de string:', trade.pl, '->', plValue);
      } catch (e) {
        console.warn('[convertTradeToProfit] Erro ao extrair PL de string:', e);
        plValue = 0;
      }
    }
    
    // Verificar se o valor está muito pequeno (menos de 1 satoshi), o que indicaria um erro de unidade
    if (Math.abs(plValue) > 0 && Math.abs(plValue) < 1) {
      console.warn('[convertTradeToProfit] Valor PL muito pequeno, convertendo para satoshis:', plValue);
      // Multiplicar por 100000000 para converter de BTC para satoshis
      plValue = plValue * 100000000;
      console.log('[convertTradeToProfit] Valor convertido para satoshis:', plValue);
    }
  }
  // CASO 2: PL não está disponível - tentar calcular a partir de outros campos
  else if (trade.side && trade.quantity && (trade.price || trade.price_index || trade.entry_price)) {
    console.log('[convertTradeToProfit] PL não disponível, tentando calcular de side/quantity/price');
    
    // Tentar calcular com dados disponíveis
    const quantity = Number(trade.quantity);
    const price = Number(trade.price || trade.price_index || trade.entry_price || 0);
    const side = trade.side.toLowerCase();
    
    if (!isNaN(quantity) && !isNaN(price) && price > 0) {
      // Cálculo simplificado - este é um fallback aproximado
      // Long: ganho quando preço sobe
      // Short: ganho quando preço cai
      const isLong = side === 'l' || side === 'long' || side === 'buy';
      const estimatedPL = isLong ? quantity * price * 0.01 : quantity * price * -0.01;
      
      plValue = Math.abs(estimatedPL);
      console.log('[convertTradeToProfit] PL estimado de side/quantity/price:', {
        side,
        isLong,
        quantity,
        price,
        plValue
      });
    } else {
      // Não foi possível calcular
      console.warn('[convertTradeToProfit] Impossível calcular PL de side/quantity/price - usando valor padrão');
      plValue = 0.0001; // Valor mínimo positivo como fallback
    }
  } else {
    // Não foi possível determinar o PL - usar valor mínimo como fallback
    console.warn('[convertTradeToProfit] PL indeterminado - usando valor padrão mínimo');
    plValue = 0.0001; // Valor mínimo positivo como fallback
  }
  
  // Verificar se o PL é positivo ou negativo
  const isProfit = trade.pl > 0;
  
  // Log detalhado do processo
  console.log('[convertTradeToProfit] Trade processado:', {
    id: tradeIdentifier,
    date: tradeDate.toISOString(),
    pl: plValue,
    isProfit,
    btcAmount: Math.abs(plValue) / 100000000
  });
  
  // Criar o objeto de retorno
  const result = {
    id: `trade_${tradeIdentifier}`, // Prefixo para evitar colisões com outros IDs
    originalId: tradeIdentifier.toString(),
    date: tradeDate.toISOString(),
    amount: Math.abs(plValue) / 100000000, // Converter satoshis para BTC
    unit: "BTC" as "BTC" | "SATS",
    isProfit: isProfit,
    // Incluir informações de origem, se fornecidas
    sourceConfigId: sourceInfo?.configId,
    sourceConfigName: sourceInfo?.configName,
    importedAt: new Date().toISOString()
  };

  return result;
}

/**
 * Converte depósito LN Markets para registro de investimento
 */
export function convertDepositToInvestment(deposit: LNMarketsDeposit, sourceInfo?: { configId: string; configName: string }) {
  console.log('[convertDepositToInvestment] 🔍 ANÁLISE DETALHADA DO DEPÓSITO');
  console.log('[convertDepositToInvestment] Depósito completo recebido:', deposit);
  console.log('[convertDepositToInvestment] Campos de data disponíveis:', {
    confirmed_at: deposit.confirmed_at,
    timestamp: deposit.timestamp,
    created_at: deposit.created_at,
    updated_at: deposit.updated_at,
    ts: deposit.ts // Às vezes vem como 'ts' em vez de 'timestamp'
  });

  // Prioridade para timestamp de confirmação
  let timestampToUse: string | number | undefined;
  let dateSource: string;

  const possibleDateFields = {
    confirmed_at: deposit.confirmed_at,
    timestamp: deposit.timestamp,
    ts: deposit.ts, // ADICIONADO: Às vezes vem como 'ts'
    created_at: deposit.created_at,
    updated_at: deposit.updated_at
  };

  // ADICIONADO: Log das verificações de cada campo individualmente
  console.log('[convertDepositToInvestment] 📋 Verificação individual dos campos:');
  Object.entries(possibleDateFields).forEach(([key, value]) => {
    console.log(`  ${key}: ${value} (tipo: ${typeof value}) (válido: ${value !== undefined && value !== null && value !== '' && value !== 0})`);
  });

  const { timestamp, source } = selectBestTimestamp(
    possibleDateFields,
    ['confirmed_at', 'timestamp', 'ts', 'created_at', 'updated_at'], // ADICIONADO: 'ts' na prioridade
    'convertDepositToInvestment'
  );

  timestampToUse = timestamp;
  dateSource = source;

  console.log('[convertDepositToInvestment] 🎯 Campo selecionado:', {
    campo: dateSource,
    valor: timestampToUse,
    tipo: typeof timestampToUse
  });

  // Parsear data
  const depositDate = parseTimestamp(timestampToUse, `convertDepositToInvestment-${dateSource}`);
  
  console.log('[convertDepositToInvestment] 📅 Data parseada:', {
    originalTimestamp: timestampToUse,
    parsedDate: depositDate,
    formattedDate: depositDate.toISOString(),
    dateSource,
    isToday: depositDate.toDateString() === new Date().toDateString() // ADICIONADO: Verificar se é hoje
  });

  // Se a data for hoje, isso pode indicar um problema
  if (depositDate.toDateString() === new Date().toDateString() && dateSource === 'fallback_current_time') {
    console.error('[convertDepositToInvestment] ⚠️ ALERTA: Data definida como hoje devido ao fallback!');
    console.error('[convertDepositToInvestment] Isso indica que nenhum campo de data válido foi encontrado no depósito.');
    console.error('[convertDepositToInvestment] Depósito original completo:', JSON.stringify(deposit, null, 2));
  }

  // Validar e criar ID único
  let depositIdentifier = deposit.uuid || deposit.id;
  if (!depositIdentifier) {
    console.error('[convertDepositToInvestment] Depósito sem identificador válido:', deposit);
    throw new Error('Depósito deve ter uuid ou id válido');
  }

  // Se o ID já tiver o prefixo "deposit_", remover para evitar duplicação
  if (typeof depositIdentifier === 'string' && depositIdentifier.startsWith('deposit_')) {
    depositIdentifier = depositIdentifier.substring(8); // Remover o prefixo 'deposit_'
    console.log('[convertDepositToInvestment] ID já tem prefixo, removendo:', depositIdentifier);
  }

  // Extrair valor do depósito
  let amountValue: number;
  if (typeof deposit.amount === 'number') {
    amountValue = deposit.amount;
  } else if (typeof deposit.amount === 'string') {
    // Remover caracteres não numéricos e converter
    const cleanedAmount = deposit.amount.replace(/[^0-9.]/g, '');
    amountValue = parseFloat(cleanedAmount);
  } else {
    console.warn('[convertDepositToInvestment] Valor do depósito inválido, usando fallback:', deposit.amount);
    amountValue = 0;
  }

  // Determinar unidade (BTC ou SATS)
  const unit = amountValue > 1 ? 'SATS' : 'BTC';
  
  // Converter para BTC se necessário
  if (unit === 'SATS') {
    amountValue = amountValue / 100000000;
  }

  // Criar o objeto de retorno
  const result = {
    id: `deposit_${depositIdentifier}`,
    originalId: depositIdentifier.toString(),
    date: depositDate.toISOString(),
    amount: amountValue,
    unit: "BTC" as "BTC" | "SATS",
    // Incluir informações de origem, se fornecidas
    sourceConfigId: sourceInfo?.configId,
    sourceConfigName: sourceInfo?.configName,
    importedAt: new Date().toISOString()
  };

  console.log('[convertDepositToInvestment] Resultado da conversão:', result);
  return result;
}

/**
 * Converte saque LN Markets para registro de saque
 */
export function convertWithdrawalToRecord(withdrawal: LNMarketsWithdrawal, sourceInfo?: { configId: string; configName: string }) {
  console.log('[convertWithdrawalToRecord] Saque completo recebido:', withdrawal);

  // Prioridade para timestamp de confirmação
  let timestampToUse: string | number | undefined;
  let dateSource: string;

  const possibleDateFields = {
    confirmed_at: withdrawal.confirmed_at,
    timestamp: withdrawal.timestamp,
    created_at: withdrawal.created_at,
    updated_at: withdrawal.updated_at
  };

  const { timestamp, source } = selectBestTimestamp(
    possibleDateFields,
    ['confirmed_at', 'timestamp', 'created_at', 'updated_at'],
    'convertWithdrawalToRecord'
  );

  timestampToUse = timestamp;
  dateSource = source;

  // Parsear data
  const withdrawalDate = parseTimestamp(timestampToUse, `convertWithdrawalToRecord-${dateSource}`);
  
  console.log('[convertWithdrawalToRecord] Data parseada:', {
    originalTimestamp: timestampToUse,
    parsedDate: withdrawalDate,
    formattedDate: withdrawalDate.toISOString(),
    dateSource
  });

  // Validar e criar ID único
  let withdrawalIdentifier = withdrawal.uuid || withdrawal.id;
  if (!withdrawalIdentifier) {
    console.error('[convertWithdrawalToRecord] Saque sem identificador válido:', withdrawal);
    throw new Error('Saque deve ter uuid ou id válido');
  }

  // Se o ID já tiver o prefixo "withdrawal_", remover para evitar duplicação
  if (typeof withdrawalIdentifier === 'string' && withdrawalIdentifier.startsWith('withdrawal_')) {
    withdrawalIdentifier = withdrawalIdentifier.substring(11); // Remover o prefixo 'withdrawal_'
    console.log('[convertWithdrawalToRecord] ID já tem prefixo, removendo:', withdrawalIdentifier);
  }

  // Extrair valor do saque
  let amountValue: number;
  if (typeof withdrawal.amount === 'number') {
    amountValue = withdrawal.amount;
  } else if (typeof withdrawal.amount === 'string') {
    // Remover caracteres não numéricos e converter
    const cleanedAmount = withdrawal.amount.replace(/[^0-9.]/g, '');
    amountValue = parseFloat(cleanedAmount);
  } else {
    console.warn('[convertWithdrawalToRecord] Valor do saque inválido, usando fallback:', withdrawal.amount);
    amountValue = 0;
  }

  // Extrair valor da taxa, se disponível
  let feeValue: number | undefined;
  if (withdrawal.fee !== undefined) {
    if (typeof withdrawal.fee === 'number') {
      feeValue = withdrawal.fee;
    } else if (typeof withdrawal.fee === 'string') {
      // Remover caracteres não numéricos e converter
      const cleanedFee = withdrawal.fee.replace(/[^0-9.]/g, '');
      feeValue = parseFloat(cleanedFee);
    }
  }

  // Determinar unidade (BTC ou SATS)
  const unit = amountValue > 1 ? 'SATS' : 'BTC';
  
  // Converter para BTC se necessário
  if (unit === 'SATS') {
    amountValue = amountValue / 100000000;
    if (feeValue !== undefined) {
      feeValue = feeValue / 100000000;
    }
  }

  // Determinar tipo de saque (lightning ou onchain)
  const type = withdrawal.type === 'onchain' ? 'onchain' : 'lightning';

  // Criar o objeto de retorno
  const result = {
    id: `withdrawal_${withdrawalIdentifier}`,
    originalId: withdrawalIdentifier.toString(),
    date: withdrawalDate.toISOString(),
    amount: amountValue,
    unit: "BTC" as "BTC" | "SATS",
    fee: feeValue,
    type: type as 'onchain' | 'lightning',
    txid: withdrawal.txid,
    // Incluir informações de origem, se fornecidas
    sourceConfigId: sourceInfo?.configId,
    sourceConfigName: sourceInfo?.configName,
    importedAt: new Date().toISOString()
  };

  console.log('[convertWithdrawalToRecord] Resultado da conversão:', result);
  return result;
} 