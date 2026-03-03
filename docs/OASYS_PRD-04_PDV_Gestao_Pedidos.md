

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-04 — PDV & Gestão de Pedidos**  
web-waiter: mapa de mesas, pedidos, notificações, conta

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 1 — Go-Live |
| **Sprints Estimados** | 3 sprints |
| **Complexidade** | Média-Alta |
| **Cobertura Atual** | \~45% |
| **Dependências** | PRD-01 (Schema Foundation), PRD-02 (Payments & CashRegister) |
| **Gap Modules** | M2 — Garçom (Web App), M3 — PDV/Service |
| **Apps Afetadas** | apps/web-waiter \+ apps/api |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-04 (PDV & Gestão de Pedidos) é a fusão dos módulos M2 (Garçom) e M3 (PDV) porque ambos vivem no mesmo frontend: apps/web-waiter. Este é o app que o garçom usa no celular durante todo o turno — é sua ferramenta de trabalho primária. Com \~45% de cobertura atual, a base já existe: mapa de mesas com SVG, criação básica de pedidos e navegação por zonas. O que falta são as operações críticas do dia-a-dia.

Este PRD cobre cinco subsistemas interdependentes:

**1\. Notificações em Tempo Real —** Substituir mocks atuais por WebSocket real. Garçom recebe alertas de pedido pronto, novo pedido do web-menu, solicitação de atendimento pela mesa, e alertas operacionais (estoque baixo, caixa aberto há 12h).

**2\. Gestão de Conta (Check) —** Dividir conta (igual, por itens, valor personalizado), juntar contas de mesas diferentes, transferir itens entre contas, aplicar desconto com motivo, e gerenciar taxa de serviço.

**3\. Confirmação de Entrega —** Status DELIVERED com confirmação por toque do garçom. Timestamp de entrega registrado. Notificação ao cliente (web-menu) quando entregue.

**4\. Mapa de Mesas Funcional —** Cores de mesa operacionais: verde (disponível), vermelho (ocupada com pedidos), amarelo (pedido pronto aguardando entrega), estrela (solicitação de atendimento). Atualização em tempo real via WebSocket.

**5\. Modo Offline Básico —** PWA com Service Worker, IndexedDB para fila de operações offline, sync automático quando reconectar. Garçom não fica parado quando o Wi-Fi cai.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Endpoints API | 14 | Dividir/juntar/transferir conta, entrega, notificações, desconto |
| Endpoints Modificados | 4 | Order update, Check close, Table status, Payment registration |
| Componentes React Novos | \~18 | Modais, telas, componentes de operação |
| Componentes Modificados | \~8 | TableMap, OrderDetail, CheckDetail, NotificationPanel |
| WebSocket Channels | 3 | waiter-notifications, table-updates, order-updates |
| PWA / Service Worker | 1 | Offline queue \+ background sync |
| Zustand Stores Novos | 2 | notification.store, offline.store |

## **Critério de Sucesso (Done Definition)**

O PRD-04 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Garçom recebe notificações reais via WebSocket: pedido pronto, novo pedido do web-menu, solicitação de atendimento.

2\. Conta pode ser dividida em 3 modalidades: igual (N pessoas), por itens (cada um paga o que consumiu), valor personalizado.

3\. Contas de mesas/comandas diferentes podem ser juntadas (merge) em uma única conta.

4\. Itens individuais podem ser transferidos entre contas (ex: cliente troca de mesa).

5\. Garçom confirma entrega com um toque. Order.status → DELIVERED. Cliente notificado.

6\. Mapa de mesas atualiza cores em tempo real: verde/vermelho/amarelo/estrela.

7\. Pagamento presencial (dinheiro, maquininha) registrável direto na tela da conta.

8\. Desconto aplicável com motivo obrigatório e aprovação do gerente se acima de 15%.

9\. App funciona offline: operações entram em fila e sincronizam ao reconectar.

10\. Zero erros de tipo no monorepo.

# **Estado Atual do web-waiter (\~45%)**

O app web-waiter já possui uma base funcional. A tabela abaixo mapeia o que existe versus o que este PRD adiciona.

| Feature | Estado Atual | PRD-04 Adiciona |
| :---- | :---- | :---- |
| Mapa de mesas (SVG) | Funcional, renderiza zones \+ tables | Cores dinâmicas por status em tempo real |
| Navegação por zonas | Funcional | Nenhuma mudança |
| Criar pedido | Funcional (via garçom) | Receber pedidos do web-menu como notificação |
| Ver pedidos da mesa | Funcional (listagem) | Confirmação de entrega (DELIVERED) |
| Notificações | Mock (dados fictícios) | WebSocket real com todos os eventos |
| Pagamento | Não existe | Registro presencial (cash/card-present) via PRD-02 |
| Dividir conta | Não existe | 3 modalidades: igual, por itens, personalizado |
| Juntar contas | Não existe | Merge de Checks com transferência de items |
| Transferir itens | Não existe | Mover itens entre Checks |
| Desconto | Não existe | Aplicação com motivo e aprovação |
| Taxa de serviço | Não existe | Exibir, editar, remover a pedido do cliente |
| Offline / PWA | Não existe | Service Worker \+ IndexedDB \+ sync |
| Zustand stores | Parcial (tables, orders) | notification.store, offline.store, check.store |
| Auth (PIN \+ JWT) | Funcional | Nenhuma mudança |

# **Arquitetura**

## **Diagrama de Fluxo — Turno do Garçom**

O PRD-04 cobre todo o ciclo operacional do garçom durante um turno.

┌─────────────┐  
│  Login PIN  │  
└─────┬───────┘  
      │  
      ▼  
┌────────────────────────────────────────────┐  
│  MAPA DE MESAS (tela principal)                    │  
│                                                    │  
│  🟢 Mesa 1   🔴 Mesa 2   🟡 Mesa 3   ⭐ Mesa 4  │  
│  livre      ocupada    pronto     chamando   │  
│                                                    │  
│  🔴 Mesa 5   🟢 Mesa 6   🔴 Mesa 7   🟢 Mesa 8  │  
│  ocupada    livre      ocupada    livre      │  
└────────┬─────────────┬─────────────┬──────────┘  
         │              │              │  
    Toca mesa       Notificação     Botão Menu  
         │           chega            │  
         ▼              │              ▼  
┌─────────────┐    ┌───▼──────┐    ┌────────────┐  
│ TABLE       │    │ NOTIFICA-  │    │ MENU        │  
│ DETAIL      │    │ ÇÕES       │    │ LATERAL     │  
│             │    │ (badge)    │    │             │  
│ \- Pedidos   │    │ \- Pronto   │    │ \- Caixa     │  
│ \- Conta     │    │ \- Web-menu │    │ \- Meus      │  
│ \- Pagar     │    │ \- Chamado  │    │   pedidos   │  
│ \- Dividir   │    │ \- Alerta   │    │ \- Conta     │  
│ \- Entregar  │    │            │    │   flutuante │  
└─────────────┘    └───────────┘    └────────────┘

## **Mapa de Mesas — Sistema de Cores**

O mapa de mesas é a tela principal do garçom. Cada mesa é renderizada como um elemento SVG com cor de fundo dinâmica que reflete o estado operacional em tempo real.

| Cor | Estado | Condição | Ação do Garçom |
| :---- | :---- | :---- | :---- |
| 🟢 Verde | Disponível | Table sem Check OPEN | Tocar para abrir mesa (criar Check) |
| 🔴 Vermelho | Ocupada | Table com Check OPEN \+ Orders ativos | Tocar para ver pedidos/conta |
| 🟡 Amarelo | Pronto p/ entrega | Check OPEN \+ algum Order com status READY | Prioridade: entregar pedido |
| ⭐ Estrela | Chamando garçom | Cliente solicitou atendimento (web-menu) | Prioridade máxima: atender chamado |
| ⚪ Cinza | Desativada | Table.isActive \= false | Mesa fora de operação |

### **Lógica de Resolução de Cor**

function resolveTableColor(table, check, orders) {  
  // Prioridade: estrela \> amarelo \> vermelho \> verde \> cinza  
  if (\!table.isActive) return "GRAY";  
  if (table.hasServiceRequest) return "STAR"; // chamando garçom  
  if (\!check) return "GREEN"; // sem conta \= disponível

  const hasReadyOrder \= orders.some(o \=\> o.status \=== "READY");  
  if (hasReadyOrder) return "YELLOW"; // pedido pronto

  return "RED"; // ocupada com pedidos ativos  
}

# **Notificações em Tempo Real**

As notificações atuais são mocks com dados fictícios. Este PRD substitui por WebSocket real. O garçom recebe notificações contextuais — apenas das mesas da sua zona (exceto alertas globais).

## **Conexão WebSocket**

// URL de conexão (autenticada):  
ws://api.oasys.com.br/ws/waiter

// Handshake:  
{  
  "type": "authenticate",  
  "token": "jwt\_token\_here",  
  "subscriptions": \["waiter-notifications", "table-updates", "order-updates"\]  
}

## **Eventos de Notificação**

| Evento | Origem | Descrição | Prioridade | UX |
| :---- | :---- | :---- | :---- | :---- |
| order.ready | KDS (PRD-05) | Pedido pronto para entrega | Alta | Toast \+ vibração \+ badge \+ mesa fica amarela |
| order.new\_from\_menu | web-menu (PRD-03) | Cliente fez pedido pelo cardápio digital | Média | Toast: "Mesa 5 fez pedido pelo cardápio" |
| table.service\_request | web-menu (PRD-03) | Cliente solicitou atendimento | Alta | Toast \+ vibração \+ mesa fica estrela |
| table.service\_dismiss | Garçom | Chamado de atendimento atendido/dispensado | Baixa | Mesa volta à cor anterior |
| check.payment\_received | PRD-02 webhook | Pagamento confirmado em conta da zona | Média | Toast: "Pagamento R$85 confirmado — Mesa 5" |
| alert.stock\_low | PRD-08 | Insumo abaixo do mínimo | Baixa | Badge no menu lateral |
| alert.cash\_register | Sistema | Caixa aberto há mais de 12h | Baixa | Badge no menu lateral |
| order.cancelled | Manager/Owner | Pedido cancelado (com motivo) | Média | Toast com motivo do cancelamento |

### **Filtragem por Zona**

O garçom só recebe notificações das mesas da sua zona atribuída, exceto alertas globais (stock\_low, cash\_register). A zona do garçom é determinada pela configuração de Zone no backend (cada zona tem garçons atribuídos). Se o garçom não tem zona específica (ex: gerente), recebe todas.

### **Notification Badge e Centro de Notificações**

O header do web-waiter exibe um badge com o número de notificações não lidas. Tocar no badge abre o centro de notificações: lista cronológica com ações rápidas (ex: tocar "Mesa 3 pronto" navega para a mesa).

interface Notification {  
  id: string;  
  type: NotificationEventType;  
  title: string;  
  body: string;  
  tableNumber?: number;  
  orderId?: string;  
  priority: "HIGH" | "MEDIUM" | "LOW";  
  read: boolean;  
  createdAt: string;  
  actionUrl?: string; // deep link para a tela relevante  
}

# **Especificação de API — Endpoints**

Todos os endpoints requerem autenticação JWT (PIN login). Isolamento por unitId. Prefixo: /api/v1.

## **Check Management Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /checks/:id/split/equal | WAITER, MANAGER | Divide conta igualmente entre N pessoas |
| POST | /checks/:id/split/by-items | WAITER, MANAGER | Divide conta por itens selecionados |
| POST | /checks/:id/split/custom | WAITER, MANAGER | Divide conta com valores personalizados |
| POST | /checks/:id/merge | WAITER, MANAGER | Junta outra conta nesta (merge) |
| POST | /checks/:id/transfer-items | WAITER, MANAGER | Transfere itens específicos para outro Check |
| POST | /checks/:id/discount | WAITER, MANAGER, OWNER | Aplica desconto com motivo |
| PUT | /checks/:id/service-fee | WAITER, MANAGER | Atualiza taxa de serviço (incluindo remover) |
| GET | /checks/:id/detail | WAITER, MANAGER, OWNER | Detalhe completo da conta com breakdown |

## **Delivery Confirmation Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /orders/:id/deliver | WAITER, MANAGER | Confirma entrega do pedido ao cliente |
| POST | /orders/:id/deliver/partial | WAITER, MANAGER | Confirma entrega parcial (alguns itens) |

## **Table Status Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /tables/status | WAITER, MANAGER, OWNER | Retorna status de todas as mesas (cor, check, pedidos) |
| POST | /tables/:id/dismiss-request | WAITER, MANAGER | Dispensa solicitação de atendimento |
| GET | /tables/:id/summary | WAITER, MANAGER | Resumo rápido: itens, total, tempo aberta |

## **Notification Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /notifications | WAITER, MANAGER, OWNER | Lista notificações do garçom (paginada) |
| POST | /notifications/:id/read | WAITER, MANAGER, OWNER | Marca notificação como lida |
| POST | /notifications/read-all | WAITER, MANAGER, OWNER | Marca todas como lidas |

# **Detalhamento — Dividir Conta**

Dividir conta é a operação mais solicitada por clientes em bar. O OASYS oferece 3 modalidades, cada uma gerando Checks filhos com splitParentId vinculado ao Check original.

## **POST /checks/:id/split/equal — Divisão Igual**

Divide o saldo restante igualmente entre N pessoas. Cada pessoa recebe um Check filho com seu valor proporcional.

### **Request Body**

const SplitEqualSchema \= z.object({  
  numberOfPeople: z.number().int().min(2).max(20),  
  includeServiceFee: z.boolean().default(true),  
});

// Exemplo: dividir entre 3 pessoas  
{ "numberOfPeople": 3, "includeServiceFee": true }

### **Response (201)**

{  
  "originalCheckId": "clx0chk...",  
  "splitChecks": \[  
    {  
      "id": "clx0split1...",  
      "splitParentId": "clx0chk...",  
      "label": "Pessoa 1",  
      "total": 95.00,  
      "serviceFee": 8.64,  
      "grossTotal": 103.64,  
      "status": "OPEN"  
    },  
    {  
      "id": "clx0split2...",  
      "label": "Pessoa 2",  
      "total": 95.00,  
      "serviceFee": 8.64,  
      "grossTotal": 103.64,  
      "status": "OPEN"  
    },  
    {  
      "id": "clx0split3...",  
      "label": "Pessoa 3",  
      "total": 95.02,  // centavo extra fica no último  
      "serviceFee": 8.63,  
      "grossTotal": 103.65,  
      "status": "OPEN"  
    }  
  \],  
  "totalSplit": 310.93,  
  "originalTotal": 310.93  
}

### **Regras de Negócio**

R1. Check original deve estar OPEN e com saldo restante \> 0\.

R2. Não é possível dividir um Check que já é filho (splitParentId \!= null).

R3. Calcular valor por pessoa: remainingBalance / numberOfPeople. Arredondar para 2 casas. Centavos residuais ficam no último split.

R4. Cada split Check herda os Orders do pai (referência, não duplicação).

R5. Check original transiciona para status SPLIT (novo status) — não aceita mais pagamentos diretos.

R6. Cada split Check pode ser pago independentemente (dinheiro, PIX, cartão). Quando todos os splits estão PAID, o Check pai também transiciona para PAID.

## **POST /checks/:id/split/by-items — Divisão por Itens**

O garçom seleciona quais itens cada pessoa fica responsável. Itens compartilhados podem ser divididos proporcionalmente.

### **Request Body**

const SplitByItemsSchema \= z.object({  
  splits: z.array(z.object({  
    label: z.string().max(50), // "João", "Maria"  
    items: z.array(z.object({  
      orderItemId: z.string().cuid(),  
      quantity: z.number().int().positive(), // pode ser parcial do item total  
    })),  
  })).min(2),  
  includeServiceFee: z.boolean().default(true),  
});

// Exemplo: João fica com as cervejas, Maria com os petiscos  
{  
  "splits": \[  
    {  
      "label": "João",  
      "items": \[  
        { "orderItemId": "clx0item1...", "quantity": 3 },  
        { "orderItemId": "clx0item2...", "quantity": 1 }  
      \]  
    },  
    {  
      "label": "Maria",  
      "items": \[  
        { "orderItemId": "clx0item3...", "quantity": 1 },  
        { "orderItemId": "clx0item4...", "quantity": 2 }  
      \]  
    }  
  \],  
  "includeServiceFee": true  
}

### **Regras de Negócio**

R1. Soma das quantidades por item não pode exceder a quantidade total do OrderItem.

R2. Todos os itens do Check devem ser atribuídos. Se algum item sobrar, retornar 400: "Itens não atribuídos: \[lista\]".

R3. Total de cada split \= SUM(item.price \* assigned\_quantity) \+ serviceFee proporcional.

R4. Mesmas regras de R4-R6 do split/equal.

## **POST /checks/:id/split/custom — Valor Personalizado**

O garçom define manualmente quanto cada pessoa paga. Útil quando uma pessoa quer pagar mais (ex: aniversariante não paga).

### **Request Body**

const SplitCustomSchema \= z.object({  
  splits: z.array(z.object({  
    label: z.string().max(50),  
    amount: z.number().positive(),  
  })).min(2),  
});

// Exemplo: um paga mais para cobrir o aniversariante  
{  
  "splits": \[  
    { "label": "Pedro", "amount": 200.00 },  
    { "label": "Lucas", "amount": 110.93 },  
    { "label": "Ana (aniversário)", "amount": 0.00 }  
  \]  
}

### **Regras de Negócio**

R1. SUM(amounts) deve ser \>= remainingBalance do Check. Se menor, retornar 400: "Soma dos valores (R$X) é menor que o saldo restante (R$Y)".

R2. Splits com amount \= 0 são permitidos (alguém paga por outra pessoa).

R3. Se SUM(amounts) \> remainingBalance, o excesso é tratado como gorjeta extra.

# **Juntar Contas (Merge)**

Permite combinar duas ou mais contas em uma só. Caso de uso: dois amigos estavam em mesas separadas e decidem juntar a conta. Ou comanda flutuante que quer ser incorporada em uma mesa.

## **POST /checks/:id/merge**

### **Request Body**

const MergeChecksSchema \= z.object({  
  sourceCheckIds: z.array(z.string().cuid()).min(1),  
  // sourceCheckIds \= checks que serão absorvidos por :id (target)  
});

// Exemplo: juntar conta da Mesa 7 e comanda flutuante na Mesa 5  
{  
  "sourceCheckIds": \["clx0chk\_mesa7...", "clx0chk\_float..."\]  
}

### **Response (200)**

{  
  "targetCheckId": "clx0chk\_mesa5...",  
  "mergedChecks": \["clx0chk\_mesa7...", "clx0chk\_float..."\],  
  "totalItemsMoved": 8,  
  "newTotal": 485.70,  
  "message": "2 contas juntadas com sucesso. 8 itens transferidos."  
}

### **Regras de Negócio**

R1. Todos os Checks (target e sources) devem estar OPEN e pertencer ao mesmo unitId.

R2. Não pode juntar Check que já é split child (splitParentId \!= null).

R3. Orders dos source Checks são reatribuídos ao target Check (update checkId).

R4. Pagamentos já feitos nos source Checks são transferidos para o target.

R5. Source Checks recebem mergedIntoId \= target Check id e status CLOSED.

R6. Se source Check tinha taxa de serviço, ela é recalculada no target.

R7. Operação atômica via Prisma transaction.

# **Transferir Itens Entre Contas**

Permite mover itens individuais de uma conta para outra. Caso de uso: cliente trocou de mesa, ou pediu algo na mesa errada.

## **POST /checks/:id/transfer-items**

### **Request Body**

const TransferItemsSchema \= z.object({  
  targetCheckId: z.string().cuid(),  
  items: z.array(z.object({  
    orderItemId: z.string().cuid(),  
    quantity: z.number().int().positive(),  
  })).min(1),  
});

// Exemplo: mover 2 chopps da Mesa 5 para a Mesa 7  
{  
  "targetCheckId": "clx0chk\_mesa7...",  
  "items": \[  
    { "orderItemId": "clx0item\_chopp...", "quantity": 2 }  
  \]  
}

### **Regras de Negócio**

R1. Source e target Checks devem estar OPEN e no mesmo unitId.

R2. Quantidade a transferir não pode exceder quantidade disponível do item.

R3. Se transferindo toda a quantidade do item, o OrderItem muda de Check. Se parcial, cria novo OrderItem no target com a quantidade transferida e reduz no source.

R4. Recalcular totais de ambos os Checks.

R5. Se source Check ficar sem itens, ele pode ser mantido OPEN (para novos pedidos) ou fechado manualmente.

# **Confirmação de Entrega**

Atualmente o OASYS não registra quando o pedido foi efetivamente entregue ao cliente. O KDS marca como READY mas não há confirmação de entrega. Este PRD adiciona o status DELIVERED.

## **POST /orders/:id/deliver**

### **Request Body**

const DeliverOrderSchema \= z.object({  
  // Sem body obrigatório — o garçom só toca o botão  
  notes: z.string().max(200).optional(),  
});

### **Response (200)**

{  
  "orderId": "clx2ord...",  
  "status": "DELIVERED",  
  "deliveredAt": "2026-03-02T22:28:00Z",  
  "deliveredBy": "clx0emp\_joao...",  
  "message": "Pedido \#42 marcado como entregue."  
}

### **Regras de Negócio**

R1. Order deve estar com status READY. Se não, retornar 400: "Pedido não está pronto para entrega".

R2. Atualizar Order.status \= DELIVERED, Order.deliveredAt \= now(), Order.deliveredBy \= employeeId do JWT.

R3. Notificar cliente via WebSocket (evento order.delivered) — integração com PRD-03 web-menu.

R4. Atualizar cor da mesa: se não há mais pedidos READY, mesa volta de amarelo para vermelho.

R5. Registrar no AuditLog: quem entregou, quando, qual pedido.

## **POST /orders/:id/deliver/partial**

Entrega parcial: quando a cozinha manda parte do pedido antes (ex: bebidas prontas, comida ainda preparando).

### **Request Body**

const PartialDeliverSchema \= z.object({  
  deliveredItemIds: z.array(z.string().cuid()).min(1),  
  // IDs dos OrderItems que estão sendo entregues agora  
});

### **Regras de Negócio**

R1. Marcar os itens especificados como delivered (novo flag no OrderItem ou tabela auxiliar).

R2. Order permanece em status READY até que TODOS os itens sejam entregues.

R3. Quando último item é entregue, Order transiciona para DELIVERED automaticamente.

# **Desconto e Taxa de Serviço**

## **POST /checks/:id/discount**

Aplica desconto na conta. Motivo obrigatório. Descontos acima de 15% do total requerem aprovação do gerente ou dono.

### **Request Body**

const ApplyDiscountSchema \= z.object({  
  type: z.enum(\["PERCENTAGE", "FIXED"\]),  
  value: z.number().positive(),  
  // PERCENTAGE: 10 \= 10%. FIXED: 50 \= R$50,00  
  reason: z.string().min(3).max(500),  
  authorizedBy: z.string().cuid().optional(),  
  // Obrigatório se desconto \> 15%  
});

// Exemplo: 10% de desconto por reclamação de demora  
{  
  "type": "PERCENTAGE",  
  "value": 10,  
  "reason": "Reclamação do cliente por demora no preparo"  
}

### **Regras de Negócio**

R1. Check deve estar OPEN.

R2. Calcular discountAmount: se PERCENTAGE, valor \= total \* (value/100). Se FIXED, valor \= value.

R3. discountAmount não pode exceder o saldo restante.

R4. Se desconto \> 15% do total e authorizedBy não informado: retornar 403: "Desconto acima de 15% requer autorização do gerente".

R5. Gravar Check.discountAmount e Check.discountReason.

R6. Registrar no AuditLog com employee, authorizer (se houver), motivo e valor.

## **PUT /checks/:id/service-fee**

Permite alterar a taxa de serviço da conta. O cliente pode solicitar remoção (taxa é sugerida, não obrigatória por lei).

### **Request Body**

const UpdateServiceFeeSchema \= z.object({  
  serviceFeeAmount: z.number().min(0),  
  // 0 \= remover taxa. Qualquer valor positivo \= definir valor fixo.  
});

// Remover taxa de serviço:  
{ "serviceFeeAmount": 0 }

// Redefinir para valor específico:  
{ "serviceFeeAmount": 15.00 }  
R1. Check deve estar OPEN. R2. Atualizar Check.serviceFeeAmount. R3. Recalcular grossTotal para pagamento.

# **Detalhe da Conta — GET /checks/:id/detail**

Retorna o breakdown completo da conta, incluindo todos os itens com modificadores, pagamentos, descontos e taxa de serviço. Usado pela tela de conta no web-waiter.

### **Response (200)**

{  
  "id": "clx0chk...",  
  "tableNumber": 5,  
  "zoneName": "Salão Principal",  
  "status": "OPEN",  
  "openedAt": "2026-03-02T20:15:00Z",  
  "duration": "2h 13min",  
  "orders": \[  
    {  
      "id": "clx2ord1...",  
      "orderNumber": 42,  
      "status": "DELIVERED",  
      "source": "WAITER",  
      "createdAt": "2026-03-02T20:16:00Z",  
      "items": \[  
        {  
          "id": "clx0item1...",  
          "productName": "Chopp Pilsen 300ml",  
          "quantity": 3,  
          "unitPrice": 12.90,  
          "totalPrice": 38.70,  
          "modifiers": \[  
            { "name": "Bem gelado", "price": 0 }  
          \],  
          "notes": null  
        }  
      \]  
    },  
    {  
      "id": "clx2ord2...",  
      "orderNumber": 47,  
      "status": "PREPARING",  
      "source": "WEB\_MENU",  
      "createdAt": "2026-03-02T21:30:00Z",  
      "items": \[...\]  
    }  
  \],  
  "financial": {  
    "itemsTotal": 285.10,  
    "serviceFeeRate": 0.10,  
    "serviceFeeAmount": 28.51,  
    "tipAmount": 0,  
    "discountAmount": 0,  
    "discountReason": null,  
    "grossTotal": 313.61,  
    "totalPaid": 150.00,  
    "remainingBalance": 163.61,  
    "isPaid": false  
  },  
  "payments": \[  
    {  
      "id": "clx2pay1...",  
      "method": "CASH",  
      "amount": 150.00,  
      "status": "CONFIRMED",  
      "paidAt": "2026-03-02T21:00:00Z"  
    }  
  \],  
  "splitChildren": \[\],  
  "customerCount": 4  
}

# **Modo Offline (PWA)**

O Wi-Fi em bares lotados é instável. O garçom não pode ficar parado quando a rede cai. O modo offline garante que operações críticas (anotar pedido, confirmar entrega) sejam registradas localmente e sincronizadas quando a conexão voltar.

## **Arquitetura Offline**

┌─────────────────┐     Online      ┌─────────────┐  
│  web-waiter    │ ──────────▶ │  API Server │  
│  (celular)     │                └─────────────┘  
└───────┬─────────┘  
        │  Offline  
        ▼  
┌─────────────────┐  
│  IndexedDB      │  
│                 │  
│  \- offlineQueue │  ← Operações pendentes  
│  \- cachedTables │  ← Último estado das mesas  
│  \- cachedMenu   │  ← Cardápio para consulta  
└───────┬─────────┘  
        │  Reconectou  
        ▼  
┌─────────────────┐  
│  Background     │  
│  Sync Worker    │  ← Processa fila FIFO  
│                 │  ← Retry com backoff  
│  Operações:     │  ← Resolve conflitos  
│  1\. POST order  │  
│  2\. POST deliver│  
│  3\. POST payment│  
└─────────────────┘

## **Operações Offline Suportadas**

| Operação | Offline? | Comportamento |
| :---- | :---- | :---- |
| Criar pedido | Sim | Salva em IndexedDB. Enviado ao backend ao reconectar. UI mostra badge "pendente". |
| Confirmar entrega | Sim | Registra localmente. Sync quando online. |
| Registrar pagamento dinheiro | Sim | Registra localmente. Não afeta Pagar.me (cash é local). |
| Ver mapa de mesas | Parcial | Exibe último estado cacheado. Badge "offline". |
| Ver cardápio | Sim | Cardápio cacheado em IndexedDB. |
| Dividir conta | Não | Requer consistência de dados. Mensagem: "Necessário conexão". |
| Juntar contas | Não | Requer consistência. Mensagem: "Necessário conexão". |
| Pagamento PIX/Cartão | Não | Requer Pagar.me online. Mensagem: "Sem conexão para pagamento digital". |

## **Offline Store**

// apps/web-waiter/src/stores/offline.store.ts

interface OfflineOperation {  
  id: string;  
  type: "CREATE\_ORDER" | "DELIVER\_ORDER" | "CASH\_PAYMENT";  
  payload: any;  
  createdAt: string;  
  retryCount: number;  
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";  
}

interface OfflineStore {  
  isOnline: boolean;  
  queue: OfflineOperation\[\];  
  pendingCount: number;

  enqueue: (op: Omit\<OfflineOperation, "id" | "status" | "retryCount"\>) \=\> void;  
  processQueue: () \=\> Promise\<void\>;  
  setOnlineStatus: (online: boolean) \=\> void;  
}

### **Service Worker**

O Service Worker intercepta requests que falham (network error) e salva na fila do IndexedDB. Quando a conexão volta (evento online), dispara o processQueue(). Operações são processadas em FIFO com retry (max 3 tentativas, backoff exponencial).

Se uma operação falha após 3 retries (ex: conflito de dados), ela é marcada como FAILED e o garçom recebe uma notificação para resolver manualmente.

# **UI — Telas do Web Waiter**

## **Tela: Detalhe da Mesa (TableDetail)**

Tela principal após tocar uma mesa no mapa. Hub de operações da mesa.

┌───────────────────────────────────────┐  
│  ← Mapa     Mesa 5 — Salão     2h 13m │  
├───────────────────────────────────────┤  
│                                       │  
│  ┌───────────────────────────────────┐  │  
│  │ Total: R$ 313,61    4 pessoas     │  │  
│  │ Pago:  R$ 150,00    Resta: 163,61 │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
│  Pedidos:                              │  
│  ┌───────────────────────────────────┐  │  
│  │ \#42 • 20:16 • DELIVERED    ✓       │  │  
│  │ 3x Chopp, 1x Caipirinha           │  │  
│  └───────────────────────────────────┘  │  
│  ┌───────────────────────────────────┐  │  
│  │ \#47 • 21:30 • READY   \[Entregar\] │  │  
│  │ 2x Linguica, 1x Fritas 🍳 WEB    │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
├───────────────────────────────────────┤  
│  ┌────────┐ ┌────────┐ ┌─────────┐  │  
│  │+ Pedido│ │ Pagar  │ │ Dividir │  │  
│  └────────┘ └────────┘ └─────────┘  │  
│  ┌────────┐ ┌────────┐ ┌─────────┐  │  
│  │Juntar  │ │Transfer│ │Desconto │  │  
│  └────────┘ └────────┘ └─────────┘  │  
└───────────────────────────────────────┘

## **Tela: Dividir Conta (SplitCheckModal)**

┌───────────────────────────────────────┐  
│  Dividir Conta                   X    │  
├───────────────────────────────────────┤  
│                                       │  
│  Total da conta: R$ 313,61             │  
│                                       │  
│  Como dividir?                         │  
│                                       │  
│  ┌───────────────────────────────────┐  │  
│  │  👥 Dividir igual               │  │  
│  │  Mesmo valor para todos           │  │  
│  └───────────────────────────────────┘  │  
│  ┌───────────────────────────────────┐  │  
│  │  📝 Dividir por itens             │  │  
│  │  Cada um paga o que consumiu      │  │  
│  └───────────────────────────────────┘  │  
│  ┌───────────────────────────────────┐  │  
│  │  💰 Valor personalizado           │  │  
│  │  Definir quanto cada um paga      │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
│  \[ \] Incluir taxa de serviço          │  
│                                       │  
└───────────────────────────────────────┘

## **Tela: Notificações**

┌───────────────────────────────────────┐  
│  ← Notificações        Limpar tudo  │  
├───────────────────────────────────────┤  
│                                       │  
│  🟡 22:28  Pedido \#47 PRONTO          │  
│     Mesa 5 • 2x Linguíça, 1x Fritas  │  
│     \[Ir para mesa\]                     │  
│                                       │  
│  ⭐ 22:25  Mesa 3 chamando garçom      │  
│     Salão Principal                     │  
│     \[Ir para mesa\]  \[Dispensar\]        │  
│                                       │  
│  📱 22:20  Novo pedido pelo cardápio   │  
│     Mesa 5 • R$ 67,80                  │  
│     \[Ver pedido\]                        │  
│                                       │  
│  💰 22:15  Pagamento confirmado        │  
│     Mesa 5 • PIX R$ 150,00             │  
│                                       │  
└───────────────────────────────────────┘

# **Componentes React**

| Componente | Arquivo | Status | Responsabilidade |
| :---- | :---- | :---- | :---- |
| TableMap | pages/TableMap.tsx | Modificar | Mapa SVG com cores dinâmicas \+ WebSocket |
| TableDetail | pages/TableDetail.tsx | Modificar | Hub da mesa: pedidos, conta, ações |
| OrderCard | components/OrderCard.tsx | Modificar | Card de pedido com botão Entregar |
| CheckDetail | components/CheckDetail.tsx | Modificar | Detalhe da conta com breakdown financeiro |
| NotificationPanel | components/NotificationPanel.tsx | Modificar | Substituir mock por WebSocket real |
| NotificationBadge | components/NotificationBadge.tsx | Novo | Badge no header com contagem |
| NotificationToast | components/NotificationToast.tsx | Novo | Toast flutuante com vibração |
| SplitCheckModal | components/SplitCheckModal.tsx | Novo | Modal de divisão (3 modalidades) |
| SplitEqualView | components/SplitEqualView.tsx | Novo | Seletor de N pessoas |
| SplitByItemsView | components/SplitByItemsView.tsx | Novo | Atribuir itens a pessoas |
| SplitCustomView | components/SplitCustomView.tsx | Novo | Input de valores por pessoa |
| MergeCheckModal | components/MergeCheckModal.tsx | Novo | Seletor de contas para juntar |
| TransferItemsModal | components/TransferItemsModal.tsx | Novo | Seletor de itens \+ conta destino |
| DiscountModal | components/DiscountModal.tsx | Novo | Input de desconto com motivo |
| PaymentQuickAction | components/PaymentQuickAction.tsx | Novo | Botões rápidos: Dinheiro, Maquininha, PIX |
| DeliverButton | components/DeliverButton.tsx | Novo | Botão de confirmação de entrega com feedback |
| OfflineIndicator | components/OfflineIndicator.tsx | Novo | Banner "Offline — N operações pendentes" |
| ServiceFeeToggle | components/ServiceFeeToggle.tsx | Novo | Toggle de taxa de serviço na conta |

# **Estrutura de Arquivos**

Arquivos novos e modificados no apps/web-waiter e apps/api.

## **Frontend — apps/web-waiter**

apps/web-waiter/src/  
├── pages/  
│   ├── TableMap.tsx                 \# MODIFICAR: cores dinâmicas  
│   └── TableDetail.tsx              \# MODIFICAR: ações de conta  
├── components/  
│   ├── OrderCard.tsx                \# MODIFICAR: botão Entregar  
│   ├── CheckDetail.tsx              \# MODIFICAR: breakdown  
│   ├── NotificationPanel.tsx        \# MODIFICAR: WebSocket real  
│   ├── NotificationBadge.tsx        \# NOVO  
│   ├── NotificationToast.tsx        \# NOVO  
│   ├── SplitCheckModal.tsx          \# NOVO  
│   ├── SplitEqualView.tsx           \# NOVO  
│   ├── SplitByItemsView.tsx         \# NOVO  
│   ├── SplitCustomView.tsx          \# NOVO  
│   ├── MergeCheckModal.tsx          \# NOVO  
│   ├── TransferItemsModal.tsx       \# NOVO  
│   ├── DiscountModal.tsx            \# NOVO  
│   ├── PaymentQuickAction.tsx       \# NOVO  
│   ├── DeliverButton.tsx            \# NOVO  
│   ├── OfflineIndicator.tsx         \# NOVO  
│   └── ServiceFeeToggle.tsx         \# NOVO  
├── stores/  
│   ├── notification.store.ts        \# NOVO  
│   ├── offline.store.ts             \# NOVO  
│   └── check.store.ts               \# NOVO  
├── hooks/  
│   ├── useTableStatus.ts            \# NOVO: WebSocket table colors  
│   ├── useNotifications.ts          \# NOVO: WebSocket notifications  
│   └── useOffline.ts                \# NOVO: online/offline detection  
├── workers/  
│   └── sw.ts                        \# NOVO: Service Worker  
└── lib/  
    └── idb.ts                       \# NOVO: IndexedDB helpers

## **Backend — apps/api**

apps/api/src/modules/checks/  
├── checks.routes.ts             \# MODIFICAR: novas rotas  
├── checks.service.ts            \# MODIFICAR: split, merge, transfer, discount  
├── checks.schemas.ts            \# NOVO: schemas Zod  
└── \_\_tests\_\_/  
    └── checks.test.ts             \# NOVO

apps/api/src/modules/notifications/  
├── notifications.routes.ts      \# NOVO  
├── notifications.service.ts     \# NOVO: create, list, mark read  
├── notifications.schemas.ts     \# NOVO  
└── \_\_tests\_\_/  
    └── notifications.test.ts      \# NOVO

apps/api/src/websocket/  
├── waiter.ws.ts                 \# NOVO: WebSocket handler for waiter  
└── channels.ts                  \# NOVO: channel management \+ zone filtering

# **Tratamento de Erros e Edge Cases**

| Cenário | Comportamento Esperado | HTTP |
| :---- | :---- | :---- |
| Dividir conta já dividida | 400: "Conta já foi dividida" | 400 |
| Dividir conta já paga | 400: "Conta já está paga" | 400 |
| Split com itens não atribuídos | 400: "Itens não atribuídos: \[lista\]" | 400 |
| Merge com Check de outra unit | 403: "Conta não pertence a esta unidade" | 403 |
| Merge com split child | 400: "Não é possível juntar conta dividida" | 400 |
| Transfer quantidade \> disponível | 400: "Quantidade excede disponível (max: N)" | 400 |
| Entregar pedido não READY | 400: "Pedido não está pronto para entrega" | 400 |
| Desconto \> 15% sem authorizedBy | 403: "Desconto acima de 15% requer autorização" | 403 |
| Desconto \> saldo restante | 400: "Desconto excede saldo restante" | 400 |
| WebSocket desconectou | Reconexão automática (backoff exponencial). Indicador visual. | N/A |
| Operação offline falha ao sync | 3 retries. Se falhar, marca FAILED. Notifica garçom. | N/A |
| Dois garçons editando mesma conta | Prisma transaction previne race condition. Segundo recebe 409\. | 409 |
| Dismiss service request já atendido | 200: idempotente, mesa já sem estrela. | 200 |
| Notificação de zona diferente | Filtrada no backend. Garçom não recebe. | N/A |

# **Estratégia de Testes**

## **Cenários de Teste — Backend**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Split equal — 3 pessoas | Unit | Cria 3 split Checks com valores corretos \+ centavo residual |
| Split equal — Check já split | Unit | Retorna 400 para double-split |
| Split by items — atribuição completa | Unit | Todos os itens atribuídos, totais corretos |
| Split by items — item não atribuído | Unit | Retorna 400 com lista de itens faltando |
| Split custom — soma \< total | Unit | Retorna 400 com diferença |
| Merge — sucesso | Integration | Orders movidos, pagamentos transferidos, source fechado |
| Merge — cross-unit | Unit | Retorna 403 |
| Transfer items — parcial | Unit | Cria novo OrderItem no target, reduz no source |
| Deliver — sucesso | Unit | READY → DELIVERED, deliveredAt preenchido |
| Deliver — não READY | Unit | Retorna 400 |
| Discount — com autorização | Unit | Desconto aplicado, AuditLog criado |
| Discount — \> 15% sem auth | Unit | Retorna 403 |
| Service fee — remover | Unit | serviceFeeAmount \= 0, grossTotal recalculado |
| Table status — cores corretas | Integration | Verde/vermelho/amarelo/estrela conforme condições |
| WebSocket — notificação por zona | Integration | Garçom zona A não recebe evento de zona B |

## **Cenários de Teste — Frontend**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| SplitCheckModal — seleção de modalidade | Component | 3 opções navegáveis |
| SplitEqualView — cálculo | Component | Valor por pessoa atualiza com slider |
| OfflineIndicator — mostra/esconde | Component | Visível quando offline, contagem de pendentes |
| Notification store — badge count | Unit (Zustand) | Incrementa/decrementa com read |
| Offline store — enqueue/process | Unit (Zustand) | Fila FIFO, status transitions corretas |
| TableMap — cores dinâmicas | Component | Cores mudam via WebSocket event |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-04**

| PRD | Módulo | Como Usa PDV |
| :---- | :---- | :---- |
| PRD-05 | KDS & Produção | KDS envia evento order.ready que PRD-04 consome. Entrega (DELIVERED) fecha o loop KDS → Waiter. |
| PRD-06 | Fiscal & NFC-e | NFC-e emitida ao fechar conta com pagamento. Usa Check.status \= PAID \+ financial breakdown. |
| PRD-07 | Fechamento | Relatório consolida Checks fechados, splits, merges, descontos do dia. Usa dados de PRD-04. |
| PRD-12 | Pessoas & Turnos | Performance do garçom (tempo de entrega, mesas atendidas) usa deliveredAt e delivery logs. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Race condition em split/merge | Média | Alto | Prisma transactions com isolation level SERIALIZABLE para operações de conta. |
| Offline sync cria duplicatas | Média | Médio | Cada operação offline tem idempotency key. Backend rejeita duplicatas com 409\. |
| WebSocket não reconecta | Baixa | Alto | Backoff exponencial (1s, 2s, 4s, 8s, 16s). Max 10 tentativas. Fallback polling (10s). |
| Garçom perde notificação importante | Média | Médio | Notificações HIGH priority: vibração \+ som \+ toast persistente (não auto-dismiss). |
| IndexedDB cheio (dispositivo antigo) | Baixa | Baixo | Limpar fila processada após sync. Max 100 operações em fila. |
| Service Worker conflita com updates | Média | Baixo | Versionamento de SW. skipWaiting() \+ clients.claim() para atualização imediata. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| WebSocket real (não SSE) | Server-Sent Events | SSE é unidirecional. WebSocket permite subscribe/unsubscribe dinâmico e filtragem por zona. |
| IndexedDB (não localStorage) | localStorage | IndexedDB suporta dados estruturados, queries e armazenamento maior. Essencial para fila offline. |
| Split cria Checks filhos | Modifica Check original | Checks filhos permitem pagamento independente. Check pai vira audit trail. |
| Merge move Orders (não copia) | Copiar OrderItems | Mover mantém integridade referencial. Cópia criaria duplicatas no estoque e fiscal. |
| Notificações filtradas no backend | Filtrar no frontend | Backend filtra por zona \= menos dados no WebSocket. Menor consumo de bateria. |
| Offline básico (não full sync) | Full offline-first | Full offline requer CRDT ou Yjs. Over-engineering para MVP. Básico cobre 90% dos casos. |

# **Sequência de Implementação (3 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: Check operations (split, merge, transfer, discount) \+ Delivery confirmation | Todos os endpoints de gestão de conta funcionais. POST /orders/:id/deliver. Testes unitários. |
| Sprint 2 | Backend: WebSocket \+ Notifications \+ Table status | Frontend: Table colors \+ Notifications | WebSocket real com filtragem por zona. Notificações com badge e toast. Mapa com cores dinâmicas. |
| Sprint 3 | Frontend: Modais de operação (split/merge/transfer/discount) \+ Offline mode (PWA) | Todas as operações de conta no frontend. Service Worker \+ IndexedDB. Testes E2E. |

OASYS PRD-04 — PDV & Gestão de Pedidos  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*