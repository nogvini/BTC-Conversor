import { NextResponse } from 'next/server';
import { Report } from '@/lib/calculator-types'; // Assumindo que Report pode ser importado
import {
  prepareReportFoundationData,
  calculateReportMetrics,
} from '@/lib/report-processing';
import { CalculatedReportData, OperationData } from '@/lib/export-types';

interface ExportRequestBody {
  report: Report; // O cliente enviará o objeto Report completo
  displayCurrency: 'BRL' | 'USD';
  reportPeriodDescription?: string; // Opcional, o cliente pode fornecer uma descrição formatada
}

export interface ReportExportDataResponse {
  calculatedMetrics: CalculatedReportData;
  enrichedOperations: OperationData[];
  reportName: string;
  reportPeriodDescription: string;
  displayCurrency: 'BRL' | 'USD';
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExportRequestBody;
    const { report, displayCurrency } = body;

    if (!report || !report.id || !report.name) {
      return NextResponse.json(
        { error: 'Objeto Report inválido ou faltando.' },
        { status: 400 }
      );
    }
    if (!['BRL', 'USD'].includes(displayCurrency)) {
      return NextResponse.json(
        { error: 'Parâmetro displayCurrency inválido. Deve ser BRL ou USD.' },
        { status: 400 }
      );
    }

    console.log(`API /export/report-data: Iniciando processamento para relatório "${report.name}", Moeda: ${displayCurrency}`);

    // 1. Preparar dados base (cotações, operações enriquecidas)
    const foundationData = await prepareReportFoundationData({ report });

    // Determinar a descrição do período para o cabeçalho do relatório
    // Se o cliente não enviou, usar o intervalo de datas das transações
    let periodDescription = body.reportPeriodDescription || 'Período Completo';
    if (!body.reportPeriodDescription && foundationData.reportDateRange) {
      periodDescription = `De ${foundationData.reportDateRange.minDate} até ${foundationData.reportDateRange.maxDate}`;
    }
    
    // 2. Calcular todas as métricas financeiras
    const calculatedMetrics = calculateReportMetrics({
      ...foundationData,
      reportName: report.name,
      reportPeriodDescription: periodDescription, // Usar a descrição determinada
      displayCurrency,
    });

    const responsePayload: ReportExportDataResponse = {
      calculatedMetrics,
      enrichedOperations: foundationData.enrichedOperations,
      reportName: report.name,
      reportPeriodDescription: periodDescription,
      displayCurrency,
    };
    
    console.log(`API /export/report-data: Processamento concluído para "${report.name}".`);
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('Erro na API /export/report-data:', error);
    // Tentar fornecer uma mensagem de erro mais específica se possível
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao processar dados do relatório.';
    return NextResponse.json(
      { error: 'Falha ao processar dados para exportação do relatório.', details: errorMessage },
      { status: 500 }
    );
  }
} 