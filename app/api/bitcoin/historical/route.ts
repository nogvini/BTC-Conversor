import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalData, forceUpdateHistoricalData } from '@/lib/server-api';
import { ApiError, RateLimitError, ExternalApiError, DataNotFoundError } from '@/lib/errors';

// Mapeamento de períodos para mais fácil identificação
const PERIOD_MAPPING = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365
};

// GET /api/bitcoin/historical?currency=usd&days=30&force=true&period=30d
// ou /api/bitcoin/historical?currency=usd&fromDate=2023-01-01&toDate=2023-01-31&force=true
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const currency = searchParams.get('currency') || 'usd';
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const days = searchParams.get('days');
  const periodParam = searchParams.get('period');

  console.log(`[API /historical] GET Request. Currency: ${currency}, Period: ${periodParam}, Days: ${days}, From: ${fromDate}, To: ${toDate}`);

  try {
    const forceUpdate = searchParams.get('force') === 'true';
    let daysOrDateParams: number | { fromDate: string; toDate: string };
    let logPeriodDescription: string;

    if (fromDate && toDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fromDate) || !dateRegex.test(toDate)) {
        return NextResponse.json(
          { error: 'Parâmetros "fromDate" e "toDate" devem estar no formato YYYY-MM-DD.' },
          { status: 400 }
        );
      }
      if (new Date(fromDate) > new Date(toDate)) {
        return NextResponse.json(
          { error: '"fromDate" não pode ser posterior a "toDate".' },
          { status: 400 }
        );
      }
      daysOrDateParams = { fromDate, toDate };
      logPeriodDescription = `de ${fromDate} até ${toDate}`;
    } else {
      let resolvedDays: number;
      if (periodParam && PERIOD_MAPPING[periodParam as keyof typeof PERIOD_MAPPING]) {
        resolvedDays = PERIOD_MAPPING[periodParam as keyof typeof PERIOD_MAPPING];
      } else if (days && !isNaN(parseInt(days, 10))) {
        resolvedDays = parseInt(days, 10);
      } else {
        resolvedDays = 30; // Padrão
      }

      if (isNaN(resolvedDays) || resolvedDays < 1 || resolvedDays > 5 * 365) { // Limite de 5 anos
        return NextResponse.json(
          { error: `Parâmetro de período inválido. Deve ser um período válido (ex: 7d, 30d, 1y) ou dias entre 1 e ${5 * 365}.` },
          { status: 400 }
        );
      }
      daysOrDateParams = resolvedDays;
      logPeriodDescription = `${resolvedDays} dias (período: ${periodParam || 'N/A'})`;
    }
    
    console.log(`[API /historical] Processando para: Moeda: ${currency}, Período: ${logPeriodDescription}${forceUpdate ? ", Forçar Atualização" : ""}`);

    if (!['usd', 'brl'].includes(currency.toLowerCase())) {
      return NextResponse.json(
        { error: 'Parâmetro "currency" inválido. Deve ser "usd" ou "brl".' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    let historicalDataResult;
    
    historicalDataResult = forceUpdate 
      ? await forceUpdateHistoricalData(currency.toLowerCase(), daysOrDateParams)
      : await getHistoricalData(currency.toLowerCase(), daysOrDateParams);
    
    const endTime = Date.now();
    
    if (!historicalDataResult || !historicalDataResult.data || historicalDataResult.data.length === 0) {
      console.warn(`[API /historical] Nenhum dado histórico encontrado para ${currency}, ${logPeriodDescription}`);
      throw new DataNotFoundError('Não há dados históricos disponíveis para os parâmetros especificados.');
    }
    
    const { data: actualDataPoints, source, lastUpdated } = historicalDataResult;
    
    const headers = new Headers();
    headers.set('X-Data-Source', source || 'unknown');
    headers.set('X-Data-Timestamp', new Date(lastUpdated).toISOString());
    headers.set('X-Response-Time', `${endTime - startTime}ms`);
    headers.set('X-Period-Processed', logPeriodDescription);
    headers.set('Cache-Control', 'private, max-age=300');
    
    console.log(`[API /historical] Resposta enviada. Fonte: ${source}, Timestamp Dados: ${new Date(lastUpdated).toISOString()}, Tempo de Resposta: ${endTime - startTime}ms`);
    
    return NextResponse.json(actualDataPoints, {
      headers: Object.fromEntries(headers.entries())
    });
  } catch (error) {
    console.error(`[API /historical] ERRO BRUTO CAPTURADO:`, error);
    console.error(`[API /historical] Tipo do erro: ${error?.constructor?.name}`);
    console.error(`[API /historical] Mensagem do erro: ${error instanceof Error ? error.message : String(error)}`);
    console.error(`[API /historical] Stack do erro: ${error instanceof Error ? error.stack : 'N/A'}`);
    console.error(`[API /historical] É ApiError? ${error instanceof ApiError}`);
    console.error(`[API /historical] É RateLimitError? ${error instanceof RateLimitError}`);
    console.error(`[API /historical] É DataNotFoundError? ${error instanceof DataNotFoundError}`);
    console.error(`[API /historical] É ExternalApiError? ${error instanceof ExternalApiError}`);

    if (error instanceof RateLimitError) {
      console.log('[API /historical] Tratando como RateLimitError...');
      return NextResponse.json(
        { error: error.message, details: 'API externa atingiu o limite de taxa.' },
        { status: error.status }
      );
    }
    if (error instanceof DataNotFoundError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    if (error instanceof ExternalApiError) {
      return NextResponse.json(
        { error: error.message, details: 'Falha ao comunicar com API externa.' },
        { status: error.status }
      );
    }
    if (error instanceof ApiError) {
      console.log('[API /historical] Tratando como ApiError genérico...');
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: 'Falha interna ao processar a solicitação de dados históricos.' },
      { status: 500 }
    );
  }
} 