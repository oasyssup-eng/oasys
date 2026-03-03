

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-07 — Fechamento & Relatórios**  
Fechamento do dia, DailyReport, consolidação financeira, dashboard básico do dono

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 1 — Go-Live |
| **Sprints Estimados** | 2 sprints |
| **Complexidade** | Média |
| **Cobertura Atual** | \~10% |
| **Dependências** | PRD-02 (Payments & CashRegister), PRD-06 (Fiscal & NFC-e) |
| **Gap Modules** | M10 — Financial / BI |
| **Apps Afetadas** | apps/api \+ apps/web-owner |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-07 (Fechamento & Relatórios) fecha o ciclo operacional do OASYS: pedido → preparo → entrega → pagamento → fechamento. Sem fechamento, o dono termina a noite sem saber se ganhou ou perdeu dinheiro. O model DailyReport já existe no schema (PRD-01) mas nunca foi populado — este PRD é a implementação completa.

O fechamento é o momento mais crítico do ponto de vista de gestão: consolida tudo que aconteceu no dia em números acionáveis. O dono precisa ver em 30 segundos se o dia foi bom ou ruim, o que vendeu, o que cancelou, se o caixa bateu, e se as notas fiscais estão corretas.

Este PRD cobre cinco subsistemas:

**1\. Fechamento do Dia —** Procedimento de encerramento que consolida todas as operações: vendas, pagamentos, cancelamentos, descontos, cortesias, consumo interno. Gera o DailyReport como registro imutável do dia.

**2\. Reconciliação Financeira —** Cruzamento automático: total de pagamentos vs. total de contas fechadas vs. total de notas fiscais emitidas. Identifica e lista divergências.

**3\. Dashboard Básico do Dono —** Tela principal do web-owner com KPIs do dia (faturamento, ticket médio, contas, cancelamentos) e gráfico de faturamento por hora. Comparativo com dia anterior.

**4\. Reabertura Controlada —** Reabrir fechamento já concluído com motivo obrigatório e log de auditoria. Caso de uso: dono percebe erro após fechar.

**5\. Exportação —** Exportar fechamento em CSV e PDF para envio ao contador ou arquivo.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Endpoints API | 8 | Fechar dia, reabrir, relatório, exportar, dashboard KPIs, histórico |
| Endpoints Modificados | 1 | CashRegister close (PRD-02) alimenta dados de fechamento |
| Models Modificados | 1 | DailyReport (já existe, popular com dados reais) |
| Serviços Novos | 2 | ClosingService (orquestração) \+ ReportService (agregação) |
| Jobs/Workers | 1 | Auto-close reminder (alerta se não fechou até 4h da manhã) |
| Componentes React (web-owner) | \~10 | Dashboard, cards KPI, gráficos, fechamento wizard, histórico |

## **Critério de Sucesso (Done Definition)**

O PRD-07 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Dono fecha o dia com um clique. DailyReport populado com consolidação financeira completa.

2\. Verificação automática de Checks abertos e pagamentos pendentes antes de permitir fechamento.

3\. Reconciliação: pagamentos vs. contas vs. notas fiscais. Divergências listadas e explicadas.

4\. Dashboard do dono exibe KPIs do dia: faturamento, ticket médio, contas fechadas, cancelamentos.

5\. Gráfico de faturamento por hora com comparação com dia anterior (mesmo dia da semana).

6\. Reabertura com motivo obrigatório e log de auditoria.

7\. Exportação CSV e PDF do fechamento funcional.

8\. Alerta automático se fechamento não realizado até 4h da manhã.

9\. Zero erros de tipo no monorepo.

# **Estado Atual (\~10%)**

O model DailyReport existe no schema, o model HourlyRevenue existe, e há um esqueleto de API no módulo de relatórios. Porém, nenhum dado é populado e nenhuma lógica de consolidação existe.

| Feature | Estado Atual | PRD-07 Adiciona |
| :---- | :---- | :---- |
| DailyReport model | Existe no schema | População real com dados consolidados |
| HourlyRevenue model | Existe no schema | População por hora com faturamento real |
| Fechamento do dia | Não existe | Procedimento completo com verificações e reconciliação |
| Reconciliação financeira | Não existe | Cruzamento pagamentos vs. contas vs. notas |
| Dashboard do dono | Placeholder vazio | KPIs reais, gráficos, comparativos |
| Exportação CSV/PDF | Não existe | Geração de arquivos para contador |
| Reabertura | Não existe | Reabrir com motivo \+ auditoria |
| CashRegister no fechamento | Parcial (PRD-02 fecha caixa) | Integração: todos os caixas devem estar fechados antes do dia |

# **Arquitetura**

## **Fluxo de Fechamento do Dia**

┌───────────┐  
│   Dono    │  clica "Fechar Dia"  
└────┬──────┘  
     │  
     ▼  
┌──────────────────────────────┐  
│ 1\. PRE-FLIGHT CHECKS          │  
│                                │  
│ a) Checks abertos?            │  \-\> Warning: "3 contas abertas"  
│ b) Pagamentos pendentes?       │  \-\> Warning: "2 PIX aguardando"  
│ c) Caixas abertos?             │  \-\> BLOCK: "Feche todos os caixas"  
│ d) Notas com erro?             │  \-\> Warning: "1 nota rejeitada"  
└──────────────┬───────────────┘  
               │  
               ▼  
┌──────────────────────────────┐  
│ 2\. CONSOLIDACAO                │  
│                                │  
│ \- Vendas brutas (total items)  │  
│ \- Taxas de servico             │  
│ \- Gorjetas                     │  
│ \- Descontos concedidos         │  
│ \- Cancelamentos                │  
│ \- Cortesias e consumo interno  │  
│ \- Faturamento liquido          │  
└──────────────┬───────────────┘  
               │  
               ▼  
┌──────────────────────────────┐  
│ 3\. RECONCILIACAO               │  
│                                │  
│ \- Pagamentos vs. Contas        │  
│ \- Notas emitidas vs. Checks    │  
│ \- Caixa: esperado vs. real     │  
└──────────────┬───────────────┘  
               │  
               ▼  
┌──────────────────────────────┐  
│ 4\. GERAR DailyReport           │  
│    (registro imutavel do dia)   │  
│                                │  
│ \+ HourlyRevenue por hora       │  
└──────────────┬───────────────┘  
               │  
               ▼  
┌──────────────────────────────┐  
│ 5\. DASHBOARD atualiza          │  
│    KPIs do dia \+ comparativo    │  
└──────────────────────────────┘

# **Conceitos Financeiros**

Antes da especificação técnica, é essencial definir a terminologia financeira usada no OASYS. Essa terminologia está alinhada com o modelo brasileiro de gestão de restaurantes.

| Conceito | Definição | Cálculo |
| :---- | :---- | :---- |
| Faturamento Bruto | Total de itens consumidos (preço x quantidade) | SUM(OrderItem.price \* OrderItem.quantity) de todos os Checks PAID |
| Taxa de Serviço | Gorjeta sugerida pelo estabelecimento | SUM(Check.serviceFeeAmount) dos Checks PAID |
| Gorjetas Extras | Gorjeta voluntária além da taxa de serviço | SUM(Check.tipAmount) dos Checks PAID |
| Descontos | Valor total de descontos concedidos | SUM(Check.discountAmount) dos Checks PAID |
| Cancelamentos | Valor de pedidos cancelados (não produzidos) | SUM de OrderItems de Orders com status CANCELLED |
| Cortesias | Itens produzidos mas não cobrados | SUM de OrderItems marcados como cortesia |
| Consumo Interno | Refeições de funcionários | SUM de OrderItems marcados como consumo interno |
| Faturamento Líquido | Receita efetiva de vendas | Faturamento Bruto \- Descontos \- Cancelamentos |
| Recebimentos | Total efetivamente recebido | SUM(Payment.amount WHERE status=CONFIRMED) |
| Ticket Médio | Valor médio por conta fechada | Faturamento Líquido / número de Checks PAID |

## **Distinção Crítica: Faturamento vs. Recebimentos**

Faturamento é o que foi vendido. Recebimentos é o que foi pago. Normalmente são iguais, mas divergem quando: (a) contas ficaram abertas (vendeu mas não recebeu); (b) pagamentos pendentes (PIX não confirmou); (c) estornos (recebeu mas devolveu). A reconciliação identifica e explica essas diferenças.

# **Especificação de API — Endpoints**

Todos os endpoints requerem JWT e role MANAGER ou OWNER. Isolamento por unitId. Prefixo: /api/v1.

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /closing/preflight | MANAGER, OWNER | Verificações pré-fechamento: checks abertos, caixas, pendentes |
| POST | /closing/execute | OWNER | Executar fechamento do dia (gera DailyReport) |
| POST | /closing/:id/reopen | OWNER | Reabrir fechamento com motivo obrigatório |
| GET | /closing/current | MANAGER, OWNER | Dados consolidados do dia atual (mesmo sem fechar) |
| GET | /closing/history | MANAGER, OWNER | Histórico de fechamentos (filtro por período) |
| GET | /closing/:id | MANAGER, OWNER | Detalhe completo de um fechamento específico |
| GET | /closing/:id/export/csv | MANAGER, OWNER | Exportar fechamento em CSV |
| GET | /closing/:id/export/pdf | MANAGER, OWNER | Exportar fechamento em PDF |
| GET | /dashboard/today | MANAGER, OWNER | KPIs em tempo real do dia (antes do fechamento) |
| GET | /dashboard/comparison | MANAGER, OWNER | Comparativo com dia anterior (mesmo dia da semana) |

# **Pre-flight Checks (POST /closing/preflight)**

Antes de fechar o dia, o sistema verifica pendências. Retorna warnings (continuar possível) e blockers (não permite fechar). O dono vê o resultado e decide se prossegue ou resolve antes.

### **Response (200)**

{  
  "canClose": false,  
  "blockers": \[  
    {  
      "type": "CASH\_REGISTERS\_OPEN",  
      "message": "2 caixas ainda abertos. Feche todos os caixas antes.",  
      "details": \[  
        { "id": "clx3a...", "operator": "Lucia Ferreira", "openSince": "17:00" },  
        { "id": "clx3b...", "operator": "DIGITAL", "openSince": "00:00" }  
      \]  
    }  
  \],  
  "warnings": \[  
    {  
      "type": "OPEN\_CHECKS",  
      "message": "3 contas ainda abertas. Serao incluidas como pendentes.",  
      "count": 3,  
      "totalAmount": 342.80,  
      "details": \[  
        { "id": "clx1...", "table": "Mesa 5", "amount": 128.50 },  
        { "id": "clx2...", "table": "Mesa 12", "amount": 95.30 },  
        { "id": "clx3...", "table": "Balcao", "amount": 119.00 }  
      \]  
    },  
    {  
      "type": "PENDING\_PAYMENTS",  
      "message": "2 pagamentos PIX aguardando confirmacao.",  
      "count": 2,  
      "totalAmount": 156.40  
    },  
    {  
      "type": "FISCAL\_ERRORS",  
      "message": "1 nota fiscal rejeitada pelo SEFAZ.",  
      "count": 1  
    }  
  \],  
  "summary": {  
    "totalChecks": 47,  
    "paidChecks": 44,  
    "openChecks": 3,  
    "totalCashRegisters": 2,  
    "openCashRegisters": 2,  
    "closedCashRegisters": 0,  
    "pendingPayments": 2,  
    "fiscalErrors": 1  
  }  
}

### **Regras de Pre-flight**

| Verificação | Tipo | Condição | Consequência |
| :---- | :---- | :---- | :---- |
| Caixas abertos | BLOCKER | Qualquer CashRegister com status OPEN | Não permite fechar. Dono deve fechar todos os caixas. |
| Checks abertos | WARNING | Checks com status OPEN | Permite fechar. Checks ficam como "pendentes" no relatório. |
| Pagamentos pendentes | WARNING | Payments com status PENDING | Permite fechar. Pagamentos serão reconciliados no próximo dia. |
| Notas fiscais com erro | WARNING | FiscalNotes com status ERROR ou REJECTED | Permite fechar. Listadas como divergências no relatório. |
| Dia já fechado | BLOCKER | DailyReport já existe para esta data | Não permite fechar. Deve reabrir primeiro. |

# **Execução do Fechamento (POST /closing/execute)**

O endpoint principal que consolida o dia e gera o DailyReport. Só o OWNER pode executar. Deve ter passado pelo preflight (todos os blockers resolvidos).

### **Request Body**

const ExecuteClosingSchema \= z.object({  
  date: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),  
  // Data do fechamento (YYYY-MM-DD). Normalmente hoje.  
  acknowledgeWarnings: z.boolean().default(false),  
  // true \= dono aceita fechar com warnings pendentes  
  closingNotes: z.string().max(1000).optional(),  
  // Observacoes do dono sobre o dia  
});

### **Response (201)**

{  
  "id": "clx7daily...",  
  "date": "2026-03-02",  
  "status": "CLOSED",

  "revenue": {  
    "grossRevenue": 13210.30,  
    "serviceFees": 1201.00,  
    "tips": 245.00,  
    "discounts": 180.00,  
    "cancellations": 285.50,  
    "courtesies": 77.30,  
    "staffMeals": 42.50,  
    "netRevenue": 12744.80  
  },

  "payments": {  
    "totalReceived": 13946.00,  
    "byMethod": {  
      "CASH": { "count": 18, "amount": 4250.00 },  
      "PIX": { "count": 15, "amount": 4120.50 },  
      "CARD": { "count": 12, "amount": 4477.00 },  
      "VOUCHER": { "count": 2, "amount": 363.80 },  
      "CARD\_PRESENT": { "count": 8, "amount": 734.70 }  
    },  
    "refunds": { "count": 1, "amount": 85.50 },  
    "pendingPayments": { "count": 2, "amount": 156.40 }  
  },

  "operations": {  
    "totalChecks": 47,  
    "paidChecks": 44,  
    "openChecks": 3,  
    "splitChecks": 6,  
    "mergedChecks": 2,  
    "totalOrders": 147,  
    "cancelledOrders": 3,  
    "avgTicket": 289.65,  
    "avgPrepTimeSeconds": 312,  
    "peakHour": "21:00",  
    "peakHourRevenue": 2847.50  
  },

  "cashRegisters": \[  
    {  
      "id": "clx3a...",  
      "operator": "Lucia Ferreira",  
      "type": "OPERATOR",  
      "openingBalance": 200.00,  
      "closingBalance": 1847.30,  
      "expectedBalance": 1852.50,  
      "difference": \-5.20,  
      "cashIn": 2152.50,  
      "withdrawals": 500.00,  
      "supplies": 0.00,  
      "transactionCount": 18  
    },  
    {  
      "id": "clx3b...",  
      "operator": "DIGITAL",  
      "type": "DIGITAL",  
      "totalProcessed": 9575.50,  
      "transactionCount": 37  
    }  
  \],

  "fiscal": {  
    "totalNotes": 45,  
    "authorized": 43,  
    "rejected": 1,  
    "errors": 1,  
    "cancelled": 2,  
    "missingNotes": 2,  
    "fiscalAmount": 12847.50,  
    "divergenceAmount": 362.80  
  },

  "reconciliation": {  
    "isBalanced": false,  
    "divergences": \[  
      {  
        "type": "CASH\_DIFFERENCE",  
        "description": "Diferenca de caixa operador: \-R$5,20",  
        "amount": \-5.20  
      },  
      {  
        "type": "FISCAL\_MISSING",  
        "description": "2 contas pagas sem nota fiscal emitida",  
        "amount": 362.80  
      },  
      {  
        "type": "PENDING\_PAYMENTS",  
        "description": "2 pagamentos PIX nao confirmados",  
        "amount": 156.40  
      }  
    \]  
  },

  "comparison": {  
    "previousDate": "2026-02-23",  
    "previousNetRevenue": 11850.40,  
    "revenueChange": 7.55,  
    "previousAvgTicket": 275.30,  
    "ticketChange": 5.21,  
    "previousTotalChecks": 43,  
    "checksChange": 9.30  
  },

  "closingNotes": "Dia bom. Pico forte as 21h por jogo do Brasil.",  
  "closedAt": "2026-03-03T02:45:00Z",  
  "closedBy": "clx0carlos..."  
}

# **Lógica de Consolidação**

## **executeClosing()**

async function executeClosing(  
  unitId: string,  
  date: string,  
  closedBy: string,  
  notes?: string,  
  prisma: PrismaClient  
): Promise\<DailyReport\> {

  const dayStart \= startOfDay(parseISO(date));  
  const dayEnd \= endOfDay(parseISO(date));

  // ── 1\. Verificar que nao existe fechamento para este dia ──  
  const existing \= await prisma.dailyReport.findFirst({  
    where: { unitId, date: dayStart },  
  });  
  if (existing) throw new ConflictError("Dia ja fechado.");

  // ── 2\. Consolidar vendas ──  
  const checks \= await prisma.check.findMany({  
    where: {  
      unitId,  
      OR: \[  
        { closedAt: { gte: dayStart, lte: dayEnd } },  
        { status: "PAID", updatedAt: { gte: dayStart, lte: dayEnd } },  
      \],  
    },  
    include: {  
      orders: { include: { items: true } },  
      payments: true,  
    },  
  });

  const revenue \= calculateRevenue(checks);

  // ── 3\. Consolidar pagamentos ──  
  const payments \= await prisma.payment.findMany({  
    where: {  
      check: { unitId },  
      createdAt: { gte: dayStart, lte: dayEnd },  
    },  
  });  
  const paymentSummary \= calculatePaymentSummary(payments);

  // ── 4\. Consolidar caixas ──  
  const cashRegisters \= await prisma.cashRegister.findMany({  
    where: {  
      unitId,  
      openedAt: { gte: dayStart, lte: dayEnd },  
    },  
    include: { operations: true, payments: true },  
  });  
  const cashSummary \= calculateCashSummary(cashRegisters);

  // ── 5\. Consolidar fiscal ──  
  const fiscalNotes \= await prisma.fiscalNote.findMany({  
    where: { unitId, createdAt: { gte: dayStart, lte: dayEnd } },  
  });  
  const fiscalSummary \= calculateFiscalSummary(fiscalNotes, checks);

  // ── 6\. Reconciliacao ──  
  const reconciliation \= reconcile(revenue, paymentSummary, cashSummary, fiscalSummary);

  // ── 7\. Faturamento por hora ──  
  const hourlyData \= calculateHourlyRevenue(checks);

  // ── 8\. Comparativo ──  
  const comparison \= await calculateComparison(unitId, date, revenue, prisma);

  // ── 9\. Operacoes ──  
  const operations \= calculateOperations(checks);

  // ── 10\. Persistir em transacao ──  
  return prisma.$transaction(async (tx) \=\> {  
    const report \= await tx.dailyReport.create({  
      data: {  
        unitId,  
        date: dayStart,  
        // ... todos os campos consolidados  
        closedBy,  
        closedAt: new Date(),  
        closingNotes: notes,  
        rawData: JSON.stringify({  
          revenue, paymentSummary, cashSummary,  
          fiscalSummary, reconciliation, operations, comparison,  
        }),  
      },  
    });

    // Criar HourlyRevenue records  
    for (const hourData of hourlyData) {  
      await tx.hourlyRevenue.create({  
        data: { dailyReportId: report.id, unitId, ...hourData },  
      });  
    }

    return report;  
  });  
}

## **calculateRevenue()**

function calculateRevenue(checks: CheckWithRelations\[\]): Revenue {  
  const paidChecks \= checks.filter(c \=\> c.status \=== "PAID");

  const grossRevenue \= paidChecks.reduce((sum, check) \=\>  
    sum \+ check.orders  
      .filter(o \=\> o.status \!== "CANCELLED" && \!o.isCortesia && \!o.isStaffMeal)  
      .reduce((s, o) \=\> s \+ o.items.reduce((si, i) \=\> si \+ i.price \* i.quantity, 0), 0\)  
  , 0);

  const serviceFees \= paidChecks.reduce((s, c) \=\> s \+ (c.serviceFeeAmount || 0), 0);  
  const tips \= paidChecks.reduce((s, c) \=\> s \+ (c.tipAmount || 0), 0);  
  const discounts \= paidChecks.reduce((s, c) \=\> s \+ (c.discountAmount || 0), 0);

  const cancelledOrders \= checks.flatMap(c \=\> c.orders).filter(o \=\> o.status \=== "CANCELLED");  
  const cancellations \= cancelledOrders.reduce((s, o) \=\>  
    s \+ o.items.reduce((si, i) \=\> si \+ i.price \* i.quantity, 0), 0);

  const courtesyOrders \= checks.flatMap(c \=\> c.orders).filter(o \=\> o.isCortesia);  
  const courtesies \= courtesyOrders.reduce((s, o) \=\>  
    s \+ o.items.reduce((si, i) \=\> si \+ i.price \* i.quantity, 0), 0);

  const staffMealOrders \= checks.flatMap(c \=\> c.orders).filter(o \=\> o.isStaffMeal);  
  const staffMeals \= staffMealOrders.reduce((s, o) \=\>  
    s \+ o.items.reduce((si, i) \=\> si \+ i.price \* i.quantity, 0), 0);

  const netRevenue \= grossRevenue \- discounts;

  return {  
    grossRevenue, serviceFees, tips, discounts,  
    cancellations, courtesies, staffMeals, netRevenue,  
  };  
}

## **reconcile()**

function reconcile(  
  revenue: Revenue,  
  payments: PaymentSummary,  
  cash: CashSummary,  
  fiscal: FiscalSummary  
): Reconciliation {  
  const divergences: Divergence\[\] \= \[\];

  // 1\. Diferenca de caixa fisico  
  for (const register of cash.registers) {  
    if (register.type \=== "OPERATOR" && register.difference \!== 0\) {  
      divergences.push({  
        type: "CASH\_DIFFERENCE",  
        description: \`Diferenca caixa ${register.operator}: R$${register.difference.toFixed(2)}\`,  
        amount: register.difference,  
      });  
    }  
  }

  // 2\. Notas fiscais faltando  
  if (fiscal.missingNotes \> 0\) {  
    divergences.push({  
      type: "FISCAL\_MISSING",  
      description: \`${fiscal.missingNotes} contas pagas sem nota fiscal\`,  
      amount: fiscal.divergenceAmount,  
    });  
  }

  // 3\. Pagamentos pendentes  
  if (payments.pending.count \> 0\) {  
    divergences.push({  
      type: "PENDING\_PAYMENTS",  
      description: \`${payments.pending.count} pagamentos nao confirmados\`,  
      amount: payments.pending.amount,  
    });  
  }

  // 4\. Recebiveis vs Faturamento  
  const receivableDiff \= payments.totalConfirmed \- (revenue.netRevenue \+ revenue.serviceFees \+ revenue.tips);  
  if (Math.abs(receivableDiff) \> 0.50) {  
    divergences.push({  
      type: "REVENUE\_PAYMENT\_MISMATCH",  
      description: \`Diferenca entre recebimentos e faturamento: R$${receivableDiff.toFixed(2)}\`,  
      amount: receivableDiff,  
    });  
  }

  return {  
    isBalanced: divergences.length \=== 0,  
    divergences,  
  };  
}

# **Comparativo com Dia Anterior**

O comparativo compara o dia atual com o mesmo dia da semana anterior (ex: segunda com segunda passada). Isso é mais relevante que comparar com o dia imediatamente anterior, porque o fluxo de bares varia drasticamente entre dias da semana.

async function calculateComparison(  
  unitId: string,  
  currentDate: string,  
  currentRevenue: Revenue,  
  prisma: PrismaClient  
): Promise\<Comparison | null\> {

  // Mesmo dia da semana, semana anterior  
  const previousDate \= subDays(parseISO(currentDate), 7);

  const previousReport \= await prisma.dailyReport.findFirst({  
    where: { unitId, date: startOfDay(previousDate) },  
  });

  if (\!previousReport) return null;

  const prev \= JSON.parse(previousReport.rawData);

  return {  
    previousDate: format(previousDate, "yyyy-MM-dd"),  
    previousNetRevenue: prev.revenue.netRevenue,  
    revenueChange: percentChange(prev.revenue.netRevenue, currentRevenue.netRevenue),  
    previousAvgTicket: prev.operations.avgTicket,  
    ticketChange: percentChange(prev.operations.avgTicket, currentRevenue.netRevenue / currentChecks),  
    previousTotalChecks: prev.operations.totalChecks,  
    checksChange: percentChange(prev.operations.totalChecks, currentChecks),  
  };  
}

function percentChange(prev: number, curr: number): number {  
  if (prev \=== 0\) return curr \> 0 ? 100 : 0;  
  return ((curr \- prev) / prev) \* 100;  
}

# **Reabertura (POST /closing/:id/reopen)**

Reabrir um fechamento já concluído. Caso de uso: dono percebeu erro, esqueceu de fechar um caixa, pagamento atrasado confirmou. Operação rara mas necessária.

### **Request Body**

const ReopenClosingSchema \= z.object({  
  reason: z.string().min(10).max(500),  
  // Motivo obrigatorio. Registrado no AuditLog.  
});

// Exemplo:  
{ "reason": "Pagamento PIX da mesa 12 confirmou apos fechamento. Necessario reconsolidar." }

### **Regras de Negócio**

R1. Somente OWNER pode reabrir (operação de alto impacto).

R2. Não deletar o DailyReport original. Marcar como REOPENED com timestamp e motivo.

R3. Registrar no AuditLog: quem reabriu, motivo, data original, data de reabertura.

R4. Dono deve executar novo fechamento após resolver as pendências.

R5. Máximo 3 reaberturas por dia (evitar abuso). Retornar 429 se exceder.

# **Dashboard Básico do Dono**

O dashboard é a primeira tela que o dono vê ao abrir o web-owner. Mostra KPIs do dia em tempo real (antes de fechar) e o resultado do fechamento (após fechar). Mobile-first — dono consulta no celular.

## **GET /dashboard/today**

KPIs em tempo real, calculados on-the-fly. Usado antes do fechamento para acompanhar o dia.

### **Response (200)**

{  
  "date": "2026-03-02",  
  "isClosed": false,  
  "lastUpdated": "2026-03-02T22:30:00Z",

  "kpis": {  
    "netRevenue": 12744.80,  
    "avgTicket": 289.65,  
    "totalChecks": 47,  
    "paidChecks": 44,  
    "openChecks": 3,  
    "cancellationRate": 2.04,  // % de pedidos cancelados  
    "avgPrepTime": "5m12s",  
    "serviceFeeTotal": 1201.00  
  },

  "hourlyRevenue": \[  
    { "hour": "17:00", "revenue": 847.50, "checks": 5 },  
    { "hour": "18:00", "revenue": 1230.00, "checks": 8 },  
    { "hour": "19:00", "revenue": 1945.30, "checks": 12 },  
    { "hour": "20:00", "revenue": 2610.00, "checks": 15 },  
    { "hour": "21:00", "revenue": 2847.50, "checks": 18 },  
    { "hour": "22:00", "revenue": 2134.50, "checks": 14 }  
  \],

  "topProducts": \[  
    { "name": "Chopp Pilsen 300ml", "quantity": 87, "revenue": 1122.30 },  
    { "name": "Caipirinha Limao", "quantity": 34, "revenue": 778.60 },  
    { "name": "Porcao de Fritas", "quantity": 28, "revenue": 809.20 },  
    { "name": "IPA Artesanal 300ml", "quantity": 22, "revenue": 371.80 },  
    { "name": "Gin Tonica", "quantity": 19, "revenue": 549.10 }  
  \],

  "paymentBreakdown": {  
    "CASH": { "count": 18, "amount": 4250.00, "percentage": 30.5 },  
    "PIX": { "count": 15, "amount": 4120.50, "percentage": 29.6 },  
    "CARD": { "count": 12, "amount": 4477.00, "percentage": 32.1 },  
    "VOUCHER": { "count": 2, "amount": 363.80, "percentage": 2.6 },  
    "CARD\_PRESENT": { "count": 8, "amount": 734.70, "percentage": 5.3 }  
  },

  "alerts": \[  
    { "type": "STOCK\_LOW", "message": "Chopp Pilsen abaixo do minimo (18L restantes)" },  
    { "type": "CASH\_OPEN\_LONG", "message": "Caixa da Lucia aberto ha 7h" }  
  \]  
}

# **UI — Dashboard do Dono**

┌─────────────────────────────────────────────────────────┐  
│  ☰ OASYS          Boteco do Ze          02/03  │  
├─────────────────────────────────────────────────────────┤  
│                                                         │  
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │  
│  │ Faturamento │ │ Ticket Med. │ │   Contas    │  │  
│  │ R$ 12.744   │ │  R$ 289,65 │ │    44/47    │  │  
│  │   ▲ 7,6%    │ │   ▲ 5,2%   │ │   ▲ 9,3%   │  │  
│  └─────────────┘ └─────────────┘ └─────────────┘  │  
│                                                         │  
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │  
│  │ Cancel. 3  │ │ Cortesias  │ │ Serv. Fee  │  │  
│  │ R$ 285,50  │ │  R$ 77,30  │ │ R$ 1.201   │  │  
│  │  2,04%     │ │            │ │            │  │  
│  └─────────────┘ └─────────────┘ └─────────────┘  │  
│                                                         │  
├─────────────────────────────────────────────────────────┤  
│  Faturamento por Hora                                   │  
│                                                         │  
│  3k|          ██                                       │  
│    |       ██ ██ ██                                    │  
│  2k|    ██ ██ ██ ██                                    │  
│    | ██ ██ ██ ██ ██                                    │  
│  1k| ██ ██ ██ ██ ██                                    │  
│    \+────────────────────                                  │  
│     17  18  19  20  21  22                               │  
│  ── Hoje   \--- Semana passada                            │  
│                                                         │  
├─────────────────────────────────────────────────────────┤  
│  Pagamentos         Top Produtos                        │  
│  PIX   29.6%        1\. Chopp 300ml  (87x)               │  
│  Card  32.1%        2\. Caipirinha   (34x)               │  
│  Cash  30.5%        3\. Fritas       (28x)               │  
│  Vouc   2.6%        4\. IPA 300ml    (22x)               │  
│  Pres   5.3%        5\. Gin Tonica   (19x)               │  
│                                                         │  
├─────────────────────────────────────────────────────────┤  
│           \[🔒 FECHAR DIA\]                               │  
└─────────────────────────────────────────────────────────┘

# **Exportação CSV e PDF**

## **GET /closing/:id/export/csv**

Gera CSV com os dados consolidados do fechamento. Formato compatível com Excel e Google Sheets. Encoding UTF-8 com BOM para caracteres acentuados.

### **Estrutura do CSV**

// Header do arquivo:  
// Fechamento\_BotecoDoZe\_2026-03-02.csv

// Secao 1: Resumo  
Indicador,Valor  
Data,2026-03-02  
Faturamento Bruto,"R$ 13.210,30"  
Taxa de Servico,"R$ 1.201,00"  
Descontos,"R$ 180,00"  
Cancelamentos,"R$ 285,50"  
Cortesias,"R$ 77,30"  
Consumo Interno,"R$ 42,50"  
Faturamento Liquido,"R$ 12.744,80"  
Ticket Medio,"R$ 289,65"  
Total Contas,47

// Secao 2: Pagamentos  
Metodo,Quantidade,Valor  
Dinheiro,18,"R$ 4.250,00"  
PIX,15,"R$ 4.120,50"  
Cartao,12,"R$ 4.477,00"  
Voucher,2,"R$ 363,80"  
Presencial,8,"R$ 734,70"

// Secao 3: Faturamento por Hora  
Hora,Faturamento,Contas  
17:00,"R$ 847,50",5  
18:00,"R$ 1.230,00",8  
...

## **GET /closing/:id/export/pdf**

Gera PDF formatado para impressão ou envio ao contador. Inclui logo do estabelecimento (se configurado), cabeçalho com dados do CNPJ, e todas as seções do relatório. Gerado com bibliotecas como pdfkit ou puppeteer.

O PDF inclui: cabeçalho com dados da empresa (razão social, CNPJ, endereço), resumo financeiro (mesmos dados do CSV), detalhamento de pagamentos por método, faturamento por hora (tabela), lista de divergências, resumo de caixas, e assinatura digital (data/hora de geração \+ usuário que fechou).

# **Componentes React (apps/web-owner)**

| Componente | Arquivo | Status | Responsabilidade |
| :---- | :---- | :---- | :---- |
| Dashboard | pages/Dashboard.tsx | Novo | Tela principal: KPIs, gráficos, alertas, botão fechar dia |
| KPICard | components/KPICard.tsx | Novo | Card com valor, label, variação percentual, ícone |
| HourlyChart | components/HourlyChart.tsx | Novo | Gráfico de barras: faturamento por hora com comparativo |
| TopProductsList | components/TopProductsList.tsx | Novo | Ranking de produtos mais vendidos do dia |
| PaymentBreakdown | components/PaymentBreakdown.tsx | Novo | Donut chart ou barras com breakdown por método |
| ClosingWizard | pages/ClosingWizard.tsx | Novo | Wizard: preflight → review → confirm → result |
| PreflightStep | components/PreflightStep.tsx | Novo | Exibe blockers e warnings do preflight |
| ClosingResult | components/ClosingResult.tsx | Novo | Resultado do fechamento com reconciliação |
| DivergenceList | components/DivergenceList.tsx | Novo | Lista de divergências com tipo, descrição, valor |
| ClosingHistory | pages/ClosingHistory.tsx | Novo | Histórico de fechamentos com filtro por período |
| AlertBanner | components/AlertBanner.tsx | Novo | Banner de alertas no topo do dashboard |

# **Estrutura de Arquivos**

## **Backend — apps/api**

apps/api/src/modules/closing/  
├── closing.routes.ts           \# Registro de rotas  
├── closing.service.ts          \# Orquestracao: preflight, execute, reopen  
├── closing.schemas.ts          \# Schemas Zod  
├── consolidation.ts            \# calculateRevenue, calculatePaymentSummary, etc.  
├── reconciliation.ts           \# reconcile() \+ divergence detection  
├── comparison.ts               \# calculateComparison() com dia da semana anterior  
├── export-csv.ts               \# Geracao de CSV  
├── export-pdf.ts               \# Geracao de PDF  
└── \_\_tests\_\_/  
    ├── closing.test.ts           \# Testes unitarios  
    ├── consolidation.test.ts     \# Testes de calculo  
    └── reconciliation.test.ts    \# Testes de reconciliacao

apps/api/src/modules/dashboard/  
├── dashboard.routes.ts         \# Rotas do dashboard  
├── dashboard.service.ts        \# KPIs em tempo real  
└── dashboard.schemas.ts        \# Schemas

## **Frontend — apps/web-owner**

apps/web-owner/src/  
├── pages/  
│   ├── Dashboard.tsx             \# Tela principal com KPIs  
│   ├── ClosingWizard.tsx         \# Wizard de fechamento  
│   └── ClosingHistory.tsx        \# Historico de fechamentos  
├── components/  
│   ├── KPICard.tsx  
│   ├── HourlyChart.tsx  
│   ├── TopProductsList.tsx  
│   ├── PaymentBreakdown.tsx  
│   ├── PreflightStep.tsx  
│   ├── ClosingResult.tsx  
│   ├── DivergenceList.tsx  
│   └── AlertBanner.tsx  
└── stores/  
    └── dashboard.store.ts        \# KPIs \+ auto-refresh

# **Tratamento de Erros e Edge Cases**

| Cenário | Comportamento Esperado | HTTP |
| :---- | :---- | :---- |
| Fechar com caixas abertos | BLOCKER: "Feche todos os caixas antes." Não permite. | 400 |
| Fechar dia já fechado | BLOCKER: "Dia já fechado. Use reabrir." | 409 |
| Fechar com checks abertos | WARNING: lista checks. Permite com acknowledgeWarnings=true. | 200 |
| Fechar com pagamentos pendentes | WARNING: lista pendentes. Permite com acknowledge. | 200 |
| Fechar dia futuro | 400: "Não pode fechar dia que ainda não aconteceu." | 400 |
| Reabrir mais de 3 vezes | 429: "Máximo de 3 reaberturas por dia." | 429 |
| Reabrir sem motivo | Validação Zod rejeita (mín. 10 chars) | 400 |
| Dashboard sem dados (primeiro dia) | Retorna KPIs zerados. Comparativo \= null. | 200 |
| Exportar fechamento inexistente | 404: "Fechamento não encontrado." | 404 |
| Cortesia total (nenhum item cobrado) | Faturamento \= 0\. Report gerado normalmente. | N/A |
| Dia sem nenhuma venda | Report gerado com zeros. Comparativo mostra queda. | N/A |
| Timezone: operou até 2h da manhã | Dia operacional \= 17:00 dia X até 05:00 dia X+1. Configurável. | N/A |
| Dois owners tentam fechar simultaneamente | Prisma transaction. Segundo recebe 409\. | 409 |

### **Dia Operacional vs. Dia Calendário**

Bares operam além da meia-noite. O "dia" de 02/03 pode incluir operações até 05:00 de 03/03. O sistema usa o conceito de "dia operacional": início \= Unit.operatingHoursStart do dia, fim \= Unit.operatingHoursEnd (que pode ser do dia seguinte se \< start). Se operatingHoursEnd \= "02:00" e operatingHoursStart \= "17:00", então o dia operacional de 02/03 vai de 02/03 17:00 até 03/03 05:00 (com margem de 3h após fechamento declarado).

# **Estratégia de Testes**

## **Cenários de Teste — Backend**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Preflight — caixa aberto bloqueia | Unit | canClose \= false com blocker CASH\_REGISTERS\_OPEN |
| Preflight — checks abertos warning | Unit | canClose \= true com warning OPEN\_CHECKS |
| Preflight — dia limpo | Unit | canClose \= true, zero blockers, zero warnings |
| Execute — consolidação correta | Integration | grossRevenue, netRevenue, todos os totais calculados corretamente |
| Execute — pagamentos por método | Integration | Breakdown CASH/PIX/CARD/VOUCHER correto |
| Execute — reconciliação detecta divergência | Integration | Caixa com diferenca \+ nota faltando \= 2 divergences |
| Execute — reconciliação balanced | Unit | isBalanced \= true quando tudo bate |
| Execute — HourlyRevenue populado | Integration | Um registro por hora com faturamento correto |
| Execute — comparativo com semana anterior | Integration | Compara com mesmo dia da semana, calcula % |
| Execute — comparativo sem histórico | Unit | comparison \= null (primeiro dia) |
| Execute — dia já fechado | Unit | 409 ConflictError |
| Reopen — sucesso | Unit | Report marcado REOPENED, AuditLog criado |
| Reopen — excedeu limite | Unit | 429 após 3 reaberturas |
| Export CSV — formato correto | Unit | CSV gerado com BOM, separadores, valores formatados |
| Dashboard today — tempo real | Integration | KPIs calculados on-the-fly antes do fechamento |
| Dia operacional — opera até 2h | Integration | Vendas da madrugada incluidas no dia anterior |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-07**

| PRD | Módulo | Como Usa Fechamento |
| :---- | :---- | :---- |
| PRD-02 | Payments | CashRegister.close é pré-requisito para fechamento. Dados de caixa alimentam reconciliação. |
| PRD-06 | Fiscal | Relatório fiscal (notas emitidas vs. esperadas) integrado ao fechamento. |
| PRD-08 | Estoque | Movimentações de estoque do dia consolidadas no relatório (custo de mercadorias). |
| PRD-10 | Dashboard BI | DailyReport é a fonte de dados para analytics histórico. MoM, YoY, tendências. |
| PRD-12 | Pessoas | Fechamento inclui dados de performance por funcionário para comissões. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Dono esquece de fechar | Alta | Médio | Alert automático se não fechou até 4h. Lembrete via WhatsApp (PRD-09). |
| Fechamento com dados inconsistentes | Média | Alto | Preflight valida antes. Reconciliação identifica divergências. |
| Performance em dia com muitas operações | Baixa | Médio | Consolidação usa queries agregadas, não iteração. Índices adequados. |
| Timezone incorreto (madrugada) | Média | Alto | Conceito de dia operacional configurável por Unit. Testes explícitos. |
| Reaberturas abusivas | Baixa | Médio | Limite de 3 reaberturas. AuditLog obrigatório. Alert ao dono. |
| Export PDF lento | Média | Baixo | Geração assíncrona. Retorna URL de download quando pronto. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| DailyReport como snapshot imutável | Calcular sempre on-the-fly | Snapshot garante consistência histórica. Dados de meses atrás não mudam se schema mudar. |
| rawData como JSON no DailyReport | Campos individuais para cada métrica | JSON é flexível para adicionar métricas sem migration. Campos principais continuam tipados. |
| Comparativo com mesmo dia da semana | Comparar com dia imediatamente anterior | Fluxo de bar varia por dia da semana. Segunda vs. segunda é mais relevante que segunda vs. domingo. |
| Preflight separado de execute | Validar e fechar em um só endpoint | Dono precisa ver warnings antes de decidir. UX melhor em 2 passos. |
| Dashboard on-the-fly (não cached) | Redis cache com TTL | Volume de Phase 1 não justifica cache. Queries diretas são suficientes. |
| Caixas fechados como BLOCKER | Apenas warning | Fechar o dia sem fechar caixa gera inconsistência irrecuperável no esperado vs. realizado. |

# **Sequência de Implementação (2 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: Preflight \+ Execute closing \+ Consolidation \+ Reconciliation \+ Comparison \+ Reopen \+ Export CSV. Testes unitários e de integração. | Fechamento funcional via API. DailyReport populado. Reconciliação detecta divergências. CSV exportado. 16 testes passando. |
| Sprint 2 | Backend: Dashboard today \+ comparison endpoint \+ Export PDF \+ auto-close reminder job. Frontend: Dashboard (KPIs, gráficos, alertas), ClosingWizard, ClosingHistory. Testes E2E. | Dashboard funcional com KPIs em tempo real. Wizard de fechamento completo. Histórico navegável. PDF gerado. Alerta automático. |

OASYS PRD-07 — Fechamento & Relatórios  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*