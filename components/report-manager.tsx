"use client";

import { useState, useEffect } from "react";
import {
  PlusCircle,
  Edit,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  CopyIcon,
  ArrowUpDown,
  FilePlus,
  FileEdit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/use-toast";
import { cn, formatDistanceToNow } from "@/lib/utils";
import { Report } from "@/lib/calculator-types";
import { useReports } from "@/hooks/use-reports";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportManagerProps {
  onCompare?: () => void;
}

export function ReportManager({ onCompare }: ReportManagerProps) {
  const {
    reports,
    activeReport,
    activeReportId,
    isLoaded,
    addReport,
    selectReport,
    deleteReport,
    updateReport,
  } = useReports();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  const isMobile = useIsMobile();

  // Resetar form quando diálogos são fechados
  useEffect(() => {
    if (!isCreateDialogOpen) {
      setNewReportName("");
      setNewReportDescription("");
    }
  }, [isCreateDialogOpen]);

  useEffect(() => {
    if (!isEditDialogOpen) {
      setEditingReport(null);
    }
  }, [isEditDialogOpen]);

  // Manipuladores de eventos
  const handleCreateReport = () => {
    if (!newReportName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe um nome para o relatório",
        variant: "destructive",
      });
      return;
    }

    addReport(newReportName.trim(), newReportDescription.trim());
    setIsCreateDialogOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editingReport) return;

    if (!editingReport.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, informe um nome para o relatório",
        variant: "destructive",
      });
      return;
    }

    updateReport(editingReport.id, {
      name: editingReport.name,
      description: editingReport.description,
    });
    setIsEditDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingReportId) return;

    deleteReport(deletingReportId);
    setIsDeleteDialogOpen(false);
    setDeletingReportId(null);
  };

  const handleSelectReport = (reportId: string) => {
    if (reportId === activeReportId) return;
    selectReport(reportId);
  };

  const handleEditReport = (report: Report) => {
    setEditingReport({ ...report });
    setIsEditDialogOpen(true);
  };

  const handleDeleteReport = (reportId: string) => {
    setDeletingReportId(reportId);
    setIsDeleteDialogOpen(true);
  };

  const formatUpdatedAt = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "Data desconhecida";
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center p-4 h-20">
        <div className="animate-pulse h-4 w-32 bg-purple-900/20 rounded"></div>
      </div>
    );
  }

  const renderReportList = () => (
    <ScrollArea className="max-h-[300px]">
      <div className="space-y-2 p-2">
        {reports.map((report) => (
          <div
            key={report.id}
            className={cn(
              "flex items-center justify-between p-3 rounded-md transition-colors",
              report.id === activeReportId
                ? "bg-purple-800/60 text-white"
                : "bg-black/30 hover:bg-purple-900/30"
            )}
          >
            <div
              className="flex-1 cursor-pointer"
              onClick={() => handleSelectReport(report.id)}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: report.color || "#8844ee" }}
                />
                <span className="font-medium">{report.name}</span>
                {report.id === activeReportId && (
                  <Badge
                    variant="outline"
                    className="ml-2 bg-purple-900/50 text-xs border-purple-700"
                  >
                    Ativo
                  </Badge>
                )}
              </div>
              {report.description && (
                <p className="text-xs text-gray-400 mt-1 ml-5 line-clamp-1">
                  {report.description}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1 ml-5">
                Atualizado {formatUpdatedAt(report.updatedAt)}
              </p>
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-purple-800/40"
                onClick={() => handleEditReport(report)}
              >
                <Edit className="h-4 w-4" />
                <span className="sr-only">Editar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-red-900/40"
                onClick={() => handleDeleteReport(report.id)}
                disabled={reports.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Excluir</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );

  return (
    <>
      <div className="flex items-center gap-2 w-full">
        {/* Seletor móvel */}
        {isMobile ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-between bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: activeReport?.color || "#8844ee",
                    }}
                  />
                  <span className="truncate">{activeReport?.name}</span>
                </div>
                <ArrowUpDown className="h-4 w-4 ml-2 text-gray-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-black/90 border-purple-800/50">
              <DropdownMenuLabel>Selecionar Relatório</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {reports.map((report) => (
                <DropdownMenuItem
                  key={report.id}
                  className={
                    report.id === activeReportId
                      ? "bg-purple-800/40 text-white"
                      : ""
                  }
                  onClick={() => handleSelectReport(report.id)}
                >
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: report.color || "#8844ee" }}
                  />
                  <span className="truncate">{report.name}</span>
                  {report.id === activeReportId && (
                    <CheckCircle className="h-4 w-4 ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Novo Relatório
              </DropdownMenuItem>
              {onCompare && (
                <DropdownMenuItem onClick={onCompare}>
                  <CopyIcon className="h-4 w-4 mr-2" />
                  Comparar Relatórios
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          // Popover para desktop
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 justify-between bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: activeReport?.color || "#8844ee",
                    }}
                  />
                  <span className="truncate">{activeReport?.name}</span>
                </div>
                <ArrowUpDown className="h-4 w-4 ml-2 text-gray-400" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-80 p-0 bg-black/90 border-purple-800/60"
              align="start"
            >
              <div className="p-2 bg-purple-900/30 text-sm font-medium border-b border-purple-700/50">
                Gerenciar Relatórios
              </div>
              {renderReportList()}
              <div className="p-2 border-t border-purple-700/50 flex gap-2">
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="flex-1 text-sm"
                  variant="outline"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Novo Relatório
                </Button>
                {onCompare && (
                  <Button
                    onClick={onCompare}
                    className="flex-1 text-sm"
                    variant="secondary"
                  >
                    <CopyIcon className="h-4 w-4 mr-2" />
                    Comparar
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Botões de ação para desktop - apenas visíveis em telas maiores */}
        <div className="hidden sm:flex gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <FilePlus className="h-5 w-5" />
            <span className="sr-only">Novo Relatório</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 bg-black/30 border-purple-700/50 hover:bg-purple-900/20"
            onClick={() => handleEditReport(activeReport)}
            disabled={!activeReport}
          >
            <FileEdit className="h-5 w-5" />
            <span className="sr-only">Editar Relatório Atual</span>
          </Button>
        </div>
      </div>

      {/* Diálogo de Criação */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-black/90 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Novo Relatório</DialogTitle>
            <DialogDescription>
              Crie um novo relatório para organizar seus investimentos e lucros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Nome do Relatório</Label>
              <Input
                id="report-name"
                placeholder="Digite o nome..."
                value={newReportName}
                onChange={(e) => setNewReportName(e.target.value)}
                className="bg-black/30 border-purple-700/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Descrição (opcional)</Label>
              <Textarea
                id="report-description"
                placeholder="Descreva o propósito deste relatório..."
                value={newReportDescription}
                onChange={(e) => setNewReportDescription(e.target.value)}
                className="h-20 resize-none bg-black/30 border-purple-700/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateReport}>Criar Relatório</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-black/90 border-purple-800/60">
          <DialogHeader>
            <DialogTitle>Editar Relatório</DialogTitle>
            <DialogDescription>
              Modifique as informações do relatório.
            </DialogDescription>
          </DialogHeader>
          {editingReport && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-report-name">Nome do Relatório</Label>
                <Input
                  id="edit-report-name"
                  placeholder="Digite o nome..."
                  value={editingReport.name}
                  onChange={(e) =>
                    setEditingReport({ ...editingReport, name: e.target.value })
                  }
                  className="bg-black/30 border-purple-700/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-report-description">
                  Descrição (opcional)
                </Label>
                <Textarea
                  id="edit-report-description"
                  placeholder="Descreva o propósito deste relatório..."
                  value={editingReport.description || ""}
                  onChange={(e) =>
                    setEditingReport({
                      ...editingReport,
                      description: e.target.value,
                    })
                  }
                  className="h-20 resize-none bg-black/30 border-purple-700/50"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent className="bg-black/90 border-purple-800/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              Confirmar Exclusão
            </DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-300">
              Todos os dados associados a este relatório serão permanentemente removidos.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Excluir Relatório
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 