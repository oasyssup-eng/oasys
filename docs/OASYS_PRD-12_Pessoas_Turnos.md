

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-12 — Pessoas & Turnos**  
Escalas, metas, comissões, bonificação, performance, gorjetas, ocorrências

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 2 — Growth & Scale |
| **Sprints Estimados** | 2 sprints |
| **Complexidade** | Média |
| **Cobertura Atual** | \~28% |
| **Dependências** | PRD-07 (Fechamento & Relatórios) |
| **Gap Modules** | M9 — Pessoas / Turnos |
| **Apps Afetadas** | apps/api \+ apps/web-owner \+ apps/web-waiter |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-12 (Pessoas & Turnos) transforma o Employee de uma entidade estática de autenticação (PIN \+ role) em um profissional gerenciável com metas, performance mensurável, comissões calculadas e escala de trabalho. Na Phase 1, o OASYS sabe que "João é garçom e fez login às 17h". Após PRD-12, o OASYS sabe que "João trabalha sex/sáb 17h-02h, vendeu R$4.200 hoje (87% da meta), tem comissão acumulada de R$168, recebeu R$320 em gorjetas e está no 2º lugar do ranking semanal".

A cobertura atual é \~28%: Employee existe com name, role, pin, unitId. Auth funciona com PIN \+ JWT \+ role-based access. EmployeeStats existe como model. O que falta é toda a gestão de turnos, metas, cálculo de comissão, distribuição de gorjetas, ranking, bonificação, ocorrências e a tela de performance no app do garçom.

A dependência de PRD-07 (Fechamento) é crítica: comissões são calculadas sobre vendas confirmadas (DailyReport). Sem fechamento, não há base auditada para pagar comissão. Metas precisam de dados históricos para ter significado.

Este PRD cobre seis subsistemas:

**1\. Escalas e Turnos —** Definição de escalas de trabalho por funcionário com dia da semana e horários. Check-in/check-out automático por PIN. Controle de horas trabalhadas. Visão de quem está trabalhando agora.

**2\. Metas por Funcionário —** Metas diárias, semanais e mensais de vendas, ticket médio, itens vendidos e cadastros de clientes. Configuráveis pelo dono por role ou por indivíduo.

**3\. Comissões —** Cálculo automático ao fechar Check: percentual sobre vendas do funcionário. Regras configuráveis: taxa base, bônus por meta batida, diferença por categoria de produto.

**4\. Gorjetas —** Distribuição de taxa de serviço (10%) entre funcionários. Modelos: individual (garçom da mesa), pooled (divisão igualitária), ou híbrido (% individual \+ % pool). Rastreamento preciso.

**5\. Ranking e Bonificação —** Ranking diário, semanal e mensal. Bonificação automática por meta batida ou posição no ranking. Gamificação para motivar equipe.

**6\. Ocorrências —** Registro formal de eventos: atrasos, faltas, advertências, elogios. Histórico no perfil do funcionário. Usado para decisões de gestão.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Models (Schema) | 5 | Schedule, ShiftLog, Goal, Commission, Occurrence |
| Models Modificados | 1 | EmployeeStats (expandir com métricas de performance) |
| Novos Enums | 3 | GoalType, GoalPeriod, OccurrenceType |
| Endpoints Novos | 18 | Escalas, metas, comissões, gorjetas, ranking, ocorrências |
| Serviços Novos | 4 | ScheduleService, GoalService, CommissionService, OccurrenceService |
| Componentes React (web-owner) | \~12 | Telas de gestão de pessoas |
| Componentes React (web-waiter) | \~4 | Tela de performance do garçom |

## **Critério de Sucesso (Done Definition)**

O PRD-12 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Dono define escalas de trabalho para cada funcionário com dias e horários.

2\. Check-in/check-out registrado automaticamente ao fazer login/logout no app do garçom.

3\. Metas configuráveis por funcionário ou por role (diária, semanal, mensal).

4\. Comissão calculada automaticamente ao fechar Check e consolidada no fechamento do dia.

5\. Gorjetas distribuídas conforme modelo configurado (individual, pooled, híbrido).

6\. Ranking de funcionários visível no web-owner (dono) e web-waiter (próprio garçom).

7\. Ocorrências registradas com histórico no perfil.

8\. Garçom vê próprio dashboard de performance no app: vendas, meta, ranking, comissão.

9\. Zero erros de tipo no monorepo.

# **Estado Atual (\~28%)**

| Feature | Estado Atual | PRD-12 Adiciona |
| :---- | :---- | :---- |
| Employee model | name, role, pin, unitId, cpf (PRD-01), email, phone, isActive, hiredAt | Campos de comissão e gorjeta já no model existente |
| Auth (PIN \+ JWT) | Funcional: login por PIN, JWT com role | Check-in/check-out automático no login |
| Roles | OWNER, MANAGER, WAITER, BARTENDER, CASHIER | Sem alteração. Metas configuráveis por role. |
| EmployeeStats | Model existe, parcialmente populado | Expandir com métricas de comissão e gorjeta |
| Zone assignment | Garçom vinculado a Zone (mesas) | Manter. Usado para distribuição de gorjetas. |
| Escalas de turno | Não existe | Schedule model completo |
| Metas | Não existe | Goal model configurável |
| Comissões | Não existe | Commission model com cálculo automático |
| Gorjetas | serviceFeeRate no Unit (PRD-01). tipAmount no Check. | Distribuição e rastreamento entre funcionários |
| Ranking | Não existe | Ranking com gamificação |
| Ocorrências | Não existe | Occurrence model |

# **Alterações no Schema**

Migration separada: prd12\_pessoas\_turnos. Todos os novos campos opcionais ou com default.

## **Novos Enums**

enum GoalType {  
  REVENUE         // Meta de receita (R$)  
  TICKET\_AVG      // Meta de ticket medio (R$)  
  ITEMS\_SOLD      // Meta de itens vendidos (quantidade)  
  CHECKS\_CLOSED   // Meta de contas fechadas  
  CUSTOMER\_SIGNUPS // Meta de cadastros de clientes (CRM)  
  UPSELL\_COUNT    // Meta de upsells aceitos  
}

enum GoalPeriod {  
  DAILY  
  WEEKLY  
  MONTHLY  
}

enum OccurrenceType {  
  LATE\_ARRIVAL    // Atraso  
  ABSENCE         // Falta  
  EARLY\_LEAVE     // Saiu antes do fim do turno  
  WARNING         // Advertencia  
  PRAISE          // Elogio  
  COMPLAINT       // Reclamacao de cliente  
  OTHER           // Outro  
}

## **Novo Model: Schedule**

Define o horário de trabalho planejado de cada funcionário. Uma entrada por dia da semana por funcionário. Quando funcionário não trabalha naquele dia, não existe registro.

model Schedule {  
  id          String    @id @default(cuid())  
  employeeId  String  
  employee    Employee  @relation(fields: \[employeeId\], references: \[id\])  
  unitId      String  
  unit        Unit      @relation(fields: \[unitId\], references: \[id\])  
  dayOfWeek   Int       // 0=Dom, 1=Seg ... 6=Sab  
  startTime   String    // HH:mm (ex: "17:00")  
  endTime     String    // HH:mm (ex: "02:00") \- pode cruzar meia-noite  
  isActive    Boolean   @default(true)  
  createdAt   DateTime  @default(now())  
  updatedAt   DateTime  @updatedAt

  @@unique(\[employeeId, dayOfWeek\])  
  @@index(\[unitId, dayOfWeek\])  
}

## **Novo Model: ShiftLog**

Registro real de ponto: quando o funcionário efetivamente fez check-in e check-out. Permite comparar planejado (Schedule) vs. realizado (ShiftLog).

model ShiftLog {  
  id            String    @id @default(cuid())  
  employeeId    String  
  employee      Employee  @relation(fields: \[employeeId\], references: \[id\])  
  unitId        String  
  unit          Unit      @relation(fields: \[unitId\], references: \[id\])  
  date          DateTime  // Data do turno (dia)  
  scheduledStart String?  // HH:mm planejado (do Schedule)  
  scheduledEnd   String?  // HH:mm planejado  
  actualStart   DateTime  // Hora real do check-in  
  actualEnd     DateTime? // Hora real do check-out (null \= ainda trabalhando)  
  hoursWorked   Decimal?  @db.Decimal(5, 2\)  // Horas efetivas (calculado no check-out)  
  isLate        Boolean   @default(false)     // Chegou atrasado (auto)  
  lateMinutes   Int?      // Minutos de atraso  
  isEarlyLeave  Boolean   @default(false)     // Saiu antes  
  notes         String?  
  createdAt     DateTime  @default(now())

  @@index(\[employeeId, date\])  
  @@index(\[unitId, date\])  
}

## **Novo Model: Goal**

Meta definida pelo dono. Pode ser genérica por role (todos os garçons) ou específica por funcionário.

model Goal {  
  id            String      @id @default(cuid())  
  unitId        String  
  unit          Unit        @relation(fields: \[unitId\], references: \[id\])  
  employeeId    String?     // null \= aplica a todos do targetRole  
  employee      Employee?   @relation(fields: \[employeeId\], references: \[id\])  
  targetRole    String?     // WAITER, BARTENDER, etc. (se employeeId null)  
  type          GoalType  
  period        GoalPeriod  
  targetValue   Decimal     @db.Decimal(10, 2\)  // Valor da meta  
  bonusAmount   Decimal?    @db.Decimal(10, 2\)  // Bonus ao atingir (R$)  
  bonusPercentage Decimal?  @db.Decimal(5, 2\)   // Bonus ao atingir (% extra)  
  isActive      Boolean     @default(true)  
  createdAt     DateTime    @default(now())  
  updatedAt     DateTime    @updatedAt

  @@index(\[unitId, isActive\])  
}

## **Novo Model: Commission**

Registro individual de comissão gerada por cada Check fechado por um funcionário. Permite rastreabilidade completa: quanto veio de cada conta.

model Commission {  
  id            String    @id @default(cuid())  
  employeeId    String  
  employee      Employee  @relation(fields: \[employeeId\], references: \[id\])  
  unitId        String  
  unit          Unit      @relation(fields: \[unitId\], references: \[id\])  
  checkId       String  
  check         Check     @relation(fields: \[checkId\], references: \[id\])  
  baseAmount    Decimal   @db.Decimal(10, 2\)  // Valor base da comissao  
  bonusAmount   Decimal   @default(0) @db.Decimal(10, 2\)  // Bonus adicional  
  totalAmount   Decimal   @db.Decimal(10, 2\)  // base \+ bonus  
  rate          Decimal   @db.Decimal(5, 4\)   // Taxa aplicada (ex: 0.04 \= 4%)  
  salesAmount   Decimal   @db.Decimal(10, 2\)  // Valor de vendas base para calculo  
  isPaid        Boolean   @default(false)     // Se ja foi pago ao funcionario  
  paidAt        DateTime?  
  createdAt     DateTime  @default(now())

  @@index(\[employeeId, createdAt\])  
  @@index(\[unitId, isPaid\])  
}

## **Novo Model: Occurrence**

model Occurrence {  
  id            String          @id @default(cuid())  
  employeeId    String  
  employee      Employee        @relation(fields: \[employeeId\], references: \[id\])  
  unitId        String  
  unit          Unit            @relation(fields: \[unitId\], references: \[id\])  
  type          OccurrenceType  
  description   String  
  date          DateTime        // Data da ocorrencia  
  severity      String          @default("MEDIUM")  // LOW, MEDIUM, HIGH  
  registeredBy  String          // Employee.id de quem registrou  
  acknowledged  Boolean         @default(false)  // Funcionario tomou ciencia  
  acknowledgedAt DateTime?  
  createdAt     DateTime        @default(now())

  @@index(\[employeeId, date\])  
}

# **Escalas e Turnos**

## **Definição de Escala**

O dono ou gerente define a escala semanal de cada funcionário no web-owner. A escala é uma grade fixa: para cada dia da semana, o horário de início e fim. Bares operam com horários que cruzam meia-noite (ex: 17:00 → 02:00), o que precisa de tratamento especial.

### **Exemplo de Escala**

| Funcionário | Seg | Ter | Qua | Qui | Sex | Sáb | Dom |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| João (Garçom) | — | — | 17-02 | 17-02 | 17-02 | 17-02 | 17-02 |
| Ana (Garçom) | 17-02 | 17-02 | 17-02 | 17-02 | 17-02 | — | — |
| Pedro (Bartender) | — | 17-02 | 17-02 | 17-02 | 17-02 | 17-02 | — |
| Lucia (Caixa) | — | — | 17-00 | 17-00 | 17-02 | 17-02 | 17-00 |

Nota: —17-02” significa 17:00 até 02:00 do dia seguinte. O sistema calcula 9 horas de turno.

## **Check-in e Check-out Automático**

Quando o funcionário faz login pelo PIN no web-waiter ou web-kds, o sistema automaticamente cria um ShiftLog com actualStart \= now(). Quando faz logout (ou é deslogado por inatividade), registra actualEnd.

  Funcionario digita PIN no app  
           |  
  Auth valida PIN \+ gera JWT  
           |  
  Tem Schedule para hoje?  
     /           \\  
   SIM            NAO  
    |               |  
  Criar ShiftLog   Criar ShiftLog  
  com scheduled    sem scheduled  
  Start/End do     Start/End  
  Schedule         (extra/cobertura)  
    |               |  
  Verificar atraso:  
  actualStart \> scheduledStart \+ tolerancia?  
    /           \\  
  SIM            NAO  
   |              |  
  isLate=true    isLate=false  
  lateMinutes=X  
  Criar Occurrence  
  LATE\_ARRIVAL  
  automaticamente  
R1. Tolerância de atraso: configurável por Unit (default: 15 minutos). Atraso de 1-15min \= registrado mas sem ocorrência. Acima de 15min \= ocorrência automática.

R2. Check-out automático: se funcionário não fez logout até scheduledEnd \+ 1h, o sistema fecha o ShiftLog com actualEnd \= scheduledEnd (assume que esqueceu).

R3. Turno sem escala: funcionário que faz login sem Schedule para o dia é registrado como turno extra. Alert ao gerente: "João fez check-in fora da escala".

R4. Horas trabalhadas: calculadas como diffHours(actualStart, actualEnd). Arredondadas para 15 minutos.

# **Metas por Funcionário**

## **Tipos de Meta**

| Tipo | Métrica | Exemplo | Roles Aplicáveis |
| :---- | :---- | :---- | :---- |
| REVENUE | Receita líquida das contas do funcionário | R$ 5.000/dia | WAITER, BARTENDER |
| TICKET\_AVG | Ticket médio das contas | R$ 70/conta | WAITER |
| ITEMS\_SOLD | Quantidade de itens vendidos | 80 itens/dia | WAITER, BARTENDER |
| CHECKS\_CLOSED | Número de contas fechadas | 20 contas/dia | WAITER, CASHIER |
| CUSTOMER\_SIGNUPS | Cadastros de clientes (CRM) | 5 cadastros/dia | WAITER |
| UPSELL\_COUNT | Upsells aceitos (Isis/garçom) | 10 upsells/dia | WAITER |

## **Aplicação de Metas**

Metas podem ser definidas de duas formas:

**Por Role:** Todos os garçons têm meta de R$5.000/dia. Goal.employeeId \= null, Goal.targetRole \= "WAITER". Quando um novo garçom é contratado, herda automaticamente.

**Por Indivíduo:** João tem meta de R$6.000/dia (acima da média por ser mais experiente). Goal.employeeId \= João.id. Sobrescreve a meta por role.

## **Cálculo de Progresso**

async function calculateGoalProgress(  
  employeeId: string,  
  goal: Goal,  
  date: Date,  
): Promise\<GoalProgress\> {

  const period \= getPeriodRange(goal.period, date);  
  // DAILY: 00:00 \- 23:59 do dia  
  // WEEKLY: segunda a domingo  
  // MONTHLY: dia 1 ao ultimo dia do mes

  const checks \= await prisma.check.findMany({  
    where: {  
      employeeId,  // garcom responsavel  
      status: "PAID",  
      closedAt: { gte: period.start, lte: period.end },  
    },  
    include: { orders: { include: { items: true } } },  
  });

  let currentValue: number;  
  switch (goal.type) {  
    case "REVENUE":  
      currentValue \= checks.reduce((sum, c) \=\> sum \+ calculateNetRevenue(c), 0);  
      break;  
    case "TICKET\_AVG":  
      const total \= checks.reduce((s, c) \=\> s \+ calculateNetRevenue(c), 0);  
      currentValue \= checks.length \> 0 ? total / checks.length : 0;  
      break;  
    case "ITEMS\_SOLD":  
      currentValue \= checks.reduce((s, c) \=\>  
        s \+ c.orders.reduce((os, o) \=\> os \+ o.items.reduce((is, i) \=\> is \+ i.quantity, 0), 0\)  
      , 0);  
      break;  
    case "CHECKS\_CLOSED":  
      currentValue \= checks.length;  
      break;  
    // CUSTOMER\_SIGNUPS e UPSELL\_COUNT: queries separadas  
  }

  const progress \= (currentValue / Number(goal.targetValue)) \* 100;

  return {  
    goalId: goal.id,  
    type: goal.type,  
    period: goal.period,  
    targetValue: Number(goal.targetValue),  
    currentValue,  
    progress: Math.min(progress, 100),  
    isAchieved: progress \>= 100,  
    remaining: Math.max(Number(goal.targetValue) \- currentValue, 0),  
  };  
}

# **Comissões**

## **Configuração**

// Configuravel pelo dono no web-owner  
interface CommissionConfig {  
  enabled: boolean;  
  defaultRate: number;          // Taxa padrao (ex: 0.04 \= 4%)  
  roleRates?: {                 // Taxa por role (sobrescreve default)  
    WAITER: number;             // ex: 0.04 (4%)  
    BARTENDER: number;          // ex: 0.03 (3%)  
    CASHIER: number;            // ex: 0.01 (1%)  
  };  
  categoryBonusRates?: {        // Bonus por categoria (adicional a taxa base)  
    \[categoryId: string\]: number; // ex: { "drinks": 0.02 } \= \+2% em drinks  
  };  
  goalAchievementBonus: number; // Bonus % se meta batida (ex: 0.5 \= \+0.5%)  
  baseOn: "NET\_REVENUE" | "GROSS\_REVENUE";  // Sobre o que calcular  
  // NET\_REVENUE \= vendas \- descontos \- cancelamentos  
  // GROSS\_REVENUE \= vendas brutas  
}

## **Fluxo de Cálculo**

  Check fecha (status \= PAID)  
           |  
  Quem e o garcom responsavel? (Check.employeeId)  
           |  
  Commission.enabled?  
     /        \\  
   NAO        SIM  
   (skip)      |  
           Calcular base:  
           salesAmount \= SUM(items) conforme baseOn  
           rate \= roleRate ou defaultRate  
           baseAmount \= salesAmount \* rate  
              |  
           Category bonus?  
              |  
           Para cada item em categoria com bonus:  
           bonusAmount \+= item.total \* categoryBonusRate  
              |  
           Meta batida hoje?  
           bonusAmount \+= baseAmount \* goalAchievementBonus  
              |  
           totalAmount \= baseAmount \+ bonusAmount  
              |  
           Criar Commission no banco  
           (isPaid \= false, aguardando pagamento)

## **Exemplo Prático**

João (garçom) fecha uma conta de R$285,01. Configuração: rate \= 4%, drinks bonus \= 2%, meta batida \= \+0,5%.

| Item | Valor | Categoria | Taxa Base | Bonus Cat. | Comissão |
| :---- | :---- | :---- | :---- | :---- | :---- |
| 2x Chopp Pilsen 300ml | R$ 25,80 | Cervejas | R$ 1,03 | — | R$ 1,03 |
| 1x Gin Tônica | R$ 28,90 | Drinks | R$ 1,16 | R$ 0,58 | R$ 1,74 |
| 1x Caipirinha Limão | R$ 22,90 | Drinks | R$ 0,92 | R$ 0,46 | R$ 1,38 |
| 1x Porção de Fritas | R$ 28,90 | Petiscos | R$ 1,16 | — | R$ 1,16 |
| Taxa de serviço 10% | R$ 25,91 | — | — | — | — |

baseAmount \= R$4,27. bonusAmount (drinks) \= R$1,04. Subtotal \= R$5,31. Meta batida: \+R$0,02 (0,5% de R$4,27). totalAmount \= R$5,33.

## **Consolidação no Fechamento**

No fechamento do dia (PRD-07), o DailyReport inclui:

• Total de comissões geradas por funcionário.

• Total de comissões pendentes de pagamento (isPaid \= false).

• Botão "Marcar como pago" — atualiza Commission.isPaid \= true e Commission.paidAt \= now().

Comissões são pagas em ciclo semanal ou mensal (configurável). O dono marca como pago após transferir o valor.

# **Gorjetas**

A taxa de serviço (10%) já está no Unit.serviceFeeRate (PRD-01) e Check.serviceFeeAmount (PRD-04). O que falta é como esse valor é distribuído entre os funcionários.

## **Modelos de Distribuição**

| Modelo | Descrição | Fórmula | Quando Usar |
| :---- | :---- | :---- | :---- |
| INDIVIDUAL | Gorjeta vai integralmente para o garçom da mesa | 100% para Check.employeeId | Bares pequenos, mesas fixas por garçom |
| POOLED | Gorjeta é somada e dividida igualmente entre todos que trabalharam | Total / qtd de funcionários no turno | Bares grandes, equipe unida |
| HYBRID | % para o garçom da mesa \+ % para o pool | Ex: 60% individual \+ 40% pool | Equilibra mérito individual e equipe |
| WEIGHTED | Pool distribuído com peso por role | Garçom=3, Bartender=2, Cozinha=1 | Reconhecer contribuição diferente |

## **Configuração**

interface TipDistributionConfig {  
  model: "INDIVIDUAL" | "POOLED" | "HYBRID" | "WEIGHTED";  
  hybridIndividualPct?: number;   // % individual no HYBRID (ex: 60\)  
  hybridPoolPct?: number;         // % pool no HYBRID (ex: 40\)  
  weightedRoles?: {               // Pesos por role no WEIGHTED  
    WAITER: number;               // ex: 3  
    BARTENDER: number;            // ex: 2  
    CASHIER: number;              // ex: 1  
    KITCHEN: number;              // ex: 1  
  };  
  includeRolesInPool: string\[\];   // Quais roles participam do pool  
  // Default: \["WAITER", "BARTENDER"\]  
  // Cozinha e caixa podem ou nao participar  
}

## **Cálculo no Fechamento**

A distribuição de gorjetas é calculada no fechamento do dia (PRD-07), não em tempo real. Razão: gorjetas pooled/híbrido requerem saber TODOS os funcionários que trabalharam e TODAS as gorjetas do dia.

async function distributeTips(unitId: string, date: Date): Promise\<TipDistribution\[\]\> {

  const config \= await getTipConfig(unitId);  
    
  // 1\. Todas as gorjetas do dia  
  const checks \= await prisma.check.findMany({  
    where: { unitId, status: "PAID", closedAt: dayRange(date), serviceFeeAmount: { gt: 0 } },  
  });  
  const totalTips \= checks.reduce((s, c) \=\> s \+ Number(c.serviceFeeAmount), 0);

  // 2\. Funcionarios que trabalharam (ShiftLog do dia)  
  const shifts \= await prisma.shiftLog.findMany({  
    where: { unitId, date: dayRange(date) },  
    include: { employee: true },  
  });  
  const eligibleEmployees \= shifts.filter(s \=\>  
    config.includeRolesInPool.includes(s.employee.role)  
  );

  // 3\. Calcular conforme modelo  
  switch (config.model) {  
    case "INDIVIDUAL":  
      return checks.map(c \=\> ({  
        employeeId: c.employeeId,  
        amount: Number(c.serviceFeeAmount),  
        source: "INDIVIDUAL",  
      }));

    case "POOLED":  
      const perPerson \= totalTips / eligibleEmployees.length;  
      return eligibleEmployees.map(s \=\> ({  
        employeeId: s.employeeId,  
        amount: perPerson,  
        source: "POOL",  
      }));

    case "HYBRID":  
      const individualPct \= config.hybridIndividualPct / 100;  
      const poolPct \= config.hybridPoolPct / 100;  
      const poolTotal \= totalTips \* poolPct;  
      const poolShare \= poolTotal / eligibleEmployees.length;  
      return eligibleEmployees.map(s \=\> {  
        const individual \= checks  
          .filter(c \=\> c.employeeId \=== s.employeeId)  
          .reduce((sum, c) \=\> sum \+ Number(c.serviceFeeAmount) \* individualPct, 0);  
        return { employeeId: s.employeeId, amount: individual \+ poolShare, source: "HYBRID" };  
      });

    case "WEIGHTED":  
      const totalWeight \= eligibleEmployees.reduce((s, e) \=\>  
        s \+ (config.weightedRoles\[e.employee.role\] || 1), 0);  
      return eligibleEmployees.map(s \=\> ({  
        employeeId: s.employeeId,  
        amount: totalTips \* (config.weightedRoles\[s.employee.role\] || 1\) / totalWeight,  
        source: "WEIGHTED",  
      }));  
  }  
}

# **Ranking e Gamificação**

## **Dimensões de Ranking**

| Dimensão | Métrica | Peso Default | Visível Para |
| :---- | :---- | :---- | :---- |
| Receita | Total vendido (net revenue) | 40% | Dono \+ Garçom |
| Ticket Médio | Média por conta | 20% | Dono \+ Garçom |
| Itens/Conta | Média de itens por conta (cross-sell) | 15% | Dono |
| Avaliação Cliente | Média de rating (se CRM ativo) | 10% | Dono \+ Garçom |
| Cadastros CRM | Clientes cadastrados pelo funcionário | 10% | Dono |
| Pontualidade | % de turnos sem atraso | 5% | Dono |

O ranking composto usa a soma ponderada das dimensões normalizadas (0-1) de cada funcionário. Pesos são configuráveis pelo dono.

## **GET /employees/ranking**

### **Response**

{  
  "period": "weekly",  
  "dateRange": { "start": "2026-02-24", "end": "2026-03-02" },  
  "ranking": \[  
    {  
      "position": 1,  
      "employeeId": "clx...",  
      "name": "Joao Santos",  
      "role": "WAITER",  
      "compositeScore": 0.87,  
      "metrics": {  
        "revenue": { "value": 28400.50, "normalized": 0.92, "rank": 1 },  
        "ticketAvg": { "value": 72.40, "normalized": 0.85, "rank": 2 },  
        "itemsPerCheck": { "value": 3.8, "normalized": 0.78, "rank": 2 },  
        "customerRating": { "value": 4.7, "normalized": 0.94, "rank": 1 },  
        "signups": { "value": 12, "normalized": 0.80, "rank": 1 },  
        "punctuality": { "value": 100, "normalized": 1.0, "rank": 1 }  
      },  
      "commission": 1136.02,  
      "tips": 842.50,  
      "goalsAchieved": 3,  
      "goalsTotal": 4,  
      "trend": "up"  // vs periodo anterior  
    },  
    // ... mais funcionarios  
  \]  
}

## **Gamificação**

| Elemento | Descrição | Impacto |
| :---- | :---- | :---- |
| Ranking visível | Garçom vê sua posição no ranking no app | Competição saudável |
| Meta diária com barra de progresso | Barra visual mostrando % da meta atingida | Motivação contínua |
| Notificação de meta batida | "Parabéns\! Meta diária atingida\!" no app | Reforço positivo imediato |
| Streak (sequência) | Contador de dias consecutivos com meta batida | Retenção de comportamento |
| Medalhas mensais | Top 1 recebe “Dest. do Mês” visível no ranking | Reconhecimento |
| Bônus por ranking | Top 3 recebem bônus configurável | Incentivo financeiro direto |

# **Especificação de API — Endpoints**

## **Escalas e Turnos**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /schedules | MANAGER, OWNER | Grade semanal de todos os funcionários |
| PUT | /schedules/:employeeId | MANAGER, OWNER | Definir/atualizar escala de um funcionário |
| GET | /shifts/today | MANAGER, OWNER | Quem está trabalhando agora (ShiftLogs abertos) |
| GET | /shifts/history | MANAGER, OWNER | Histórico de turnos (filtro por data e funcionário) |
| POST | /shifts/:id/checkout | MANAGER | Forçar check-out manual |

## **Metas e Comissões**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /goals | MANAGER, OWNER | Listar metas ativas |
| POST | /goals | OWNER | Criar nova meta |
| PUT | /goals/:id | OWNER | Editar meta |
| DELETE | /goals/:id | OWNER | Desativar meta |
| GET | /goals/progress/:employeeId | WAITER, MANAGER, OWNER | Progresso do funcionário nas metas |
| GET | /commissions | MANAGER, OWNER | Listar comissões (filtro: período, funcionário, isPaid) |
| POST | /commissions/mark-paid | OWNER | Marcar comissões como pagas (batch) |
| GET | /commissions/config | MANAGER, OWNER | Configuração de comissão |
| PUT | /commissions/config | OWNER | Atualizar configuração de comissão |

## **Ranking, Gorjetas e Ocorrências**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /employees/ranking | WAITER, MANAGER, OWNER | Ranking composto (diário, semanal, mensal) |
| GET | /employees/:id/performance | WAITER, MANAGER, OWNER | Dashboard de performance individual |
| GET | /tips/distribution | MANAGER, OWNER | Distribuição de gorjetas do dia/período |
| GET | /tips/config | MANAGER, OWNER | Configuração de distribuição de gorjetas |
| PUT | /tips/config | OWNER | Atualizar configuração de gorjetas |
| GET | /occurrences | MANAGER, OWNER | Listar ocorrências (filtro: tipo, funcionário, data) |
| POST | /occurrences | MANAGER, OWNER | Registrar ocorrência |
| PUT | /occurrences/:id/acknowledge | WAITER, BARTENDER, CASHIER | Funcionário acusa ciência |

# **UI — Web Owner e Web Waiter**

## **Telas Web Owner**

| Tela | Rota | Descrição |
| :---- | :---- | :---- |
| Equipe | /team | Lista de funcionários com status (online/offline), turno atual, performance rápida |
| Escala Semanal | /team/schedule | Grade visual: funcionários × dias da semana. Drag-and-drop para editar. |
| Metas | /team/goals | CRUD de metas por role ou indivíduo. Progresso visível. |
| Ranking | /team/ranking | Ranking completo com todas as dimensões. Filtro por período. |
| Comissões | /team/commissions | Lista de comissões pendentes e pagas. Botão mark-paid. |
| Gorjetas | /team/tips | Distribuição do dia/período. Configuração do modelo. |
| Ocorrências | /team/occurrences | Histórico de ocorrências. Registro de nova. |
| Detalhe Funcionário | /team/:id | Perfil completo: dados, escala, metas, comissões, gorjetas, ocorrências. |

## **Tela Web Waiter: "Meu Desempenho"**

Nova tela no web-waiter acessível pelo menu lateral. O garçom vê apenas seus próprios dados — nunca os de outros (exceto posição no ranking sem valores alheios).

┌────────────────────────────────────────┐  
│  Meu Desempenho          Joao Santos  │  
├────────────────────────────────────────┤  
│                                        │  
│  ┌────────────────────────────────────┐  │  
│  │  Meta do Dia: R$ 5.000            │  │  
│  │  \[=================-----\] 78%      │  │  
│  │  Atual: R$ 3.920  Falta: R$ 1.080 │  │  
│  └────────────────────────────────────┘  │  
│                                        │  
│  ┌────────┐ ┌────────┐ ┌────────┐  │  
│  │ Vendas │ │ Ticket │ │ Contas │  │  
│  │R$3.920│ │ R$72  │ │   54   │  │  
│  └────────┘ └────────┘ └────────┘  │  
│                                        │  
│  Ranking Semanal:  \#2 de 4 garcons      │  
│  Streak: 5 dias consecutivos com meta\!   │  
│                                        │  
│  Comissao acumulada (semana): R$ 168,40  │  
│  Gorjeta acumulada (semana):  R$ 320,00  │  
│                                        │  
└────────────────────────────────────────┘

## **Componentes React**

| Componente | App | Responsabilidade |
| :---- | :---- | :---- |
| TeamList | web-owner | Lista de funcionários com status e métricas rápidas |
| ScheduleGrid | web-owner | Grade semanal drag-and-drop |
| GoalManager | web-owner | CRUD de metas com preview de aplicação |
| RankingBoard | web-owner | Ranking completo com dimensões e filtros |
| CommissionTable | web-owner | Tabela de comissões com mark-paid |
| TipDistribution | web-owner | Visualização de distribuição de gorjetas |
| OccurrenceTimeline | web-owner | Timeline de ocorrências por funcionário |
| EmployeeProfile | web-owner | Perfil completo com todas as abas |
| GoalProgressBar | web-owner / web-waiter | Barra de progresso de meta compartilhada |
| CommissionConfig | web-owner | Configuração de taxas de comissão |
| TipConfig | web-owner | Configuração do modelo de gorjeta |
| MyPerformance | web-waiter | Dashboard do garçom (venda, meta, rank, comissão) |
| MiniRanking | web-waiter | Ranking simplificado (só posição, sem valores alheios) |
| StreakBadge | web-waiter | Badge de sequência de meta batida |
| ShiftStatus | web-waiter | Indicador de turno atual (desde HH:mm, Xh trabalhadas) |

# **Estrutura de Arquivos**

apps/api/src/modules/people/  
├── people.routes.ts              \# Registro de todas as rotas do modulo  
├── schedule.service.ts           \# CRUD de escalas, check-in/check-out  
├── goal.service.ts               \# CRUD de metas, calculo de progresso  
├── commission.service.ts          \# Calculo, consolidacao, mark-paid  
├── tip-distribution.service.ts   \# Distribuicao por modelo  
├── ranking.service.ts            \# Ranking composto, normalizacao  
├── occurrence.service.ts          \# CRUD de ocorrencias  
├── people.schemas.ts             \# Schemas Zod  
└── \_\_tests\_\_/  
    ├── schedule.test.ts  
    ├── commission.test.ts  
    ├── tip-distribution.test.ts  
    ├── ranking.test.ts  
    └── goal.test.ts

apps/web-owner/src/  
├── pages/  
│   ├── TeamOverview.tsx  
│   ├── ScheduleManager.tsx  
│   ├── GoalManager.tsx  
│   ├── RankingPage.tsx  
│   ├── CommissionsPage.tsx  
│   ├── TipsPage.tsx  
│   └── EmployeeDetailPage.tsx  
├── components/  
│   ├── (componentes listados na tabela acima)  
└── stores/  
    └── people.store.ts

apps/web-waiter/src/  
├── pages/  
│   └── MyPerformance.tsx  
└── components/  
    ├── MiniRanking.tsx  
    ├── StreakBadge.tsx  
    └── ShiftStatus.tsx

# **Estratégia de Testes**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Escala — criar semanal | Unit | Schedule criado para cada dia, unique por employee+day |
| Check-in — com Schedule | Unit | ShiftLog criado com scheduledStart/End, atraso detectado |
| Check-in — sem Schedule | Unit | ShiftLog criado sem scheduled, alert de turno extra |
| Check-in — atraso \> tolerância | Unit | isLate=true, lateMinutes correto, Occurrence LATE\_ARRIVAL |
| Check-out — automático | Unit | Após scheduledEnd \+ 1h, ShiftLog fechado automaticamente |
| Horas trabalhadas — cálculo | Unit | 9h turno (17:00-02:00) calculado corretamente |
| Meta REVENUE — progresso | Unit | Soma de vendas do funcionário no período correta |
| Meta TICKET\_AVG — progresso | Unit | Média calculada corretamente |
| Meta por role — aplicação | Unit | Todos garçons herdam meta se employeeId null |
| Meta individual — sobrescreve | Unit | Meta específica sobrescreve role |
| Comissão — cálculo base | Unit | salesAmount \* rate \= baseAmount correto |
| Comissão — bônus categoria | Unit | Drinks com \+2% calculado corretamente |
| Comissão — bônus meta batida | Unit | Adicional aplicado quando goal.isAchieved |
| Comissão — mark paid batch | Unit | Múltiplas comissões marcadas como pagas |
| Gorjeta INDIVIDUAL | Unit | 100% para o garçom da mesa |
| Gorjeta POOLED | Unit | Total / nº funcionários \= share correto |
| Gorjeta HYBRID 60/40 | Unit | 60% individual \+ 40% pool distribuído corretamente |
| Gorjeta WEIGHTED | Unit | Proporcional aos pesos por role |
| Ranking composto — ordenação | Unit | Score normalizado \+ ponderado ordena corretamente |
| Ranking — garçom vê só posição | Unit | Resposta filtrada: só próprios dados \+ posição |
| Ocorrência — registrar e acusar | Unit | Occurrence criada, acknowledged atualizado |
| Ocorrência — atraso automático | Unit | LATE\_ARRIVAL criado automaticamente no check-in |

# **Impacto Downstream e Riscos**

## **Dependências de Entrada**

| PRD | O que fornece para PRD-12 |
| :---- | :---- |
| PRD-07 | DailyReport: base auditada para consolidar comissões e gorjetas. Fechamento trigger. |
| PRD-02 | Payment/Check: Check.employeeId identifica garçom. serviceFeeAmount para gorjetas. |
| PRD-01 | Employee expandido: cpf, isActive, hiredAt. EmployeeStats model. |
| PRD-04 | Check.status \= PAID: trigger para cálculo de comissão. |

## **Módulos que Dependem de PRD-12**

| PRD | Como Usa Pessoas & Turnos |
| :---- | :---- |
| PRD-10 | Dashboard BI: métricas de equipe. Comissões no custo operacional. Performance por funcionário. |
| PRD-11 | CRM: meta de cadastros de clientes atribuída ao garçom. Comissão por cadastro. |
| PRD-13 | Auditoria: ShiftLog como registro de ponto. Ocorrências como trilha de auditoria de RH. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Cálculo de comissão errado | Média | Alto | Comissão vinculada a Check específico. Rastreabilidade total. Dono revisa antes de pagar. |
| Gorjeta gera conflito na equipe | Média | Médio | Modelo configurável. Dono decide com equipe. Transparência nos cálculos. |
| Garçom manipula check-in (amigo faz login) | Baixa | Baixo | PIN é pessoal. Futuramente: biometria ou token no dispositivo. Auditoria de IPs. |
| Metas desproporcionais desmotivam | Média | Médio | Recomendação baseada em histórico. Ajuste mensal. Metas realistas. |
| Ranking gera competição tóxica | Baixa | Médio | Ranking positivo (celebração, não punição). Garçom vê só própria posição. Sem vergonha pública. |
| Turnos cruzando meia-noite causam bugs | Alta | Médio | Lógica específica: se endTime \< startTime, turno cruza meia-noite. Testes extensivos. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| Check-in via PIN (não biometria) | Facial recognition / fingerprint | Complexidade desproporcional para MVP. PIN já existe. Biometria na Phase 3+. |
| Comissão por Check (não agregado) | Cálculo agregado no fechamento | Rastreabilidade: cada comissão vinculada a Check específico. Permite auditoria e disput. |
| Gorjeta no fechamento (não real-time) | Distribuição a cada Check | Pool requer dados completos do dia. Real-time impossibilita pooled/weighted. |
| Schedule semanal fixo (não horário flex) | Agenda com exceções | Bares têm escala fixa. Exceções resolvidas por turno sem Schedule (extra). Simples \> complexo. |
| Ranking composto ponderado | Ranking só por receita | Receita pura penaliza quem tem menos mesas. Composto equilibra múltiplas dimensões. |
| Occurrence como registro formal | Chat/nota informal | Registro formal com ciência (acknowledged) tem valor legal trabalhista. Protege empregador e empregado. |

# **Sequência de Implementação (2 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Schema: migration com 5 novos models \+ enums. Backend: ScheduleService (CRUD escala \+ check-in/check-out automático \+ atraso), GoalService (CRUD metas \+ cálculo de progresso), CommissionService (cálculo ao fechar Check \+ consolidação \+ mark-paid). Frontend web-owner: ScheduleGrid, GoalManager, CommissionTable. Frontend web-waiter: MyPerformance (básico), GoalProgressBar. | Escalas funcionais com check-in automático. Metas configuráveis com progresso em tempo real. Comissões calculadas automaticamente. Garçom vê meta e progresso no app. |
| Sprint 2 | Backend: TipDistributionService (4 modelos), RankingService (composto \+ normalização), OccurrenceService (CRUD \+ automático). Frontend web-owner: RankingBoard, TipDistribution, TipConfig, OccurrenceTimeline, EmployeeProfile. Frontend web-waiter: MiniRanking, StreakBadge, ShiftStatus. Testes completos \+ polish. | Gorjetas distribuídas automaticamente. Ranking com gamificação. Ocorrências rastreadas. Dashboard completo do garçom. Sistema de pessoas polido. |

OASYS PRD-12 — Pessoas & Turnos  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*