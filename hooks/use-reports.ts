"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Report, 
  Investment, 
  ProfitRecord, 
  ReportCollection, 
  STORAGE_KEYS, 
  generateId, 
  createNewReport,
  migrateFromLegacyData
} from "@/lib/calculator-types";
import { toast } from "@/components/ui/use-toast";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { 위험Kit as uuidv4 } from "uuid"; // Assumindo que uuidv4 é importado assim, ajuste se necessário
import { fetchBtcPriceOnDate } from "@/lib/client-api"; // Para buscar preço na data do aporte
import { Investment, ProfitRecord, DisplayCurrency } from "./calculator-types"; // Importar tipos de um arquivo centralizado
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfDay, endOfDay, isBefore } from 'date-fns'; // Adicionar/garantir estas importações

// --- Constantes --- 
const STORAGE_KEYS = {
  REPORTS_COLLECTION: "btcReportsCollection_v3", // Incrementar versão se houver mudanças de schema que quebram compatibilidade
  ACTIVE_REPORT_ID: "btcActiveReportId_v2",
};

// --- Tipos Fundamentais (revisitar e mover para calculator-types.ts se apropriado) ---

// Mantido aqui por enquanto, mas idealmente em calculator-types.ts
export interface CurrencyRates {
  btcToUsd: number;
  usdToBrlRate: number; // 1 USD = X BRL
  timestamp: string; // ISO string da última atualização das cotações
}

// --- Interface para o Sumário Calculado do Relatório ---
export interface ReportSummary {
  // Investimentos
  totalInvestedBtc: number;
  totalInvestedUsdAtPurchase: number;
  averageBuyPriceUsd: number;
  firstInvestmentDate?: string | null; // ISO date
  lastInvestmentDate?: string | null; // ISO date
  investmentCount: number;

  // Lucros/Perdas Operacionais (de ProfitRecord)
  totalOperationalProfitBtc: number;
  totalOperationalLossBtc: number;
  netOperationalProfitBtc: number;
  netOperationalProfitUsdAtCurrentPrice: number;
  operationalProfitRecordCount: number;
  operationalLossRecordCount: number;

  // Saldo e Valorização
  currentPortfolioBtc: number;
  currentPortfolioUsd: number;
  currentPortfolioBrl: number;
  valuationProfitUsd: number; // (Valor atual dos BTCs investidos) - (Valor pago por esses BTCs)
  valuationProfitBtc: number;

  // Desempenho Geral
  totalNetProfitLossBtc: number;
  totalNetProfitLossUsd: number;
  returnOnInvestmentPercent: number;

  // Métricas de Período (baseadas nos filtros)
  // Os valores reais para o período filtrado
  profitOrLossInPeriodBtc: number;
  profitOrLossInPeriodUsd: number; // Calculado usando o preço BTC no final do período ou preço atual
  yieldInPeriodPercent: number; // (ProfitLossInPeriodBtc / CapitalNoInicioDoPeriodoEmBTC) * 100
  // Capital usado como base para o yield do período
  capitalAtPeriodStartBtc?: number;
  capitalAtPeriodStartUsd?: number;
  // Métricas de fluxo de caixa e valorização *dentro* do período para análise mais detalhada
  investmentsInPeriodBtc: number;
  operationalNetProfitInPeriodBtc: number; // Lucro/perda líquido de ProfitRecords dentro do período
  valuationChangeInPeriodUsd: number; // Mudança de valor dos ativos que estavam no portfólio durante o período

  // Metadados do Sumário
  lastCalculated: string; // ISO timestamp
  pricesUsed: CurrencyRates | null; // Cotações usadas para este cálculo de sumário
  calculationError?: string | null; // Mensagem de erro se o cálculo falhar
}

// --- Interface Principal do Relatório --- 
export interface Report {
  id: string;
  name: string;
  description?: string;
  investments: Investment[];
  profits: ProfitRecord[];
  color?: string;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date - quando qualquer dado do relatório foi modificado pela última vez

  // Configurações de Filtro para a aba "Histórico" no ProfitCalculator
  historyPeriodFilterType: "month" | "custom";
  historyFilterMonthDate: string; // ISO date (representa o mês selecionado, e.g., "2023-11-01")
  historyFilterCustomStartDate?: string | null; // ISO date
  historyFilterCustomEndDate?: string | null; // ISO date

  // Configurações Adicionais
  lastImportDate?: string | null; // ISO date da última importação de dados
  // displayCurrencyOnCalculator?: DisplayCurrency; // Se quisermos persistir por relatório

  // Sumário Calculado (pode ser null se ainda não calculado ou se houver erro)
  summary: ReportSummary | null;
}

// --- Estrutura da Coleção de Relatórios --- 
export interface ReportsCollection {
  reports: Report[];
  // Poderíamos adicionar metadados da coleção aqui, como versão do schema, etc.
}

// --- Estado e Ações do Hook (Zustand) --- 
interface ReportsState {
  collection: ReportsCollection;
  activeReportId: string | null;
  isLoaded: boolean; // Flag para indicar se os dados foram carregados do localStorage
  // Funções de CRUD para Relatórios
  addReport: (name: string, description?: string, color?: string, id?: string) => Report; // Retorna o relatório criado
  updateReportDetails: (reportId: string, updates: Partial<Pick<Report, "name" | "description" | "color" | "historyPeriodFilterType" | "historyFilterMonthDate" | "historyFilterCustomStartDate" | "historyFilterCustomEndDate">>) => boolean;
  deleteReport: (reportId: string) => boolean;
  selectReport: (reportId: string | null) => void;
  // Funções de CRUD para Investimentos e Lucros dentro de um relatório
  // As funções de adição agora recebem Omit<Investment, 'id'> e Omit<ProfitRecord, 'id'>
  // e o hook gera o ID e busca o preço na data.
  addInvestmentToReport: (reportId: string, investmentBaseData: Omit<Investment, "id" | "priceAtDate" | "priceAtDateCurrency" | "priceAtDateSource">, options?: { suppressToast?: boolean }) => { status: 'added' | 'error' | 'duplicate', reportId: string, investmentId?: string, message?: string };
  addProfitRecordToReport: (reportId: string, profitBaseData: Omit<ProfitRecord, "id">, options?: { suppressToast?: boolean }) => { status: 'added' | 'error' | 'duplicate', reportId: string, profitId?: string, message?: string };
  updateInvestmentInReport: (reportId: string, investmentId: string, updates: Partial<Investment>) => boolean;
  updateProfitRecordInReport: (reportId: string, profitId: string, updates: Partial<ProfitRecord>) => boolean;
  deleteInvestmentFromReport: (reportId: string, investmentId: string) => boolean;
  deleteProfitRecordFromReport: (reportId: string, profitId: string) => boolean;
  deleteAllInvestmentsFromReport: (reportId: string) => boolean;
  deleteAllProfitsFromReport: (reportId: string) => boolean;
  // Função para importar dados para um relatório (substitui importData global se focarmos por relatório)
  importExternalDataToReport: (reportId: string, investments: Investment[], profits: ProfitRecord[], options?: { suppressToast?: boolean, source?: string }) => { success: boolean, investmentStats: { added: number, duplicates: number, errors: number }, profitStats: { added: number, duplicates: number, errors: number } };
  // Função para recalcular o sumário de um relatório específico
  recalculateReportSummary: (reportId: string, currentRates: CurrencyRates) => Promise<boolean>;
  // Função para definir o estado inicial (usado internamente ao carregar do localStorage)
  setLoaded: (loadedCollection: ReportsCollection, loadedActiveId: string | null) => void;
}

// --- Implementação do Hook useReports --- 

// TODO: Mover calculateReportSummary para fora do hook para que possa ser chamado sem depender do estado interno do hook diretamente
// ou torná-la uma função auxiliar que o hook chama.

const defaultInitialReportSummary: ReportSummary = {
  totalInvestedBtc: 0,
  totalInvestedUsdAtPurchase: 0,
  averageBuyPriceUsd: 0,
  investmentCount: 0,
  totalOperationalProfitBtc: 0,
  totalOperationalLossBtc: 0,
  netOperationalProfitBtc: 0,
  netOperationalProfitUsdAtCurrentPrice: 0,
  operationalProfitRecordCount: 0,
  operationalLossRecordCount: 0,
  currentPortfolioBtc: 0,
  currentPortfolioUsd: 0,
  currentPortfolioBrl: 0,
  valuationProfitUsd: 0,
  valuationProfitBtc: 0,
  totalNetProfitLossBtc: 0,
  totalNetProfitLossUsd: 0,
  returnOnInvestmentPercent: 0,
  profitOrLossInPeriodBtc: 0,
  profitOrLossInPeriodUsd: 0,
  yieldInPeriodPercent: 0,
  investmentsInPeriodBtc: 0,
  operationalNetProfitInPeriodBtc: 0,
  valuationChangeInPeriodUsd: 0,
  lastCalculated: new Date(0).toISOString(), // Data Epoch como placeholder
  pricesUsed: null,
  calculationError: "Not calculated yet",
};

export const useReports = create<ReportsState>()(
  persist(
    (set, get) => ({
      collection: { reports: [] },
      activeReportId: null,
      isLoaded: false,

      setLoaded: (loadedCollection, loadedActiveId) => {
        console.log("[useReports] setLoaded chamado com:", loadedCollection, loadedActiveId);
        set({
          collection: loadedCollection,
          activeReportId: loadedActiveId,
          isLoaded: true,
        });
      },

      addReport: (name, description = "", color, id) => {
        const newReportId = id || uuidv4();
        const now = new Date().toISOString();
        const newReport: Report = {
          id: newReportId,
          name,
          description,
          investments: [],
          profits: [],
          color: color || generateRandomColor(),
          createdAt: now,
          updatedAt: now,
          historyPeriodFilterType: "month",
          historyFilterMonthDate: startOfMonth(new Date()).toISOString(),
          summary: { ...defaultInitialReportSummary, lastCalculated: now, calculationError: "Newly created, needs calculation" },
        };
        set(state => ({
          collection: {
            ...state.collection,
            reports: [...state.collection.reports, newReport],
          },
          activeReportId: state.collection.reports.length === 0 || !state.activeReportId 
                          ? newReportId 
                          : state.activeReportId,
        }));
        toast({ title: "Relatório Criado", description: `"${name}" foi adicionado.` });
        return newReport;
      },

      updateReportDetails: (reportId, updates) => {
        let found = false;
        let needsRecalculation = false;
        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(report => {
              if (report.id === reportId) {
                found = true;
                const updatedReport = { ...report, ...updates, updatedAt: new Date().toISOString() };
                if (updates.historyPeriodFilterType || updates.historyFilterMonthDate || updates.historyFilterCustomStartDate || updates.historyFilterCustomEndDate) {
                  updatedReport.summary = { 
                    ...(updatedReport.summary || defaultInitialReportSummary),
                    lastCalculated: new Date().toISOString(),
                    calculationError: "Filters changed, recalculation needed",
                  };
                  needsRecalculation = true; // Marcar para recalcular fora do map
                }
                return updatedReport;
              }
              return report;
            }),
          },
        }));
        if (found) {
          toast({ title: "Relatório Atualizado", description: "Detalhes do relatório foram salvos." });
          if (needsRecalculation) {
            const currentRates = get().collection.reports.find(r => r.id === reportId)?.summary?.pricesUsed; // Tentar pegar taxas antigas
            if (currentRates) { // Só recalcula se tiver taxas para usar (ou buscar novas)
                 // Idealmente, buscaríamos as taxas mais atuais aqui antes de recalcular
                 // Por ora, passamos as que já podem estar no sumário, ou o recálculo falhará suavemente
                 get().recalculateReportSummary(reportId, currentRates); 
            } else {
                console.warn(`[updateReportDetails] Não foi possível obter currentRates para recalcular sumário do relatório ${reportId} após mudança de filtro.`);
            }
          }
        } else {
          toast({ title: "Erro", description: "Relatório não encontrado para atualização.", variant: "destructive" });
        }
        return found;
      },
      
      deleteReport: (reportId) => {
        let wasActive = false;
        let reportName = "Relatório";
        const originalLength = get().collection.reports.length;

        set(state => {
          const reportToDelete = state.collection.reports.find(r => r.id === reportId);
          if (reportToDelete) reportName = reportToDelete.name;
          const newReports = state.collection.reports.filter(r => r.id !== reportId);
          let newActiveId = state.activeReportId;
          if (state.activeReportId === reportId) {
            wasActive = true;
            newActiveId = newReports.length > 0 ? newReports[0].id : null;
          }
          return {
            collection: { ...state.collection, reports: newReports },
            activeReportId: newActiveId,
          };
        });
        
        const success = get().collection.reports.length < originalLength;
        if (success) {
          toast({ title: "Relatório Excluído", description: `"${reportName}" foi removido.` });
        } else {
          toast({ title: "Erro", description: "Relatório não encontrado para exclusão.", variant: "destructive"});
        }
        return success;
      },

      selectReport: (reportId) => {
        set({ activeReportId: reportId });
      },
      
      addInvestmentToReport: (reportId, investmentBaseData, options) => {
        let status: 'added' | 'error' | 'duplicate' = 'error';
        let investmentId: string | undefined = undefined;
        let message: string | undefined = undefined;
        let reportNameForToast = "Relatório";

        set(state => {
          const reportIndex = state.collection.reports.findIndex(r => r.id === reportId);
          if (reportIndex === -1) {
            message = "Relatório não encontrado.";
            return state; 
          }

          const targetReport = state.collection.reports[reportIndex];
          reportNameForToast = targetReport.name;
          const newInvestmentId = uuidv4();
          
          const isDuplicate = targetReport.investments.some(inv => 
            inv.date === investmentBaseData.date && 
            inv.amount === investmentBaseData.amount && 
            inv.unit === investmentBaseData.unit
          );

          if (isDuplicate) {
            status = 'duplicate';
            message = `Investimento já existe em ${investmentBaseData.date} no relatório "${reportNameForToast}"`;
             if (!options?.suppressToast) {
              toast({ title: "Investimento Duplicado", description: message, variant: "warning" });
            }
            return state;
          }

          const newInvestment: Investment = {
            ...investmentBaseData,
            id: newInvestmentId,
          };

          const updatedReport: Report = {
            ...targetReport,
            investments: [...targetReport.investments, newInvestment].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            updatedAt: new Date().toISOString(),
            summary: { 
              ...(targetReport.summary || defaultInitialReportSummary),
              calculationError: "Data changed, recalculation needed",
              lastCalculated: new Date().toISOString(),
            },
          };

          const newReports = [...state.collection.reports];
          newReports[reportIndex] = updatedReport;
          
          status = 'added';
          investmentId = newInvestmentId;
          message = "Investimento adicionado a \"" + reportNameForToast + "\". Preço na data será buscado.";
          
          if (!options?.suppressToast) {
            toast({ title: "Investimento Adicionado", description: `Adicionado a "${reportNameForToast}". O preço na data será buscado.` });
          }

          (async () => {
            try {
              const priceDate = parseISO(investmentBaseData.date); // Usar parseISO
              const priceInfo = await fetchBtcPriceOnDate(priceDate, "USD"); 
              
              get().updateInvestmentInReport(reportId, newInvestmentId, {
                priceAtDate: priceInfo?.price,
                priceAtDateCurrency: priceInfo?.currency,
                priceAtDateSource: priceInfo?.source,
              });
              // Após atualizar o preço, o sumário é marcado para recálculo. 
              // A chamada explícita a recalculateReportSummary deve ocorrer após ter currentRates disponíveis.
            } catch (e) {
              console.error(`Erro ao buscar preço para investimento ${newInvestmentId}:`, e);
            }
          })();

          return {
            collection: { ...state.collection, reports: newReports },
          };
        });
        
        // Após adicionar, se tivermos taxas atuais, recalcular.
        // Este é um ponto onde podemos precisar de acesso às taxas globais ou passá-las.
        // Por ora, o sumário está apenas marcado como "needs recalculation".
        // A interface do usuário (ex: ProfitCalculator) será responsável por disparar o recálculo quando tiver as taxas.
        return { status, reportId, investmentId, message };
      },

      updateInvestmentInReport: (reportId, investmentId, updates) => {
        let foundAndUpdated = false;
        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(report => {
              if (report.id === reportId) {
                const investmentIndex = report.investments.findIndex(inv => inv.id === investmentId);
                if (investmentIndex !== -1) {
                  const updatedInvestment = { ...report.investments[investmentIndex], ...updates };
                  const newInvestments = [...report.investments];
                  newInvestments[investmentIndex] = updatedInvestment;
                  foundAndUpdated = true;
                  return {
                    ...report,
                    investments: newInvestments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                    updatedAt: new Date().toISOString(),
                    summary: { 
                      ...(report.summary || defaultInitialReportSummary),
                      calculationError: "Data changed, recalculation needed",
                      lastCalculated: new Date().toISOString(),
                    }, 
                  };
                }
              }
              return report;
            }),
          },
        }));
        return foundAndUpdated;
      },

      deleteInvestmentFromReport: (reportId, investmentId) => {
        let foundAndDeleted = false;
        let reportName = "Relatório";
        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(report => {
              if (report.id === reportId) {
                reportName = report.name;
                const initialLength = report.investments.length;
                const newInvestments = report.investments.filter(inv => inv.id !== investmentId);
                if (newInvestments.length < initialLength) {
                  foundAndDeleted = true;
                  return {
                    ...report,
                    investments: newInvestments,
                    updatedAt: new Date().toISOString(),
                    summary: { 
                      ...(report.summary || defaultInitialReportSummary),
                      calculationError: "Data changed, recalculation needed",
                      lastCalculated: new Date().toISOString(),
                    }, 
                  };
                }
              }
              return report;
            }),
          },
        }));
        if (foundAndDeleted) {
          toast({ title: "Investimento Removido", description: `Do relatório "${reportName}"`, variant: "success" });
        } else {
          toast({ title: "Erro", description: "Investimento não encontrado para remoção.", variant: "destructive" });
        }
        return foundAndDeleted;
      },
      
      deleteAllInvestmentsFromReport: (reportId) => {
        let foundAndCleared = false;
        let reportName = "Relatório";
        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(report => {
              if (report.id === reportId && report.investments.length > 0) {
                reportName = report.name;
                foundAndCleared = true;
                return {
                  ...report,
                  investments: [],
                  updatedAt: new Date().toISOString(),
                  summary: { 
                    ...(report.summary || defaultInitialReportSummary),
                    calculationError: "Data changed, recalculation needed",
                    lastCalculated: new Date().toISOString(),
                  }, 
                };
              }
              return report;
            }),
          },
        }));
         if (foundAndCleared) {
          toast({ title: "Investimentos Removidos", description: `Todos os aportes do relatório "${reportName}" foram removidos.`, variant: "success" });
        } else {
          const report = get().collection.reports.find(r => r.id === reportId);
          if (report && report.investments.length === 0) {
            toast({ title: "Nenhum Investimento", description: `Não há aportes para remover em "${report.name}".`, variant: "default" });
          } else if (!report) {
            toast({ title: "Erro", description: "Relatório não encontrado.", variant: "destructive" });
          }
        }
        return foundAndCleared;
      },

      addProfitRecordToReport: (reportId, profitBaseData, options) => {
        let status: 'added' | 'error' | 'duplicate' = 'error';
        let profitId: string | undefined = undefined;
        let message: string | undefined = undefined;
        let reportNameForToast = "Relatório";

        set(state => {
          const reportIndex = state.collection.reports.findIndex(r => r.id === reportId);
          if (reportIndex === -1) {
            message = "Relatório não encontrado.";
            return state;
          }

          const targetReport = state.collection.reports[reportIndex];
          reportNameForToast = targetReport.name;
          const newProfitId = uuidv4();
          
          const isDuplicate = targetReport.profits.some(p => 
            p.date === profitBaseData.date && 
            p.amount === profitBaseData.amount && 
            p.unit === profitBaseData.unit &&
            p.isProfit === profitBaseData.isProfit 
          );

          if (isDuplicate) {
            status = 'duplicate';
            const type = profitBaseData.isProfit ? "lucro" : "perda";
            message = `Registro de ${type} já existe em ${profitBaseData.date} no relatório "${reportNameForToast}".`;
            if (!options?.suppressToast) {
              toast({ title: "Registro Duplicado", description: message, variant: "warning" });
            }
            return state;
          }

          const newProfitRecord: ProfitRecord = {
            ...profitBaseData,
            id: newProfitId,
          };

          const updatedReport: Report = {
            ...targetReport,
            profits: [...targetReport.profits, newProfitRecord].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            updatedAt: new Date().toISOString(),
            summary: { 
              ...(targetReport.summary || defaultInitialReportSummary),
              calculationError: "Data changed, recalculation needed",
              lastCalculated: new Date().toISOString(),
            }, 
          };

          const newReports = [...state.collection.reports];
          newReports[reportIndex] = updatedReport;

          status = 'added';
          profitId = newProfitId;
          const type = profitBaseData.isProfit ? "lucro" : "perda";
          message = `Registro de ${type} adicionado a "${reportNameForToast}".`;

          if (!options?.suppressToast) {
            toast({ title: `Registro de ${type} Adicionado`, description: message, variant: "success" });
          }
          
          return {
            collection: { ...state.collection, reports: newReports },
          };
        });
        return { status, reportId, profitId, message };
      },

      updateProfitRecordInReport: (reportId, profitId, updates) => {
        let foundAndUpdated = false;
        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(report => {
              if (report.id === reportId) {
                const profitIndex = report.profits.findIndex(p => p.id === profitId);
                if (profitIndex !== -1) {
                  const updatedProfit = { ...report.profits[profitIndex], ...updates };
                  const newProfits = [...report.profits];
                  newProfits[profitIndex] = updatedProfit;
                  foundAndUpdated = true;
                  return {
                    ...report,
                    profits: newProfits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                    updatedAt: new Date().toISOString(),
                    summary: { 
                      ...(report.summary || defaultInitialReportSummary),
                      calculationError: "Data changed, recalculation needed",
                      lastCalculated: new Date().toISOString(),
                    }, 
                  };
                }
              }
              return report;
            }),
          },
        }));
        return foundAndUpdated;
      },

      deleteProfitRecordFromReport: (reportId, profitId) => {
        let foundAndDeleted = false;
        let reportName = "Relatório";
        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(report => {
              if (report.id === reportId) {
                reportName = report.name;
                const initialLength = report.profits.length;
                const newProfits = report.profits.filter(p => p.id !== profitId);
                if (newProfits.length < initialLength) {
                  foundAndDeleted = true;
                  return {
                    ...report,
                    profits: newProfits,
                    updatedAt: new Date().toISOString(),
                    summary: { 
                      ...(report.summary || defaultInitialReportSummary),
                      calculationError: "Data changed, recalculation needed",
                      lastCalculated: new Date().toISOString(),
                    }, 
                  };
                }
              }
              return report;
            }),
          },
        }));
        if (foundAndDeleted) {
          toast({ title: "Registro Removido", description: `De "${reportName}"`, variant: "success" });
        } else {
          toast({ title: "Erro", description: "Registro não encontrado para remoção.", variant: "destructive" });
        }
        return foundAndDeleted;
      },
      
      deleteAllProfitsFromReport: (reportId) => {
        let foundAndCleared = false;
        let reportName = "Relatório";
        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(report => {
              if (report.id === reportId && report.profits.length > 0) {
                reportName = report.name;
                foundAndCleared = true;
                return {
                  ...report,
                  profits: [],
                  updatedAt: new Date().toISOString(),
                  summary: { 
                    ...(report.summary || defaultInitialReportSummary),
                    calculationError: "Data changed, recalculation needed",
                    lastCalculated: new Date().toISOString(),
                  }, 
                };
              }
              return report;
            }),
          },
        }));
        if (foundAndCleared) {
          toast({ title: "Registros Removidos", description: `Todos os lucros/perdas do relatório "${reportName}" foram removidos.`, variant: "success" });
        } else {
          const report = get().collection.reports.find(r => r.id === reportId);
          if (report && report.profits.length === 0) {
            toast({ title: "Nenhum Registro", description: `Não há lucros/perdas para remover em "${report.name}".`, variant: "default" });
          } else if (!report) {
            toast({ title: "Erro", description: "Relatório não encontrado.", variant: "destructive" });
          }
        }
        return foundAndCleared;
      },
      
      importExternalDataToReport: (reportId, investmentsToImport, profitsToImport, options) => {
        const stats = {
          investmentStats: { added: 0, duplicates: 0, errors: 0 },
          profitStats: { added: 0, duplicates: 0, errors: 0 },
        };
        let success = false;
        let reportName = "Relatório";
        
        const report = get().collection.reports.find(r => r.id === reportId);
        if (!report) {
          if (!options?.suppressToast) {
            toast({ title: "Erro na Importação", description: "Relatório de destino não encontrado.", variant: "destructive" });
          }
          return { success: false, ...stats };
        }
        reportName = report.name;

        investmentsToImport.forEach(invBase => {
          const { id, priceAtDate, priceAtDateCurrency, priceAtDateSource, ...base } = invBase; 
          const result = get().addInvestmentToReport(reportId, base, { suppressToast: true });
          if (result.status === 'added') stats.investmentStats.added++;
          else if (result.status === 'duplicate') stats.investmentStats.duplicates++;
          else stats.investmentStats.errors++;
        });

        profitsToImport.forEach(profBase => {
          const { id, ...base } = profBase; 
          const result = get().addProfitRecordToReport(reportId, base, { suppressToast: true });
          if (result.status === 'added') stats.profitStats.added++;
          else if (result.status === 'duplicate') stats.profitStats.duplicates++;
          else stats.profitStats.errors++;
        });

        if (stats.investmentStats.added > 0 || stats.profitStats.added > 0) {
          success = true;
          set(state => ({ 
            collection: {
              ...state.collection,
              reports: state.collection.reports.map(r => 
                r.id === reportId ? { 
                  ...r, 
                  lastImportDate: new Date().toISOString(), 
                  updatedAt: new Date().toISOString(),
                  summary: { 
                    ...(r.summary || defaultInitialReportSummary),
                    calculationError: "Data imported, recalculation needed",
                    lastCalculated: new Date().toISOString(),
                   } 
                } : r
              )
            }
          }));
          if (!options?.suppressToast) {
            let desc = "";
            if (stats.investmentStats.added > 0) desc += `${stats.investmentStats.added} aportes. `;
            if (stats.profitStats.added > 0) desc += `${stats.profitStats.added} lucros/perdas. `;
            if (stats.investmentStats.duplicates > 0 || stats.profitStats.duplicates > 0) desc += `${stats.investmentStats.duplicates + stats.profitStats.duplicates} duplicados. `;
            if (stats.investmentStats.errors > 0 || stats.profitStats.errors > 0) desc += `${stats.investmentStats.errors + stats.profitStats.errors} erros. `;
            toast({ title: `Dados Importados para "${reportName}"`, description: desc.trim(), variant: "success" });
          }
        } else if ((stats.investmentStats.duplicates > 0 || stats.profitStats.duplicates > 0) && !options?.suppressToast) {
            toast({ title: "Dados Duplicados", description: `Nenhum dado novo importado para "${reportName}" pois já existiam.`, variant: "default" });
        } else if ((stats.investmentStats.errors > 0 || stats.profitStats.errors > 0) && !options?.suppressToast) {
            toast({ title: "Erro na Importação", description: `Falha ao importar dados para "${reportName}".`, variant: "destructive" });
        } else if (!options?.suppressToast) {
            toast({ title: "Nenhum Dado Novo", description: `Nenhum dado novo para importar para "${reportName}".`, variant: "default" });
        }
        return { success, ...stats };
      },

      // --- Função de Recálculo do Sumário --- 
      recalculateReportSummary: async (reportId, currentRates) => {
        const report = get().collection.reports.find(r => r.id === reportId);
        if (!report) {
          console.error(`[recalculateSummary] Relatório ${reportId} não encontrado.`);
          return false;
        }
        if (!currentRates || !currentRates.btcToUsd || !currentRates.usdToBrlRate || currentRates.btcToUsd === 0) {
          console.warn(`[recalculateSummary] Cotações atuais inválidas ou zeradas para o relatório ${reportId}. Sumário não recalculado.`);
          set(state => ({
            collection: {
              ...state.collection,
              reports: state.collection.reports.map(r => 
                r.id === reportId ? { 
                  ...r, 
                  summary: { 
                    ...(r.summary || defaultInitialReportSummary), 
                    calculationError: "Cotações atuais indisponíveis ou inválidas", 
                    pricesUsed: null 
                  }
                } : r
              )
            }
          }));
          return false;
        }

        let priceBtcUsdAtPeriodStart: number | null = null;
        let priceBtcUsdAtPeriodEnd: number | null = null;
        let P_start_date_obj: Date | null = null;
        let P_end_date_obj: Date | null = null;

        if (report.historyPeriodFilterType === 'month' && report.historyFilterMonthDate) {
          try {
            P_start_date_obj = startOfMonth(parseISO(report.historyFilterMonthDate));
            P_end_date_obj = endOfMonth(parseISO(report.historyFilterMonthDate));
          } catch (e) { console.error("[recalculateSummary] Error parsing historyFilterMonthDate:", e); }
        } else if (report.historyPeriodFilterType === 'custom' && report.historyFilterCustomStartDate && report.historyFilterCustomEndDate) {
          try {
            P_start_date_obj = startOfDay(parseISO(report.historyFilterCustomStartDate));
            P_end_date_obj = endOfDay(parseISO(report.historyFilterCustomEndDate));
            if (isBefore(P_end_date_obj, P_start_date_obj)) P_start_date_obj = P_end_date_obj = null; // Invalidar
          } catch (e) { console.error("[recalculateSummary] Error parsing custom filter dates:", e); }
        }
        
        // Buscar preços históricos se um período de filtro estiver ativo e válido
        if (P_start_date_obj) {
            const priceInfoStart = await fetchBtcPriceOnDate(P_start_date_obj, "USD");
            priceBtcUsdAtPeriodStart = priceInfoStart?.price || null;
        }
        if (P_end_date_obj) {
            // Se P_end_date_obj for hoje ou futuro, usar currentRates.btcToUsd
            // Senão, buscar preço histórico.
            if (isBefore(P_end_date_obj, startOfDay(new Date()))) { // Se P_end é estritamente antes de hoje
                const priceInfoEnd = await fetchBtcPriceOnDate(P_end_date_obj, "USD");
                priceBtcUsdAtPeriodEnd = priceInfoEnd?.price || null;
            } else { // P_end é hoje ou futuro, usar preço atual
                priceBtcUsdAtPeriodEnd = currentRates.btcToUsd;
            }
        }

        const calculatedSummary = calculateReportSummaryLogic(
          report, // Passa os campos necessários de `report`
          currentRates,
          priceBtcUsdAtPeriodStart,
          priceBtcUsdAtPeriodEnd
        );

        set(state => ({
          collection: {
            ...state.collection,
            reports: state.collection.reports.map(r => 
              r.id === reportId ? { ...r, summary: calculatedSummary, updatedAt: new Date().toISOString() } : r
            )
          }
        }));
        // Não mostrar toast aqui, pois pode ser chamado em background ou em loop
        console.log(`[recalculateSummary] Sumário para o relatório "${report.name}" (${reportId}) recalculado.`);
        return true;
      },
    }),
    {
      name: STORAGE_KEYS.REPORTS_COLLECTION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        collection: state.collection,
        activeReportId: state.activeReportId,
      }),
      onRehydrateStorage: () => (persistedState) => {
        console.log("[useReports] onRehydrateStorage: Estado persistido recebido:", persistedState);
        if (persistedState) {
          // A migração e o carregamento inicial agora são tratados por initializeReportsStore
          // Esta callback apenas confirma a reidratação. O estado isLoaded
          // será definido por initializeReportsStore após a migração.
          // Se initializeReportsStore não for usado, então precisaríamos chamar setLoaded aqui.
          // Por agora, vamos assumir que initializeReportsStore é o ponto de entrada principal para definir o estado carregado.
          // Se for necessário, podemos reativar: 
          // get().setLoaded(persistedState.collection || { reports: [] }, persistedState.activeReportId || null);
          console.log("[useReports] onRehydrateStorage: Reidratação concluída. initializeReportsStore deve finalizar o setup.");
        } else {
          console.log("[useReports] onRehydrateStorage: Nenhum estado persistido encontrado. initializeReportsStore deve configurar estado inicial.");
          // Garante que, se não houver estado persistido, isLoaded seja true após a tentativa de reidratação (via initializeReportsStore)
          // Se initializeReportsStore não for usado, e não há estado persistido, o estado inicial do create() (isLoaded: false) permanece
          // até que algo o altere. Considerar chamar setLoaded com estado padrão se não houver persistência e initializeReportsStore não for usado.
          // Ex: get().setLoaded({ reports: [] }, null);
        }
      },
    }
  )
);

// Função auxiliar para gerar cores aleatórias mais agradáveis
function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 60%)`; // Cor pastel, mas vibrante
}

// --- Lógica de Migração (Exemplo) ---
// Esta lógica deve ser executada ANTES de inicializar o store do Zustand
// ou antes de chamar setLoaded se você estiver fazendo manualmente.

// Suponha que a versão antiga dos relatórios não tinha `summary` ou `historyPeriodFilterType`.
// interface OldReportV1 { id: string; name: string; investments: Investment[]; profits: ProfitRecord[]; createdAt: string; }
// interface OldReportsCollectionV1 { reports: OldReportV1[]; }

export function migrateReportsCollection(persistedState: any): ReportsCollection {
  if (!persistedState || !persistedState.collection || !persistedState.collection.reports) {
    return { reports: [] }; // Estado inicial se não houver nada ou estrutura inválida
  }

  let collectionToMigrate = persistedState.collection as ReportsCollection; // Assume que já pode ser o formato novo

  // Verifica se a migração é necessária (ex: pela ausência de um campo novo)
  const needsMigration = collectionToMigrate.reports.some(report => typeof report.summary === 'undefined' || typeof report.updatedAt === 'undefined');

  if (needsMigration) {
    console.log("useReports: Migrando dados de relatórios para novo formato...");
    const migratedReports = collectionToMigrate.reports.map((report: any) => {
      const now = new Date().toISOString();
      return {
        ...report, // Mantém campos existentes
        investments: report.investments || [],
        profits: report.profits || [],
        description: report.description || "",
        color: report.color || generateRandomColor(),
        createdAt: report.createdAt || now, 
        updatedAt: report.updatedAt || now, // Adicionar updatedAt
        historyPeriodFilterType: report.historyPeriodFilterType || "month",
        historyFilterMonthDate: report.historyFilterMonthDate || startOfMonth(new Date()).toISOString(),
        historyFilterCustomStartDate: report.historyFilterCustomStartDate || null,
        historyFilterCustomEndDate: report.historyFilterCustomEndDate || null,
        lastImportDate: report.lastImportDate || null,
        summary: report.summary || { ...defaultInitialReportSummary, lastCalculated: now, calculationError: "Migrated, needs calculation" },
      } as Report;
    });
    collectionToMigrate = { ...collectionToMigrate, reports: migratedReports };
    toast({ title: "Dados Atualizados", description: "O formato dos seus relatórios foi atualizado para a nova versão.", duration: 5000});
  }
  return collectionToMigrate;
}

// Lógica para carregar o activeReportId do localStorage separadamente (se necessário)
export function loadActiveReportId(): string | null {
  try {
    const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_REPORT_ID);
    return activeId ? JSON.parse(activeId) : null;
  } catch (e) {
    console.error("Erro ao carregar activeReportId do localStorage:", e);
    return null;
  }
}

// Lógica para salvar activeReportId no localStorage separadamente (se necessário)
// Se activeReportId faz parte do `partialize` do persist, isso pode não ser necessário.
// Contudo, o `persist` do Zustand pode ter limitações com atualizações parciais imediatas de itens não-principais.
// Este é um exemplo se você precisar de controle mais granular.
// useReports.subscribe(
//   (state) => state.activeReportId,
//   (activeReportId) => {
//     try {
//       if (activeReportId) {
//         localStorage.setItem(STORAGE_KEYS.ACTIVE_REPORT_ID, JSON.stringify(activeReportId));
//       } else {
//         localStorage.removeItem(STORAGE_KEYS.ACTIVE_REPORT_ID);
//       }
//     } catch (e) {
//       console.error("Erro ao salvar activeReportId no localStorage:", e);
//     }
//   }
// );

// Inicialização do Store com Migração:
// Isso é um pouco mais complexo com `persist` middleware.
// Uma abordagem é carregar o estado bruto, migrar, e então inicializar o store.
// O `onRehydrateStorage` do persist middleware é útil, mas a migração pode precisar ocorrer antes.

// Fora do hook, para ser chamado na inicialização da aplicação:
export const initializeReportsStore = () => {
  console.log("[initializeReportsStore] Iniciando inicialização do store de relatórios...");
  const rawState = localStorage.getItem(STORAGE_KEYS.REPORTS_COLLECTION);
  let collectionToLoad: ReportsCollection = { reports: [] };
  let activeIdToLoad: string | null = null;

  if (rawState) {
    try {
      const parsedState = JSON.parse(rawState);
      if (parsedState && parsedState.state) { // Zustand armazena sob uma chave "state"
        console.log("[initializeReportsStore] Estado bruto do localStorage:", parsedState.state);
        collectionToLoad = migrateReportsCollection({ 
            collection: parsedState.state.collection, 
        });
        activeIdToLoad = parsedState.state.activeReportId || loadActiveReportId(); // Prioriza o que está no objeto
        console.log("[initializeReportsStore] Coleção migrada e ID ativo carregado:", collectionToLoad, activeIdToLoad);
      } else {
        console.warn("[initializeReportsStore] Formato inesperado no localStorage. Usando padrão.");
      }
    } catch (e) {
      console.error("[initializeReportsStore] Erro ao parsear/migrar dados do localStorage. Usando padrão:", e);
    }
  }

  // Chamar setLoaded para atualizar o store com os dados carregados/migrados e definir isLoaded = true
  useReports.getState().setLoaded(collectionToLoad, activeIdToLoad);

  // Garantir que o relatório ativo exista, ou selecionar o primeiro, ou null
  const finalActiveId = useReports.getState().activeReportId;
  const reports = useReports.getState().collection.reports;
  if (finalActiveId && !reports.some(r => r.id === finalActiveId)) {
    console.log(`[initializeReportsStore] ID ativo '${finalActiveId}' não encontrado nos relatórios. Selecionando o primeiro.`);
    useReports.getState().selectReport(reports.length > 0 ? reports[0].id : null);
  } else if (!finalActiveId && reports.length > 0) {
    console.log("[initializeReportsStore] Nenhum ID ativo. Selecionando o primeiro relatório.");
    useReports.getState().selectReport(reports[0].id);
  } else {
    console.log("[initializeReportsStore] Nenhum ID ativo e nenhum relatório para selecionar, ou ID ativo já é válido.");
  }
  console.log("[initializeReportsStore] Finalizado. Estado atual de isLoaded:", useReports.getState().isLoaded);
};

// +++ INÍCIO DA NOVA FUNÇÃO calculateReportSummaryLogic +++

// Função auxiliar para converter SATS para BTC, ou manter BTC
function convertToBtc(amount: number, unit: "BTC" | "SATS"): number {
  return unit === "SATS" ? amount / 1e8 : amount;
}

export function calculateReportSummaryLogic(
  reportData: Pick<Report, 'investments' | 'profits' | 'historyPeriodFilterType' | 'historyFilterMonthDate' | 'historyFilterCustomStartDate' | 'historyFilterCustomEndDate'>,
  currentRates: CurrencyRates,
  // Preços históricos para o início e fim do período de filtro, se aplicável. Em USD.
  priceBtcUsdAtPeriodStart?: number | null,
  priceBtcUsdAtPeriodEnd?: number | null 
): ReportSummary {
  const { investments, profits } = reportData;
  const { btcToUsd, usdToBrlRate } = currentRates;
  const btcToBrl = btcToUsd * usdToBrlRate;

  const newSummary: ReportSummary = {
    totalInvestedBtc: 0,
    totalInvestedUsdAtPurchase: 0,
    averageBuyPriceUsd: 0,
    investmentCount: 0,
    firstInvestmentDate: null,
    lastInvestmentDate: null,
    totalOperationalProfitBtc: 0,
    totalOperationalLossBtc: 0,
    netOperationalProfitBtc: 0,
    netOperationalProfitUsdAtCurrentPrice: 0,
    operationalProfitRecordCount: 0,
    operationalLossRecordCount: 0,
    currentPortfolioBtc: 0,
    currentPortfolioUsd: 0,
    currentPortfolioBrl: 0,
    valuationProfitUsd: 0,
    valuationProfitBtc: 0,
    totalNetProfitLossBtc: 0,
    totalNetProfitLossUsd: 0,
    returnOnInvestmentPercent: 0,
    profitOrLossInPeriodBtc: 0,
    profitOrLossInPeriodUsd: 0,
    yieldInPeriodPercent: 0,
    capitalAtPeriodStartBtc: 0,
    capitalAtPeriodStartUsd: 0,
    investmentsInPeriodBtc: 0,
    operationalNetProfitInPeriodBtc: 0,
    valuationChangeInPeriodUsd: 0,
    lastCalculated: new Date().toISOString(),
    pricesUsed: currentRates,
    calculationError: null,
  };

  // --- Cálculos de Investimento ---
  newSummary.investmentCount = investments.length;
  investments.forEach(inv => {
    const investmentBtc = convertToBtc(inv.amount, inv.unit);
    newSummary.totalInvestedBtc += investmentBtc;
    if (inv.priceAtDate && inv.priceAtDateCurrency) {
      let priceUsd = inv.priceAtDate;
      if (inv.priceAtDateCurrency === "BRL" && usdToBrlRate > 0) {
        priceUsd = inv.priceAtDate / usdToBrlRate;
      }
      newSummary.totalInvestedUsdAtPurchase += priceUsd * investmentBtc;
    }
  });

  newSummary.averageBuyPriceUsd = newSummary.totalInvestedBtc > 0
    ? newSummary.totalInvestedUsdAtPurchase / newSummary.totalInvestedBtc
    : 0;

  if (investments.length > 0) {
    const sortedInvestments = [...investments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    newSummary.firstInvestmentDate = sortedInvestments[0].date;
    newSummary.lastInvestmentDate = sortedInvestments[sortedInvestments.length - 1].date;
  }

  // --- Cálculos Operacionais (ProfitRecords) ---
  profits.forEach(p => {
    const amountBtc = convertToBtc(p.amount, p.unit);
    if (p.isProfit) {
      newSummary.totalOperationalProfitBtc += amountBtc;
      newSummary.operationalProfitRecordCount++;
    } else {
      newSummary.totalOperationalLossBtc += amountBtc;
      newSummary.operationalLossRecordCount++;
    }
  });
  newSummary.netOperationalProfitBtc = newSummary.totalOperationalProfitBtc - newSummary.totalOperationalLossBtc;
  newSummary.netOperationalProfitUsdAtCurrentPrice = newSummary.netOperationalProfitBtc * btcToUsd;

  // --- Saldo e Valorização ---
  newSummary.currentPortfolioBtc = newSummary.totalInvestedBtc + newSummary.netOperationalProfitBtc;
  newSummary.currentPortfolioUsd = newSummary.currentPortfolioBtc * btcToUsd;
  newSummary.currentPortfolioBrl = newSummary.currentPortfolioBtc * btcToBrl;

  // Valorização: (Valor atual dos BTCs investidos originalmente) - (Valor pago por esses BTCs)
  newSummary.valuationProfitUsd = (newSummary.totalInvestedBtc * btcToUsd) - newSummary.totalInvestedUsdAtPurchase;
  newSummary.valuationProfitBtc = btcToUsd > 0 ? newSummary.valuationProfitUsd / btcToUsd : 0;

  // --- Desempenho Geral ---
  newSummary.totalNetProfitLossBtc = newSummary.netOperationalProfitBtc + newSummary.valuationProfitBtc;
  newSummary.totalNetProfitLossUsd = newSummary.netOperationalProfitUsdAtCurrentPrice + newSummary.valuationProfitUsd;
  newSummary.returnOnInvestmentPercent = newSummary.totalInvestedBtc > 0
    ? (newSummary.totalNetProfitLossBtc / newSummary.totalInvestedBtc) * 100
    : 0;

  // --- Cálculos de Período ---
  const { historyPeriodFilterType, historyFilterMonthDate, historyFilterCustomStartDate, historyFilterCustomEndDate } = reportData;
  let P_start_date_obj: Date | null = null;
  let P_end_date_obj: Date | null = null;

  if (historyPeriodFilterType === 'month' && historyFilterMonthDate) {
    try {
      P_start_date_obj = startOfMonth(parseISO(historyFilterMonthDate));
      P_end_date_obj = endOfMonth(parseISO(historyFilterMonthDate));
    } catch (e) { console.error("Error parsing historyFilterMonthDate:", e); }
  } else if (historyPeriodFilterType === 'custom' && historyFilterCustomStartDate && historyFilterCustomEndDate) {
    try {
      P_start_date_obj = startOfDay(parseISO(historyFilterCustomStartDate));
      P_end_date_obj = endOfDay(parseISO(historyFilterCustomEndDate));
      if (isBefore(P_end_date_obj, P_start_date_obj)) {
        newSummary.calculationError = "Data final do período é anterior à data inicial.";
        P_start_date_obj = null; // Invalidar período
        P_end_date_obj = null;
      }
    } catch (e) { console.error("Error parsing custom filter dates:", e); }
  }

  if (P_start_date_obj && P_end_date_obj && !newSummary.calculationError) {
    const pStart = P_start_date_obj;
    const pEnd = P_end_date_obj;

    // 1. Capital no início do período (BTC)
    investments.filter(inv => isBefore(parseISO(inv.date), pStart))
      .forEach(inv => newSummary.capitalAtPeriodStartBtc += convertToBtc(inv.amount, inv.unit));
    profits.filter(p => isBefore(parseISO(p.date), pStart))
      .forEach(p => newSummary.capitalAtPeriodStartBtc += (p.isProfit ? 1 : -1) * convertToBtc(p.amount, p.unit));

    if (priceBtcUsdAtPeriodStart && priceBtcUsdAtPeriodStart > 0) {
        newSummary.capitalAtPeriodStartUsd = newSummary.capitalAtPeriodStartBtc * priceBtcUsdAtPeriodStart;
    }

    // 2. Investimentos e Lucros/Perdas DENTRO do período (BTC)
    newSummary.investmentsInPeriodBtc = investments
      .filter(inv => isWithinInterval(parseISO(inv.date), { start: pStart, end: pEnd }))
      .reduce((sum, inv) => sum + convertToBtc(inv.amount, inv.unit), 0);
    
    newSummary.operationalNetProfitInPeriodBtc = profits
      .filter(p => isWithinInterval(parseISO(p.date), { start: pStart, end: pEnd }))
      .reduce((sum, p) => sum + (p.isProfit ? 1 : -1) * convertToBtc(p.amount, p.unit), 0);

    // 3. Capital no FIM do período (BTC)
    let capitalAtPeriodEndBtc = 0;
    investments.filter(inv => !isBefore(pEnd, parseISO(inv.date)) ) // date <= pEnd
      .forEach(inv => capitalAtPeriodEndBtc += convertToBtc(inv.amount, inv.unit));
    profits.filter(p => !isBefore(pEnd, parseISO(p.date)) ) // date <= pEnd
      .forEach(p => capitalAtPeriodEndBtc += (p.isProfit ? 1 : -1) * convertToBtc(p.amount, p.unit));

    // 4. Lucro/Perda no período (BTC)
    newSummary.profitOrLossInPeriodBtc = capitalAtPeriodEndBtc - newSummary.capitalAtPeriodStartBtc - newSummary.investmentsInPeriodBtc;

    // 5. Lucro/Perda no período (USD)
    const effectivePriceAtPeriodEndUsd = priceBtcUsdAtPeriodEnd ?? (isWithinInterval(new Date(), {start: pStart, end: pEnd}) || isBefore(new Date(), pEnd) ? currentRates.btcToUsd : null);
    if (effectivePriceAtPeriodEndUsd && effectivePriceAtPeriodEndUsd > 0) {
        newSummary.profitOrLossInPeriodUsd = newSummary.profitOrLossInPeriodBtc * effectivePriceAtPeriodEndUsd;
    } else if (newSummary.profitOrLossInPeriodBtc !== 0) {
        newSummary.calculationError = (newSummary.calculationError || "") + " Preço no fim do período indisponível para converter Lucro/Perda do período para USD.";
    }

    // 6. Yield no período (%)
    if (newSummary.capitalAtPeriodStartBtc && newSummary.capitalAtPeriodStartBtc !== 0) {
      newSummary.yieldInPeriodPercent = (newSummary.profitOrLossInPeriodBtc / newSummary.capitalAtPeriodStartBtc) * 100;
    }

    // 7. ValuationChangeInPeriodUsd (Mudança de valor dos ativos que estavam no portfólio durante o período)
    // (Capital_P_start_btc * Price_P_end) - (Capital_P_start_btc * Price_P_start)
    if (priceBtcUsdAtPeriodStart && priceBtcUsdAtPeriodStart > 0 && effectivePriceAtPeriodEndUsd && effectivePriceAtPeriodEndUsd > 0) {
      newSummary.valuationChangeInPeriodUsd = newSummary.capitalAtPeriodStartBtc * (effectivePriceAtPeriodEndUsd - priceBtcUsdAtPeriodStart);
    } else if (newSummary.capitalAtPeriodStartBtc !==0 ){ 
      // newSummary.calculationError = (newSummary.calculationError || "") + " Preços históricos do período incompletos para cálculo de valorização no período.";
       // Não setar erro aqui pois pode ser normal se o período for futuro ou os preços não estiverem disponíveis ainda
    }

  } else if (historyPeriodFilterType !== "month" || historyFilterMonthDate) { // Se não for filtro mensal padrão, ou se for custom e inválido
    if ( (historyPeriodFilterType === "custom" && (historyFilterCustomStartDate || historyFilterCustomEndDate) && !newSummary.calculationError)) {
        newSummary.calculationError = (newSummary.calculationError || "") + " Filtros de período customizado incompletos ou inválidos.";
    }
    // Se não há filtro de período válido, as métricas de período permanecem 0 ou como calculadas sem filtro.
  }

  return newSummary;
}
// +++ FIM DA NOVA FUNÇÃO calculateReportSummaryLogic +++
