

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-11 — CRM & Fidelização**  
Cadastro, histórico de consumo, pontos, cashback, cupons, campanhas, reservas

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 2 — Growth & Scale |
| **Sprints Estimados** | 3 sprints |
| **Complexidade** | Média |
| **Cobertura Atual** | \~4% |
| **Dependências** | PRD-03 (Cardápio Digital), PRD-09 (WhatsApp & Isis) |
| **Gap Modules** | M8 — CRM / Fidelização |
| **Apps Afetadas** | apps/api \+ apps/web-owner \+ apps/web-menu |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-11 (CRM & Fidelização) transforma clientes anônimos em clientes conhecidos, rastreados e fidelizados. Na Phase 1, o OASYS sabe que "alguém na mesa 7 pediu uma Caipirinha". Após PRD-11, o OASYS sabe que "João, que vem toda sexta, sempre pede Caipirinha e Porção de Fritas, gasta R$85 por visita em média, e está a 30 pontos de ganhar um chopp grátis".

A cobertura atual é \~4%: o model Customer existe com phone hashing e LGPD consent tracking (CustomerConsent). O modelo de consentimento granular é funcional. Fora isso, nada de CRM foi implementado — não há histórico de consumo, pontuação, cashback, cupons, campanhas ou reservas.

Este é Phase 2 porque depende de base de clientes que só existe após operação real. Sem clientes usando o cardápio digital (PRD-03) e WhatsApp (PRD-09), não há dados para alimentar o CRM. O valor do CRM cresce exponencialmente com o volume de dados.

Este PRD cobre seis subsistemas:

**1\. Cadastro e Perfil de Cliente —** Identificação por telefone (WhatsApp) ou CPF (nota fiscal). Perfil enriquecido com histórico, preferências, e segmento. LGPD completo com consentimento granular, exportação de dados e direito ao esquecimento.

**2\. Histórico de Consumo —** Cada visita do cliente é rastreada: data, itens pedidos, valor gasto, unidade visitada. Permite análise de frequência, sazonalidade, LTV (lifetime value), e preferências.

**3\. Programa de Fidelidade (Pontos) —** A cada R$1 gasto, o cliente acumula pontos configuráveis. Pontos podem ser trocados por itens ou descontos. Saldo, extrato, e regras de expiração.

**4\. Cashback —** Percentual do valor gasto retorna como crédito para próxima visita. Configurável por Unit, por categoria, ou por campanha específica.

**5\. Cupons Segmentados —** Criação de cupons com regras: valor mínimo, validade, produto específico, uso único ou múltiplo, segmento de cliente. Distribuídos via WhatsApp, email, ou resgatados no cardápio digital.

**6\. Campanhas e Reservas —** Campanhas de marketing segmentadas via WhatsApp (PRD-09). Reservas de mesa com confirmação automática. Segmentação por comportamento de consumo (RFM — Recency, Frequency, Monetary).

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Models (Schema) | 6 | LoyaltyAccount, PointTransaction, CashbackTransaction, Coupon, CouponRedemption, Reservation |
| Models Modificados | 2 | Customer (campos de perfil), Check (customerId vinculado) |
| Novos Enums | 3 | PointTransactionType, CouponType, ReservationStatus |
| Endpoints Novos | 22 | Customer profile, pontos, cashback, cupons, campanhas, reservas |
| Serviços Novos | 5 | CustomerProfileService, LoyaltyService, CouponService, CampaignService, ReservationService |
| Componentes React (web-owner) | \~14 | Telas de CRM, cupons, campanhas, reservas |
| Componentes React (web-menu) | \~4 | Perfil do cliente, saldo de pontos, cupons disponíveis |

## **Critério de Sucesso (Done Definition)**

O PRD-11 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Cliente identificado por telefone (WhatsApp) ou CPF tem perfil com histórico de visitas e preferências.

2\. Programa de pontos funcional: acumular ao pagar, consultar saldo, trocar por recompensas.

3\. Cashback funcional: percentual configurado pelo dono, crédito aparece na próxima visita.

4\. Cupons: criar com regras, distribuir via WhatsApp, resgatar no cardápio digital.

5\. Segmentação RFM funcional: classificar clientes em segmentos baseados em comportamento.

6\. Campanha via WhatsApp: selecionar segmento, escolher template, enviar, medir resultado.

7\. Reserva de mesa funcional: solicitar, confirmar, cancelar, check-in automático.

8\. LGPD completo: exportar dados, revogar consentimento, direito ao esquecimento.

9\. Dashboard CRM no web-owner com KPIs: clientes ativos, LTV, retenção, conversão de campanha.

10\. Zero erros de tipo no monorepo.

# **Estado Atual (\~4%)**

| Feature | Estado Atual | PRD-11 Adiciona |
| :---- | :---- | :---- |
| Customer model | Existe com id, phone (hashed), createdAt | nome, email, cpf, birthDate, gender, tags, segmento, LTV |
| CustomerConsent | Funcional: tipo, granted, grantedAt, revokedAt | Novos tipos: LOYALTY, MARKETING\_EMAIL, MARKETING\_WHATSAPP |
| Phone hashing (LGPD) | Funcional: SHA-256 com salt | Manter. Lookup por hash funciona. |
| Check.customerId | Campo existe mas raramente populado | Popular automaticamente via identificação WhatsApp ou CPF na nota |
| Histórico de consumo | Não existe | CustomerVisit tracking via Check \+ Orders |
| Programa de pontos | Não existe | LoyaltyAccount \+ PointTransaction |
| Cashback | Não existe | CashbackTransaction \+ saldo em LoyaltyAccount |
| Cupons | Não existe | Coupon \+ CouponRedemption com regras flexíveis |
| Campanhas | Não existe | Integração com PRD-09 WhatsApp para envio segmentado |
| Reservas | Não existe | Reservation model com confirmação e check-in |
| Segmentação | Não existe | RFM scoring \+ segmentos automáticos |

# **Alterações no Schema**

Diferente dos PRDs de Phase 1 (cobertos pelo PRD-01), as alterações de schema do CRM requerem uma nova migration específica. Todos os novos campos são opcionais ou com default para não quebrar dados existentes.

## **Novos Enums**

enum PointTransactionType {  
  EARN       // Acumulo por compra  
  REDEEM     // Resgate por recompensa  
  EXPIRE     // Expiracao automatica  
  ADJUST     // Ajuste manual (dono)  
  BONUS      // Bonus (campanha, aniversario)  
}

enum CouponType {  
  PERCENTAGE   // Desconto percentual (ex: 10%)  
  FIXED\_VALUE  // Desconto fixo (ex: R$20)  
  FREE\_ITEM    // Item gratuito (ex: 1 Chopp gratis)  
  BUY\_X\_GET\_Y  // Compre X leve Y  
}

enum ReservationStatus {  
  PENDING     // Solicitada, aguardando confirmacao  
  CONFIRMED   // Confirmada pelo estabelecimento  
  CANCELLED   // Cancelada (pelo cliente ou estabelecimento)  
  NO\_SHOW     // Cliente nao apareceu  
  CHECKED\_IN  // Cliente chegou e esta na mesa  
  COMPLETED   // Reserva finalizada (cliente saiu)  
}

## **Modificações no Customer**

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| name | String? | Não | null | Nome do cliente (coletado no cadastro ou WhatsApp) |
| email | String? | Não | null | Email para campanhas e recibos |
| cpf | String? | Não | null | CPF (11 dígitos, usado para NFC-e e identificação) |
| birthDate | DateTime? | Não | null | Data de nascimento (bonus de aniversário) |
| gender | String? | Não | null | Gênero (opcional, para segmentação) |
| tags | String? | Não | null | JSON array de tags: \["VIP", "frequente", "happy\_hour"\] |
| rfmScore | String? | Não | null | Score RFM atual: ex "543" (R=5, F=4, M=3) |
| segment | String? | Não | null | Segmento atual: CHAMPION, LOYAL, AT\_RISK, LOST, etc |
| totalSpent | Decimal? | Não | 0 | Total gasto (lifetime) — LTV base |
| totalVisits | Int? | Não | 0 | Número total de visitas |
| lastVisitAt | DateTime? | Não | null | Data da última visita |
| firstVisitAt | DateTime? | Não | null | Data da primeira visita |
| preferredProducts | String? | Não | null | JSON: top 5 produtos mais pedidos com contagem |
| avgTicket | Decimal? | Não | null | Ticket médio calculado |
| notes | String? | Não | null | Observações livres (ex: "alergia a amendoim") |

## **Novo Model: LoyaltyAccount**

Conta de fidelidade do cliente. Uma por Customer por Unit (multi-tenant). Armazena saldo de pontos e cashback.

model LoyaltyAccount {  
  id              String    @id @default(cuid())  
  customerId      String  
  customer        Customer  @relation(fields: \[customerId\], references: \[id\])  
  unitId          String  
  unit            Unit      @relation(fields: \[unitId\], references: \[id\])  
  pointsBalance   Int       @default(0)    // Saldo atual de pontos  
  pointsEarned    Int       @default(0)    // Total acumulado (lifetime)  
  pointsRedeemed  Int       @default(0)    // Total resgatado  
  pointsExpired   Int       @default(0)    // Total expirado  
  cashbackBalance Decimal   @default(0) @db.Decimal(10, 2\)  // Saldo de cashback (R$)  
  tier            String    @default("BRONZE")  // BRONZE, SILVER, GOLD, PLATINUM  
  isActive        Boolean   @default(true)  
  createdAt       DateTime  @default(now())  
  updatedAt       DateTime  @updatedAt

  pointTransactions     PointTransaction\[\]  
  cashbackTransactions  CashbackTransaction\[\]

  @@unique(\[customerId, unitId\])  
  @@index(\[unitId, tier\])  
}

## **Novo Model: PointTransaction**

model PointTransaction {  
  id              String                @id @default(cuid())  
  loyaltyAccountId String  
  loyaltyAccount  LoyaltyAccount        @relation(fields: \[loyaltyAccountId\], references: \[id\])  
  type            PointTransactionType  
  points          Int                   // Positivo para EARN/BONUS, negativo para REDEEM/EXPIRE  
  description     String                // "Compra \#1234 \- R$85,50" ou "Resgate: 1 Chopp gratis"  
  referenceId     String?               // checkId, couponId, ou campaignId  
  referenceType   String?               // "CHECK", "COUPON", "CAMPAIGN"  
  expiresAt       DateTime?             // Data de expiracao dos pontos  
  createdAt       DateTime              @default(now())

  @@index(\[loyaltyAccountId, createdAt\])  
}

## **Novo Model: CashbackTransaction**

model CashbackTransaction {  
  id                String          @id @default(cuid())  
  loyaltyAccountId  String  
  loyaltyAccount    LoyaltyAccount  @relation(fields: \[loyaltyAccountId\], references: \[id\])  
  type              String          // CREDIT (ganhou) ou DEBIT (usou)  
  amount            Decimal         @db.Decimal(10, 2\)  
  description       String  
  referenceId       String?         // checkId  
  createdAt         DateTime        @default(now())

  @@index(\[loyaltyAccountId, createdAt\])  
}

## **Novo Model: Coupon**

model Coupon {  
  id              String        @id @default(cuid())  
  unitId          String  
  unit            Unit          @relation(fields: \[unitId\], references: \[id\])  
  code            String        // Codigo unico: "HAPPY2026", "CHOPP10"  
  type            CouponType  
  value           Decimal       @db.Decimal(10, 2\)  // % ou R$ dependendo do type  
  freeProductId   String?       // Product.id se type \= FREE\_ITEM  
  buyQuantity     Int?          // X em "compre X leve Y"  
  getQuantity     Int?          // Y em "compre X leve Y"  
  minOrderValue   Decimal?      @db.Decimal(10, 2\)  // Pedido minimo para ativar  
  maxDiscount     Decimal?      @db.Decimal(10, 2\)  // Teto de desconto (para %)    
  applicableProductId  String?  // Se restrito a um produto especifico  
  applicableCategoryId String?  // Se restrito a uma categoria  
  maxUses         Int?          // Usos totais permitidos (null \= ilimitado)  
  maxUsesPerCustomer Int?       @default(1)  // Usos por cliente  
  usedCount       Int           @default(0)  
  targetSegment   String?       // Segmento RFM alvo (null \= todos)  
  validFrom       DateTime  
  validUntil      DateTime  
  isActive        Boolean       @default(true)  
  createdAt       DateTime      @default(now())

  redemptions     CouponRedemption\[\]

  @@unique(\[unitId, code\])  
  @@index(\[unitId, isActive, validUntil\])  
}

## **Novo Model: CouponRedemption**

model CouponRedemption {  
  id          String    @id @default(cuid())  
  couponId    String  
  coupon      Coupon    @relation(fields: \[couponId\], references: \[id\])  
  customerId  String  
  customer    Customer  @relation(fields: \[customerId\], references: \[id\])  
  checkId     String  
  check       Check     @relation(fields: \[checkId\], references: \[id\])  
  discount    Decimal   @db.Decimal(10, 2\)  // Valor efetivo do desconto  
  createdAt   DateTime  @default(now())

  @@index(\[couponId, customerId\])  
}

## **Novo Model: Reservation**

model Reservation {  
  id              String            @id @default(cuid())  
  unitId          String  
  unit            Unit              @relation(fields: \[unitId\], references: \[id\])  
  customerId      String?  
  customer        Customer?         @relation(fields: \[customerId\], references: \[id\])  
  customerName    String            // Nome (pode nao ter Customer cadastrado)  
  customerPhone   String            // Telefone para confirmacao  
  tableId         String?           // Mesa reservada (null \= qualquer disponivel)  
  partySize       Int               // Numero de pessoas  
  date            DateTime          // Data da reserva  
  time            String            // HH:mm horario desejado  
  duration        Int               @default(120)  // Duracao estimada em minutos  
  status          ReservationStatus @default(PENDING)  
  notes           String?           // Observacoes (aniversario, alergia, etc)  
  confirmedAt     DateTime?  
  cancelledAt     DateTime?  
  cancelReason    String?  
  checkedInAt     DateTime?  
  completedAt     DateTime?  
  checkId         String?           // Vincula ao Check quando faz check-in  
  source          String            @default("WEB")  // WEB, WHATSAPP, PHONE, WALK\_IN  
  createdAt       DateTime          @default(now())  
  updatedAt       DateTime          @updatedAt

  @@index(\[unitId, date, status\])  
  @@index(\[customerId\])  
}

# **Identificação de Cliente**

O maior desafio do CRM em bares é identificar o cliente. Diferente de e-commerce (login obrigatório), em bar o cliente pode ser completamente anônimo. O OASYS usa múltiplos pontos de identificação, nenhum obrigatório.

## **Pontos de Identificação**

| Canal | Momento | Como Identifica | Confiabilidade |
| :---- | :---- | :---- | :---- |
| WhatsApp (PRD-09) | Pedido via Isis | Número de telefone da sessão | Alta — telefone é único |
| Cardápio Digital (PRD-03) | Pedido com CPF na nota | CPF informado voluntariamente | Alta — CPF é único |
| Cardápio Digital | Login opcional (futuro) | Email \+ senha ou magic link | Alta |
| Programa de pontos | Garçom pergunta telefone | Telefone digitado no PDV | Média — pode errar dígito |
| Nota Fiscal (PRD-06) | CPF na nota | CPF registrado na NFC-e | Alta |
| Reserva | Nome \+ telefone ao reservar | Telefone da reserva | Alta |

## **Fluxo de Identificação**

  Cliente interage (WhatsApp, QR, PDV)  
              |  
  Tem telefone ou CPF?  
     /              \\  
   SIM               NAO  
    |                  |  
  Buscar Customer     Conta anonima  
  por hash(phone)     (sem CRM)  
  ou CPF              |  
    |                 Se informar  
  Encontrou?          telefone/CPF  
   /        \\         depois:  
  SIM       NAO       merge  
   |          |  
  Vincular   Criar Customer  
  Check ao   novo (consentimento  
  Customer   LGPD primeiro)  
   |          |  
  Atualizar  Popular perfil  
  lastVisit  basico  
  \+ stats     |  
   \\          /  
    Acumular pontos/cashback  
    (se programa ativo)  
IMPORTANTE: A identificação NUNCA é obrigatória. Cliente pode consumir completamente anônimo. O CRM é valor adicional, não barreira.

# **Segmentação RFM**

RFM (Recency, Frequency, Monetary) é o modelo clássico de segmentação de clientes. Cada dimensão recebe nota de 1 (pior) a 5 (melhor), resultando em score de 3 dígitos (ex: "543").

## **Dimensões**

| Dimensão | Pergunta | Cálculo | Exemplo |
| :---- | :---- | :---- | :---- |
| Recency (R) | Quando foi a última visita? | Dias desde lastVisitAt | 0-7 dias \= 5, 8-14 \= 4, 15-30 \= 3, 31-60 \= 2, 60+ \= 1 |
| Frequency (F) | Com que frequência visita? | totalVisits nos últimos 90 dias | 8+ \= 5, 5-7 \= 4, 3-4 \= 3, 2 \= 2, 1 \= 1 |
| Monetary (M) | Quanto gasta por visita? | avgTicket (média) | Top 20% \= 5, 20-40% \= 4, 40-60% \= 3, 60-80% \= 2, bottom 20% \= 1 |

## **Segmentos Derivados**

| Segmento | Score RFM | Descrição | Ação Recomendada |
| :---- | :---- | :---- | :---- |
| CHAMPION | R=5, F=4-5, M=4-5 | Melhor cliente. Vem sempre, gasta muito, veio recentemente. | Manter VIP. Recompensas exclusivas. Não precisa de promoção. |
| LOYAL | R=3-5, F=3-5, M=3-5 | Cliente fiel. Vem frequentemente com bom ticket. | Programa de pontos. Reconhecer fidelidade. Upsell moderado. |
| POTENTIAL\_LOYAL | R=4-5, F=1-2, M=3-5 | Veio recentemente, gastou bem, mas poucas vezes. | Incentivar segunda/terceira visita. Cupom de retorno. |
| PROMISING | R=4-5, F=1-2, M=1-2 | Novo, veio recentemente. Potencial desconhecido. | Boas-vindas. Primeira experiência excelente. Cupom de retorno. |
| NEEDS\_ATTENTION | R=2-3, F=3-4, M=3-4 | Era bom cliente mas está sumindo. | Campanha de reativação. "Sentimos sua falta." Cupom agressivo. |
| ABOUT\_TO\_SLEEP | R=2, F=2-3, M=2-3 | Está esfriando. Pode perder. | Campanha urgente. Desconto forte. Pesquisa de satisfação. |
| AT\_RISK | R=1-2, F=3-5, M=3-5 | ERA um bom cliente. Não vem há muito. | Win-back campanha. Oferta irrecusável. Entender o que mudou. |
| HIBERNATING | R=1, F=1-2, M=1-2 | Veio poucas vezes, há muito tempo. | Baixa prioridade. Campanha de massa genérica ou ignorar. |
| LOST | R=1, F=1, M=1 | Veio uma vez, há muito tempo, gastou pouco. | Não investir. Remover de campanhas ativas. |

## **Cálculo Automático**

// Job executa 1x/dia (madrugada)  
async function recalculateRFMScores(unitId: string): Promise\<void\> {

  const customers \= await prisma.customer.findMany({  
    where: { checks: { some: { unitId } } },  
    include: { checks: { where: { unitId, status: "PAID" } } },  
  });

  // Calcular quintis para Monetary (percentis por unidade)  
  const tickets \= customers.map(c \=\> c.avgTicket).sort((a, b) \=\> a \- b);  
  const quintiles \= calculateQuintiles(tickets);

  for (const customer of customers) {  
    const daysSinceLastVisit \= diffDays(customer.lastVisitAt, new Date());  
    const visitsLast90d \= customer.checks.filter(c \=\>  
      diffDays(c.createdAt, new Date()) \<= 90  
    ).length;

    const R \= scoreRecency(daysSinceLastVisit);   // 1-5  
    const F \= scoreFrequency(visitsLast90d);       // 1-5  
    const M \= scoreMonetary(customer.avgTicket, quintiles); // 1-5

    const rfmScore \= \`${R}${F}${M}\`;  
    const segment \= classifySegment(R, F, M);

    await prisma.customer.update({  
      where: { id: customer.id },  
      data: { rfmScore, segment },  
    });  
  }  
}

# **Programa de Fidelidade (Pontos)**

## **Configuração por Unit**

// Configuravel pelo dono no web-owner  
interface LoyaltyConfig {  
  enabled: boolean;                // Ativar/desativar programa  
  pointsPerReal: number;           // Pontos por R$1 gasto (default: 1\)  
  redeemRatio: number;             // Quantos pontos \= R$1 de desconto (default: 100\)  
  minRedeemPoints: number;         // Minimo para resgatar (default: 50\)  
  pointsExpirationDays: number;    // Dias para expirar (default: 365, 0 \= nunca)  
  bonusBirthday: number;           // Pontos bonus no aniversario (default: 100\)  
  bonusFirstVisit: number;         // Pontos bonus na primeira visita (default: 50\)  
  tierThresholds: {                // Pontos acumulados (lifetime) para cada tier  
    SILVER: number;                // Default: 500  
    GOLD: number;                  // Default: 2000  
    PLATINUM: number;              // Default: 5000  
  };  
  tierMultipliers: {               // Multiplicador de acumulo por tier  
    BRONZE: number;                // Default: 1.0x  
    SILVER: number;                // Default: 1.2x  
    GOLD: number;                  // Default: 1.5x  
    PLATINUM: number;              // Default: 2.0x  
  };  
}

## **Fluxo de Acúmulo**

  Check fechado (PAID)  
         |  
  Cliente identificado? (customerId no Check)  
    /           \\  
  SIM            NAO \--\> nao acumula pontos  
   |  
  LoyaltyAccount existe?  
    /           \\  
  SIM           NAO \--\> criar LoyaltyAccount BRONZE  
   |  
  Calcular pontos:  
  pontos \= floor(netAmount \* pointsPerReal \* tierMultiplier)  
   |  
  Criar PointTransaction type=EARN  
  Atualizar LoyaltyAccount.pointsBalance  
   |  
  Verificar upgrade de tier  
  (pointsEarned \>= thresholds?)  
   |  
  Se tier mudou: notificar via WhatsApp

## **Fluxo de Resgate**

Cliente pode resgatar pontos por desconto no cardápio digital ou via garçom. O desconto é aplicado como Check.discountAmount com Check.discountReason \= "Resgate de pontos (X pts)".

R1. Mínimo de pontos para resgate: minRedeemPoints (default 50).

R2. Conversão: 100 pontos \= R$1 de desconto (configurável).

R3. Desconto não pode exceder o total da conta (não gera crédito).

R4. Pontos mais antigos são consumidos primeiro (FIFO por expiresAt).

## **Expiração de Pontos**

Job diário verifica pontos com expiresAt no passado. Cria PointTransaction type=EXPIRE e decrementa pointsBalance. Alerta ao cliente 7 dias antes via WhatsApp (se consentido): "João, 150 pontos expiram em 7 dias\! Use antes de DD/MM."

# **Cashback**

Cashback é mais simples que pontos: percentual do valor gasto retorna como crédito em reais. O crédito fica disponível na próxima visita e pode ser usado como forma de pagamento.

## **Configuração**

interface CashbackConfig {  
  enabled: boolean;                 // Ativar/desativar  
  defaultRate: number;              // % padrao (ex: 5 \= 5%)  
  categoryRates?: {                 // Taxas por categoria (sobrescreve default)  
    \[categoryId: string\]: number;   // ex: { "cervejas": 3, "petiscos": 8 }  
  };  
  maxCashbackPerTransaction: number; // Teto por transacao (ex: R$50)  
  expirationDays: number;           // Dias para expirar (default: 90\)  
  minBalanceToUse: number;          // Minimo para usar (default: R$5)  
}

## **Fluxo**

1\. Check pago → calcular cashback: SUM(item.price \* item.quantity \* rate) para cada item, respeitando categoryRates.

2\. Criar CashbackTransaction type=CREDIT com valor calculado.

3\. Atualizar LoyaltyAccount.cashbackBalance.

4\. Na próxima visita, cliente pode aplicar cashback como pagamento parcial: criar CashbackTransaction type=DEBIT.

5\. Cashback não pode ser combinado com cupom de desconto (evitar double dip).

NOTA: Pontos e Cashback não são mutuamente exclusivos. O dono escolhe qual ativar (ou ambos). Ambos usam o mesmo LoyaltyAccount com campos separados (pointsBalance vs cashbackBalance).

# **Cupons Segmentados**

## **Tipos de Cupom**

| Tipo | Exemplo | Campos Usados | Cálculo do Desconto |
| :---- | :---- | :---- | :---- |
| PERCENTAGE | 10% de desconto | value=10, maxDiscount=R$30 | min(total \* 10%, R$30) |
| FIXED\_VALUE | R$20 de desconto | value=20, minOrderValue=R$80 | Se total \>= R$80: R$20 |
| FREE\_ITEM | 1 Chopp grátis | freeProductId, minOrderValue | Preço do produto (se pedido min atingido) |
| BUY\_X\_GET\_Y | Compre 3 Chopps leve 4 | buyQuantity=3, getQuantity=4, applicableProductId | Preço de 1 Chopp (unidade mais barata) |

## **Ciclo de Vida do Cupom**

  Dono cria cupom (web-owner)  
         |  
  Distribui via:  
  \- WhatsApp (campanha PRD-09)  
  \- Cardápio digital (banner)  
  \- Impresso (QR code)  
  \- Automatico (pos-compra)  
         |  
  Cliente digita codigo (web-menu ou garcom)  
         |  
  Validar:  
  \- Codigo existe e ativo?  
  \- Dentro do periodo de validade?  
  \- maxUses nao atingido?  
  \- maxUsesPerCustomer nao atingido?  
  \- minOrderValue atingido?  
  \- Segmento do cliente \= targetSegment?  
  \- Produto/categoria aplicavel?  
         |  
  Se valido:  
  \- Aplicar desconto no Check  
  \- Criar CouponRedemption  
  \- Incrementar usedCount  
         |  
  Se invalido:  
  \- Retornar motivo especifico

# **Campanhas de Marketing**

Campanhas permitem ao dono enviar mensagens segmentadas para grupos de clientes via WhatsApp (PRD-09). A integração é com o sistema de templates e fila já construído no PRD-09.

## **Fluxo de Campanha**

| Etapa | Ação | Responsável | Detalhe |
| :---- | :---- | :---- | :---- |
| 1\. Criar | Dono define mensagem, segmento-alvo, e agenda | web-owner | Segmento via filtro RFM ou tags |
| 2\. Preview | Ver quantos clientes serão atingidos e custo estimado | web-owner | COUNT(customers WHERE segment IN targets) |
| 3\. Aprovar | Dono confirma envio (evitar acidental) | web-owner | Botão com confirmação dupla |
| 4\. Enfileirar | Sistema enfileira mensagens no Redis Streams (PRD-09) | API | Respeita rate limit e quiet hours |
| 5\. Enviar | MessageSender envia via Graph API | Worker | Template MARKETING (custo por msg) |
| 6\. Medir | Rastrear: enviadas, entregues, lidas, cliques, conversões | API | Webhook status \+ pedidos pós-campanha |

## **Métricas de Campanha**

| Métrica | Cálculo | Meta Saudável |
| :---- | :---- | :---- |
| Reach | Número de clientes que receberam | — |
| Delivery Rate | Entregues / Enviadas \* 100 | \> 95% |
| Read Rate | Lidas / Entregues \* 100 | \> 60% |
| Click Rate | Cliques (botões) / Lidas \* 100 | \> 15% |
| Conversion Rate | Pedidos feitos em 48h / Reach \* 100 | \> 5% |
| Revenue Generated | SUM(Check.total) para clientes que converteram | — |
| ROI | (Revenue \- CustoMensagens) / CustoMensagens \* 100 | \> 300% |
| Opt-out Rate | Clientes que pediram para parar / Reach \* 100 | \< 2% |

Conversion tracking: quando um cliente que recebeu campanha faz um pedido nas próximas 48h, esse pedido é atribuído à campanha. Janela de atribuição configurável (default 48h).

# **Reservas de Mesa**

Reserva é feature complementar do CRM. Cliente reserva mesa com antecedência, recebe confirmação via WhatsApp, e faz check-in automático ao chegar.

## **Canais de Reserva**

| Canal | Como Funciona | Dependência |
| :---- | :---- | :---- |
| WhatsApp (Isis) | Cliente diz "quero reservar mesa" → Isis coleta data, horário, pessoas → cria Reservation | PRD-09 |
| Cardápio Digital | Formulário de reserva acessível pelo menu QR code | PRD-03 |
| Telefone | Funcionário registra reserva manualmente no web-waiter | Nenhuma |
| Walk-in | Cliente chega sem reserva, hostess registra no sistema | Nenhuma |

## **Ciclo de Vida da Reserva**

| Transição | Trigger | Notificação |
| :---- | :---- | :---- |
| PENDING → CONFIRMED | Gerente/hostess confirma disponibilidade | WhatsApp: "Reserva confirmada para DD/MM às HH:mm. Mesa para N pessoas." |
| PENDING → CANCELLED | Sem confirmação em 2h (auto) ou gerente cancela | WhatsApp: "Reserva não confirmada. Contate-nos para reagendar." |
| CONFIRMED → CANCELLED | Cliente ou gerente cancela | WhatsApp: "Reserva cancelada." \+ Se \< 2h antes: flag no perfil |
| CONFIRMED → CHECKED\_IN | Cliente chegou. Check aberto na mesa. | Nenhuma (presencial) |
| CONFIRMED → NO\_SHOW | Horário \+ 30min sem check-in (automático) | WhatsApp: "Sentimos sua falta\! Deseja reagendar?" \+ flag no perfil |
| CHECKED\_IN → COMPLETED | Check fechado (PAID) | Nenhuma (automático) |

R1. Lembrete automático 2h antes via WhatsApp: "João, lembrete: sua reserva no Boteco do Zé é hoje às 20h. Vemos você lá\!"

R2. No-show tracking: clientes com 2+ no-shows recebem flag no perfil. Reservas futuras requerem confirmação adicional.

R3. Disponibilidade: calcular mesas livres por horário considerando reservas existentes \+ duração estimada.

R4. Check-in automático: quando garçom abre Check na mesa reservada, Reservation transiciona para CHECKED\_IN.

# **LGPD — Compliance Completo**

O OASYS já tem CustomerConsent com consentimento granular. PRD-11 completa a implementação LGPD com exportação de dados e direito ao esquecimento.

## **Tipos de Consentimento**

| Tipo | Propósito | Obrigatório para | Revogável |
| :---- | :---- | :---- | :---- |
| DATA\_COLLECTION | Armazenar dados pessoais (nome, telefone, CPF) | Qualquer cadastro | Sim (exclui todos os dados) |
| LOYALTY | Participar do programa de fidelidade | Pontos e cashback | Sim (perde saldo) |
| MARKETING\_WHATSAPP | Receber promoções por WhatsApp | Campanhas e upsell | Sim (para de receber) |
| MARKETING\_EMAIL | Receber promoções por email | Campanhas email | Sim (para de receber) |
| RESERVATION\_REMINDER | Receber lembretes de reserva | Lembretes automáticos | Sim |

## **Endpoints LGPD**

| Método | Rota | Descrição |
| :---- | :---- | :---- |
| GET | /customers/:id/data-export | Exportar todos os dados do cliente em JSON (nome, histórico, pontos, etc) |
| POST | /customers/:id/consent | Registrar ou revogar consentimento por tipo |
| DELETE | /customers/:id/forget | Direito ao esquecimento: anonimizar todos os dados pessoais |
| GET | /customers/:id/consents | Listar todos os consentimentos ativos e histórico |

## **Direito ao Esquecimento**

async function forgetCustomer(customerId: string): Promise\<void\> {  
  await prisma.$transaction(async (tx) \=\> {  
    // 1\. Anonimizar dados pessoais (nao deletar \- manter para historico financeiro)  
    await tx.customer.update({  
      where: { id: customerId },  
      data: {  
        name: "ANONIMIZADO",  
        email: null,  
        cpf: null,  
        phone: "ANONIMIZADO",  // hash tambem anonimizado  
        birthDate: null,  
        gender: null,  
        tags: null,  
        notes: null,  
        preferredProducts: null,  
      },  
    });

    // 2\. Revogar todos os consentimentos  
    await tx.customerConsent.updateMany({  
      where: { customerId, revokedAt: null },  
      data: { revokedAt: new Date() },  
    });

    // 3\. Desativar conta de fidelidade (manter para auditoria)  
    await tx.loyaltyAccount.updateMany({  
      where: { customerId },  
      data: { isActive: false, pointsBalance: 0, cashbackBalance: 0 },  
    });

    // 4\. Check.customerId permanece (dados financeiros) mas sem link para pessoa real  
    // 5\. Log de auditoria  
    await tx.auditLog.create({  
      data: { action: "CUSTOMER\_FORGOTTEN", entityId: customerId, entityType: "Customer" },  
    });  
  });  
}  
IMPORTANTE: Não deletamos o registro Customer — anonimizamos. Check e Payment referenciam customerId para integridade financeira. Após anonimizar, os dados financeiros existem mas não estão vinculados a uma pessoa identificável.

# **Especificação de API — Endpoints**

## **Customer & Perfil**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /customers | MANAGER, OWNER | Listar clientes com filtros (segmento, tags, busca) |
| GET | /customers/:id | MANAGER, OWNER | Perfil completo: dados, histórico, pontos, cashback |
| POST | /customers | WAITER, MANAGER, OWNER | Cadastrar novo cliente (com consentimento) |
| PUT | /customers/:id | MANAGER, OWNER | Atualizar dados do cliente |
| GET | /customers/:id/history | MANAGER, OWNER | Histórico de visitas e consumo detalhado |
| GET | /customers/:id/data-export | MANAGER, OWNER | Exportar todos os dados (LGPD) |
| DELETE | /customers/:id/forget | OWNER | Direito ao esquecimento (LGPD) |
| POST | /customers/:id/consent | WAITER, MANAGER, OWNER | Registrar/revogar consentimento |
| GET | /customers/segments | MANAGER, OWNER | Resumo de segmentos RFM com contagem |

## **Fidelidade (Pontos & Cashback)**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /loyalty/:customerId | WAITER, MANAGER, OWNER | Saldo de pontos e cashback do cliente |
| GET | /loyalty/:customerId/transactions | MANAGER, OWNER | Extrato de pontos e cashback |
| POST | /loyalty/:customerId/redeem | WAITER, MANAGER | Resgatar pontos por desconto |
| POST | /loyalty/:customerId/adjust | OWNER | Ajuste manual de pontos (bonus/correção) |
| GET | /loyalty/config | MANAGER, OWNER | Configuração atual de pontos e cashback |
| PUT | /loyalty/config | OWNER | Atualizar configuração |

## **Cupons**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /coupons | MANAGER, OWNER | Listar cupons (ativos, expirados, esgotados) |
| POST | /coupons | MANAGER, OWNER | Criar novo cupom |
| PUT | /coupons/:id | MANAGER, OWNER | Editar cupom (se não usado) |
| DELETE | /coupons/:id | OWNER | Desativar cupom |
| POST | /coupons/validate | WAITER, MANAGER, PUBLIC | Validar código de cupom (retorna desconto ou erro) |
| POST | /coupons/redeem | WAITER, MANAGER, PUBLIC | Resgatar cupom em um Check |

## **Reservas**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /reservations | WAITER, MANAGER, OWNER | Listar reservas (filtro: data, status) |
| POST | /reservations | WAITER, MANAGER, PUBLIC | Criar reserva |
| PUT | /reservations/:id/confirm | MANAGER | Confirmar reserva |
| PUT | /reservations/:id/cancel | WAITER, MANAGER, PUBLIC | Cancelar reserva |
| PUT | /reservations/:id/check-in | WAITER, MANAGER | Check-in (vincula ao Check) |
| GET | /reservations/availability | PUBLIC | Horários disponíveis para data e nº de pessoas |

# **Estrutura de Arquivos**

apps/api/src/modules/crm/  
├── crm.routes.ts                 \# Registro de rotas de Customer/Profile  
├── customer-profile.service.ts    \# CRUD, historico, RFM, LGPD  
├── crm.schemas.ts                \# Schemas Zod  
├── rfm.calculator.ts             \# Calculo de RFM scores e segmentos  
├── rfm.scheduler.ts              \# Job diario de recalculo RFM  
└── \_\_tests\_\_/  
    ├── customer-profile.test.ts  
    └── rfm.test.ts

apps/api/src/modules/loyalty/  
├── loyalty.routes.ts             \# Rotas pontos/cashback  
├── loyalty.service.ts            \# Acumulo, resgate, expiracao  
├── loyalty.schemas.ts            \# Schemas Zod  
├── cashback.service.ts           \# Calculo e aplicacao de cashback  
├── expiration.scheduler.ts       \# Job diario de expiracao de pontos  
└── \_\_tests\_\_/  
    ├── loyalty.test.ts  
    └── cashback.test.ts

apps/api/src/modules/coupons/  
├── coupons.routes.ts             \# CRUD \+ validacao \+ resgate  
├── coupons.service.ts            \# Logica de validacao e resgate  
├── coupons.schemas.ts  
└── \_\_tests\_\_/  
    └── coupons.test.ts

apps/api/src/modules/campaigns/  
├── campaigns.routes.ts           \# Criar, preview, enviar  
├── campaigns.service.ts          \# Segmentacao \+ envio via PRD-09  
├── campaigns.schemas.ts  
└── \_\_tests\_\_/  
    └── campaigns.test.ts

apps/api/src/modules/reservations/  
├── reservations.routes.ts  
├── reservations.service.ts       \# Criar, confirmar, check-in, no-show  
├── reservations.schemas.ts  
├── availability.service.ts       \# Calculo de disponibilidade  
└── \_\_tests\_\_/  
    └── reservations.test.ts

apps/web-owner/src/  
├── pages/  
│   ├── CRMDashboard.tsx           \# Overview: segmentos, KPIs, top clientes  
│   ├── CustomerList.tsx            \# Lista com busca, filtros por segmento  
│   ├── CustomerDetail.tsx          \# Perfil completo: historico, pontos, visitas  
│   ├── CouponManager.tsx           \# CRUD de cupons  
│   ├── CampaignManager.tsx         \# Criar e enviar campanhas  
│   └── ReservationBoard.tsx        \# Quadro de reservas por data/horario  
├── components/  
│   ├── SegmentChart.tsx            \# Donut chart de segmentos RFM  
│   ├── CustomerCard.tsx            \# Card resumo de cliente  
│   ├── LoyaltyBadge.tsx            \# Badge de tier (BRONZE/SILVER/GOLD/PLATINUM)  
│   ├── PointsHistory.tsx           \# Timeline de transacoes de pontos  
│   ├── CouponCard.tsx              \# Card de cupom com detalhes e status  
│   ├── CampaignPreview.tsx         \# Preview com reach e custo estimado  
│   ├── CampaignResults.tsx         \# Metricas pos-envio  
│   └── ReservationSlot.tsx         \# Slot visual no quadro de reservas  
└── stores/  
    ├── crm.store.ts  
    ├── loyalty.store.ts  
    └── reservations.store.ts

# **Estratégia de Testes**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Cadastro com consentimento | Unit | Customer criado, CustomerConsent registrado |
| Identificação por telefone hash | Unit | Busca por hash retorna Customer correto |
| Identificação por CPF | Unit | Busca por CPF retorna Customer correto |
| RFM cálculo — score correto | Unit | R=5 se \< 7 dias, F=5 se 8+ visitas, M por quintil |
| RFM segmento — CHAMPION | Unit | Score 555 ou 554 \= CHAMPION |
| RFM segmento — AT\_RISK | Unit | R=1-2, F=3-5, M=3-5 \= AT\_RISK |
| Pontos — acúmulo ao pagar | Unit | PointTransaction EARN criada, balance atualizado |
| Pontos — tier multiplier | Unit | GOLD acumula 1.5x pontos |
| Pontos — resgate | Unit | PointTransaction REDEEM, balance decrementado, desconto no Check |
| Pontos — expiração | Unit | Job expira pontos antigos, balance atualizado |
| Pontos — FIFO resgate | Unit | Pontos mais antigos consumidos primeiro |
| Cashback — crédito | Unit | CashbackTransaction CREDIT, balance atualizado |
| Cashback — category rates | Unit | Taxa diferente por categoria aplicada corretamente |
| Cashback — não combina com cupom | Unit | Rejeita se Check já tem cupom aplicado |
| Cupom PERCENTAGE — com teto | Unit | Desconto \= min(total \* %, maxDiscount) |
| Cupom FREE\_ITEM | Unit | Produto adicionado gratuitamente ao Check |
| Cupom — uso máximo atingido | Unit | Rejeita com mensagem específica |
| Cupom — segmento errado | Unit | Rejeita: "Cupom não disponível para seu perfil" |
| Campanha — preview reach | Unit | Contagem correta de clientes no segmento |
| Campanha — envio segmentado | Integration | Mensagens enfileiradas para clientes do segmento |
| Campanha — métricas | Unit | Delivery, read, conversion calculados corretamente |
| Reserva — criar e confirmar | Unit | Status PENDING → CONFIRMED, notificação enviada |
| Reserva — no-show automático | Unit | 30min após horário: CONFIRMED → NO\_SHOW |
| Reserva — check-in vincula Check | Unit | Check aberto na mesa linkado à Reservation |
| Reserva — disponibilidade | Unit | Calcula mesas livres considerando duração |
| LGPD — exportar dados | Unit | JSON completo com todos os dados do cliente |
| LGPD — esquecer | Unit | Dados anonimizados, consentimentos revogados, loyalty desativada |
| LGPD — revogar marketing | Unit | Para de receber campanhas, upsell continua se loyalty ativo |

# **Impacto Downstream e Riscos**

## **Dependências de Entrada**

| PRD | O que fornece para PRD-11 |
| :---- | :---- |
| PRD-03 | Cardápio digital: canal de identificação (CPF na nota), cupom no checkout, consulta de pontos |
| PRD-09 | WhatsApp: canal de identificação (telefone), envio de campanhas, lembretes de reserva, notificações de fidelidade |
| PRD-02 | Check com pagamento: trigger para acumular pontos/cashback |
| PRD-06 | NFC-e: CPF do cliente na nota pode identificar/cadastrar |

## **Módulos que Dependem de PRD-11**

| PRD | Como Usa CRM |
| :---- | :---- |
| PRD-10 | Dashboard BI: métricas de CRM (LTV, retenção, churn). Segmentos no BI avançado. |
| PRD-12 | Pessoas: comissão de garçom inclui upsell de fidelidade. Meta de cadastros. |
| PRD-09 | Upsell personalizado baseado em preferências do perfil do cliente. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Baixa adesão ao programa de pontos | Alta | Médio | Facilitar cadastro (1 toque no WhatsApp). Bônus na primeira visita. Garçom incentivado. |
| LGPD violação | Baixa | Crítico | Consentimento granular obrigatório. Forget funcional. Auditoria de acesso a dados pessoais. |
| Cupons abusados (fraude) | Média | Médio | maxUsesPerCustomer. Códigos únicos. Tracking de resgates. Alertas de uso anormal. |
| Campanha marcada como spam pela Meta | Média | Alto | Respeitar opt-out. Limitar frequência. Templates aprovados. Quiet hours. |
| Reservas não honradas (no-show alto) | Alta | Baixo | Tracking de no-show. Confirmação 2h antes. No-show flag no perfil. |
| Complexidade do schema (6 novos models) | Média | Médio | Migration separada do PRD-01. Todos os campos opcionais. Rollback possível. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| RFM por quintis (não fixo) | Thresholds fixos para Monetary | Cada bar tem ticket médio diferente. Quintis adaptam automaticamente. |
| Pontos \+ Cashback separados | Sistema unificado | São lógicas diferentes. Pontos \= gamificação. Cashback \= valor direto. Dono pode ter só um. |
| Anonimizar (não deletar) | Hard delete | Integridade financeira. Check referencia customerId. Anonimizar preserva histórico financeiro sem PII. |
| Reserva via WhatsApp \+ Web | Só telefone | WhatsApp é mais natural para o público. Web cobre quem não usa WhatsApp. Funcionário cobre walk-in. |
| Cupom com regras flexíveis | Apenas desconto percentual | Mercado F\&B usa muitos formatos: "chopp gratis", "compre 3 leve 4". Flexibilidade \= mais criatividade. |
| Campanha com janela de atribuição 48h | Sem tracking de conversão | Dono precisa saber se campanha funcionou. 48h é janela razoável para bar (volta no fim de semana). |

# **Sequência de Implementação (3 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Schema: migration com 6 novos models \+ modificações Customer. Backend: CustomerProfileService (CRUD, identificação, histórico), RFM calculator \+ scheduler, LGPD (exportar, esquecer). Frontend: CustomerList, CustomerDetail. | Clientes identificados e rastreados. RFM funcional. Histórico de consumo. LGPD completo. Dashboard CRM básico. |
| Sprint 2 | Backend: LoyaltyService (pontos \+ cashback \+ tiers \+ expiração), CouponService (CRUD \+ validação \+ resgate). Frontend: LoyaltyBadge, PointsHistory, CouponManager, CouponCard. Web-menu: saldo de pontos e campo de cupom. | Programa de fidelidade funcional end-to-end. Cupons criados, distribuídos e resgatados. Cliente vê saldo no cardápio digital. |
| Sprint 3 | Backend: CampaignService (segmentação, envio via PRD-09, métricas), ReservationService (criar, confirmar, check-in, no-show, disponibilidade). Frontend: CampaignManager, CampaignResults, ReservationBoard. Testes E2E. | Campanhas segmentadas via WhatsApp. Reservas com confirmação e check-in. Métricas de campanha. Sistema CRM completo e polido. |

OASYS PRD-11 — CRM & Fidelização  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*