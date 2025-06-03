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
  migrateFromLegacyData,
  migrateReportToMultipleAPIs,
  getUsedConfigIds
} from "@/lib/calculator-types";
import { toast } from "@/components/ui/use-toast";
import { useReportEvents } from "@/contexts/report-events-context";

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
  
  // Estado para controlar a migração para múltiplas APIs
  const [isMultiAPIMigrated, setIsMultiAPIMigrated] = useState(false);
  
  // Usar o contexto de eventos para notificar mudanças
  const { emitEvent } = useReportEvents();
  
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
        
        // Emitir evento de relatório selecionado após carregar
        if (activeId) {
          emitEvent('report-selected', activeId);
        }
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
          
          // Emitir evento após migração
          if (migratedData.activeReportId) {
            emitEvent('report-selected', migratedData.activeReportId);
          }
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
          
          // Emitir evento após criar relatório inicial
          emitEvent('report-selected', initialReport.id);
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
      
      // Emitir evento após criar relatório em caso de erro
      emitEvent('report-selected', initialReport.id);
    }
  }, [emitEvent]);
  
  // Migrar relatórios para formato de múltiplas APIs
  useEffect(() => {
    if (isLoaded && !isMultiAPIMigrated && collection.reports.length > 0) {
      // Verificar se algum relatório precisa ser migrado para o formato de múltiplas APIs
      let needsMigration = false;
      const migratedReports = collection.reports.map(report => {
        // Verificar se precisa migrar
        if (!report.associatedLNMarketsConfigIds && report.associatedLNMarketsConfigId) {
          needsMigration = true;
          return migrateReportToMultipleAPIs(report);
        }
        return report;
      });
      
      // Se algum relatório foi migrado, atualizar a coleção
      if (needsMigration) {
        console.log('[useReports] Migrando relatórios para suporte a múltiplas APIs');
        
        const updatedCollection = {
          ...collection,
          reports: migratedReports,
          lastUpdated: new Date().toISOString()
        };
        
        setCollection(updatedCollection);
        localStorage.setItem(STORAGE_KEYS.REPORTS_COLLECTION, JSON.stringify(updatedCollection));
        
        toast({
          title: "Suporte a múltiplas APIs ativado",
          description: "Seus relatórios foram atualizados para suportar múltiplas configurações de API.",
          duration: 5000,
        });
      }
      
      setIsMultiAPIMigrated(true);
    }
  }, [isLoaded, isMultiAPIMigrated, collection]);
  
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
        isActive: false
      }));
      
      // Adicionar o novo relatório como ativo
      return {
        ...prevCollection,
        reports: [...updatedReports, newReport],
        activeReportId: newReport.id,
        lastUpdated: new Date().toISOString()
      };
    });
    
    emitEvent('report-added', name);
  }, [emitEvent]);

  // Função para selecionar um relatório como ativo
  const selectReport = useCallback((reportId: string) => {
    console.log('[useReports] selectReport chamado:', { reportId });
    
    setCollection(prevCollection => {
      console.log('[useReports] Dentro do setCollection:', { 
        reportId, 
        currentActive: prevCollection.activeReportId,
        reportExists: prevCollection.reports.some(r => r.id === reportId)
      });
      
      // Verificar se o relatório existe
      const reportExists = prevCollection.reports.some(r => r.id === reportId);
      if (!reportExists) {
        console.log('[useReports] Relatório não encontrado:', reportId);
        toast({
          title: "Erro",
          description: "Relatório não encontrado",
          variant: "destructive",
        });
        return prevCollection;
      }

      // Se já é o relatório ativo, não fazer nada
      if (prevCollection.activeReportId === reportId) {
        console.log('[useReports] Relatório já está ativo:', reportId);
        return prevCollection;
      }

      // Atualizar todos os relatórios para não estarem ativos
      const updatedReports = prevCollection.reports.map(report => ({
        ...report,
        isActive: report.id === reportId
      }));

      const updatedCollection = {
        ...prevCollection,
        reports: updatedReports,
        activeReportId: reportId,
        lastUpdated: new Date().toISOString()
      };

      console.log('[useReports] Relatório selecionado:', {
        reportId,
        reportName: updatedReports.find(r => r.id === reportId)?.name,
        prevActiveId: prevCollection.activeReportId
      });

      // Emitir evento de relatório selecionado
      emitEvent('report-selected', reportId);

      return updatedCollection;
    });
  }, [emitEvent, toast]);

  // Função para deletar um relatório
  const deleteReport = useCallback((reportId: string) => {
    setCollection(prevCollection => {
      // Não permitir deletar o último relatório
      if (prevCollection.reports.length <= 1) {
        toast({
          title: "Não é possível deletar",
          description: "Deve haver pelo menos um relatório",
          variant: "destructive",
        });
        return prevCollection;
      }

      const reportToDelete = prevCollection.reports.find(r => r.id === reportId);
      if (!reportToDelete) {
        toast({
          title: "Erro",
          description: "Relatório não encontrado",
          variant: "destructive",
        });
        return prevCollection;
      }

      // Remover o relatório
      const updatedReports = prevCollection.reports.filter(r => r.id !== reportId);
      
      // Se o relatório deletado era o ativo, selecionar o primeiro
      let newActiveReportId = prevCollection.activeReportId;
      if (prevCollection.activeReportId === reportId) {
        newActiveReportId = updatedReports[0]?.id || '';
        
        // Atualizar o isActive para o novo relatório ativo
        updatedReports.forEach(report => {
          report.isActive = report.id === newActiveReportId;
        });
      }

      toast({
        title: "Relatório excluído",
        description: `O relatório "${reportToDelete.name}" foi excluído com sucesso`,
        variant: "success",
      });

      // Emitir evento de relatório deletado
      emitEvent('report-deleted', reportId);
      
      // Se mudou o relatório ativo, emitir evento de seleção
      if (newActiveReportId !== prevCollection.activeReportId) {
        emitEvent('report-selected', newActiveReportId);
      }

      return {
        ...prevCollection,
        reports: updatedReports,
        activeReportId: newActiveReportId,
        lastUpdated: new Date().toISOString()
      };
    });
  }, [emitEvent]);

  // Função para atualizar um relatório existente
  const updateReport = useCallback((reportId: string, updates: Partial<Report>) => {
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      if (reportIndex === -1) {
        toast({
          title: "Erro",
          description: "Relatório não encontrado",
          variant: "destructive",
        });
        return prevCollection;
      }

      const updatedReports = [...prevCollection.reports];
      updatedReports[reportIndex] = {
        ...updatedReports[reportIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };

      toast({
        title: "Relatório atualizado",
        description: "As alterações foram salvas com sucesso",
        variant: "success",
      });

      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
  }, []);

  // NOVA: Função para associar múltiplas APIs a um relatório
  const associateAPIToReport = useCallback((reportId: string, configId: string, configName: string) => {
    if (!reportId || !configId) return false;
    
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      if (reportIndex === -1) return prevCollection;
      
      const report = prevCollection.reports[reportIndex];
      
      // Inicializar array se não existir
      const associatedLNMarketsConfigIds = report.associatedLNMarketsConfigIds || [];
      
      // Verificar se a configuração já está associada
      if (associatedLNMarketsConfigIds.includes(configId)) {
        // Apenas atualizar lastUsedConfigId
        const updatedReport = {
          ...report,
          lastUsedConfigId: configId
        };
        
        const updatedReports = [...prevCollection.reports];
        updatedReports[reportIndex] = updatedReport;
        
        return {
          ...prevCollection,
          reports: updatedReports,
          lastUpdated: new Date().toISOString()
        };
      }
      
      // Adicionar nova configuração
      const updatedReport = {
        ...report,
        associatedLNMarketsConfigIds: [...associatedLNMarketsConfigIds, configId],
        lastUsedConfigId: configId,
        // Manter o campo legado por compatibilidade
        associatedLNMarketsConfigId: configId,
        associatedLNMarketsConfigName: configName
      };
      
      const updatedReports = [...prevCollection.reports];
      updatedReports[reportIndex] = updatedReport;
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, []);
  
  // NOVA: Função para obter APIs associadas a um relatório
  const getReportAssociatedAPIs = useCallback((reportId: string) => {
    const report = collection.reports.find(r => r.id === reportId);
    if (!report) return [];
    
    return getUsedConfigIds(report);
  }, [collection.reports]);
  
  // NOVA: Função para verificar se um relatório tem múltiplas APIs
  const hasMultipleAPIs = useCallback((reportId: string) => {
    const apis = getReportAssociatedAPIs(reportId);
    return apis.length > 1;
  }, [getReportAssociatedAPIs]);
  
  // NOVA: Função para atualizar fonte de um registro
  const updateRecordSource = useCallback((
    reportId: string, 
    recordId: string, 
    recordType: 'investment' | 'profit' | 'withdrawal',
    sourceInfo: { configId: string, configName: string }
  ) => {
    if (!reportId || !recordId || !sourceInfo.configId) return false;
    
    setCollection(prevCollection => {
      const reportIndex = prevCollection.reports.findIndex(r => r.id === reportId);
      if (reportIndex === -1) return prevCollection;
      
      const report = prevCollection.reports[reportIndex];
      const now = new Date().toISOString();
      
      // Clonar relatório para modificação
      let updatedReport = {...report};
      
      // Atualizar o registro de acordo com o tipo
      if (recordType === 'investment') {
        updatedReport.investments = updatedReport.investments.map(inv => 
          inv.id === recordId 
            ? { 
                ...inv, 
                sourceConfigId: sourceInfo.configId, 
                sourceConfigName: sourceInfo.configName,
                importedAt: now
              }
            : inv
        );
      } else if (recordType === 'profit') {
        updatedReport.profits = updatedReport.profits.map(profit => 
          profit.id === recordId 
            ? { 
                ...profit, 
                sourceConfigId: sourceInfo.configId, 
                sourceConfigName: sourceInfo.configName,
                importedAt: now
              }
            : profit
        );
      } else if (recordType === 'withdrawal') {
        updatedReport.withdrawals = updatedReport.withdrawals.map(withdrawal => 
          withdrawal.id === recordId 
            ? { 
                ...withdrawal, 
                sourceConfigId: sourceInfo.configId, 
                sourceConfigName: sourceInfo.configName,
                importedAt: now
              }
            : withdrawal
        );
      }
      
      // Atualizar mapeamento de fonte de dados
      if (!updatedReport.dataSourceMapping) {
        updatedReport.dataSourceMapping = {};
      }
      
      updatedReport.dataSourceMapping[recordId] = {
        configId: sourceInfo.configId,
        configName: sourceInfo.configName,
        importDate: now,
        recordType: recordType === 'investment' 
          ? 'deposit' 
          : (recordType === 'profit' ? 'trade' : 'withdrawal')
      };
      
      // Atualizar relatório na coleção
      const updatedReports = [...prevCollection.reports];
      updatedReports[reportIndex] = updatedReport;
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: now
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
      
      // Emitir evento de investimento adicionado
      emitEvent('investment-added', reportIdToUpdate, { investmentId: newInvestmentId });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return result;
  }, [emitEvent]);
  
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
      
      // Emitir evento de lucro adicionado
      emitEvent('profit-added', reportIdToUpdate, { profitId: newProfitRecordId });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return result;
  }, [emitEvent]);
  
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
      
      // Emitir evento de investimento excluído
      emitEvent('investment-deleted', reportId, { investmentId });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, [emitEvent]);
  
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
      
      // Emitir evento de lucro excluído
      emitEvent('profit-deleted', reportId, { profitId });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, [emitEvent]);
  
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
      
      // Emitir evento de relatório atualizado
      emitEvent('report-updated', reportId, { 
        updatedInvestments: newInvestments !== undefined, 
        updatedProfits: newProfits !== undefined 
      });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, [emitEvent]);
  
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
      
      // Emitir evento de dados importados
      emitEvent('data-imported', targetReportId, {
        importedInvestments: investments?.length || 0,
        importedProfits: profits?.length || 0,
        replaced: options?.replace || false
      });
      
      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString()
      };
    });
    
    return true;
  }, [emitEvent]);
  
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
      
      // Emitir evento de operação em lote concluída
      emitEvent('bulk-operation-completed', reportId, { 
        operation: 'delete-all-investments'
      });

      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return true;
  }, [emitEvent]);

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
      
      // Emitir evento de operação em lote concluída
      emitEvent('bulk-operation-completed', reportId, { 
        operation: 'delete-all-profits'
      });

      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return true;
  }, [emitEvent]);

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
      
      // Emitir evento de operação em lote concluída
      emitEvent('bulk-operation-completed', reportId, { 
        operation: 'delete-all-withdrawals'
      });

      return {
        ...prevCollection,
        reports: updatedReports,
        lastUpdated: new Date().toISOString(),
      };
    });
    return true;
  }, [emitEvent]);
  
  // Retornar as funções e dados necessários
  return {
    reports: collection.reports,
    activeReport,
    activeReportId: collection.activeReportId,
    isLoaded,
    isMigrated,
    isMultiAPIMigrated,
    
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
    
    // Novas funções para suporte a múltiplas APIs
    associateAPIToReport,
    getReportAssociatedAPIs,
    hasMultipleAPIs,
    updateRecordSource
  };
} 