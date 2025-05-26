"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExcelExportOptions } from "@/lib/excel-export";

interface ExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExportPDF: (options: PDFExportOptions) => void;
  onExportExcel: (options: ExcelExportOptions) => void;
  isExporting: boolean;
}

export interface PDFExportOptions {
  includeInvestments: boolean;
  includeProfits: boolean;
  includeWithdrawals: boolean;
  includeSummary: boolean;
  includeCharts: boolean;
  includeMonthlyBreakdown: boolean;
  currency: 'USD' | 'BRL';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
}

export default function ExportOptionsDialog({
  open,
  onOpenChange,
  onExportPDF,
  onExportExcel,
  isExporting
}: ExportOptionsDialogProps) {
  const [activeTab, setActiveTab] = useState<"pdf" | "excel">("pdf");
  
  // Estado das opções de exportação PDF
  const [pdfOptions, setPdfOptions] = useState<PDFExportOptions>({
    includeInvestments: true,
    includeProfits: true,
    includeWithdrawals: true,
    includeSummary: true,
    includeCharts: true,
    includeMonthlyBreakdown: true,
    currency: 'BRL'
  });
  
  // Estado das opções de exportação Excel
  const [excelOptions, setExcelOptions] = useState<ExcelExportOptions>({
    includeInvestments: true,
    includeProfits: true,
    includeWithdrawals: true,
    includeSummary: true,
    includeMonthlyBreakdown: true,
    currency: 'BRL'
  });
  
  // Estado para o filtro de data
  const [useDateFilter, setUseDateFilter] = useState(false);
  const [dateRange, setDateRange] = useState<{
    startDate?: Date;
    endDate?: Date;
  }>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Função para atualizar opções PDF
  const updatePDFOption = (key: keyof PDFExportOptions, value: boolean | 'USD' | 'BRL') => {
    setPdfOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Função para atualizar opções Excel
  const updateExcelOption = (key: keyof ExcelExportOptions, value: boolean | 'USD' | 'BRL') => {
    setExcelOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Função para lidar com a exportação
  const handleExport = () => {
    if (activeTab === "pdf") {
      const options: PDFExportOptions = {
        ...pdfOptions,
        dateRange: useDateFilter && dateRange.startDate && dateRange.endDate 
          ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
          : undefined
      };
      onExportPDF(options);
    } else {
      const options: ExcelExportOptions = {
        ...excelOptions,
        dateRange: useDateFilter && dateRange.startDate && dateRange.endDate 
          ? { startDate: dateRange.startDate, endDate: dateRange.endDate }
          : undefined
      };
      onExportExcel(options);
    }
  };
  
  // Formatar intervalo de datas para exibição
  const formatDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return "Selecione um intervalo";
    }
    
    return `${format(dateRange.startDate, "dd/MM/yyyy")} - ${format(dateRange.endDate, "dd/MM/yyyy")}`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Opções de Exportação</DialogTitle>
          <DialogDescription>
            Configure as opções para exportar seu relatório.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "pdf" | "excel")} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="pdf" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              PDF
            </TabsTrigger>
            <TabsTrigger value="excel" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pdf">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Conteúdo do Relatório</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pdf-include-summary" 
                      checked={pdfOptions.includeSummary}
                      onCheckedChange={(checked) => updatePDFOption('includeSummary', checked as boolean)}
                    />
                    <Label htmlFor="pdf-include-summary">Resumo Geral</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pdf-include-investments" 
                      checked={pdfOptions.includeInvestments}
                      onCheckedChange={(checked) => updatePDFOption('includeInvestments', checked as boolean)}
                    />
                    <Label htmlFor="pdf-include-investments">Investimentos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pdf-include-profits" 
                      checked={pdfOptions.includeProfits}
                      onCheckedChange={(checked) => updatePDFOption('includeProfits', checked as boolean)}
                    />
                    <Label htmlFor="pdf-include-profits">Lucros/Perdas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pdf-include-withdrawals" 
                      checked={pdfOptions.includeWithdrawals}
                      onCheckedChange={(checked) => updatePDFOption('includeWithdrawals', checked as boolean)}
                    />
                    <Label htmlFor="pdf-include-withdrawals">Saques</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pdf-include-charts" 
                      checked={pdfOptions.includeCharts}
                      onCheckedChange={(checked) => updatePDFOption('includeCharts', checked as boolean)}
                    />
                    <Label htmlFor="pdf-include-charts">Gráficos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pdf-include-monthly" 
                      checked={pdfOptions.includeMonthlyBreakdown}
                      onCheckedChange={(checked) => updatePDFOption('includeMonthlyBreakdown', checked as boolean)}
                    />
                    <Label htmlFor="pdf-include-monthly">Detalhamento Mensal</Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Moeda Principal</h4>
                <RadioGroup 
                  value={pdfOptions.currency} 
                  onValueChange={(value) => updatePDFOption('currency', value as 'USD' | 'BRL')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BRL" id="pdf-currency-brl" />
                    <Label htmlFor="pdf-currency-brl">Real (BRL)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="USD" id="pdf-currency-usd" />
                    <Label htmlFor="pdf-currency-usd">Dólar (USD)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="excel">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Planilhas a Incluir</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="excel-include-summary" 
                      checked={excelOptions.includeSummary}
                      onCheckedChange={(checked) => updateExcelOption('includeSummary', checked as boolean)}
                    />
                    <Label htmlFor="excel-include-summary">Resumo Geral</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="excel-include-investments" 
                      checked={excelOptions.includeInvestments}
                      onCheckedChange={(checked) => updateExcelOption('includeInvestments', checked as boolean)}
                    />
                    <Label htmlFor="excel-include-investments">Investimentos</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="excel-include-profits" 
                      checked={excelOptions.includeProfits}
                      onCheckedChange={(checked) => updateExcelOption('includeProfits', checked as boolean)}
                    />
                    <Label htmlFor="excel-include-profits">Lucros/Perdas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="excel-include-withdrawals" 
                      checked={excelOptions.includeWithdrawals}
                      onCheckedChange={(checked) => updateExcelOption('includeWithdrawals', checked as boolean)}
                    />
                    <Label htmlFor="excel-include-withdrawals">Saques</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="excel-include-monthly" 
                      checked={excelOptions.includeMonthlyBreakdown}
                      onCheckedChange={(checked) => updateExcelOption('includeMonthlyBreakdown', checked as boolean)}
                    />
                    <Label htmlFor="excel-include-monthly">Detalhamento Mensal</Label>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Moeda Principal</h4>
                <RadioGroup 
                  value={excelOptions.currency} 
                  onValueChange={(value) => updateExcelOption('currency', value as 'USD' | 'BRL')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BRL" id="excel-currency-brl" />
                    <Label htmlFor="excel-currency-brl">Real (BRL)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="USD" id="excel-currency-usd" />
                    <Label htmlFor="excel-currency-usd">Dólar (USD)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="use-date-filter" 
              checked={useDateFilter}
              onCheckedChange={(checked) => setUseDateFilter(!!checked)}
            />
            <Label htmlFor="use-date-filter">Filtrar por período</Label>
          </div>
          
          {useDateFilter && (
            <div className="flex flex-col space-y-2">
              <Label htmlFor="date-range">Intervalo de Datas</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDateRange()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{
                      from: dateRange.startDate,
                      to: dateRange.endDate
                    }}
                    onSelect={(range) => {
                      setDateRange({
                        startDate: range?.from,
                        endDate: range?.to
                      });
                    }}
                    locale={ptBR}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancelar
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || (useDateFilter && (!dateRange.startDate || !dateRange.endDate))}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Exportar {activeTab.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 