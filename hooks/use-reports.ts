"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { 
  Report, 
  Investment, 
  ProfitRecord, 
  WithdrawalRecord,
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
  
  // Carrega os dados do localStorage ao inicializar - CORRIGIDO
  useEffect(() => {
    try {
      // Tentar carregar a coleção de relatórios
      const savedCollection = localStorage.getItem(STORAGE_KEYS.REPORTS_COLLECTION);
      
      if (savedCollection) {
        // Se há uma coleção salva, usar ela
        const parsedCollection = JSON.parse(savedCollection) as ReportCollection;
        
        // CORREÇÃO: Garantir que o activeReportId esteja alinhado com a propriedade isActive
        let activeId = parsedCollection.activeReportId;
        
        // Se não tiver activeReportId definido, verificar se algum relatório está marcado como ativo
        if (!activeId) {
          const activeReport = parsedCollection.reports.find(r => r.isActive);
          if (activeReport) {
            activeId = activeReport.id;
          } else if (parsedCollection.reports.length > 0) {
            // Se não houver relatório ativo, definir o primeiro como ativo
            activeId = parsedCollection.reports[0].id;
          }
        }
        
        // Atualizar o isActive para estar consistente com o activeReportId
        const updatedReports = parsedCollection.reports.map(report => ({
          ...report,
          isActive: report.id === activeId
        }));
        
        // Log de debug para verificação da inicialização
        console.log('[useReports] Carregando relatórios:', {
          numReports: updatedReports.length,
          reportNames: updatedReports.map(r => `${r.name}${r.isActive ? ' (ativo)' : ''}`),
          activeReportId: activeId
        });
        
        const correctedCollection = {
          ...parsedCollection,
          reports: updatedReports,
          activeReportId: activeId
        };
        
        // Salvar a coleção corrigida de volta ao localStorage
        localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(correctedCollection));
        
        setCollection(correctedCollection);
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
  
  // Salva a coleção no localStorage quando ela é alterada - MELHORADO
  useEffect(() => {
    if (isLoaded && collection.reports.length > 0) {
      // CORREÇÃO: Verificar a consistência antes de salvar
      let collectionToSave = {...collection};
      
      // Garantir que sempre temos um relatório ativo
      if (!collectionToSave.activeReportId || !collectionToSave.reports.some(r => r.id === collectionToSave.activeReportId)) {
        // Se não há relatório ativo válido, usar o primeiro
        if (collectionToSave.reports.length > 0) {
          collectionToSave.activeReportId = collectionToSave.reports[0].id;
          
          // Atualizar o isActive para todos os relatórios
          collectionToSave.reports = collectionToSave.reports.map(report => ({
            ...report,
            isActive: report.id === collectionToSave.activeReportId
          }));
          
          console.log('[saveEffect] Corrigindo coleção sem relatório ativo:', {
            activeReportId: collectionToSave.activeReportId,
            reportNames: collectionToSave.reports.map(r => `${r.name}${r.isActive ? ' (ativo)' : ''}`)
          });
          
          // Atualizar o estado interno com a correção
          setCollection(collectionToSave);
        }
      }
      
      // Salvar no localStorage
      localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(collectionToSave));
    }
  }, [collection, isLoaded]);
  
  // Função para adicionar um novo relatório - CORRIGIDA
  const addReport = useCallback((name: string, description?: string) => {
    setCollection(prevCollection => {
      const newReport = createNewReport(name, description);
      
      // Atualizar todos os relatórios para não estarem ativos
      const updatedReports = prevCollection.reports.map(report => ({
        ...report,
        isActive: false,
      }));
      
      // Novo array com todos os relatórios atualizados e o novo relatório
      const allReports = [...updatedReports, newReport];
      
      // Log de debug para verificação
      console.log('[addReport] Criando novo relatório:', {
        reportId: newReport.id,
        reportName: newReport.name,
        numReports: allReports.length,
        reportNames: allReports.map(r => `${r.name}${r.isActive ? ' (ativo)' : ''}`),
        activeReportId: newReport.id
      });
      
      const newCollection = {
        ...prevCollection,
        reports: allReports,
        activeReportId: newReport.id,
        lastUpdated: new Date().toISOString()
      };
      
      // Garantir que a coleção seja salva imediatamente
      try {
        localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(newCollection));
        console.log('[addReport] Coleção salva no localStorage com sucesso');
      } catch (error) {
        console.error('[addReport] Erro ao salvar coleção no localStorage:', error);
      }
      
      return newCollection;
    });
    
    toast({
      title: "Relatório criado",
      description: `O relatório "${name}" foi criado com sucesso`,
      duration: 3000,
    });
    
    return true;
  }, []);
  
  // Função para selecionar um relatório - CORRIGIDA
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
        updatedAt: report.id === reportId ? new Date().toISOString() : report.updatedAt
      }));
      
      // Log de debug para verificação
      console.log('[selectReport] Selecionando relatório:', {
        reportId,
        numReports: updatedReports.length,
        reportNames: updatedReports.map(r => `${r.name}${r.isActive ? ' (ativo)' : ''}`),
        activeReportId: reportId
      });
      
      const newCollection = {
        ...prevCollection,
        reports: updatedReports,
        activeReportId: reportId,
        lastUpdated: new Date().toISOString()
      };
      
      // Garantir que a coleção seja salva imediatamente
      try {
        localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(newCollection));
        console.log('[selectReport] Coleção salva no localStorage com sucesso');
      } catch (error) {
        console.error('[selectReport] Erro ao salvar coleção no localStorage:', error);
      }
      
      return newCollection;
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

      // Verificar e impedir alteração de investments e profits diretamente por esta função
      const safeUpdates = { ...updates };
      delete safeUpdates.investments;
      delete safeUpdates.profits;

      const updatedReportsArray = prevCollection.reports.map((report, index) => {
        if (index === reportIndex) {
          return {
            ...report,
            ...safeUpdates, // Aplicar apenas atualizações seguras
            updatedAt: new Date().toISOString(), // Atualizar a data de modificação
          };
        }
        return report;
      });
      
      const reportName = updatedReportsArray[reportIndex].name;

      // Não mostrar toast para cada atualização (ex: reordenar)
      // Apenas se for uma edição de nome ou descrição vinda do ReportManager
      if (updates.name || updates.description) {
        toast({
          title: "Relatório atualizado",
          description: `O relatório "${reportName}" foi atualizado.`,
          duration: 3000,
        });
      }
      
      return {
        ...prevCollection,
        reports: updatedReportsArray, // Usar o novo array mapeado
        lastUpdated: new Date().toISOString(),
        // Manter o activeReportId, a menos que o updateReport especificamente mude o report ativo
        activeReportId: safeUpdates.isActive === true ? reportId : safeUpdates.isActive === false && prevCollection.activeReportId === reportId ? undefined : prevCollection.activeReportId,
      };
    });

    return true;
  }, []);
  
  // Função para adicionar um investimento ao relatório ativo (ou especificado) - CORRIGIDA
  const addInvestment = useCallback((
    investmentData: Omit<Investment, "id"> & { originalId?: string }, 
    targetReportId?: string,
    options?: { suppressToast?: boolean }
  ): { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } => {
    let result: { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } = { status: 'error', message: 'Operação não concluída' };
    
    setCollection(prevCollection => {
      // CORREÇÃO: Garantir que haja um relatório ativo válido
      let reportIdToUpdate = targetReportId || prevCollection.activeReportId;
      
      // Se não tiver relatório alvo, verificar se algum relatório está marcado como ativo
      if (!reportIdToUpdate) {
        const activeReport = prevCollection.reports.find(r => r.isActive);
        if (activeReport) {
          reportIdToUpdate = activeReport.id;
          console.log('[addInvestment] Usando relatório ativo:', activeReport.name);
        } else if (prevCollection.reports.length > 0) {
          // Usar o primeiro relatório se não houver relatório ativo
          reportIdToUpdate = prevCollection.reports[0].id;
          console.log('[addInvestment] Nenhum relatório ativo, usando o primeiro:', prevCollection.reports[0].name);
        }
      }
      
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
  
  // Função para adicionar um registro de lucro/perda ao relatório ativo (ou especificado) - CORRIGIDA
  const addProfitRecord = useCallback((
    profitData: Omit<ProfitRecord, "id"> & { originalId?: string }, 
    targetReportId?: string,
    options?: { suppressToast?: boolean }
  ): { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } => {
    let result: { status: 'added' | 'duplicate' | 'error'; id?: string; originalId?: string; message?: string } = { status: 'error', message: 'Operação não concluída' };

    setCollection(prevCollection => {
      // CORREÇÃO: Garantir que haja um relatório ativo válido
      let reportIdToUpdate = targetReportId || prevCollection.activeReportId;
      
      // Se não tiver relatório alvo, verificar se algum relatório está marcado como ativo
      if (!reportIdToUpdate) {
        const activeReport = prevCollection.reports.find(r => r.isActive);
        if (activeReport) {
          reportIdToUpdate = activeReport.id;
          console.log('[addProfitRecord] Usando relatório ativo:', activeReport.name);
        } else if (prevCollection.reports.length > 0) {
          // Usar o primeiro relatório se não houver relatório ativo
          reportIdToUpdate = prevCollection.reports[0].id;
          console.log('[addProfitRecord] Nenhum relatório ativo, usando o primeiro:', prevCollection.reports[0].name);
        }
      }
      
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
        // ALGORITMO MELHORADO: Detectar duplicatas usando ID composto
        // Verifica se existe EXATAMENTE o mesmo profit (mesmo ID) 
        const exactDuplicate = reportToUpdate.profits.some(p => p.id === profitData.id);
        
        if (exactDuplicate) {
          result = { status: 'duplicate', originalId: profitData.originalId, message: `Registro de lucro/perda com ID exato ${profitData.id} já existe.` };
          if (!options?.suppressToast) {
            toast({ title: "Registro Duplicado", description: result.message + " Foi ignorado.", variant: "default", duration: 4000 });
          }
          return prevCollection; 
        }
        
        // IMPORTANTE: Não verificar duplicidade pelo originalId, pois queremos permitir
        // trades do mesmo ID mas com valores diferentes
        /*
        const isDuplicate = reportToUpdate.profits.some(p => p.originalId === profitData.originalId);
        if (isDuplicate) {
          result = { status: 'duplicate', originalId: profitData.originalId, message: `Registro de lucro/perda com ID original ${profitData.originalId} já existe.` };
          if (!options?.suppressToast) {
            toast({ title: "Registro Duplicado", description: result.message + " Foi ignorado.", variant: "default", duration: 4000 });
          }
          return prevCollection; 
        }
        */
      }

      // MODIFICADO: Preservar o ID se já for um ID composto (começa com lnm_)
      const usePredefinedId = profitData.id && typeof profitData.id === 'string' && profitData.id.startsWith('lnm_');
      const newProfitRecordId = usePredefinedId ? profitData.id : generateId();
      
      console.log('[addProfitRecord] ID gerado:', {
        idOriginal: profitData.id,
        originalId: profitData.originalId,
        idGerado: newProfitRecordId,
        usouIdExistente: usePredefinedId
      });
      
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

  // NOVA FUNÇÃO: Adicionar um saque ao relatório ativo (ou especificado)
  const addWithdrawal = useCallback((
    withdrawalData: Omit<WithdrawalRecord, "id"> & { originalId?: string }, 
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

      // Verificar se já existe um saque com o mesmo originalId
      if (withdrawalData.originalId) {
        const isDuplicate = reportToUpdate.withdrawals?.some(w => w.originalId === withdrawalData.originalId);
        if (isDuplicate) {
          result = { status: 'duplicate', originalId: withdrawalData.originalId, message: `Saque com ID original ${withdrawalData.originalId} já existe.` };
          if (!options?.suppressToast) {
            toast({ title: "Saque Duplicado", description: result.message + " Foi ignorado.", variant: "default", duration: 4000 });
          }
          return prevCollection; 
        }
      }

      const newWithdrawalId = generateId();
      const newWithdrawal: WithdrawalRecord = {
        ...withdrawalData,
        id: newWithdrawalId,
      };

      const updatedReport = {
        ...reportToUpdate,
        withdrawals: [...(reportToUpdate.withdrawals || []), newWithdrawal],
      };

      const updatedReports = [...prevCollection.reports];
      updatedReports[reportIndex] = updatedReport;
      
      result = { status: 'added', id: newWithdrawalId, message: "Novo saque registrado com sucesso." };
      if (!options?.suppressToast) {
        toast({ title: "Saque Adicionado", description: result.message, variant: "success" });
      }
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return result;
  }, []);

  // NOVA FUNÇÃO: Deletar um saque específico
  const deleteWithdrawal = useCallback((withdrawalId: string, targetReportId?: string) => {
    setCollection(prevCollection => {
      const reportIdToUpdate = targetReportId || prevCollection.activeReportId;
      if (!reportIdToUpdate) {
        toast({
          title: "Erro",
          description: "Nenhum relatório ativo ou alvo especificado.",
          variant: "destructive",
        });
        return prevCollection;
      }

      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportIdToUpdate);
      if (reportIndex === -1) {
        toast({
          title: "Erro",
          description: "Relatório não encontrado.",
          variant: "destructive",
        });
        return prevCollection;
      }

      const reportToUpdate = prevCollection.reports[reportIndex];
      const withdrawalIndex = reportToUpdate.withdrawals?.findIndex(w => w.id === withdrawalId) ?? -1;

      if (withdrawalIndex === -1) {
        toast({
          title: "Saque não encontrado",
          description: "O saque que você tentou excluir não foi encontrado",
          variant: "destructive",
        });
        return prevCollection;
      }

      const updatedWithdrawals = [...(reportToUpdate.withdrawals || [])];
      updatedWithdrawals.splice(withdrawalIndex, 1);

      const updatedReport = {
        ...reportToUpdate,
        withdrawals: updatedWithdrawals,
      };

      const updatedReports = [...prevCollection.reports];
      updatedReports[reportIndex] = updatedReport;

      toast({
        title: "Saque excluído",
        description: "O saque foi excluído com sucesso",
        variant: "success",
      });

      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });

    return true;
  }, []);

  // NOVA FUNÇÃO: Excluir todos os saques de um relatório
  const deleteAllWithdrawalsFromReport = useCallback((reportId: string) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);

      if (reportIndex === -1) {
        toast({
          title: "Relatório não encontrado",
          description: "Não foi possível encontrar o relatório para excluir os saques.",
          variant: "destructive",
          duration: 3000,
        });
        return prevCollection;
      }

      const updatedReports = [...prevCollection.reports];
      const currentReport = { ...updatedReports[reportIndex] };

      currentReport.withdrawals = [];
      currentReport.updatedAt = new Date().toISOString();
      updatedReports[reportIndex] = currentReport;

      toast({
        title: "Saques excluídos",
        description: `Todos os saques do relatório "${currentReport.name}" foram excluídos.`,
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
    addWithdrawal,
    deleteInvestment,
    deleteProfitRecord,
    deleteWithdrawal,
    updateReportData,
    importData,
    deleteAllInvestmentsFromReport,
    deleteAllProfitsFromReport,
    deleteAllWithdrawalsFromReport,
  };
} 