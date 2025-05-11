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

// Hook para gerenciar relatórios da calculadora
export function useReports() {
  // Estado para a coleção de relatórios
  const [collection, setCollection] = useState<ReportCollection>({
    reports: [],
    lastUpdated: new Date().toISOString(),
    version: "1.0.0"
  });
  
  // Estado para controlar se os dados já foram carregados
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Estado para controlar a migração de dados legados
  const [isMigrated, setIsMigrated] = useState(false);
  
  // Referência ao relatório ativo atual
  const activeReport = collection.reports.find(r => r.id === collection.activeReportId) || 
                       collection.reports[0];
  
  // Carrega os dados do localStorage ao inicializar
  useEffect(() => {
    try {
      // Tentar carregar a coleção de relatórios
      const savedCollection = localStorage.getItem(STORAGE_KEYS.REPORTS_COLLECTION);
      
      if (savedCollection) {
        // Se há uma coleção salva, usar ela
        const parsedCollection = JSON.parse(savedCollection) as ReportCollection;
        setCollection(parsedCollection);
        setIsMigrated(true);
      } else {
        // Se não há coleção salva, verificar se há dados legados para migrar
        const migratedData = migrateFromLegacyData();
        
        if (migratedData) {
          // Se houver dados legados, usá-los e salvar a nova coleção
          setCollection(migratedData);
          localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(migratedData));
          setIsMigrated(true);
          
          toast({
            title: "Dados migrados",
            description: "Seus dados foram migrados para o novo formato de múltiplos relatórios",
            duration: 5000,
          });
        } else {
          // Se não houver dados legados, criar um relatório inicial vazio
          const initialReport = createNewReport("Meu Primeiro Relatório", "Relatório inicial");
          const newCollection: ReportCollection = {
            reports: [initialReport],
            activeReportId: initialReport.id,
            lastUpdated: new Date().toISOString(),
            version: "1.0.0"
          };
          
          setCollection(newCollection);
          localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(newCollection));
        }
      }
      
      setIsLoaded(true);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      
      // Em caso de erro, criar uma coleção vazia
      const initialReport = createNewReport("Meu Primeiro Relatório", "Relatório inicial");
      const newCollection: ReportCollection = {
        reports: [initialReport],
        activeReportId: initialReport.id,
        lastUpdated: new Date().toISOString(),
        version: "1.0.0"
      };
      
      setCollection(newCollection);
      localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(newCollection));
      setIsLoaded(true);
      
      toast({
        title: "Erro ao carregar dados",
        description: "Houve um problema ao carregar seus relatórios. Um novo relatório vazio foi criado.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, []);
  
  // Salva a coleção no localStorage quando ela é alterada
  useEffect(() => {
    if (isLoaded && collection.reports.length > 0) {
      localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(collection));
    }
  }, [collection, isLoaded]);
  
  // Função para adicionar um novo relatório
  const addReport = useCallback((name: string, description?: string) => {
    setCollection(prevCollection => {
      const newReport = createNewReport(name, description);
      
      // Atualizar todos os relatórios para não estarem ativos
      const updatedReports = prevCollection.reports.map(report => ({
        ...report,
        isActive: false,
      }));
      
      return {
        ...prevCollection,
        reports: [...updatedReports, newReport],
        activeReportId: newReport.id,
        lastUpdated: new Date().toISOString()
      };
    });
    
    toast({
      title: "Relatório criado",
      description: `O relatório "${name}" foi criado com sucesso`,
      duration: 3000,
    });
    
    return true;
  }, []);
  
  // Função para selecionar um relatório
  const selectReport = useCallback((reportId: string) => {
    setCollection(prevCollection => {
      // Verificar se o relatório existe
      const reportExists = prevCollection.reports.some(r => r.id === reportId);
      
      if (!reportExists) {
        toast({
          title: "Relatório não encontrado",
          description: "O relatório selecionado não foi encontrado",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }
      
      // Atualizar estado de ativo para todos os relatórios
      const updatedReports = prevCollection.reports.map(report => ({
        ...report,
        isActive: report.id === reportId,
      }));
      
      return {
        ...prevCollection,
        reports: updatedReports,
        activeReportId: reportId,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // Função para excluir um relatório
  const deleteReport = useCallback((reportId: string) => {
    setCollection(prevCollection => {
      // Não permitir excluir se houver apenas um relatório
      if (prevCollection.reports.length <= 1) {
        toast({
          title: "Operação não permitida",
          description: "Deve haver pelo menos um relatório",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }
      
      // Verificar se o relatório existe
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      
      if (reportIndex === -1) {
        toast({
          title: "Relatório não encontrado",
          description: "O relatório que você tentou excluir não foi encontrado",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }
      
      // Filtrar a lista de relatórios
      const updatedReports = prevCollection.reports.filter(r => r.id !== reportId);
      
      // Se o relatório excluído era o ativo, ativar outro
      let newActiveId = prevCollection.activeReportId;
      if (newActiveId === reportId) {
        newActiveId = updatedReports[0]?.id;
        // Atualizar estado ativo
        updatedReports[0] = { ...updatedReports[0], isActive: true };
      }
      
      const reportName = prevCollection.reports[reportIndex].name;
      toast({
        title: "Relatório excluído",
        description: `O relatório "${reportName}" foi excluído com sucesso`,
        duration: 3000,
      });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        activeReportId: newActiveId,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // Função para atualizar um relatório
  const updateReport = useCallback((reportId: string, updates: Partial<Report>) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      
      if (reportIndex === -1) {
        toast({
          title: "Relatório não encontrado",
          description: "O relatório que você tentou atualizar não foi encontrado",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }
      
      const updatedReports = [...prevCollection.reports];
      
      // Verificar e impedir alteração de investments e profits diretamente por esta função
      const safeUpdates = { ...updates };
      delete safeUpdates.investments;
      delete safeUpdates.profits;
      
      updatedReports[reportIndex] = {
        ...updatedReports[reportIndex],
        ...safeUpdates,
        updatedAt: new Date().toISOString()
      };
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // Função para adicionar um investimento ao relatório ativo
  const addInvestment = useCallback((investment: Omit<Investment, "id">) => {
    if (!activeReport) {
      toast({
        title: "Nenhum relatório ativo",
        description: "Não há relatório ativo para adicionar o investimento",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }
    
    const newInvestment: Investment = {
      ...investment,
      id: generateId()
    };
    
    setCollection(prevCollection => {
      const updatedReports = prevCollection.reports.map(report => {
        if (report.id === prevCollection.activeReportId) {
          return {
            ...report,
            investments: [...report.investments, newInvestment],
            updatedAt: new Date().toISOString()
          };
        }
        return report;
      });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, [activeReport]);
  
  // Função para adicionar um registro de lucro/perda ao relatório ativo
  const addProfitRecord = useCallback((profit: Omit<ProfitRecord, "id">) => {
    if (!activeReport) {
      toast({
        title: "Nenhum relatório ativo",
        description: "Não há relatório ativo para adicionar o registro",
        variant: "destructive",
        duration: 3000,
      });
      return false;
    }
    
    const newProfit: ProfitRecord = {
      ...profit,
      id: generateId()
    };
    
    setCollection(prevCollection => {
      const updatedReports = prevCollection.reports.map(report => {
        if (report.id === prevCollection.activeReportId) {
          return {
            ...report,
            profits: [...report.profits, newProfit],
            updatedAt: new Date().toISOString()
          };
        }
        return report;
      });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, [activeReport]);
  
  // Função para excluir um investimento
  const deleteInvestment = useCallback((reportId: string, investmentId: string) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      
      if (reportIndex === -1) {
        return prevCollection;
      }
      
      const updatedReports = [...prevCollection.reports];
      const updatedInvestments = updatedReports[reportIndex].investments.filter(
        inv => inv.id !== investmentId
      );
      
      updatedReports[reportIndex] = {
        ...updatedReports[reportIndex],
        investments: updatedInvestments,
        updatedAt: new Date().toISOString()
      };
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // Função para excluir um registro de lucro/perda
  const deleteProfitRecord = useCallback((reportId: string, profitId: string) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      
      if (reportIndex === -1) {
        return prevCollection;
      }
      
      const updatedReports = [...prevCollection.reports];
      const updatedProfits = updatedReports[reportIndex].profits.filter(
        prof => prof.id !== profitId
      );
      
      updatedReports[reportIndex] = {
        ...updatedReports[reportIndex],
        profits: updatedProfits,
        updatedAt: new Date().toISOString()
      };
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // Função para atualizar os dados de investimentos/lucros completos de um relatório
  const updateReportData = useCallback((
    reportId: string, 
    newInvestments?: Investment[], 
    newProfits?: ProfitRecord[]
  ) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      
      if (reportIndex === -1) {
        toast({
          title: "Relatório não encontrado",
          description: "O relatório que você tentou atualizar não foi encontrado",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }
      
      const updatedReports = [...prevCollection.reports];
      const currentReport = { ...updatedReports[reportIndex] };
      
      // Atualizar investimentos e/ou lucros se fornecidos
      if (newInvestments !== undefined) {
        currentReport.investments = newInvestments;
      }
      
      if (newProfits !== undefined) {
        currentReport.profits = newProfits;
      }
      
      currentReport.updatedAt = new Date().toISOString();
      updatedReports[reportIndex] = currentReport;
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // Função para importar dados de um arquivo ou outro relatório
  const importData = useCallback((
    targetReportId: string,
    investments?: Investment[],
    profits?: ProfitRecord[],
    options?: { replace?: boolean }
  ) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === targetReportId);
      
      if (reportIndex === -1) {
        toast({
          title: "Relatório não encontrado",
          description: "O relatório alvo para importação não foi encontrado",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }
      
      const updatedReports = [...prevCollection.reports];
      const currentReport = { ...updatedReports[reportIndex] };
      
      // Atualizar investimentos se fornecidos
      if (investments) {
        if (options?.replace) {
          currentReport.investments = investments;
        } else {
          // Combinar mantendo ids únicos
          const existingIds = new Set(currentReport.investments.map(inv => inv.id));
          const newInvestments = investments.filter(inv => !existingIds.has(inv.id));
          currentReport.investments = [...currentReport.investments, ...newInvestments];
        }
      }
      
      // Atualizar lucros se fornecidos
      if (profits) {
        if (options?.replace) {
          currentReport.profits = profits;
        } else {
          // Combinar mantendo ids únicos
          const existingIds = new Set(currentReport.profits.map(p => p.id));
          const newProfits = profits.filter(p => !existingIds.has(p.id));
          currentReport.profits = [...currentReport.profits, ...newProfits];
        }
      }
      
      currentReport.updatedAt = new Date().toISOString();
      updatedReports[reportIndex] = currentReport;
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // Retornar as funções e dados necessários
  return {
    reports: collection.reports,
    activeReport,
    activeReportId: collection.activeReportId,
    isLoaded,
    isMigrated,
    
    // Funções para gerenciamento de relatórios
    addReport,
    selectReport,
    deleteReport,
    updateReport,
    
    // Funções para gerenciamento de dados
    addInvestment,
    addProfitRecord,
    deleteInvestment,
    deleteProfitRecord,
    updateReportData,
    importData
  };
} 