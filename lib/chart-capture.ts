import html2canvas from 'html2canvas';

export interface ChartCaptureOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  scale?: number;
}

export interface CapturedChart {
  id: string;
  title: string;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Captura um elemento gráfico e converte para base64
 */
export async function captureChartElement(
  elementId: string,
  title: string,
  options: ChartCaptureOptions = {}
): Promise<CapturedChart | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Elemento com ID ${elementId} não encontrado`);
      return null;
    }

    const defaultOptions = {
      width: 800,
      height: 400,
      backgroundColor: '#ffffff',
      scale: 2,
      ...options
    };

    console.log(`[ChartCapture] Capturando gráfico: ${title}`);

    const canvas = await html2canvas(element, {
      width: defaultOptions.width,
      height: defaultOptions.height,
      backgroundColor: defaultOptions.backgroundColor,
      scale: defaultOptions.scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      removeContainer: true
    });

    const dataUrl = canvas.toDataURL('image/png', 0.95);
    
    console.log(`[ChartCapture] Gráfico capturado com sucesso: ${title}`);

    return {
      id: elementId,
      title,
      dataUrl,
      width: canvas.width,
      height: canvas.height
    };

  } catch (error) {
    console.error(`[ChartCapture] Erro ao capturar gráfico ${title}:`, error);
    return null;
  }
}

/**
 * Captura múltiplos gráficos dos profit-calculator
 */
export async function captureProfitCalculatorCharts(): Promise<CapturedChart[]> {
  const charts: CapturedChart[] = [];
  
  console.log('[ChartCapture] Iniciando captura de gráficos do profit-calculator');

  // Lista de gráficos a serem capturados - baseado na estrutura do profit-calculator.tsx
  const chartConfigs = [
    {
      id: 'main-evolution-chart',
      title: 'Evolução do Patrimônio',
      selector: '#main-evolution-chart .recharts-wrapper'
    },
    {
      id: 'pie-chart-composition',
      title: 'Composição do Patrimônio',
      selector: '#pie-chart-composition .recharts-wrapper'
    }
  ];

  for (const config of chartConfigs) {
    try {
      // Primeiro tenta pelo ID específico
      let element = document.getElementById(config.id);
      
      // Se não encontrar pelo ID, tenta pelo seletor
      if (!element) {
        element = document.querySelector(config.selector);
      }
      
      // Se ainda não encontrar, tenta buscar na aba de gráficos ativa
      if (!element && config.id === 'main-evolution-chart') {
        const chartsTab = document.querySelector('[role="tabpanel"][data-state="active"] .recharts-wrapper');
        if (chartsTab) {
          element = chartsTab as HTMLElement;
        }
      }

      if (element) {
        // Verificar se o elemento tem conteúdo SVG
        const svgElements = element.querySelectorAll('svg');
        if (svgElements.length === 0) {
          console.warn(`[ChartCapture] Elemento ${config.id} encontrado mas sem conteúdo SVG`);
          continue;
        }

        // Adicionar um ID temporário se não existir
        if (!element.id) {
          element.id = `temp-${config.id}`;
        }

        const captured = await captureChartElement(
          element.id,
          config.title,
          {
            width: 800,
            height: 400,
            backgroundColor: '#ffffff',
            scale: 1.5
          }
        );

        if (captured) {
          charts.push(captured);
        }

        // Remover ID temporário
        if (element.id.startsWith('temp-')) {
          element.removeAttribute('id');
        }
      } else {
        console.warn(`[ChartCapture] Elemento para ${config.title} não encontrado`);
      }
    } catch (error) {
      console.error(`[ChartCapture] Erro ao capturar ${config.title}:`, error);
    }
  }

  console.log(`[ChartCapture] Captura concluída. ${charts.length} gráficos capturados`);
  return charts;
}

/**
 * Aguarda que os gráficos sejam renderizados antes de capturar
 */
export async function waitForChartsToRender(timeout: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = timeout / 100;

    const checkCharts = () => {
      attempts++;
      
      // Verificar se há elementos gráficos renderizados
      const chartElements = document.querySelectorAll('.recharts-wrapper, .recharts-surface');
      const hasCharts = chartElements.length > 0;
      
      // Verificar se os gráficos têm conteúdo
      const hasContent = Array.from(chartElements).some(element => {
        const svgElements = element.querySelectorAll('svg');
        return svgElements.length > 0;
      });

      if (hasCharts && hasContent) {
        console.log('[ChartCapture] Gráficos detectados e renderizados');
        resolve(true);
        return;
      }

      if (attempts >= maxAttempts) {
        console.warn('[ChartCapture] Timeout aguardando renderização dos gráficos');
        resolve(false);
        return;
      }

      setTimeout(checkCharts, 100);
    };

    checkCharts();
  });
} 