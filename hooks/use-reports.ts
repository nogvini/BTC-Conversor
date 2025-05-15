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
      
      // Filtrar a lista de relatórios para remover o relatório excluído
      let updatedReportsArray = prevCollection.reports.filter(r => r.id !== reportId);
      
      let newActiveReportId = prevCollection.activeReportId;

      // Se o relatório excluído era o ativo, ou se não há mais relatório ativo válido
      // definir um novo relatório ativo (o primeiro da lista atualizada, se houver)
      const currentActiveStillExists = updatedReportsArray.some(r => r.id === newActiveReportId);

      if ((newActiveReportId === reportId || !currentActiveStillExists) && updatedReportsArray.length > 0) {
        newActiveReportId = updatedReportsArray[0].id;
      }
      
      // Garantir que isActive seja definido corretamente no novo array de relatórios
      updatedReportsArray = updatedReportsArray.map(report => ({
        ...report,
        isActive: report.id === newActiveReportId,
      }));
      
      // Se, após a exclusão, não houver mais relatórios, o activeReportId pode ser undefined
      if (updatedReportsArray.length === 0) {
        newActiveReportId = undefined;
      }

      const reportName = prevCollection.reports[reportIndex].name;
      toast({
        title: "Relatório excluído",
        description: `O relatório "${reportName}" foi excluído com sucesso`,
        duration: 3000,
      });
      
      return {
        ...prevCollection,
        reports: updatedReportsArray,
        activeReportId: newActiveReportId,
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
  
  // Função para adicionar um investimento ao relatório ativo (ou especificado)
  const addInvestment = useCallback((
    investmentData: Omit<Investment, "id"> & { originalId?: string }, 
    targetReportId?: string,
    options?: { suppressToast?: boolean }
  ): { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } => {
    let result: { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } = { status: 'error', message: 'Operação não concluída' };
    
    setCollection(prevCollection => {
      const reportIdToUpdate = targetReportId || prevCollection.activeReportId;
      if (!reportIdToUpdate) {
        result = { status: 'error', message: "Nenhum relatório ativo ou alvo especificado." };
        if (!options?.suppressToast) {
          toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        return prevCollection;
      }

      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportIdToUpdate);
      if (reportIndex === -1) {
        result = { status: 'error', message: "Relatório não encontrado." };
        if (!options?.suppressToast) {
          toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        return prevCollection;
      }

      const reportToUpdate = prevCollection.reports[reportIndex];

      if (investmentData.originalId) {
        const isDuplicate = reportToUpdate.investments.some(inv => inv.originalId === investmentData.originalId);
        if (isDuplicate) {
          result = { status: 'duplicate', originalId: investmentData.originalId, message: `Aporte com ID original ${investmentData.originalId} já existe.` };
          if (!options?.suppressToast) {
            toast({ title: "Aporte Duplicado", description: result.message + " Foi ignorado.", variant: "default", duration: 4000 });
          }
          return prevCollection; 
        }
      }

      const newInvestmentId = generateId();
      const newInvestment: Investment = {
        ...investmentData,
        id: newInvestmentId,
      };

      const updatedReport = {
        ...reportToUpdate,
        investments: [...reportToUpdate.investments, newInvestment],
      };

      const updatedReports = [...prevCollection.reports];
      updatedReports[reportIndex] = updatedReport;
      
      result = { status: 'added', id: newInvestmentId, message: "Novo aporte registrado com sucesso." };
      if (!options?.suppressToast) {
        toast({ title: "Aporte Adicionado", description: result.message, variant: "success" });
      }
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return result;
  }, []);
  
  // Função para adicionar um registro de lucro/perda ao relatório ativo (ou especificado)
  const addProfitRecord = useCallback((
    profitData: Omit<ProfitRecord, "id"> & { originalId?: string }, 
    targetReportId?: string,
    options?: { suppressToast?: boolean }
  ): { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } => {
    let result: { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } = { status: 'error', message: 'Operação não concluída' };

    setCollection(prevCollection => {
      const reportIdToUpdate = targetReportId || prevCollection.activeReportId;
      if (!reportIdToUpdate) {
        result = { status: 'error', message: "Nenhum relatório ativo ou alvo especificado." };
        if (!options?.suppressToast) {
          toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        return prevCollection;
      }

      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportIdToUpdate);
      if (reportIndex === -1) {
        result = { status: 'error', message: "Relatório não encontrado." };
        if (!options?.suppressToast) {
          toast({ title: "Erro", description: result.message, variant: "destructive" });
        }
        return prevCollection;
      }

      const reportToUpdate = prevCollection.reports[reportIndex];

      if (profitData.originalId) {
        const isDuplicate = reportToUpdate.profits.some(p => p.originalId === profitData.originalId);
        if (isDuplicate) {
          result = { status: 'duplicate', originalId: profitData.originalId, message: `Registro de lucro/perda com ID original ${profitData.originalId} já existe.` };
          if (!options?.suppressToast) {
            toast({ title: "Registro Duplicado", description: result.message + " Foi ignorado.", variant: "default", duration: 4000 });
          }
          return prevCollection; 
        }
      }

      const newProfitRecordId = generateId();
      const newProfitRecord: ProfitRecord = {
        ...profitData,
        id: newProfitRecordId,
      };

      const updatedReport = {
        ...reportToUpdate,
        profits: [...reportToUpdate.profits, newProfitRecord],
      };

      const updatedReports = [...prevCollection.reports];
      updatedReports[reportIndex] = updatedReport;

      result = { status: 'added', id: newProfitRecordId, message: "Novo registro de lucro/perda salvo com sucesso." };
      if (!options?.suppressToast) {
        toast({ title: "Registro Adicionado", description: result.message, variant: "success" });
      }
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return result;
  }, []);
  
  // Função para excluir um investimento de um relatório específico
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
  
  // NOVA FUNÇÃO: Excluir todos os investimentos de um relatório
  const deleteAllInvestmentsFromReport = useCallback((reportId: string) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);

      if (reportIndex === -1) {
        toast({
          title: "Relatório não encontrado",
          description: "Não foi possível encontrar o relatório para excluir os aportes.",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }

      const updatedReports = [...prevCollection.reports];
      const currentReport = { ...updatedReports[reportIndex] };

      currentReport.investments = [];
      currentReport.updatedAt = new Date().toISOString();
      updatedReports[reportIndex] = currentReport;

      toast({
        title: "Aportes excluídos",
        description: `Todos os aportes do relatório "${currentReport.name}" foram excluídos.`,
        duration: 3000,
      });

      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return true;
  }, []);

  // NOVA FUNÇÃO: Excluir todos os lucros/perdas de um relatório
  const deleteAllProfitsFromReport = useCallback((reportId: string) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);

      if (reportIndex === -1) {
        toast({
          title: "Relatório não encontrado",
          description: "Não foi possível encontrar o relatório para excluir os registros de lucro/perda.",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }

      const updatedReports = [...prevCollection.reports];
      const currentReport = { ...updatedReports[reportIndex] };

      currentReport.profits = [];
      currentReport.updatedAt = new Date().toISOString();
      updatedReports[reportIndex] = currentReport;

      toast({
        title: "Registros de Lucro/Perda excluídos",
        description: `Todos os registros de lucro/perda do relatório "${currentReport.name}" foram excluídos.`,
        duration: 3000,
      });

      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
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
    importData,
    deleteAllInvestmentsFromReport,
    deleteAllProfitsFromReport,
  };
} 