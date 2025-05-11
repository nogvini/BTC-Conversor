# Product Context: Raid Bitcoin Toolkit

## 1. Funcionalidades Principais

O Raid Bitcoin Toolkit é composto por três módulos principais, cada um com funcionalidades específicas para atender às necessidades dos usuários no acompanhamento e gerenciamento de seus ativos em Bitcoin:

### 1.1. Conversor de Moedas

*   **Conversão em Tempo Real:** Permite a conversão instantânea entre Bitcoin (BTC), Satoshis (SATS), Dólar Americano (USD) e Real Brasileiro (BRL).
*   **Cotações Atualizadas:** Busca e exibe as cotações mais recentes do Bitcoin em relação ao USD e BRL, com indicação de quando os dados foram atualizados.
*   **Interface Intuitiva:** Design simples e direto para facilitar a entrada de valores e a seleção de unidades/moedas.
*   **Fallback de Dados:** Em caso de falha na API de cotação, utiliza dados em cache para garantir a continuidade da funcionalidade, informando o usuário sobre o uso de dados não atuais.
*   **Persistência de Uso:** Salva o último valor e unidade utilizados pelo usuário para agilizar conversões futuras.

### 1.2. Gráficos de Preços Históricos

*   **Visualização Dinâmica:** Apresenta gráficos interativos do histórico de preços do Bitcoin.
*   **Múltiplas Janelas de Tempo:** Permite ao usuário selecionar diferentes períodos para análise (ex: 1 dia, 7 dias, 1 mês, 1 ano, máximo).
*   **Clareza Visual:** Gráficos limpos e de fácil interpretação para identificar tendências e padrões de mercado.
*   **Dados Confiáveis:** Utiliza fontes de dados históricos consistentes para a plotagem dos gráficos.

### 1.3. Calculadora de Lucros e Investimentos

*   **Registro de Transações:**
    *   **Aportes (Investimentos):** Permite registrar a data, valor e unidade (BTC/SATS) de cada aporte realizado.
    *   **Lucros/Perdas:** Permite registrar a data, valor, unidade e tipo (lucro ou perda) de cada operação de realização.
*   **Gerenciamento de Múltiplas Contas/Relatórios:**
    *   Criação e gerenciamento de múltiplos "relatórios" (contas) para organizar transações de diferentes origens (ex: exchanges, carteiras pessoais).
    *   Seleção de um relatório ativo para novos registros.
    *   Filtragem de visualização por um ou mais relatórios selecionados.
*   **Visualização de Histórico e Resumo:**
    *   Exibição do histórico de aportes e lucros/perdas de forma organizada, com opção de filtrar por mês ou período personalizado.
    *   Cálculo e exibição de totais de investimento, lucro/perda e rendimento para o período selecionado, tanto em criptomoeda quanto na moeda fiduciária escolhida (USD/BRL).
*   **Importação e Exportação de Dados:**
    *   **Exportação para Excel (.xlsx):** Permite exportar todos os dados de aportes e lucros/perdas de relatórios selecionados (ou todos) para um arquivo Excel, facilitando backup e análise externa.
    *   **Importação de CSV:** Suporte para importação de dados de aportes e operações (lucros/perdas) a partir de arquivos CSV com formatos específicos (ex: padrão de exchanges).
    *   **Importação de Backup (Excel):** Capacidade de importar dados previamente exportados pelo próprio sistema.
    *   **Prevenção de Duplicidade:** Mecanismos para identificar e evitar a importação de registros duplicados.
*   **Interface Amigável:** Facilidade para adicionar, visualizar e remover registros.
*   **Cotações Atuais para Cálculo:** Utiliza as cotações atuais de BTC/USD e BRL/USD para calcular os valores equivalentes em moeda fiduciária nos relatórios.

## 2. Problemas Resolvidos

*   **Dificuldade em Acompanhar Cotações:** Elimina a necessidade de consultar múltiplas fontes para obter cotações atualizadas de Bitcoin.
*   **Falta de Ferramentas Consolidadas:** Reúne conversor, gráficos e calculadora de investimentos em um único local, evitando o uso de diversas planilhas ou aplicativos separados.
*   **Gestão Complexa de Portfólio:** Simplifica o rastreamento de aportes, lucros e perdas, especialmente para quem realiza transações frequentes ou utiliza múltiplas plataformas.
*   **Análise de Desempenho:** Fornece relatórios e cálculos de rendimento que ajudam o usuário a entender a performance de seus investimentos em Bitcoin.
*   **Portabilidade de Dados Limitada:** Oferece opções de importação e exportação, dando ao usuário controle sobre seus dados financeiros.
*   **Interface Pouco Intuitiva:** Busca oferecer uma experiência de usuário superior comparada a ferramentas genéricas ou complexas.

## 3. Benefícios para o Usuário

*   **Tomada de Decisão Informada:** Acesso rápido a cotações e dados históricos para decisões de compra, venda ou conversão.
*   **Organização Financeira:** Melhor controle e organização dos investimentos em Bitcoin.
*   **Visão Clara do Desempenho:** Entendimento facilitado sobre a rentabilidade dos ativos digitais.
*   **Economia de Tempo:** Consolidação de ferramentas que agilizam tarefas comuns relacionadas ao Bitcoin.
*   **Segurança e Privacidade (Dados Locais):** Os dados de investimento são primariamente armazenados localmente no navegador do usuário, oferecendo um nível de privacidade (com a opção de exportar para backup).
*   **Flexibilidade:** Capacidade de gerenciar múltiplas "contas" ou "carteiras" de forma segregada.
*   **Interface Moderna e Responsiva:** Uso agradável em diferentes dispositivos. 