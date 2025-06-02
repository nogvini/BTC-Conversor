/**
 * API Client para o lado do cliente
 * Consome as APIs do servidor, eliminando a necessidade de armazenamento local
 */

import { AppData, BitcoinPrice, HistoricalDataPoint } from './api';

// URL base para as APIs do servidor
const API_BASE_URL = '/api/bitcoin';

/**
 * Buscar todos os dados necessários para a aplicação
 */
export async function fetchAllAppData(force: boolean = false): Promise<AppData> {
  try {
    const url = force 
      ? `${API_BASE_URL}/data?force=true` 
      : `${API_BASE_URL}/data`;
      
    const response = await fetch(url, {
      cache: force ? 'no-store' : 'default',
      next: force ? { revalidate: 0 } : { revalidate: 300 } // 5 minutos se não for forçado
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar dados: ${response.status}`);
    }
    
    const data = await response.json() as AppData;
    
    // Adicionar o campo historicalData para compatibilidade com o código existente
    data.historicalData = {
      usd: data.historicalDataUSD,
      brl: data.historicalDataBRL
    };
    
    return data;
  } catch (error) {
    console.error('Erro ao buscar todos os dados:', error);
    throw error;
  }
}

/**
 * Buscar apenas o preço atual do Bitcoin
 * @param forceUpdate Força a atualização dos dados ignorando o cache
 * @returns Dados atualizados do preço do Bitcoin
 */
export async function getCurrentBitcoinPrice(forceUpdate: boolean = false): Promise<BitcoinPrice | null> {
  try {
    // Construir URL com parâmetro de força atualização se necessário
    const url = forceUpdate 
      ? `${API_BASE_URL}/price?force=true` 
      : `${API_BASE_URL}/price`;
    
    // Configurar opções da requisição
    const fetchOptions: RequestInit = {
      // Se forceUpdate, não usar cache
      cache: forceUpdate ? 'no-store' : 'default',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'BTCRaidToolkit',
        'X-Force-Update': forceUpdate ? 'true' : 'false'
      }
    };
    
    // Fazer a requisição com as opções adequadas
    console.log(`Buscando preço atual${forceUpdate ? ' (forçando atualização)' : ''}`);
    
    // Adicionar timeout para evitar requisições intermináveis
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos de timeout
    fetchOptions.signal = controller.signal;
    
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId); // Limpar timeout se obtiver resposta
    
    if (!response.ok) {
      console.warn(`Erro ao buscar preço: ${response.status} ${response.statusText}`);
      return null; // Retornar null em vez de lançar erro
    }
    
    // Exibir informações de diagnóstico se disponíveis
    const forceUpdateHeader = response.headers.get('X-Force-Update');
    if (forceUpdateHeader) {
      console.log(`Dados ${forceUpdateHeader === 'true' ? 'forçadamente atualizados' : 'obtidos do cache'}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar preço atual:', error);
    return null; // Retornar null em vez de lançar erro
  }
}

/**
 * Obter dados históricos do Bitcoin
 */
export async function getHistoricalBitcoinData(
  currency = 'usd',
  days = 30,
  period?: string
): Promise<HistoricalDataPoint[]> {
  try {
    const params = new URLSearchParams();
    params.append('currency', currency);
    params.append('days', days.toString());
    
    if (period) {
      params.append('period', period);
    }
    
    const url = `${API_BASE_URL}/historical?${params.toString()}`;
    
    const fetchOptions: RequestInit = {
      cache: 'default',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'BTCRaidToolkit'
      }
    };
    
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      let errorData = { message: response.statusText, error: response.statusText }; // Fallback
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // Corpo não é JSON ou está vazio, usar statusText
        console.warn('[client-api getHistoricalBitcoinData] Falha ao parsear corpo do erro JSON:', jsonError);
      }

      if (response.status === 429) {
        console.warn(`[client-api getHistoricalBitcoinData] Limite de requisições (429) detectado. Mensagem: ${errorData.message || errorData.error}`);
        throw new Error(`RATE_LIMIT: ${errorData.message || errorData.error || 'Limite de requisições atingido.'}`);
      }
      console.error(`[client-api getHistoricalBitcoinData] Erro ao buscar dados históricos (${response.status}):`, errorData);
      throw new Error(`Erro ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
    }
    
    const source = response.headers.get('X-Data-Source');
    const usingCache = response.headers.get('X-Using-Cache');
    const responseTime = response.headers.get('X-Response-Time');
    
    if (source || usingCache || responseTime) {
      console.log(
        `Dados históricos: fonte=${source || 'desconhecida'}, ` +
        `cache=${usingCache === 'true' ? 'sim' : 'não'}, ` +
        `tempo=${responseTime || 'n/a'}`
      );
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar dados históricos:', error);
    throw error;
  }
}

export async function getHistoricalBitcoinDataForRange(
  currency: 'usd' | 'brl',
  fromDate: string, // Formato YYYY-MM-DD
  toDate: string,   // Formato YYYY-MM-DD
  forceUpdate: boolean = false
): Promise<HistoricalDataPoint[]> {
  try {
    const params = new URLSearchParams();
    params.append('currency', currency);
    params.append('fromDate', fromDate);
    params.append('toDate', toDate);
    if (forceUpdate) {
      params.append('force', 'true');
    }

    const url = `${API_BASE_URL}/historical?${params.toString()}`;
    
    const fetchOptions: RequestInit = {
      cache: forceUpdate ? 'no-store' : 'default',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-App': 'BTCRaidToolkit',
      },
      next: forceUpdate ? { revalidate: 0 } : { revalidate: 300 }
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      let errorData = { message: response.statusText, error: response.statusText }; // Fallback
      try {
        errorData = await response.json();
      } catch (jsonError) {
        // Corpo não é JSON ou está vazio, usar statusText
        console.warn('[client-api getHistoricalBitcoinDataForRange] Falha ao parsear corpo do erro JSON:', jsonError);
      }

      if (response.status === 429) {
        console.warn(`[client-api getHistoricalBitcoinDataForRange] Limite de requisições (429) detectado. Mensagem: ${errorData.message || errorData.error}`);
        throw new Error(`RATE_LIMIT: ${errorData.message || errorData.error || 'Limite de requisições atingido.'}`);
      }
      console.error(`[client-api getHistoricalBitcoinDataForRange] Erro ao buscar dados históricos por intervalo (${response.status}):`, errorData);
      // Usar errorData.message se disponível (do corpo JSON da nossa API), senão errorData.error ou statusText
      throw new Error(`Erro ${response.status}: ${errorData.message || errorData.error || response.statusText}`);
    }

    const source = response.headers.get('X-Data-Source');
    const usingCache = response.headers.get('X-Using-Cache');
    const responseTime = response.headers.get('X-Response-Time');
    console.log(
      `Dados históricos (intervalo ${fromDate}-${toDate}): fonte=${source || 'desconhecida'}, ` +
      `cache=${usingCache === 'true' ? 'sim' : 'não'}, tempo=${responseTime || 'n/a'}`
    );

    return await response.json();
  } catch (error) {
    console.error('Erro em getHistoricalBitcoinDataForRange:', error);
    throw error; // Re-lançar para ser tratado pelo chamador
  }
}

/**
 * Exporta um relatório para PDF (versão melhorada com cotações)
 * @param reportData Dados do relatório a ser exportado
 * @param displayCurrency Moeda para exibição (USD ou BRL)
 * @param reportPeriodDescription Descrição opcional do período do relatório
 * @param btcToUsd Cotação atual de BTC para USD
 * @param brlToUsd Cotação atual de BRL para USD
 * @param capturedCharts Gráficos capturados (opcional)
 * @returns URL do blob do PDF ou nulo em caso de erro
 */
export async function exportReportToPdfWithRates(
  reportData: any,
  displayCurrency: 'BRL' | 'USD',
  reportPeriodDescription: string = '',
  btcToUsd: number,
  brlToUsd: number,
  capturedCharts?: any[] // Adicionar parâmetro para gráficos capturados
): Promise<Blob | null> {
  try {
    console.log('=== INICIANDO EXPORTAÇÃO PDF CLIENT-API (COM COTAÇÕES) ===');
    console.log('Dados recebidos:', {
      hasReportData: !!reportData,
      displayCurrency,
      reportPeriodDescription,
      btcToUsd,
      brlToUsd
    });
    
    const url = '/api/export/report-pdf';
    
    // Verificações iniciais para evitar enviar dados inválidos
    if (!reportData || typeof reportData !== 'object') {
      throw new Error('Dados do relatório inválidos ou ausentes');
    }
    
    // Validar cotações
    if (!btcToUsd || btcToUsd <= 0) {
      throw new Error('Cotação BTC->USD inválida ou zero');
    }
    
    if (!brlToUsd || brlToUsd <= 0) {
      throw new Error('Cotação BRL->USD inválida ou zero');
    }
    
    console.log('Estrutura do reportData recebido:', {
      id: reportData.id,
      name: reportData.name,
      hasInvestments: !!reportData.investments,
      hasProfit: !!reportData.profits,
      hasWithdrawals: !!reportData.withdrawals,
      investmentsCount: Array.isArray(reportData.investments) ? reportData.investments.length : 'não é array',
      profitsCount: Array.isArray(reportData.profits) ? reportData.profits.length : 'não é array',
      withdrawalsCount: Array.isArray(reportData.withdrawals) ? reportData.withdrawals.length : 'não é array'
    });
    
    if (Array.isArray(reportData.investments) && reportData.investments.length > 0) {
      console.log('Primeiros 2 investimentos do client-api:', reportData.investments.slice(0, 2));
    }
    
    if (Array.isArray(reportData.profits) && reportData.profits.length > 0) {
      console.log('Primeiros 2 lucros do client-api:', reportData.profits.slice(0, 2));
    }
    
    if (!reportData.name) {
      console.warn('Relatório sem nome, adicionando nome padrão');
      reportData.name = `Relatório Bitcoin ${new Date().toISOString().split('T')[0]}`;
    }
    
    // Garantir que arrays essenciais existam
    if (!Array.isArray(reportData.investments)) reportData.investments = [];
    if (!Array.isArray(reportData.profits)) reportData.profits = [];
    if (!Array.isArray(reportData.withdrawals)) reportData.withdrawals = [];
    
    const requestData = {
      report: reportData,
      displayCurrency,
      reportPeriodDescription,
      // ADICIONAR AS COTAÇÕES NO PAYLOAD
      currentRates: {
        btcToUsd,
        brlToUsd,
        timestamp: new Date().toISOString()
      },
      // ADICIONAR GRÁFICOS CAPTURADOS
      capturedCharts: capturedCharts || []
    };
    
    console.log('Dados que serão enviados para a API:', {
      reportId: requestData.report.id,
      reportName: requestData.report.name,
      investmentsToSend: requestData.report.investments.length,
      profitsToSend: requestData.report.profits.length,
      withdrawalsToSend: requestData.report.withdrawals.length,
      displayCurrency: requestData.displayCurrency,
      btcToUsd: requestData.currentRates.btcToUsd,
      brlToUsd: requestData.currentRates.brlToUsd
    });
    
    console.log('Enviando requisição de PDF...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `${errorData.error}${errorData.details ? `: ${errorData.details}` : ''}`;
        }
      } catch (e) {
        // Se não puder obter detalhes do erro como JSON, apenas use o status
        console.warn('Não foi possível obter detalhes do erro como JSON');
      }
      
      console.error('Erro na geração do PDF:', errorMessage);
      throw new Error(`Falha ao gerar o PDF: ${errorMessage}`);
    }
    
    console.log('PDF gerado com sucesso, obtendo blob...');
    return await response.blob();
    
  } catch (error) {
    console.error('Erro ao exportar relatório para PDF com cotações:', error);
    // Retornar null em vez de lançar o erro, para que o chamador possa tentar tratar
    throw new Error(`Erro ao exportar PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Exporta um relatório para PDF
 * @param reportData Dados do relatório a ser exportado
 * @param displayCurrency Moeda para exibição (USD ou BRL)
 * @param reportPeriodDescription Descrição opcional do período do relatório
 * @returns URL do blob do PDF ou nulo em caso de erro
 */
export async function exportReportToPdf(
  reportData: any,
  displayCurrency: 'BRL' | 'USD',
  reportPeriodDescription?: string
): Promise<Blob | null> {
  try {
    console.log('=== INICIANDO EXPORTAÇÃO PDF CLIENT-API ===');
    console.log('Dados recebidos:', {
      hasReportData: !!reportData,
      displayCurrency,
      reportPeriodDescription
    });
    
    const url = '/api/export/report-pdf';
    
    // Verificações iniciais para evitar enviar dados inválidos
    if (!reportData || typeof reportData !== 'object') {
      throw new Error('Dados do relatório inválidos ou ausentes');
    }
    
    console.log('Estrutura do reportData recebido:', {
      id: reportData.id,
      name: reportData.name,
      hasInvestments: !!reportData.investments,
      hasProfit: !!reportData.profits,
      hasWithdrawals: !!reportData.withdrawals,
      investmentsCount: Array.isArray(reportData.investments) ? reportData.investments.length : 'não é array',
      profitsCount: Array.isArray(reportData.profits) ? reportData.profits.length : 'não é array',
      withdrawalsCount: Array.isArray(reportData.withdrawals) ? reportData.withdrawals.length : 'não é array'
    });
    
    if (Array.isArray(reportData.investments) && reportData.investments.length > 0) {
      console.log('Primeiros 2 investimentos do client-api:', reportData.investments.slice(0, 2));
    }
    
    if (Array.isArray(reportData.profits) && reportData.profits.length > 0) {
      console.log('Primeiros 2 lucros do client-api:', reportData.profits.slice(0, 2));
    }
    
    if (!reportData.name) {
      console.warn('Relatório sem nome, adicionando nome padrão');
      reportData.name = `Relatório Bitcoin ${new Date().toISOString().split('T')[0]}`;
    }
    
    // Garantir que arrays essenciais existam
    if (!Array.isArray(reportData.investments)) reportData.investments = [];
    if (!Array.isArray(reportData.profits)) reportData.profits = [];
    if (!Array.isArray(reportData.withdrawals)) reportData.withdrawals = [];
    
    const requestData = {
      report: reportData,
      displayCurrency,
      reportPeriodDescription
    };
    
    console.log('Dados que serão enviados para a API:', {
      reportId: requestData.report.id,
      reportName: requestData.report.name,
      investmentsToSend: requestData.report.investments.length,
      profitsToSend: requestData.report.profits.length,
      withdrawalsToSend: requestData.report.withdrawals.length,
      displayCurrency: requestData.displayCurrency
    });
    
    console.log('Enviando requisição de PDF...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      let errorMessage = `Erro ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = `${errorData.error}${errorData.details ? `: ${errorData.details}` : ''}`;
        }
      } catch (e) {
        // Se não puder obter detalhes do erro como JSON, apenas use o status
        console.warn('Não foi possível obter detalhes do erro como JSON');
      }
      
      console.error('Erro na geração do PDF:', errorMessage);
      throw new Error(`Falha ao gerar o PDF: ${errorMessage}`);
    }
    
    console.log('PDF gerado com sucesso, obtendo blob...');
    return await response.blob();
    
  } catch (error) {
    console.error('Erro ao exportar relatório para PDF:', error);
    // Retornar null em vez de lançar o erro, para que o chamador possa tentar tratar
    throw new Error(`Erro ao exportar PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export { HistoricalDataPoint };
