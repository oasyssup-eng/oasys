

**OASYS**

Sistema Operacional para Bares de Alto Volume

**PRD-01 — Schema Foundation**

Prisma Models, Enums, Campos Fiscais, OrderPolicy

| Campo | Valor |
| :---- | :---- |
| Versão | 1.0 |
| Data | 02 de Março de 2026 |
| Fase | Phase 1 — Go-Live |
| Sprints Estimados | 1 sprint |
| Complexidade | Média |
| Cobertura Atual | \~30% |
| Dependências | Nenhuma (módulo raiz) |
| Autor | Claude (Opus 4.6) — Geração Automatizada |
| Classificação | Documento confidencial — Uso interno |

# **Índice**

# **Resumo Executivo**

PRD-01 (Schema Foundation) é o alicerce de todo o OASYS. Este documento especifica todas as alterações necessárias no schema Prisma para suportar as features de Phase 1 — Go-Live. Sem um schema correto e completo, cada módulo construído sobre ele carregará tech debt que se acumula exponencialmente.

O schema atual tem 26 models e 14 enums com \~30% de cobertura para as necessidades de Phase 1\. Este PRD adiciona 7 novos models, 5 novos enums, e expande 6 models existentes. Ao final, o schema suportará pagamentos, caixa registradora, estoque básico, notas fiscais, políticas de pedido e campos de compliance fiscal brasileiro.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Models | 7 | CashRegister, CashRegisterOperation, StockItem, StockMovement, ProductIngredient, FiscalNote, PriceSchedule |
| Models Modificados | 6 | Unit, Employee, Order, Cancellation, Check, Product |
| Novos Enums | 5 | OrderPolicy, CashRegisterStatus, MovementType, FiscalNoteStatus, PaymentStatus |
| Enums Modificados | 2 | OrderStatus (add HELD), PaymentMethod (add VOUCHER) |
| Seed Data | 1 suite | Bar fictício completo com dados realistas brasileiros |

## **Critério de Sucesso (Done Definition)**

O PRD-01 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Migrations aplicadas sem erro no PostgreSQL local e em staging.

2\. Seed atualizado com dados realistas e executável sem erro.

3\. Zero erros de tipo (tsc \--noEmit) no monorepo inteiro — incluindo apps/api, apps/web-owner, apps/web-waiter e apps/web-kds.

4\. Schema suporta todas as features de PRD-02 até PRD-08 sem necessidade de nova migration.

5\. Nenhum model ou campo órfão — tudo tem relação ou uso documentado.

# **Estado Atual do Schema**

O schema Prisma existente contém 26 models e 14 enums, totalizando \~714 linhas. A arquitetura multi-tenant (Organization → Unit → recursos) está correta, e o isolamento por unitId está aplicado nas queries da API.

## **Models Existentes (26)**

| Model | Status | Notas |
| :---- | :---- | :---- |
| Organization | OK | Raiz do multi-tenant |
| Unit | MODIFICAR | Faltam campos fiscais (CNPJ, IE, endereço completo), serviceFeeRate, orderPolicy |
| Employee | MODIFICAR | Faltam cpf, email, phone, isActive, hiredAt |
| Customer | OK | Tem phone hashing, LGPD consent tracking |
| CustomerConsent | OK | Consentimento granular funcional |
| WhatsAppSession | OK | State machine completa |
| Table (mesa) | OK | Vinculado a Zone e Layout |
| Zone | OK | Zonas de mesas por andar |
| Layout | OK | SVG canvas para mapa de mesas |
| Check | MODIFICAR | Faltam serviceFeeAmount, tipAmount, splitParentId |
| Order | MODIFICAR | Faltam orderNumber sequencial, courseType, holdUntil |
| OrderItem | OK | Tem notes, quantidade, preço |
| Product | MODIFICAR | Faltam isAvailable (bool), sortOrder, tags |
| Category | OK | Categorias de cardápio |
| Modifier | OK | Adicionais e variações |
| ModifierGroup | OK | Agrupamento de modificadores |
| Payment | OK | Schema existe, módulo vazio |
| Cancellation | MODIFICAR | Falta authorizedBy (aprovação dual) |
| FloatingAccount | OK | Conta flutuante com pickupCode |
| DailyReport | OK | Schema existe, nunca populado |
| Alert | OK | Alertas configuráveis |
| AuditLog | OK | Existe com \~1% cobertura |
| Notification | OK | Base para notificações |
| KDSStation | OK | Implícito via enum no code |
| EmployeeStats | OK | Stats agregadas |
| HourlyRevenue | OK | Revenue por hora |

# **Novos Enums**

Os enums abaixo devem ser adicionados ao schema.prisma. Cada enum é documentado com seu propósito e valores.

## **OrderPolicy**

Define a política de pagamento do estabelecimento. Configurado por Unit — permite que cada unidade opere de forma diferente.

| Valor | Descrição | Uso |
| :---- | :---- | :---- |
| PRE\_PAYMENT | Cliente paga antes do pedido entrar na produção | Bar lotado com cliente em pé — reduz calote |
| POST\_PAYMENT | Cliente paga ao fechar a conta (modelo tradicional) | Restaurante com mesa, modelo clássico |
| HYBRID | Pré-pagamento para balcão/takeout, pós para mesa | Flexibilidade por canal de atendimento |

## **CashRegisterStatus**

Ciclo de vida do caixa registradora. Cada caixa tem abertura, operação e fechamento com reconciliação.

| Valor | Descrição |
| :---- | :---- |
| OPEN | Caixa aberto e aceitando operações |
| CLOSED | Caixa fechado com reconciliação completa |
| SUSPENDED | Caixa suspenso temporariamente (troca de turno) |

## **MovementType**

Tipos de movimentação de estoque. Cada movimento registra entrada, saída, ajuste ou perda.

| Valor | Descrição | Exemplo |
| :---- | :---- | :---- |
| IN | Entrada de estoque (compra, recebimento) | Recebeu 50L de chopp |
| OUT | Saída por venda (automática) | Vendeu 300ml de chopp |
| ADJUSTMENT | Ajuste de inventário (contagem física) | Inventário encontrou 48L em vez de 50L |
| LOSS | Perda (quebra, vencimento, furto) | Garrafa quebrou |
| TRANSFER | Transferência entre depósitos | Moveu do estoque para o bar |

## **FiscalNoteStatus**

Status de emissão da nota fiscal eletrônica (NFC-e) via FocusNFe.

| Valor | Descrição |
| :---- | :---- |
| PENDING | Aguardando envio ao SEFAZ |
| PROCESSING | Enviada, aguardando retorno |
| AUTHORIZED | Autorizada pelo SEFAZ — nota válida |
| REJECTED | Rejeitada pelo SEFAZ — precisa correção |
| CANCELLED | Cancelada (dentro do prazo legal) |
| ERROR | Erro de comunicação ou processamento |

## **PaymentStatus**

Status do ciclo de vida de um pagamento. Complementa o PaymentMethod existente.

| Valor | Descrição |
| :---- | :---- |
| PENDING | Pagamento iniciado, aguardando confirmação |
| CONFIRMED | Pagamento confirmado (webhook ou manual) |
| FAILED | Falha no processamento |
| REFUNDED | Estornado ao cliente |
| CANCELLED | Cancelado antes de confirmação |

## **Enums Modificados**

Adições a enums existentes:

| Enum | Novo Valor | Razão |
| :---- | :---- | :---- |
| OrderStatus | HELD | Pedido retido ('segurar pedido') — não vai para produção até ser liberado |
| PaymentMethod | VOUCHER | Pagamento via voucher/vale alimentação |
| OrderStatus | CANCELLED | Necessário para cancelamento formal de pedidos individuais |

# **Models Existentes — Modificações**

Campos a adicionar em models existentes. Todos os novos campos devem ter valor default ou ser opcionais para não quebrar migrations em banco com dados.

## **Unit — Campos Fiscais e Operacionais**

A Unit precisa suportar compliance fiscal brasileiro e políticas operacionais por estabelecimento.

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| cnpj | String? | Não | null | CNPJ do estabelecimento (14 dígitos, sem formatação) |
| stateRegistration | String? | Não | null | Inscrição Estadual (IE) para NFC-e |
| legalName | String? | Não | null | Razão social para nota fiscal |
| streetAddress | String? | Não | null | Logradouro completo |
| addressNumber | String? | Não | null | Número do endereço |
| addressComplement | String? | Não | null | Complemento (sala, andar) |
| neighborhood | String? | Não | null | Bairro |
| city | String? | Não | null | Cidade |
| state | String? | Não | null | UF (2 chars) |
| zipCode | String? | Não | null | CEP (8 dígitos) |
| ibgeCode | String? | Não | null | Código IBGE do município (7 dígitos) — obrigatório para NFC-e |
| orderPolicy | OrderPolicy | Sim | POST\_PAYMENT | Política de pagamento do estabelecimento |
| serviceFeeRate | Decimal? | Não | null | Taxa de serviço (ex: 0.10 \= 10%) |
| tipSuggestions | String? | Não | null | JSON array de sugestões de gorjeta: \[10, 12, 15\] |
| operatingHoursStart | String? | Não | null | Horário de abertura (HH:mm) |
| operatingHoursEnd | String? | Não | null | Horário de fechamento (HH:mm) |

## **Employee — Dados Pessoais e Status**

Expandir Employee para suportar gestão de pessoas, comissões e compliance trabalhista.

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| cpf | String? | Não | null | CPF do funcionário (11 dígitos) |
| email | String? | Não | null | E-mail para notificações e login futuro |
| phone | String? | Não | null | Telefone do funcionário |
| isActive | Boolean | Sim | true | Soft delete — funcionário desativado não aparece |
| hiredAt | DateTime? | Não | null | Data de contratação |
| terminatedAt | DateTime? | Não | null | Data de desligamento |

## **Order — Sequência e Controle de Fluxo**

Order precisa de número sequencial para senhas de retirada, tipo de curso para sequenciamento de produção, e suporte a hold.

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| orderNumber | Int | Sim | autoincrement() | Número sequencial do pedido (diário, reinicia por unit) |
| courseType | String? | Não | null | Tipo: STARTER, MAIN, DESSERT, DRINK — para sequenciamento KDS |
| holdUntil | DateTime? | Não | null | Horário para liberar pedido retido (HELD) |
| deliveredAt | DateTime? | Não | null | Timestamp de confirmação de entrega |
| deliveredBy | String? | Não | null | Employee ID que confirmou entrega |
| notifiedAt | DateTime? | Não | null | Timestamp de notificação ao cliente (evita duplicata) |
| source | String? | Não | null | Canal de origem: WEB\_MENU, WHATSAPP, WAITER, POS |

## **Cancellation — Aprovação Dual**

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| authorizedBy | String? | Não | null | ID do gerente/dono que aprovou o cancelamento |
| authorizedAt | DateTime? | Não | null | Timestamp da aprovação |

## **Check — Taxas e Divisão**

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| serviceFeeAmount | Decimal? | Não | null | Valor calculado da taxa de serviço |
| tipAmount | Decimal? | Não | null | Valor da gorjeta |
| splitParentId | String? | Não | null | ID do Check pai quando dividido |
| mergedIntoId | String? | Não | null | ID do Check destino quando contas foram juntadas |
| discountAmount | Decimal? | Não | null | Valor total de desconto aplicado |
| discountReason | String? | Não | null | Motivo do desconto |

## **Product — Disponibilidade e Ordenação**

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| isAvailable | Boolean | Sim | true | Controle manual de disponibilidade (estoque automático sobrescreve) |
| sortOrder | Int | Sim | 0 | Ordem de exibição no cardápio |
| tags | String? | Não | null | JSON array de tags: \["vegano", "sem gluten", "picante"\] |
| imageUrl | String? | Não | null | URL da imagem do produto para cardápio digital |
| preparationTime | Int? | Não | null | Tempo estimado de preparo em minutos |
| station | String? | Não | null | Estação KDS: BAR, KITCHEN, GRILL, DESSERT |

## **Payment — Status e Referência Externa**

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| status | PaymentStatus | Sim | PENDING | Status do ciclo de vida do pagamento |
| externalId | String? | Não | null | ID da transação no gateway (Pagar.me) |
| pixQrCode | String? | Não | null | Payload do QR Code PIX |
| pixQrCodeBase64 | String? | Não | null | QR Code PIX em base64 para exibição |
| paymentUrl | String? | Não | null | URL de pagamento (cartão online) |
| expiresAt | DateTime? | Não | null | Expiração do link/QR de pagamento |
| paidAt | DateTime? | Não | null | Timestamp de confirmação efetiva do pagamento |
| cashRegisterId | String? | Não | null | FK para CashRegister (qual caixa processou) |
| metadata | String? | Não | null | JSON com dados adicionais do gateway |

# **Novos Models**

Models inteiramente novos que devem ser adicionados ao schema.prisma. Cada model inclui especificação de campos, relações e índices.

## **CashRegister — Caixa Registradora**

Infraestrutura de caixa, não feature. Todo pagamento é vinculado a um CashRegister. Suporta tipo OPERATOR (caixa humano) e DIGITAL (automático para pagamentos online).

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| id | String @id @default(cuid()) | Sim | auto | Identificador único |
| unitId | String | Sim | \- | FK para Unit |
| employeeId | String? | Não | null | Operador responsável (null se DIGITAL) |
| type | String | Sim | \- | OPERATOR ou DIGITAL |
| status | CashRegisterStatus | Sim | OPEN | Estado do caixa |
| openedAt | DateTime | Sim | now() | Abertura do caixa |
| closedAt | DateTime? | Não | null | Fechamento do caixa |
| openingBalance | Decimal @db.Decimal(10,2) | Sim | 0 | Fundo de troco inicial |
| closingBalance | Decimal? @db.Decimal(10,2) | Não | null | Saldo apurado no fechamento |
| expectedBalance | Decimal? @db.Decimal(10,2) | Não | null | Saldo esperado (calculado) |
| difference | Decimal? @db.Decimal(10,2) | Não | null | Diferença (realizado \- esperado) |
| closingNotes | String? | Não | null | Observações do fechamento |

Relações: Unit (belongsTo), Employee (belongsTo), Payment\[\] (hasMany), CashRegisterOperation\[\] (hasMany)

Índices: @@index(\[unitId, status\]) — busca de caixas abertos por unidade

## **CashRegisterOperation — Operações de Caixa**

Registra sangrias, suprimentos e outras operações manuais no caixa. Cada operação tem aprovação e motivo.

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| id | String @id @default(cuid()) | Sim | auto | Identificador único |
| cashRegisterId | String | Sim | \- | FK para CashRegister |
| type | String | Sim | \- | WITHDRAWAL (sangria), SUPPLY (suprimento), ADJUSTMENT |
| amount | Decimal @db.Decimal(10,2) | Sim | \- | Valor da operação |
| reason | String | Sim | \- | Motivo obrigatório |
| employeeId | String | Sim | \- | Quem executou |
| authorizedBy | String? | Não | null | Quem autorizou (se requer aprovação) |
| createdAt | DateTime | Sim | now() | Timestamp |

## **StockItem — Item de Estoque**

Cada insumo rastreável no estoque. Vinculado a Unit para multi-tenant. Suporta unidades diversas (ml, g, unidade).

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| id | String @id @default(cuid()) | Sim | auto | Identificador único |
| unitId | String | Sim | \- | FK para Unit |
| name | String | Sim | \- | Nome do insumo (ex: Chopp Pilsen) |
| sku | String? | Não | null | Código de barras / SKU |
| quantity | Decimal @db.Decimal(10,3) | Sim | 0 | Quantidade atual em estoque |
| unitType | String | Sim | \- | UN, KG, L, ML, G, DOSE |
| minQuantity | Decimal? @db.Decimal(10,3) | Não | null | Quantidade mínima (alerta) |
| costPrice | Decimal? @db.Decimal(10,2) | Não | null | Custo unitário atual |
| supplierId | String? | Não | null | Fornecedor principal (futuro) |
| isActive | Boolean | Sim | true | Soft delete |
| createdAt | DateTime | Sim | now() | Criação |
| updatedAt | DateTime @updatedAt | Sim | auto | Última atualização |

Relações: Unit (belongsTo), StockMovement\[\] (hasMany), ProductIngredient\[\] (hasMany)

Índices: @@index(\[unitId, isActive\]), @@unique(\[unitId, sku\])

## **StockMovement — Movimentação de Estoque**

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| id | String @id @default(cuid()) | Sim | auto | Identificador único |
| stockItemId | String | Sim | \- | FK para StockItem |
| type | MovementType | Sim | \- | Tipo de movimentação |
| quantity | Decimal @db.Decimal(10,3) | Sim | \- | Quantidade movimentada (sempre positivo) |
| reason | String? | Não | null | Motivo (obrigatório para ADJUSTMENT e LOSS) |
| reference | String? | Não | null | Referência: orderId, purchaseId, etc. |
| employeeId | String? | Não | null | Quem executou |
| costPrice | Decimal? @db.Decimal(10,2) | Não | null | Custo unitário neste movimento |
| createdAt | DateTime | Sim | now() | Timestamp |

Relação: StockItem (belongsTo)

Índice: @@index(\[stockItemId, createdAt\])

## **ProductIngredient — Link Produto → Insumo**

Vincula um produto do cardápio aos seus insumos com a quantidade consumida por unidade vendida. Essencial para baixa automática de estoque e cálculo de CMV.

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| id | String @id @default(cuid()) | Sim | auto | Identificador único |
| productId | String | Sim | \- | FK para Product |
| stockItemId | String | Sim | \- | FK para StockItem |
| quantity | Decimal @db.Decimal(10,3) | Sim | \- | Quantidade consumida por unidade vendida |

Relações: Product (belongsTo), StockItem (belongsTo)

Índice: @@unique(\[productId, stockItemId\])

## **FiscalNote — Nota Fiscal Eletrônica**

Armazena dados e status de notas fiscais emitidas via FocusNFe. Requisito legal — XML deve ser mantido por 5 anos.

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| id | String @id @default(cuid()) | Sim | auto | Identificador único |
| unitId | String | Sim | \- | FK para Unit |
| checkId | String | Sim | \- | FK para Check |
| externalRef | String | Sim | \- | Referência única enviada ao FocusNFe |
| status | FiscalNoteStatus | Sim | PENDING | Status de emissão |
| type | String | Sim | NFCE | NFCE ou NFE |
| number | String? | Não | null | Número da nota fiscal (retornado pelo SEFAZ) |
| series | String? | Não | null | Série da nota |
| accessKey | String? | Não | null | Chave de acesso (44 dígitos) |
| xml | String? | Não | null | XML completo da nota (legal: manter 5 anos) |
| danfeUrl | String? | Não | null | URL do DANFE para visualização |
| totalAmount | Decimal @db.Decimal(10,2) | Sim | \- | Valor total da nota |
| customerCpf | String? | Não | null | CPF do cliente (opcional na NFC-e) |
| errorMessage | String? | Não | null | Mensagem de erro se rejeitada |
| issuedAt | DateTime? | Não | null | Data de autorização pelo SEFAZ |
| cancelledAt | DateTime? | Não | null | Data de cancelamento |
| createdAt | DateTime | Sim | now() | Criação |

Relações: Unit (belongsTo), Check (belongsTo)

Índices: @@index(\[unitId, status\]), @@unique(\[unitId, externalRef\])

## **PriceSchedule — Preço por Horário (Happy Hour)**

Permite variação de preço por dia da semana e faixa horária. Quando ativo, sobrescreve o preço base do Product.

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| id | String @id @default(cuid()) | Sim | auto | Identificador único |
| productId | String | Sim | \- | FK para Product |
| unitId | String | Sim | \- | FK para Unit |
| dayOfWeek | Int | Sim | \- | 0=Dom, 1=Seg ... 6=Sab |
| startTime | String | Sim | \- | HH:mm (ex: 17:00) |
| endTime | String | Sim | \- | HH:mm (ex: 19:00) |
| price | Decimal @db.Decimal(10,2) | Sim | \- | Preço promocional |
| label | String? | Não | null | Ex: 'Happy Hour', 'Dobradinha de Terça' |
| isActive | Boolean | Sim | true | Ativar/desativar sem deletar |

Relações: Product (belongsTo), Unit (belongsTo)

Índice: @@index(\[unitId, productId, dayOfWeek\])

# **Prisma Schema — Blocos de Código**

Blocos Prisma prontos para cópia. Copie cada bloco diretamente para packages/database/prisma/schema.prisma.

## **Novos Enums**

enum OrderPolicy {  
  PRE\_PAYMENT  
  POST\_PAYMENT  
  HYBRID  
}  
   
enum CashRegisterStatus {  
  OPEN  
  CLOSED  
  SUSPENDED  
}  
   
enum MovementType {  
  IN  
  OUT  
  ADJUSTMENT  
  LOSS  
  TRANSFER  
}  
   
enum FiscalNoteStatus {  
  PENDING  
  PROCESSING  
  AUTHORIZED  
  REJECTED  
  CANCELLED  
  ERROR  
}  
   
enum PaymentStatus {  
  PENDING  
  CONFIRMED  
  FAILED  
  REFUNDED  
  CANCELLED  
}

## **Adicionar ao OrderStatus existente**

// Adicionar estes valores ao enum OrderStatus existente:  
// HELD       — pedido retido, não vai para produção  
// CANCELLED  — pedido cancelado formalmente

## **Model CashRegister**

model CashRegister {  
  id              String              @id @default(cuid())  
  unitId          String  
  unit            Unit                @relation(fields: \[unitId\], references: \[id\])  
  employeeId      String?  
  employee        Employee?           @relation(fields: \[employeeId\], references: \[id\])  
  type            String              // OPERATOR | DIGITAL  
  status          CashRegisterStatus  @default(OPEN)  
  openedAt        DateTime            @default(now())  
  closedAt        DateTime?  
  openingBalance  Decimal             @default(0) @db.Decimal(10, 2\)  
  closingBalance  Decimal?            @db.Decimal(10, 2\)  
  expectedBalance Decimal?            @db.Decimal(10, 2\)  
  difference      Decimal?            @db.Decimal(10, 2\)  
  closingNotes    String?  
  payments        Payment\[\]  
  operations      CashRegisterOperation\[\]  
  createdAt       DateTime            @default(now())  
  updatedAt       DateTime            @updatedAt  
   
  @@index(\[unitId, status\])  
}

## **Model CashRegisterOperation**

model CashRegisterOperation {  
  id              String        @id @default(cuid())  
  cashRegisterId  String  
  cashRegister    CashRegister  @relation(fields: \[cashRegisterId\], references: \[id\])  
  type            String        // WITHDRAWAL | SUPPLY | ADJUSTMENT  
  amount          Decimal       @db.Decimal(10, 2\)  
  reason          String  
  employeeId      String  
  employee        Employee      @relation(fields: \[employeeId\], references: \[id\])  
  authorizedBy    String?  
  createdAt       DateTime      @default(now())  
}

## **Model StockItem**

model StockItem {  
  id            String              @id @default(cuid())  
  unitId        String  
  unit          Unit                @relation(fields: \[unitId\], references: \[id\])  
  name          String  
  sku           String?  
  quantity      Decimal             @default(0) @db.Decimal(10, 3\)  
  unitType      String              // UN | KG | L | ML | G | DOSE  
  minQuantity   Decimal?            @db.Decimal(10, 3\)  
  costPrice     Decimal?            @db.Decimal(10, 2\)  
  supplierId    String?  
  isActive      Boolean             @default(true)  
  movements     StockMovement\[\]  
  ingredients   ProductIngredient\[\]  
  createdAt     DateTime            @default(now())  
  updatedAt     DateTime            @updatedAt  
   
  @@index(\[unitId, isActive\])  
  @@unique(\[unitId, sku\])  
}

## **Model StockMovement**

model StockMovement {  
  id            String        @id @default(cuid())  
  stockItemId   String  
  stockItem     StockItem     @relation(fields: \[stockItemId\], references: \[id\])  
  type          MovementType  
  quantity      Decimal       @db.Decimal(10, 3\)  
  reason        String?  
  reference     String?       // orderId, purchaseId, etc  
  employeeId    String?  
  costPrice     Decimal?      @db.Decimal(10, 2\)  
  createdAt     DateTime      @default(now())  
   
  @@index(\[stockItemId, createdAt\])  
}

## **Model ProductIngredient**

model ProductIngredient {  
  id            String      @id @default(cuid())  
  productId     String  
  product       Product     @relation(fields: \[productId\], references: \[id\])  
  stockItemId   String  
  stockItem     StockItem   @relation(fields: \[stockItemId\], references: \[id\])  
  quantity      Decimal     @db.Decimal(10, 3\) // qty consumed per unit sold  
   
  @@unique(\[productId, stockItemId\])  
}

## **Model FiscalNote**

model FiscalNote {  
  id            String            @id @default(cuid())  
  unitId        String  
  unit          Unit              @relation(fields: \[unitId\], references: \[id\])  
  checkId       String  
  check         Check             @relation(fields: \[checkId\], references: \[id\])  
  externalRef   String  
  status        FiscalNoteStatus  @default(PENDING)  
  type          String            @default("NFCE") // NFCE | NFE  
  number        String?  
  series        String?  
  accessKey     String?  
  xml           String?           @db.Text  
  danfeUrl      String?  
  totalAmount   Decimal           @db.Decimal(10, 2\)  
  customerCpf   String?  
  errorMessage  String?  
  issuedAt      DateTime?  
  cancelledAt   DateTime?  
  createdAt     DateTime          @default(now())  
   
  @@index(\[unitId, status\])  
  @@unique(\[unitId, externalRef\])  
}

## **Model PriceSchedule**

model PriceSchedule {  
  id          String    @id @default(cuid())  
  productId   String  
  product     Product   @relation(fields: \[productId\], references: \[id\])  
  unitId      String  
  unit        Unit      @relation(fields: \[unitId\], references: \[id\])  
  dayOfWeek   Int       // 0=Sun, 1=Mon ... 6=Sat  
  startTime   String    // HH:mm  
  endTime     String    // HH:mm  
  price       Decimal   @db.Decimal(10, 2\)  
  label       String?  
  isActive    Boolean   @default(true)  
   
  @@index(\[unitId, productId, dayOfWeek\])  
}

# **Seed Data — Bar Fictício Brasileiro**

O seed deve criar um cenário realista de um bar de alto volume em São Paulo. Os dados devem ser suficientes para testar todas as features de Phase 1 sem precisar de entrada manual.

## **Organization & Unit**

| Campo | Valor |
| :---- | :---- |
| Organization.name | Boteco do Zé Ltda |
| Organization.slug | boteco-do-ze |
| Unit.name | Boteco do Zé — Pinheiros |
| Unit.slug | pinheiros |
| Unit.cnpj | 12345678000199 |
| Unit.stateRegistration | 123456789012 |
| Unit.legalName | Boteco do Zé Comércio de Bebidas Ltda |
| Unit.streetAddress | Rua dos Pinheiros |
| Unit.addressNumber | 1234 |
| Unit.neighborhood | Pinheiros |
| Unit.city | São Paulo |
| Unit.state | SP |
| Unit.zipCode | 05422012 |
| Unit.ibgeCode | 3550308 |
| Unit.orderPolicy | POST\_PAYMENT |
| Unit.serviceFeeRate | 0.10 |
| Unit.tipSuggestions | \[10, 12, 15\] |
| Unit.operatingHoursStart | 17:00 |
| Unit.operatingHoursEnd | 02:00 |

## **Employees (6)**

| Nome | Role | PIN | CPF | Contexto |
| :---- | :---- | :---- | :---- | :---- |
| Carlos Silva | OWNER | 1234 | 11122233344 | Dono do bar, acesso total |
| Maria Oliveira | MANAGER | 5678 | 22233344455 | Gerente de operações |
| João Santos | WAITER | 1111 | 33344455566 | Garçom zona A (mesas 1-8) |
| Ana Costa | WAITER | 2222 | 44455566677 | Garçom zona B (mesas 9-16) |
| Pedro Lima | BARTENDER | 3333 | 55566677788 | Bartender principal |
| Lucia Ferreira | CASHIER | 4444 | 66677788899 | Caixa |

## **Categories & Products**

Cardápio realista com 4 categorias e 20 produtos, incluindo preços de mercado SP 2026\.

| Categoria | Produto | Preço (R$) | Estação KDS | Tempo Preparo |
| :---- | :---- | :---- | :---- | :---- |
| Cervejas | Chopp Pilsen 300ml | 12.90 | BAR | 1 min |
| Cervejas | Chopp Pilsen 500ml | 18.90 | BAR | 1 min |
| Cervejas | IPA Artesanal 300ml | 16.90 | BAR | 1 min |
| Cervejas | Heineken Long Neck | 14.90 | BAR | 1 min |
| Cervejas | Brahma Lata | 8.90 | BAR | 1 min |
| Drinks | Caipirinha Limão | 22.90 | BAR | 3 min |
| Drinks | Caipirinha Maracujá | 24.90 | BAR | 3 min |
| Drinks | Gin Tônica | 28.90 | BAR | 2 min |
| Drinks | Moscow Mule | 32.90 | BAR | 3 min |
| Drinks | Aperol Spritz | 29.90 | BAR | 2 min |
| Petiscos | Porção de Fritas | 28.90 | KITCHEN | 12 min |
| Petiscos | Bolinho de Bacalhau (6un) | 34.90 | KITCHEN | 15 min |
| Petiscos | Linguiça Acebolada | 38.90 | KITCHEN | 10 min |
| Petiscos | Torresmo | 32.90 | KITCHEN | 8 min |
| Petiscos | Bruschetta (4un) | 26.90 | KITCHEN | 8 min |
| Sem Álcool | Água Mineral 500ml | 5.90 | BAR | 0 min |
| Sem Álcool | Refrigerante Lata | 7.90 | BAR | 0 min |
| Sem Álcool | Suco Natural Laranja | 12.90 | BAR | 3 min |
| Sem Álcool | Água Tônica | 8.90 | BAR | 0 min |
| Sem Álcool | Red Bull | 18.90 | BAR | 0 min |

## **StockItems (15 insumos)**

| Insumo | Unidade | Qtd Inicial | Mínimo | Custo Unit. |
| :---- | :---- | :---- | :---- | :---- |
| Chopp Pilsen (barril 50L) | L | 100.000 | 20.000 | R$ 4.50/L |
| IPA Artesanal (barril 30L) | L | 30.000 | 10.000 | R$ 8.00/L |
| Heineken Long Neck | UN | 120 | 24 | R$ 5.50 |
| Brahma Lata | UN | 200 | 48 | R$ 2.80 |
| Cachaça 51 (1L) | ML | 5000 | 1000 | R$ 0.015/ML |
| Limão Taiti | UN | 100 | 20 | R$ 0.50 |
| Maracujá | UN | 40 | 10 | R$ 1.20 |
| Gin Gordon's (1L) | ML | 3000 | 500 | R$ 0.06/ML |
| Tônica Schweppes (350ml) | UN | 80 | 24 | R$ 3.50 |
| Batata Congelada (kg) | KG | 20.000 | 5.000 | R$ 12.00/KG |
| Bacalhau Desfiado (kg) | KG | 5.000 | 2.000 | R$ 85.00/KG |
| Linguiça Calabresa (kg) | KG | 8.000 | 3.000 | R$ 22.00/KG |
| Água Mineral 500ml | UN | 150 | 48 | R$ 1.20 |
| Refrigerante Lata | UN | 120 | 36 | R$ 2.50 |
| Suco Laranja (L) | L | 15.000 | 5.000 | R$ 6.00/L |

## **ProductIngredient (exemplos de ficha técnica)**

Cada produto deve ter ao menos 1 ingrediente vinculado. Exemplos:

| Produto | Insumo | Qtd por Venda | Lógica |
| :---- | :---- | :---- | :---- |
| Chopp Pilsen 300ml | Chopp Pilsen | 0.350 L | 300ml \+ 50ml de desperdício |
| Chopp Pilsen 500ml | Chopp Pilsen | 0.570 L | 500ml \+ 70ml de desperdício |
| Caipirinha Limão | Cachaça 51 | 60 ML | Dose padrão |
| Caipirinha Limão | Limão Taiti | 2 UN | 2 limões por drink |
| Gin Tônica | Gin Gordon's | 60 ML | Dose padrão |
| Gin Tônica | Tônica Schweppes | 1 UN | 1 garrafa por drink |
| Porção de Fritas | Batata Congelada | 0.400 KG | 400g por porção |
| Heineken Long Neck | Heineken Long Neck | 1 UN | 1:1 direto |

## **Zones, Tables & Layout**

Criar 2 zonas com 16 mesas no total:

| Zona | Mesas | Garçom Responsável |
| :---- | :---- | :---- |
| Salão Principal (zona A) | Mesas 1 a 8 | João Santos |
| Varanda (zona B) | Mesas 9 a 16 | Ana Costa |

## **CashRegister (seed inicial)**

Criar 1 caixa digital (DIGITAL, sempre aberto para pagamentos online) e 1 caixa operador (OPERATOR, aberto por Lucia). O caixa digital é criado automaticamente ao seed e não precisa de abertura manual.

# **Estratégia de Migration**

Todas as alterações devem ser feitas em uma única migration para manter atomicidade. O nome sugerido é:

npx prisma migrate dev \--name "prd01\_schema\_foundation"

## **Ordem de Execução**

1\. Adicionar novos enums (OrderPolicy, CashRegisterStatus, MovementType, FiscalNoteStatus, PaymentStatus).

2\. Adicionar novos valores aos enums existentes (HELD e CANCELLED no OrderStatus, VOUCHER no PaymentMethod).

3\. Adicionar novos campos nos models existentes (todos com default ou nullable — não quebra dados existentes).

4\. Criar novos models (CashRegister, CashRegisterOperation, StockItem, StockMovement, ProductIngredient, FiscalNote, PriceSchedule).

5\. Adicionar índices e unique constraints.

6\. Executar seed atualizado.

## **Checklist de Validação Pós-Migration**

Executar na seguinte ordem após migration:

1\. npx prisma migrate status — confirmar que migration foi aplicada

2\. npx prisma generate — regenerar o Prisma Client

3\. npx prisma db seed — executar seed atualizado

4\. npx tsc \--noEmit (na raiz do monorepo) — zero erros de tipo em todos os packages

5\. Verificar no banco: SELECT count(\*) FROM cada nova tabela — confirmar que seed populou

## **Relações que Devem Ser Adicionadas em Models Existentes**

Além dos campos, as relações reversa devem ser adicionadas:

| Model Existente | Nova Relação | Tipo |
| :---- | :---- | :---- |
| Unit | cashRegisters CashRegister\[\] | hasMany |
| Unit | stockItems StockItem\[\] | hasMany |
| Unit | fiscalNotes FiscalNote\[\] | hasMany |
| Unit | priceSchedules PriceSchedule\[\] | hasMany |
| Employee | cashRegisters CashRegister\[\] | hasMany |
| Employee | cashRegisterOperations CashRegisterOperation\[\] | hasMany |
| Product | ingredients ProductIngredient\[\] | hasMany |
| Product | priceSchedules PriceSchedule\[\] | hasMany |
| Check | fiscalNotes FiscalNote\[\] | hasMany |
| Check | splitChildren Check\[\] (self-relation via splitParentId) | hasMany |
| Payment | cashRegister CashRegister? (via cashRegisterId) | belongsTo |

# **Impacto nos Módulos Downstream**

Este schema foi desenhado para suportar PRD-02 até PRD-08 sem novas migrations. Abaixo, o mapeamento de quais campos cada PRD consumirá:

| PRD | Módulo | Campos/Models que Consume |
| :---- | :---- | :---- |
| PRD-02 | Payments & CashRegister | CashRegister, CashRegisterOperation, Payment.status/externalId/pixQrCode/paymentUrl/cashRegisterId, PaymentStatus enum |
| PRD-03 | Cardápio Digital | Product.isAvailable/sortOrder/tags/imageUrl/station, OrderPolicy, PriceSchedule, Order.source/orderNumber |
| PRD-04 | PDV & Gestão de Pedidos | Check.splitParentId/mergedIntoId/serviceFeeAmount/tipAmount/discountAmount, Order.deliveredAt/deliveredBy |
| PRD-05 | KDS & Produção | Order.courseType/holdUntil/notifiedAt, OrderStatus.HELD |
| PRD-06 | Fiscal & NFC-e | FiscalNote model completo, Unit.cnpj/stateRegistration/legalName/ibgeCode \+ todos os campos de endereço |
| PRD-07 | Fechamento & Relatórios | CashRegister.closingBalance/expectedBalance/difference, DailyReport (já existe) |
| PRD-08 | Estoque Básico | StockItem, StockMovement, ProductIngredient, MovementType enum |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Migration quebra dados de dev existente | Média | Baixo | Todos os novos campos são nullable ou com default. prisma migrate reset se necessário. |
| Monorepo não compila após mudanças no schema | Alta | Médio | Executar tsc \--noEmit imediatamente após prisma generate. Corrigir imports. |
| Seed falha por relações circulares | Baixa | Baixo | Criar em ordem: Org → Unit → Employees → Categories → Products → Stock → Ingredientes |
| Campo fiscal incorreto para NFC-e | Média | Alto | ibgeCode e stateRegistration validados contra tabela IBGE. Homologar com FocusNFe em PRD-06. |

OASYS PRD-01 — Schema Foundation  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026

Documento confidencial — Uso interno