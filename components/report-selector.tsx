"use client";

import { useState } from "react";
import { 
  PlusCircle, 
  FileText, 
  MoreVertical, 
  Pencil, 
  Trash, 
  Check, 
  X, 
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Report } from "@/lib/calculator-types";
import { toast } from "@/components/ui/use-toast";

interface ReportSelectorProps {
  reports: Report[];
  activeReportId?: string;
  onSelectReport: (reportId: string) => void;
  onAddReport: (name: string, description?: string) => boolean;
  onUpdateReport: (reportId: string, updates: Partial<Report>) => boolean;
  onDeleteReport: (reportId: string) => boolean;
}

export default function ReportSelector({
  reports,
  activeReportId,
  onSelectReport,
  onAddReport,
  onUpdateReport,
  onDeleteReport
}: ReportSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  
  const activeReport = reports.find(r => r.id === activeReportId) || reports[0];
  
  const handleOpenNewReportDialog = () => {
    setEditingReport(null);
    setNewReportName("");
    setNewReportDescription("");
    setIsDialogOpen(true);
  };
  
  const handleOpenEditDialog = (report: Report) => {
    setEditingReport(report);
    setNewReportName(report.name);
    setNewReportDescription(report.description || "");
    setIsDialogOpen(true);
  };
  
  const handleConfirmDialog = () => {
    if (!newReportName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe um nome para o relatório",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    if (editingReport) {
      // Editar relatório existente
      const success = onUpdateReport(editingReport.id, {
        name: newReportName.trim(),
        description: newReportDescription.trim() || undefined
      });
      
      if (success) {
        toast({
          title: "Relatório atualizado",
          description: `O relatório "${newReportName}" foi atualizado com sucesso`,
          duration: 3000,
        });
      }
    } else {
      // Adicionar novo relatório
      const success = onAddReport(
        newReportName.trim(), 
        newReportDescription.trim() || undefined
      );
      
      if (success) {
        toast({
          title: "Relatório criado",
          description: `O relatório "${newReportName}" foi criado com sucesso`,
          duration: 3000,
        });
      }
    }
    
    setIsDialogOpen(false);
  };
  
  const handleConfirmDelete = () => {
    if (reportToDelete) {
      const success = onDeleteReport(reportToDelete.id);
      
      if (success) {
        toast({
          title: "Relatório excluído",
          description: `O relatório "${reportToDelete.name}" foi excluído com sucesso`,
          duration: 3000,
        });
      }
    }
    
    setIsDeleteDialogOpen(false);
    setReportToDelete(null);
  };
  
  const handleOpenDeleteDialog = (report: Report) => {
    setReportToDelete(report);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="flex-1 justify-between font-normal bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
            >
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 text-purple-400" />
                <span className="truncate">{activeReport?.name || "Selecione um relatório"}</span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[220px] bg-background/95 backdrop-blur-sm">
            {reports.map((report) => (
              <DropdownMenuItem
                key={report.id}
                className={`flex items-center gap-2 ${report.id === activeReportId ? 'bg-purple-900/30' : ''}`}
                onClick={() => onSelectReport(report.id)}
              >
                <FileText className="h-4 w-4 text-purple-400" />
                <span className="flex-1 truncate">{report.name}</span>
                {report.id === activeReportId && <Check className="h-3 w-3 text-green-500" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button 
          variant="outline" 
          size="icon" 
          className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
          onClick={handleOpenNewReportDialog}
        >
          <PlusCircle className="h-4 w-4" />
        </Button>
        
        {activeReport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-sm">
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={() => handleOpenEditDialog(activeReport)}
              >
                <Pencil className="h-4 w-4" />
                <span>Editar</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 text-red-500 focus:text-red-500"
                onClick={() => handleOpenDeleteDialog(activeReport)}
                disabled={reports.length <= 1}
              >
                <Trash className="h-4 w-4" />
                <span>Excluir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {activeReport?.description && (
        <div className="text-xs text-muted-foreground px-1">
          {activeReport.description}
        </div>
      )}
      
      {/* Dialog para criar/editar relatório */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingReport ? 'Editar Relatório' : 'Novo Relatório'}</DialogTitle>
            <DialogDescription>
              {editingReport 
                ? 'Altere as informações do relatório selecionado' 
                : 'Preencha as informações para criar um novo relatório'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="reportName" className="text-sm font-medium">
                Nome do Relatório
              </label>
              <Input
                id="reportName"
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                placeholder="Ex: Meu Portfólio Principal"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="reportDescription" className="text-sm font-medium">
                Descrição <span className="text-muted-foreground">(opcional)</span>
              </label>
              <Input
                id="reportDescription"
                value={newReportDescription}
                onChange={(e) => setNewReportDescription(e.target.value)}
                placeholder="Ex: Aportes e lucros do mercado spot"
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleConfirmDialog}
              className="flex-1 sm:flex-none"
            >
              {editingReport ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog para confirmar exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir Relatório</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o relatório "{reportToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive"
              onClick={handleConfirmDelete}
              className="flex-1 sm:flex-none"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 