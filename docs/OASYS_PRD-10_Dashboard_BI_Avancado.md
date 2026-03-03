

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-10 — Dashboard & BI Avançado**  
Analytics histórico, comparativos MoM/YoY, CMV real, margem, FUP diário, recomendações

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 2 — Growth & Scale |
| **Sprints Estimados** | 3 sprints |
| **Complexidade** | Média-Alta |
| **Cobertura Atual** | \~14% |
| **Dependências** | PRD-07 (Fechamento & Relatórios), PRD-08 (Estoque Básico) |
| **Gap Modules** | M10 — Financeiro / BI |
| **Apps Afetadas** | apps/api \+ apps/web-owner |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-10 (Dashboard & BI Avançado) transforma dados operacionais acumulados em inteligência acionável para o dono. PRD-07 (Phase 1\) entrega o dashboard básico: KPIs do dia, fechamento, comparação com dia anterior. PRD-10 eleva isso para visão estratégica: histórico de semanas e meses, comparação MoM/YoY, CMV real vs. teórico, margem por produto, ranking entre unidades, e recomendações acionáveis.

A cobertura atual é \~14%: DailyReport existe como model e será populado pelo PRD-07, HourlyRevenue existe, EmployeeStats e alertas configurados. O que falta é toda a camada de agregação histórica, cálculos de margem, visualizações comparativas, e o FUP diário automatizado.

Este PRD requer que o sistema já esteja operando há pelo menos 2-4 semanas para que os dados históricos tenham valor. É a razão pela qual é Phase 2 — não porque é menos importante, mas porque precisa de insumo (dados) que só existem com operação real.

Este PRD cobre seis subsistemas:

**1\. Comparativos Temporais —** Análise MoM (mês vs. mês anterior), WoW (semana vs. semana anterior), YoY (ano vs. ano anterior) para receita, ticket médio, número de contas, cancelamentos. Gráficos de tendência.

**2\. Comparativos entre Unidades —** Ranking de unidades por receita, ticket médio, CMV, e eficiência operacional. Heatmap de performance por dia da semana.

**3\. CMV Real vs. Teórico —** CMV teórico (ficha técnica × vendas) vs. CMV real (inventário inicial \+ compras \- inventário final). Diferença \= desperdício. Margem por produto e por categoria.

**4\. Análise de Produtos —** Ranking de produtos por receita, quantidade, margem, frequência. Identificação de "estrelas" (alto volume \+ alta margem), "abacaxis" (baixo volume \+ baixa margem), oportunidades de reprecificação.

**5\. FUP Diário Automatizado —** Resumo do dia anterior enviado automaticamente ao dono via WhatsApp (PRD-09) ou email às 10h da manhã. KPIs principais, destaques, alertas.

**6\. Recomendações Acionáveis —** Insights gerados por regras baseadas nos dados: ajuste de preço, horário de happy hour, produto para promover, insumo para renegociar.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Endpoints API | 12 | Comparativos, CMV, produtos, ranking, FUP, recomendações |
| Serviços Novos | 5 | AnalyticsService, CMVService, ProductAnalytics, FUPService, RecommendationEngine |
| Workers/Jobs | 2 | FUP diário (cron 10h) \+ Agregação semanal/mensal |
| Componentes React (web-owner) | \~18 | Dashboard avançado completo com múltiplas visões |
| Models Novos | 0 | Usa DailyReport, HourlyRevenue, StockMovement, ProductIngredient existentes |
| Caching | Redis | Cache de agregações com TTL (dados históricos não mudam) |

## **Critério de Sucesso (Done Definition)**

O PRD-10 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Dashboard exibe comparativo MoM: receita, ticket médio, contas, cancelamentos com % de variação.

2\. Gráfico de tendência semanal (receita por dia dos últimos 30 dias) funcional com linha de média móvel.

3\. Ranking de unidades (se multi-unit) com comparação de KPIs.

4\. CMV real calculado: inventário inicial \+ compras \- inventário final vs. CMV teórico (ficha técnica).

5\. Margem por produto e por categoria visível com gráfico.

6\. Matriz BCG de produtos (estrelas, vacas leiteiras, interrogações, abacaxis).

7\. FUP diário enviado automaticamente às 10h (WhatsApp ou email).

8\. Mínimo 3 recomendações acionáveis geradas por dia baseadas em dados reais.

9\. Performance: dashboard carrega em \< 2 segundos (cache de agregações).

10\. Zero erros de tipo no monorepo.

# **Conceitos Financeiros**

O PRD-07 introduziu Faturamento, Recebimentos, e Receita Líquida. O PRD-10 aprofunda com CMV, Margem de Contribuição, e Lucratividade Estimada.

## **Pirâmide Financeira do F\&B**

  ┌────────────────────────────────────────┐  
  │  Faturamento Bruto                      │  SUM(itens vendidos)  
  │  \- Descontos                             │  
  │  \- Cancelamentos                         │  
  │  \= RECEITA LIQUIDA                       │  \<\< KPI principal  
  ├────────────────────────────────────────┤  
  │  \- CMV (Custo de Mercadoria Vendida)     │  \<\< PRD-10 calcula  
  │  \= MARGEM DE CONTRIBUICAO                │  \<\< O que sobra  
  ├────────────────────────────────────────┤  
  │  \- Custos Fixos (aluguel, folha, luz)    │  Fora do OASYS\*  
  │  \- Custos Variaveis (taxas, impostos)    │  Fora do OASYS\*  
  │  \= LUCRO OPERACIONAL                     │  Estimativa  
  └────────────────────────────────────────┘

  \* OASYS nao controla custos fixos/variaveis (contabilidade).  
    Lucratividade e ESTIMATIVA baseada em CMV \+ taxa de servico.

## **CMV: Teórico vs. Real**

| Tipo | Fórmula | Fonte de Dados | Quando Usar |
| :---- | :---- | :---- | :---- |
| CMV Teórico | SUM(qty\_vendida \* ficha\_tecnica \* custo\_unitario) | PRD-08: ProductIngredient \+ StockItem.costPrice \+ OrderItem.quantity | Diário (calculado automaticamente) |
| CMV Real | (Estoque Inicial \+ Compras) \- Estoque Final | PRD-08: StockMovement (IN) \+ contagem física (ADJUSTMENT) | Semanal/mensal (requer inventário) |
| Desperdício | CMV Real \- CMV Teórico | Diferença entre os dois | Indicador de eficiência operacional |

Exemplo prático: Em uma semana, o bar vendeu 200 Caipirinhas. Pela ficha técnica, deveria ter consumido 12L de cachaça (200 \* 60ml). CMV teórico \= 12L \* R$0,015/ml \= R$180. Porém, na contagem física, consumiu 14L. CMV real \= 14L \* R$0,015/ml \= R$210. Desperdício \= R$30 (16,7%). O dono precisa investigar: doses maiores? Derramamento? Furto?

## **Margem de Contribuição por Produto**

| Produto | Preço | CMV Teórico | Margem (R$) | Margem (%) | Classificação |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Chopp Pilsen 300ml | R$ 12,90 | R$ 1,58 | R$ 11,32 | 87,7% | Estrela (alto vol \+ alta margem) |
| Caipirinha Limão | R$ 22,90 | R$ 1,90 | R$ 21,00 | 91,7% | Estrela |
| Gin Tônica | R$ 28,90 | R$ 7,10 | R$ 21,80 | 75,4% | Vaca leiteira (vol moderado) |
| Heineken Long Neck | R$ 14,90 | R$ 5,50 | R$ 9,40 | 63,1% | Volume alto, margem menor |
| Bolinho Bacalhau | R$ 34,90 | R$ 17,00 | R$ 17,90 | 51,3% | Alto CMV, margem apertada |
| Porção de Fritas | R$ 28,90 | R$ 4,80 | R$ 24,10 | 83,4% | Excelente margem |
| Água Mineral | R$ 5,90 | R$ 1,20 | R$ 4,70 | 79,7% | Baixo valor absoluto |

# **Especificação de API — Endpoints**

Todos os endpoints requerem JWT com role MANAGER ou OWNER. Prefixo: /api/v1. Dados de multi-unit disponíveis apenas para OWNER no nível Organization.

## **Comparativos Temporais**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /analytics/overview | MANAGER, OWNER | Resumo executivo: KPIs com comparação ao período anterior |
| GET | /analytics/revenue/trend | MANAGER, OWNER | Receita diária dos últimos N dias (gráfico de tendência) |
| GET | /analytics/revenue/hourly | MANAGER, OWNER | Receita por hora em um dia específico (ou média do período) |
| GET | /analytics/comparison | MANAGER, OWNER | Comparativo MoM, WoW, ou YoY para métricas selecionadas |
| GET | /analytics/heatmap | MANAGER, OWNER | Heatmap: receita por dia da semana × hora |

## **Produtos e CMV**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /analytics/products/ranking | MANAGER, OWNER | Ranking de produtos por receita, qtd, margem, frequência |
| GET | /analytics/products/:id/detail | MANAGER, OWNER | Histórico de vendas, margem, tendência de um produto |
| GET | /analytics/products/matrix | MANAGER, OWNER | Matriz BCG: volume × margem com classificação |
| GET | /analytics/cmv | MANAGER, OWNER | CMV teórico vs. real por período, por categoria ou produto |
| GET | /analytics/cmv/trend | MANAGER, OWNER | Evolução do CMV% ao longo do tempo |

## **Multi-Unit e Outros**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /analytics/units/ranking | OWNER | Ranking de unidades (receita, ticket, CMV, eficiência) |
| GET | /analytics/recommendations | MANAGER, OWNER | Recomendações acionáveis baseadas em dados |

# **Detalhamento de Endpoints**

## **GET /analytics/overview**

Endpoint principal do dashboard. Retorna KPIs do período selecionado com comparação ao período equivalente anterior. Default: últimos 7 dias vs. 7 dias anteriores.

### **Query Parameters**

const OverviewQuerySchema \= z.object({  
  period: z.enum(\["today", "7d", "30d", "mtd", "ytd", "custom"\]).default("7d"),  
  startDate: z.string().optional(),  // ISO date (custom period)  
  endDate: z.string().optional(),  
  unitId: z.string().cuid().optional(),  // null \= all units (OWNER)  
});

### **Response (200)**

{  
  "period": { "start": "2026-02-23", "end": "2026-03-01", "days": 7 },  
  "previousPeriod": { "start": "2026-02-16", "end": "2026-02-22", "days": 7 },

  "kpis": {  
    "netRevenue": {  
      "current": 89420.50,  
      "previous": 82150.30,  
      "change": 8.85,  
      "trend": "up"  
    },  
    "avgTicket": {  
      "current": 67.80,  
      "previous": 63.20,  
      "change": 7.28,  
      "trend": "up"  
    },  
    "totalChecks": {  
      "current": 1319,  
      "previous": 1300,  
      "change": 1.46,  
      "trend": "stable"  
    },  
    "cancellationRate": {  
      "current": 3.2,  
      "previous": 4.1,  
      "change": \-21.95,  
      "trend": "down"  // down is GOOD for cancellations  
    },  
    "cmvPercentage": {  
      "current": 28.5,  
      "previous": 30.1,  
      "change": \-5.31,  
      "trend": "down"  // down is GOOD for CMV  
    },  
    "avgPrepTime": {  
      "current": 8.2,  
      "previous": 9.1,  
      "change": \-9.89,  
      "trend": "down"  // down is GOOD for prep time  
    },  
    "serviceFeeTotal": {  
      "current": 8942.05,  
      "previous": 8215.03,  
      "change": 8.85,  
      "trend": "up"  
    },  
    "grossMargin": {  
      "current": 71.5,  
      "previous": 69.9,  
      "change": 2.29,  
      "trend": "up"  
    }  
  },

  "highlights": \[  
    { "type": "positive", "text": "Receita cresceu 8.85% vs semana anterior" },  
    { "type": "positive", "text": "CMV reduziu de 30.1% para 28.5% \- margens melhores" },  
    { "type": "warning", "text": "Sexta-feira foi 23% abaixo da media \- investigar" },  
    { "type": "info", "text": "Produto mais vendido: Chopp Pilsen 300ml (432 unidades)" }  
  \]  
}

### **Regras de Trend**

| Métrica | trend \= "up" (bom) | trend \= "down" (bom) | trend \= "stable" |
| :---- | :---- | :---- | :---- |
| netRevenue | change \> 3% | change \< \-3% | \-3% a 3% |
| avgTicket | change \> 3% | change \< \-3% | \-3% a 3% |
| totalChecks | change \> 3% | change \< \-3% | \-3% a 3% |
| cancellationRate | change \< \-5% (reduziu) | change \> 5% (aumentou) | \-5% a 5% |
| cmvPercentage | change \< \-3% (reduziu) | change \> 3% (aumentou) | \-3% a 3% |
| avgPrepTime | change \< \-5% (mais rapido) | change \> 5% (mais lento) | \-5% a 5% |
| grossMargin | change \> 2% | change \< \-2% | \-2% a 2% |

## **GET /analytics/revenue/trend**

Retorna receita diária para plotar gráfico de tendência com linha de média móvel (7 dias).

### **Response**

{  
  "period": "30d",  
  "data": \[  
    {  
      "date": "2026-02-01",  
      "dayOfWeek": "Saturday",  
      "netRevenue": 14250.80,  
      "totalChecks": 210,  
      "avgTicket": 67.86,  
      "movingAvg7d": 12450.30  
    },  
    {  
      "date": "2026-02-02",  
      "dayOfWeek": "Sunday",  
      "netRevenue": 8420.50,  
      "totalChecks": 142,  
      "avgTicket": 59.30,  
      "movingAvg7d": 12380.15  
    },  
    // ... 28 mais dias  
  \],  
  "summary": {  
    "best": { "date": "2026-02-22", "revenue": 16880.40, "dayOfWeek": "Saturday" },  
    "worst": { "date": "2026-02-10", "revenue": 4220.10, "dayOfWeek": "Monday" },  
    "average": 12340.50,  
    "standardDeviation": 3420.80  
  }  
}

## **GET /analytics/heatmap**

Retorna matriz receita × dia da semana × hora. Permite identificar picos e vales para otimizar escala e promoções.

### **Response**

{  
  "period": "30d",  
  "matrix": \[  
    // Cada celula: \[dayOfWeek, hour, avgRevenue\]  
    { "day": 0, "dayName": "Dom", "hour": 17, "avgRevenue": 420.30, "intensity": 0.35 },  
    { "day": 0, "dayName": "Dom", "hour": 18, "avgRevenue": 680.50, "intensity": 0.55 },  
    { "day": 0, "dayName": "Dom", "hour": 19, "avgRevenue": 1240.80, "intensity": 0.85 },  
    // ...  
    { "day": 5, "dayName": "Sex", "hour": 22, "avgRevenue": 1850.20, "intensity": 1.00 },  
    { "day": 6, "dayName": "Sab", "hour": 23, "avgRevenue": 1720.40, "intensity": 0.95 },  
  \],  
  "peak": { "day": "Sexta", "hour": "22h", "avgRevenue": 1850.20 },  
  "valley": { "day": "Segunda", "hour": "17h", "avgRevenue": 120.50 }  
}  
intensity é um valor normalizado 0-1 para colorização do heatmap no frontend. 1.0 \= pico máximo, 0.0 \= sem vendas. Facilita o render com gradiente de cor.

# **CMV Real vs. Teórico**

## **GET /analytics/cmv**

### **Response**

{  
  "period": { "start": "2026-02-01", "end": "2026-02-28" },

  "theoretical": {  
    "total": 25480.30,  
    "percentage": 28.5,  
    "byCategory": \[  
      { "category": "Cervejas", "cmv": 8420.10, "revenue": 32500.00, "pct": 25.9 },  
      { "category": "Drinks", "cmv": 5280.40, "revenue": 18200.00, "pct": 29.0 },  
      { "category": "Petiscos", "cmv": 9540.80, "revenue": 28800.00, "pct": 33.1 },  
      { "category": "Sem Alcool", "cmv": 2239.00, "revenue": 9920.50, "pct": 22.6 }  
    \]  
  },

  "real": {  
    "total": 28120.50,  
    "percentage": 31.4,  
    "calculation": {  
      "openingInventory": 42500.00,  
      "purchases": 31200.00,  
      "closingInventory": 45579.50,  
      "consumed": 28120.50  
      // consumed \= opening \+ purchases \- closing  
    }  
  },

  "waste": {  
    "amount": 2640.20,  
    "percentage": 2.95,  
    // waste \= real \- theoretical  
    "topWasteItems": \[  
      { "name": "Chopp Pilsen", "theoreticalKg": 85.0, "realKg": 98.5, "wastePct": 15.9, "costImpact": 607.50 },  
      { "name": "Cachaca 51", "theoreticalMl": 12000, "realMl": 14200, "wastePct": 18.3, "costImpact": 330.00 },  
      { "name": "Batata Congelada", "theoreticalKg": 48.0, "realKg": 55.2, "wastePct": 15.0, "costImpact": 864.00 }  
    \]  
  },

  "diagnosis": {  
    "status": "ATTENTION",  // EXCELLENT, HEALTHY, ATTENTION, PROBLEM, CRITICAL  
    "message": "CMV real 31.4% esta 2.9pp acima do teorico. Desperdicio de R$2.640 no mes."  
  }  
}

## **Cálculo do CMV Real**

async function calculateRealCMV(unitId: string, period: DateRange): Promise\<RealCMV\> {

  // 1\. Estoque no INICIO do periodo  
  // Snapshot: usa ultimo ajuste (ADJUSTMENT) antes do periodo, ou estoque atual \- movimentacoes  
  const openingInventory \= await getInventoryValueAt(unitId, period.start);

  // 2\. Compras no periodo (movimentacoes IN)  
  const purchases \= await prisma.stockMovement.aggregate({  
    where: {  
      stockItem: { unitId },  
      type: "IN",  
      createdAt: { gte: period.start, lte: period.end },  
    },  
    \_sum: {  
      // SUM(quantity \* costPrice) para cada movimento  
    },  
  });

  // 3\. Estoque no FINAL do periodo  
  const closingInventory \= await getInventoryValueAt(unitId, period.end);

  // 4\. CMV Real \= Opening \+ Purchases \- Closing  
  const realCMV \= openingInventory \+ purchasesTotal \- closingInventory;

  return { openingInventory, purchases: purchasesTotal, closingInventory, consumed: realCMV };  
}  
NOTA: getInventoryValueAt() calcula o valor do estoque em uma data específica. Na Phase 2 básica, usa StockItem.quantity atual retroagindo as movimentações. Acurado se o dono faz contagem (ajustes) regularmente. Em versão futura, snapshot periódico é ideal.

# **Análise de Produtos**

## **Matriz BCG de Produtos**

Classificar cada produto em 4 quadrantes baseados em volume de vendas (eixo X) e margem % (eixo Y). Usa medianas como thresholds.

             MARGEM ALTA  
                 |  
    Interrogacao |  Estrela  
    (baixo vol,  |  (alto vol,  
     alta margem)|   alta margem)  
                 |  
  \------baixo----+----alto------  VOLUME  
                 |  
    Abacaxi      |  Vaca Leiteira  
    (baixo vol,  |  (alto vol,  
     baixa       |   baixa margem)  
     margem)     |  
                 |  
             MARGEM BAIXA

## **GET /analytics/products/matrix**

### **Response**

{  
  "period": "30d",  
  "medians": { "volume": 145, "margin": 78.5 },  
  "products": \[  
    {  
      "id": "clx...",  
      "name": "Chopp Pilsen 300ml",  
      "category": "Cervejas",  
      "volume": 432,  
      "revenue": 5572.80,  
      "cmv": 682.56,  
      "margin": 87.7,  
      "quadrant": "STAR",  
      "x": 0.85,  // posicao normalizada 0-1 no eixo X  
      "y": 0.82   // posicao normalizada 0-1 no eixo Y  
    },  
    {  
      "id": "clx...",  
      "name": "Bolinho Bacalhau",  
      "category": "Petiscos",  
      "volume": 68,  
      "revenue": 2373.20,  
      "cmv": 1156.00,  
      "margin": 51.3,  
      "quadrant": "DOG",  // abacaxi  
      "x": 0.22,  
      "y": 0.15  
    }  
  \],  
  "quadrantSummary": {  
    "STAR": { "count": 5, "revenue": 28400.00, "margin": 85.2 },  
    "CASH\_COW": { "count": 4, "revenue": 22100.00, "margin": 62.1 },  
    "QUESTION": { "count": 3, "revenue": 4800.00, "margin": 80.5 },  
    "DOG": { "count": 3, "revenue": 6200.00, "margin": 48.3 }  
  }  
}

| Quadrante | Descrição | Ação Recomendada |
| :---- | :---- | :---- |
| STAR (Estrela) | Alto volume, alta margem. Motores do negócio. | Manter visível no cardápio. Garantir estoque. Promover. |
| CASH\_COW (Vaca Leiteira) | Alto volume, margem menor. Traz movimento. | Manter mas buscar reduzir CMV. Não remover do cardápio. |
| QUESTION (Interrogação) | Baixo volume, alta margem. Potencial escondido. | Promover (upsell, destaque no menu). Se não vender, reclassificar. |
| DOG (Abacaxi) | Baixo volume, baixa margem. Ocupa espaço. | Revisar preço ou remover. Substituir por algo melhor. |

# **Comparativo entre Unidades**

Para organizacoes com múltiplas unidades, o dono precisa comparar performance entre elas. O ranking mostra quais unidades performam melhor e onde estão os problemas.

## **GET /analytics/units/ranking**

### **Response**

{  
  "period": "30d",  
  "units": \[  
    {  
      "unitId": "clx...",  
      "name": "Boteco do Ze \- Pinheiros",  
      "netRevenue": 89420.50,  
      "avgTicket": 67.80,  
      "totalChecks": 1319,  
      "cmvPct": 28.5,  
      "cancellationRate": 3.2,  
      "avgPrepTime": 8.2,  
      "ranking": 1,  
      "revenueVsPrevious": 8.85  
    },  
    {  
      "unitId": "clx...",  
      "name": "Boteco do Ze \- Vila Madalena",  
      "netRevenue": 72150.30,  
      "avgTicket": 58.40,  
      "totalChecks": 1235,  
      "cmvPct": 32.1,  
      "cancellationRate": 5.8,  
      "avgPrepTime": 11.5,  
      "ranking": 2,  
      "revenueVsPrevious": \-2.30  
    }  
  \],  
  "insights": \[  
    "Vila Madalena tem CMV 3.6pp acima de Pinheiros. Investigar desperdicio.",  
    "Taxa de cancelamento em Vila Madalena (5.8%) e quase o dobro de Pinheiros (3.2%).",  
    "Tempo de preparo em Vila Madalena (11.5min) e 40% mais lento. Revisar processos."  
  \]  
}  
NOTA: Na Phase 1, o OASYS opera com uma única unidade. O endpoint de ranking retorna array de 1\. A UI deve ser escalável para N unidades, mas não é prioridade visual até que existam múltiplas.

# **Recomendações Acionáveis**

O RecommendationEngine analisa dados e gera insights acionáveis. Na Phase 2, usa regras determinísticas (if/then). Na Phase 3+, pode usar LLM para análise mais sofisticada.

## **Regras do Engine**

| Regra | Condição | Recomendação | Prioridade |
| :---- | :---- | :---- | :---- |
| CMV Alto | CMV% \> 35% por 7+ dias | Revisar fichas técnicas e preços de fornecedores. Auditar estoque. | Alta |
| Produto Abacaxi | Produto no quadrante DOG por 30+ dias | Considerar remover {{produto}} do cardápio ou aumentar preço em {{x}}%. | Média |
| Happy Hour Ineficiente | Receita no horário happy hour \< 80% do horário normal | Promoção de happy hour não está gerando tráfego adicional. Revisar. | Média |
| Horário Subutilizado | Receita em horário X consistentemente \< 50% da média | Considerar promoção ou evento para {{horario}} (receita {{x}}% abaixo). | Baixa |
| Estrela Sem Estoque | Produto STAR ficou indisponível por \>2h no período | {{produto}} (top seller) ficou esgotado {{n}} vezes. Aumentar estoque mínimo. | Alta |
| Desperdício Alto | CMV real \> CMV teórico \+ 15% em insumo | Desperdício de {{insumo}} está {{pct}}% acima do esperado. Treinar equipe. | Alta |
| Ticket em Queda | avgTicket caindo por 3+ semanas consecutivas | Ticket médio em queda constante. Revisar mix de produtos e upsell. | Média |
| Cancelamento Alto | cancellationRate \> 5% por 7+ dias | Taxa de cancelamento {{pct}}% está elevada. Investigar causas. | Alta |
| Produto Interrogação | Produto QUESTION com margem \> 80% | {{produto}} tem margem excelente mas vende pouco. Promover no cardápio e upsell. | Média |
| Dia da Semana Fraco | Dia X consistentemente \< 60% média semanal | {{dia}} é o dia mais fraco. Criar evento ou promoção específica. | Baixa |

## **GET /analytics/recommendations**

### **Response**

{  
  "generatedAt": "2026-03-02T10:00:00Z",  
  "recommendations": \[  
    {  
      "id": "rec\_001",  
      "type": "WASTE\_HIGH",  
      "priority": "HIGH",  
      "title": "Desperdicio alto de Chopp Pilsen",  
      "description": "O consumo real de Chopp Pilsen foi 15.9% acima do teorico ..." ,  
      "suggestedAction": "Auditar processo de servir chopp. Verificar calibracao ...",  
      "impact": "Economia estimada de R$607/mes",  
      "dataPoints": {  
        "theoreticalConsumption": 85.0,  
        "realConsumption": 98.5,  
        "wastePct": 15.9,  
        "costImpact": 607.50  
      },  
      "dismissed": false,  
      "dismissedAt": null  
    },  
    {  
      "id": "rec\_002",  
      "type": "PRODUCT\_QUESTION",  
      "priority": "MEDIUM",  
      "title": "Aperol Spritz tem potencial inexplorado",  
      "description": "Margem de 78.2% mas apenas 42 vendas/mes ...",  
      "suggestedAction": "Destaque no cardapio digital. Incluir em upsell do Isis ...",  
      "impact": "Potencial \+R$1.200/mes se dobrar vendas",  
      "dataPoints": {  
        "currentVolume": 42,  
        "margin": 78.2,  
        "potentialRevenue": 2511.60  
      },  
      "dismissed": false  
    }  
  \]  
}  
Recomendações podem ser "dismissed" pelo dono (ele já viu e decidiu não agir ou já agiu). Dismissed recommendations não reaparecem por 30 dias.

# **FUP Diário Automatizado**

Todo dia às 10h da manhã, o OASYS envia automaticamente ao dono um resumo do dia anterior. Serve como "bom dia" inteligente — o dono acorda e já sabe como foi a operação.

## **Canais de Envio**

| Canal | Formato | Dependência | Prioridade |
| :---- | :---- | :---- | :---- |
| WhatsApp | Template com resumo \+ link para dashboard | PRD-09 (WhatsApp & Isis) | Preferido |
| Email | HTML formatado com KPIs, gráficos inline, e link | Nenhuma (SMTP ou SendGrid) | Fallback |
| Push Notification | Resumo curto \+ deep link para app | PWA (future) | Futuro |

## **Conteúdo do FUP**

// Template WhatsApp (resumo curto)  
// Template: daily\_fup  
// Categoria: UTILITY

"Bom dia {{nome}}\! Resumo de ontem no {{unidade}}:

 Receita:     R$ {{receita}} ({{var\_receita}})  
 Ticket Medio: R$ {{ticket}}  
 Contas:      {{contas}} fechadas  
 CMV:         {{cmv}}%

{{destaque\_principal}}

Ver detalhes: {{link\_dashboard}}"

// Exemplo real:  
"Bom dia Carlos\! Resumo de ontem no Boteco do Ze \- Pinheiros:

 Receita:     R$ 14.280,50 (+12.3% vs semana passada)  
 Ticket Medio: R$ 72,40  
 Contas:      197 fechadas  
 CMV:         27.8%

Destaque: Sabado foi o melhor dia do mes\!

Ver detalhes: https://app.oasys.com.br/dashboard?date=2026-03-01"

## **FUP Service**

// Cron job: executa todo dia as 10h  
async function sendDailyFUP(): Promise\<void\> {

  // 1\. Buscar todas as unidades com fechamento de ontem  
  const yesterday \= subDays(new Date(), 1);  
  const reports \= await prisma.dailyReport.findMany({  
    where: { date: yesterday, status: "CLOSED" },  
    include: { unit: { include: { organization: true } } },  
  });

  for (const report of reports) {  
    // 2\. Buscar donos da organization  
    const owners \= await prisma.employee.findMany({  
      where: { unitId: report.unitId, role: "OWNER", isActive: true },  
    });

    // 3\. Calcular comparativo (mesmo dia semana passada)  
    const comparison \= await calculateComparison(report);

    // 4\. Gerar highlight principal  
    const highlight \= generateHighlight(report, comparison);

    // 5\. Enviar para cada dono  
    for (const owner of owners) {  
      if (owner.phone) {  
        await sendWhatsAppFUP(owner.phone, report, comparison, highlight);  
      }  
      if (owner.email) {  
        await sendEmailFUP(owner.email, report, comparison, highlight);  
      }  
    }  
  }  
}  
R1. Só envia FUP se fechamento foi realizado (DailyReport.status \= CLOSED). Se dono esqueceu de fechar, envia lembrete em vez de FUP.

R2. Se dono não tem WhatsApp configurado, envia por email. Se não tem email, não envia (log warning).

R3. Horário configurável por Unit (default: 10:00). Dono de bar que opera até 5h pode preferir receber às 14h.

# **Estratégia de Cache**

Dados históricos não mudam (DailyReport é imutável após fechamento). Agregações de períodos passados podem ser cacheadas indefinidamente. Apenas o dia corrente (não fechado) é calculado em tempo real.

| Endpoint | TTL do Cache | Chave do Cache | Razão |
| :---- | :---- | :---- | :---- |
| /analytics/overview (período passado) | 24h | analytics:overview:{unitId}:{period}:{hash} | DailyReport imutável |
| /analytics/overview (inclui hoje) | 5 min | analytics:overview:{unitId}:today | Dia em andamento muda |
| /analytics/revenue/trend | 24h | analytics:trend:{unitId}:{days} | Histórico não muda |
| /analytics/heatmap | 24h | analytics:heatmap:{unitId}:{period} | Histórico não muda |
| /analytics/cmv | 24h | analytics:cmv:{unitId}:{period} | Depende de movimentações finalizadas |
| /analytics/products/matrix | 12h | analytics:matrix:{unitId}:{period} | Pode mudar com ajustes |
| /analytics/products/ranking | 12h | analytics:ranking:{unitId}:{period} | Mesmo |
| /analytics/recommendations | 1h | analytics:recs:{unitId} | Precisa refletir dados recentes |

Implementação: Redis GET/SET com TTL. Middleware de cache no Fastify que verifica Redis antes de executar handler. Se cache miss, executa query, salva resultado, retorna. Invalidar cache de "hoje" a cada fechamento.

# **UI — Web Owner (apps/web-owner)**

## **Navegação**

O dashboard avançado substitui o dashboard básico do PRD-07 como tela principal do web-owner. O básico se torna uma "aba" ou sub-view do avançado.

| Tela | Rota | Descrição |
| :---- | :---- | :---- |
| Dashboard Principal | /dashboard | Overview com KPIs, tendência, destaques, recomendações |
| Análise de Receita | /dashboard/revenue | Gráfico de tendência \+ heatmap \+ comparativos |
| Análise de Produtos | /dashboard/products | Ranking \+ matriz BCG \+ margem por produto |
| CMV & Custos | /dashboard/cmv | CMV teórico vs. real \+ desperdício \+ tendência CMV% |
| Unidades | /dashboard/units | Ranking entre unidades (se multi-unit) |
| Relatórios | /dashboard/reports | Histórico de fechamentos \+ exportação (PRD-07 move para cá) |

## **Componentes React**

| Componente | Arquivo | Responsabilidade |
| :---- | :---- | :---- |
| AnalyticsDashboard | pages/AnalyticsDashboard.tsx | Layout principal com tabs/navegação entre views |
| PeriodSelector | components/PeriodSelector.tsx | Seletor: Hoje, 7d, 30d, Mês, Ano, Custom |
| KPICardAdvanced | components/KPICardAdvanced.tsx | KPI com valor, comparação, trend arrow, sparkline mini |
| RevenueTrendChart | components/RevenueTrendChart.tsx | Line chart: receita diária \+ média móvel 7d |
| HeatmapChart | components/HeatmapChart.tsx | Heatmap: dia da semana × hora com gradiente |
| ComparisonTable | components/ComparisonTable.tsx | Tabela MoM/WoW com cores (verde/vermelho) |
| ProductRankingTable | components/ProductRankingTable.tsx | Ranking com ordenação por coluna |
| BCGMatrix | components/BCGMatrix.tsx | Scatter plot: volume × margem com quadrantes |
| MarginBar | components/MarginBar.tsx | Barra horizontal: preço → CMV → margem por produto |
| CMVComparison | components/CMVComparison.tsx | Cards: teórico vs. real com gauge visual |
| WasteTrend | components/WasteTrend.tsx | Gráfico de desperdício ao longo do tempo |
| UnitRanking | components/UnitRanking.tsx | Tabela de unidades com comparação visual |
| RecommendationCard | components/RecommendationCard.tsx | Card com título, descrição, ação, dismiss button |
| HighlightBanner | components/HighlightBanner.tsx | Banner top com destaques do período |
| SparklineChart | components/SparklineChart.tsx | Mini gráfico inline para KPI cards |
| GaugeChart | components/GaugeChart.tsx | Gauge semicircular para CMV% e margem% |
| ExportButton | components/ExportButton.tsx | Botão de exportação CSV/PDF com período |
| FUPConfigModal | components/FUPConfigModal.tsx | Configuração do FUP: horário, canal, ativar/desativar |

# **Estrutura de Arquivos**

apps/api/src/modules/analytics/  
├── analytics.routes.ts           \# Registro de rotas  
├── analytics.service.ts          \# Overview, comparativos temporais  
├── analytics.schemas.ts          \# Schemas Zod (query params \+ responses)  
├── cmv.service.ts                \# CMV teorico vs. real, desperdicio  
├── product-analytics.service.ts  \# Ranking, matriz BCG, margem  
├── multi-unit.service.ts         \# Ranking e comparacao entre unidades  
├── recommendation.engine.ts      \# Regras de recomendacao  
├── fup.service.ts                \# FUP diario (WhatsApp \+ email)  
├── fup.scheduler.ts              \# Cron job 10h  
├── cache.middleware.ts            \# Redis cache middleware  
├── aggregation.utils.ts          \# Helpers: movingAvg, percentChange, normalize  
└── \_\_tests\_\_/  
    ├── analytics.test.ts  
    ├── cmv.test.ts  
    ├── product-analytics.test.ts  
    ├── recommendation.test.ts  
    └── fup.test.ts

apps/web-owner/src/  
├── pages/  
│   ├── AnalyticsDashboard.tsx  
│   ├── RevenueAnalysis.tsx  
│   ├── ProductAnalysis.tsx  
│   ├── CMVAnalysis.tsx  
│   └── UnitComparison.tsx  
├── components/  
│   ├── PeriodSelector.tsx  
│   ├── KPICardAdvanced.tsx  
│   ├── RevenueTrendChart.tsx  
│   ├── HeatmapChart.tsx  
│   ├── ComparisonTable.tsx  
│   ├── ProductRankingTable.tsx  
│   ├── BCGMatrix.tsx  
│   ├── MarginBar.tsx  
│   ├── CMVComparison.tsx  
│   ├── WasteTrend.tsx  
│   ├── UnitRanking.tsx  
│   ├── RecommendationCard.tsx  
│   ├── HighlightBanner.tsx  
│   ├── SparklineChart.tsx  
│   ├── GaugeChart.tsx  
│   ├── ExportButton.tsx  
│   └── FUPConfigModal.tsx  
└── stores/  
    └── analytics.store.ts

# **Estratégia de Testes**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Overview — 7d com comparação | Unit | KPIs corretos, percentChange calculado, trend atribuído |
| Overview — sem dados anteriores | Unit | previous \= null, change \= null, sem erro |
| Revenue trend — 30 dias | Unit | 30 pontos retornados, movingAvg7d correto a partir do 7º dia |
| Revenue trend — média móvel | Unit | Valor correto da média dos últimos 7 dias |
| Heatmap — normalização | Unit | intensity 0-1 calculado corretamente, peak \= 1.0 |
| CMV teórico — cálculo | Unit | SUM(vendas \* ficha \* custo) correto |
| CMV real — cálculo | Unit | opening \+ purchases \- closing \= consumed |
| CMV desperdício — cálculo | Unit | waste \= real \- theoretical, topWasteItems ordenados |
| CMV diagnóstico — faixas | Unit | \< 25% \= EXCELLENT, 25-30 \= HEALTHY, 30-35 \= ATTENTION, etc |
| Produto ranking — ordenação | Unit | Ordenado por coluna selecionada (receita, margem, qtd) |
| Produto matriz BCG — classificação | Unit | Quadrantes atribuídos corretamente vs medianas |
| Multi-unit ranking | Unit | Unidades ordenadas por receita, insights gerados |
| Recomendação — CMV alto | Unit | Gera recomendação quando CMV \> 35% por 7d |
| Recomendação — produto abacaxi | Unit | Gera recomendação para DOG \> 30 dias |
| Recomendação — dismiss | Unit | Dismissed não reaparece por 30 dias |
| FUP — gera conteúdo | Unit | Resumo com KPIs, comparação, highlight |
| FUP — só envia se fechou | Unit | Não envia se DailyReport inexistente |
| Cache — hit e miss | Integration | Primeiro request \= miss (query). Segundo \= hit (Redis). |
| Cache — invalidação | Integration | Após fechamento, cache de "today" invalidado |
| Performance — \< 2s | Integration | Dashboard overview carrega em \< 2000ms com cache |

# **Impacto Downstream e Riscos**

## **Dependências de Entrada**

| PRD | O que fornece para PRD-10 |
| :---- | :---- |
| PRD-07 | DailyReport populado com dados financeiros. HourlyRevenue. Reconciliação. Base de TODO o BI. |
| PRD-08 | StockMovement para CMV. ProductIngredient para cálculo teórico. StockItem.costPrice. |
| PRD-02 | Payment com método e status. Breakdown por tipo de pagamento. |
| PRD-09 | Canal para FUP diário via WhatsApp. Métricas de conversão de upsell. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Dados insuficientes (primeiras semanas) | Alta | Médio | Dashboard exibe "Dados insuficientes" em vez de métricas erradas. Mínimo 7 dias. |
| CMV real impreciso (sem inventário regular) | Alta | Médio | Alertar dono para fazer contagem semanal. CMV teórico como fallback. |
| Performance lenta em períodos longos | Média | Médio | Cache Redis com TTL. Agregações pré-calculadas. Queries com índices otimizados. |
| Recomendações genéricas demais | Média | Baixo | Regras específicas com dados concretos. Mostrar números, não platitudes. |
| FUP vira spam (dono ignora) | Média | Baixo | Configurar frequência. Conteúdo relevante com highlights. Opção de desativar. |
| Matriz BCG com poucos produtos | Alta | Baixo | Mínimo 8 produtos para gerar matriz. Abaixo disso, mostra ranking simples. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| DailyReport como fonte (não recalcular) | Sempre calcular de Orders/Payments | DailyReport é imutável. Garante consistência histórica. Muito mais rápido. |
| Redis cache (não in-memory) | Node.js Map cache | Redis persiste entre restarts. Compartilhado entre workers. TTL nativo. |
| Regras determinísticas (não LLM) | Claude API para recomendações | LLM adiciona latência e custo. Regras são suficientes para Phase 2\. LLM na Phase 3\. |
| Heatmap por hora (não 15min) | Granularidade de 15 minutos | Hora é suficiente para decisões. 15min gera matriz muito grande sem valor adicional. |
| BCG com medianas (não fixo) | Thresholds fixos de volume/margem | Medianas se adaptam ao mix de cada bar. Fixo não funciona para bares diferentes. |
| FUP às 10h (não ao fechar) | Enviar ao fechar o dia | Dono fecha às 2-3h (cansado). Resumo de manhã é mais efetivo. Horário configurável. |

# **Sequência de Implementação (3 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: AnalyticsService (overview, trend, heatmap, comparison) \+ cache middleware (Redis) \+ aggregation utils. Frontend: Dashboard principal com KPIs, RevenueTrendChart, PeriodSelector. | Dashboard funcional com KPIs comparativos, gráfico de tendência 30d com média móvel, heatmap dia×hora. Cache operacional. |
| Sprint 2 | Backend: CMVService (teórico vs. real, desperdício) \+ ProductAnalytics (ranking, matriz BCG, margem) \+ multi-unit ranking. Frontend: ProductAnalysis, BCGMatrix, CMVComparison, MarginBar, UnitRanking. | Análise de produtos completa com matriz BCG. CMV real vs. teórico com desperdício. Ranking de unidades. Margem por produto visível. |
| Sprint 3 | Backend: RecommendationEngine (10 regras) \+ FUPService \+ FUP scheduler (cron). Frontend: RecommendationCard, FUPConfigModal, HighlightBanner. Testes E2E \+ performance. Polish. | Recomendações acionáveis. FUP diário automatizado (WhatsApp \+ email). Performance \< 2s. Dashboard polido e completo. |

OASYS PRD-10 — Dashboard & BI Avançado  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*