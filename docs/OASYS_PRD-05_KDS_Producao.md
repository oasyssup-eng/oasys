

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-05 — KDS & Produção**  
web-kds: fila de pedidos, bump, entrega, tempo médio, sequenciamento, painel de retirada

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 1 — Go-Live |
| **Sprints Estimados** | 2 sprints |
| **Complexidade** | Média |
| **Cobertura Atual** | \~33% |
| **Dependências** | PRD-01 (Schema Foundation) |
| **Gap Modules** | M7 — KDS/Produção |
| **Apps Afetadas** | apps/web-kds \+ apps/api |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-05 (KDS & Produção) é o sistema nervoso da operação de cozinha e bar. O KDS (Kitchen Display System) é onde bartenders, cozinheiros e chapeiros recebem, gerenciam e despacham pedidos. Com \~33% de cobertura, a base já existe: múltiplas estações (BAR, KITCHEN, GRILL, DESSERT), cálculo de tempo médio de preparo e detecção de anomalias. O que falta é completar o fluxo end-to-end e integrar com o web-menu (PRD-03).

Este PRD cobre seis subsistemas:

**1\. Status DELIVERED —** Botão e endpoint funcional para marcar pedido como entregue. Fecha o loop KDS → Waiter. Timestamp de entrega registrado para métricas de performance.

**2\. Notificação ao Cliente —** Quando pedido muda para READY, o cliente é notificado em tempo real via WebSocket no web-menu (PRD-03). Som \+ vibração no celular. Notificação única (não duplica).

**3\. Multi-canal —** Receber pedidos do web-menu (novo canal) além dos pedidos do garçom. Cada pedido identifica sua origem (source: WAITER, WEB\_MENU, WHATSAPP, POS) com badge visual na fila.

**4\. Sequenciamento de Cursos —** Ordenar produção por courseType (DRINK → STARTER → MAIN → DESSERT). Curso seguinte só entra em produção quando anterior é despachado. Manual override disponível.

**5\. Hold/Pause —** Segurar pedido na fila sem produzir (status HELD). Liberar manualmente ou por timer (holdUntil). Caso de uso: cliente pediu mas pediu para esperar, ou mesa quer sincronizar entrada com prato principal.

**6\. Painel de Retirada (TV Mode) —** Tela fullscreen para TV/monitor exibindo senhas prontas para retirada. Visual grande, alto contraste, atualização automática. Para balcão e pedidos delivery.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Endpoints API | 8 | Deliver, hold, release, course-sequence, pickup-board, cortesia, stats |
| Endpoints Modificados | 3 | Order creation (multi-source), Order update (course logic), KDS queue |
| Componentes React Novos | \~12 | TV mode, course tabs, hold modal, cortesia, source badge |
| Componentes Modificados | \~6 | KDSQueue, OrderTicket, StationSelector, KDSHeader, TimerBadge |
| WebSocket Channels | 2 | kds-orders (receber), kds-updates (status changes) |
| Zustand Stores Modificados | 2 | kds.store (course \+ hold), notification.store (ready events) |

## **Critério de Sucesso (Done Definition)**

O PRD-05 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Bartender/cozinheiro recebe pedidos de todos os canais (waiter \+ web-menu) com identificação de origem.

2\. Fila de pedidos organizada por estação (BAR, KITCHEN, GRILL, DESSERT) com filtragem funcional.

3\. Bump (marcar como pronto) funcional com um toque. Pedido sai da fila ativa e vai para fila de retirada.

4\. Garçom pode marcar DELIVERED via PRD-04. Pedido sai completamente do KDS.

5\. Cliente notificado via WebSocket quando pedido fica READY (som \+ vibração no web-menu).

6\. Sequenciamento de cursos funcional: DRINK → STARTER → MAIN → DESSERT. Override manual disponível.

7\. Hold/pause funcional: segurar pedido com timer ou liberação manual.

8\. Painel de retirada (TV mode) exibindo senhas prontas em fullscreen com alto contraste.

9\. Controle de cortesias e consumo interno registrado com motivo.

10\. Zero erros de tipo no monorepo.

# **Estado Atual do web-kds (\~33%)**

O app web-kds já possui fundação funcional. A tabela abaixo mapeia o que existe versus o que este PRD completa.

| Feature | Estado Atual | PRD-05 Adiciona |
| :---- | :---- | :---- |
| Fila de pedidos por estação | Funcional (BAR, KITCHEN) | Adicionar GRILL, DESSERT. Filtragem por múltiplas estações. |
| Bump (PREPARING → READY) | Funcional (botão existe) | Notificação ao cliente e garçom ao bumpar |
| Timer de preparo | Funcional (exibe tempo) | Alertas visuais: amarelo \>1.5x média, vermelho \>2x |
| Tempo médio por produto | Cálculo existe | Exibir no ticket e no painel de stats |
| Detecção de anomalias | Funcional (flag suspeitas) | Nenhuma mudança |
| Status DELIVERED | Não existe | Endpoint \+ integração com PRD-04 web-waiter |
| Notificação ao cliente (READY) | Não existe | WebSocket push para web-menu |
| Pedidos do web-menu | Não existe | Receber via WebSocket \+ badge de origem |
| Sequenciamento de cursos | Não existe | courseType com lógica de sequenciamento |
| Hold/Pause | Não existe | HELD status \+ holdUntil timer \+ release manual |
| Painel de retirada (TV) | Não existe | Tela fullscreen com senhas prontas |
| Cortesia/Consumo interno | Não existe | Registro com motivo e aprovação |
| Multi-estação simultânea | Parcial | Um pedido pode ter itens em estações diferentes |

# **Arquitetura**

## **Fluxo Completo do Pedido no KDS**

O KDS é o centro de produção. Todo pedido passa por ele, independente da origem. O fluxo abaixo mostra a jornada completa de um pedido desde a criação até a entrega.

┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  
│ Garçom   │  │ Web-Menu │  │ WhatsApp │  │   POS    │  
│ (waiter) │  │ (PRD-03) │  │ (PRD-09) │  │ (futuro) │  
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  
     │              │              │              │  
     └──────┬───────┴──────┬───────┴──────┘  
            │              │  
     POST /orders     POST /orders  
     source:WAITER    source:WEB\_MENU  
            │              │  
            └──────┬───────┘  
                   │  
            ┌──────▼───────┐  
            │   API Server   │  
            │                │  
            │ 1\. Valida      │  
            │ 2\. Cria Order  │  
            │ 3\. Roteia por  │  
            │    station    │  
            └──────┬────────┘  
                   │  
          WebSocket push  
          kds-orders channel  
                   │  
       ┌───────────┼───────────┐  
       │           │           │  
 ┌─────▼───┐ ┌───▼─────┐ ┌───▼─────┐  
 │  BAR     │ │ KITCHEN  │ │  GRILL   │  
 │ Station  │ │ Station  │ │ Station  │  
 └────┬────┘ └───┬─────┘ └───┬─────┘  
      │           │           │  
      │  RECEIVED → PREPARING → READY  
      │           │           │  
      └───────────┼───────────┘  
                    │  
         Notify waiter \+ client  
                    │  
            ┌───────▼───────┐  
            │   DELIVERED     │ ← garçom confirma (PRD-04)  
            └───────────────┘

## **Estado do Pedido — State Machine Completa**

O ciclo de vida completo de um Order no KDS. Cada transição é acionada por uma ação específica com actor definido.

| De | Para | Ação | Actor | Evento WebSocket |
| :---- | :---- | :---- | :---- | :---- |
| (novo) | RECEIVED | Pedido criado (POST /orders) | Garçom / Cliente / Sistema | kds-orders: order.new |
| RECEIVED | PREPARING | Cozinheiro começa a preparar (bump start) | KDS Operator | kds-updates: order.preparing |
| RECEIVED | HELD | Segurar pedido (hold) | KDS Operator / Garçom | kds-updates: order.held |
| HELD | RECEIVED | Liberar pedido (release) | KDS Operator / Timer | kds-updates: order.released |
| PREPARING | READY | Pedido pronto (bump ready) | KDS Operator | kds-updates: order.ready \+ notify client |
| READY | DELIVERED | Entrega confirmada | Garçom (PRD-04) | kds-updates: order.delivered |
| RECEIVED | CANCELLED | Cancelamento | Manager / Owner | kds-updates: order.cancelled |
| PREPARING | CANCELLED | Cancelamento em preparo | Manager / Owner | kds-updates: order.cancelled |

### **Transições Inválidas (retornar 400\)**

READY → PREPARING (não pode "despreparar"). DELIVERED → qualquer estado (finalizado). CANCELLED → qualquer estado (terminal). HELD → PREPARING (deve liberar primeiro para RECEIVED). Qualquer estado → RECEIVED (não pode "receber novamente").

# **Estações KDS**

Cada produto do cardápio tem uma estação de produção atribuída (Product.station). Quando um pedido chega, seus itens são roteados para as estações corretas. Um pedido com itens de múltiplas estações aparece em todas elas.

| Estação | Código | Operador Típico | Produtos |
| :---- | :---- | :---- | :---- |
| Bar | BAR | Bartender | Chopps, drinks, cervejas, água, refrigerante, sucos |
| Cozinha | KITCHEN | Cozinheiro | Petiscos quentes, porções, pratos |
| Churrasqueira | GRILL | Chapeiro | Carnes grelhadas, espetos, linguica |
| Sobremesa | DESSERT | Confeiteiro | Sobremesas, doces, café |

## **Roteamento de Itens**

Quando um pedido contém itens de múltiplas estações (ex: 2 chopps \+ 1 porção de fritas), o pedido aparece em ambas as estações (BAR e KITCHEN). Cada estação vê apenas seus itens, mas com referência ao pedido completo.

// Roteamento no ticket:  
// Pedido \#42 \- Mesa 5  
// Itens:  
//   2x Chopp Pilsen 300ml  \-\> station: BAR  
//   1x Caipirinha Limao    \-\> station: BAR  
//   1x Porcao de Fritas    \-\> station: KITCHEN  
//   1x Linguica Acebolada  \-\> station: KITCHEN

// Na tela do BAR:  
// \#42 | Mesa 5 | 20:16  
// \[BAR\] 2x Chopp Pilsen 300ml  
// \[BAR\] 1x Caipirinha Limao  
// (KITCHEN) 1x Porcao de Fritas      \<- referencia, nao produz  
// (KITCHEN) 1x Linguica Acebolada    \<- referencia, nao produz

// Cada estacao faz bump dos SEUS itens.  
// Pedido so fica READY quando TODAS as estacoes completam.

### **Lógica de Compleção Multi-Estação**

Um pedido multi-estação (itens em BAR \+ KITCHEN) só transiciona para READY quando TODAS as estações completaram seus itens. Enquanto uma estação está pronta e outra não, o pedido fica em status PREPARING com indicador visual de progresso parcial.

function isOrderReady(order: Order, stationCompletions: Map\<string, boolean\>): boolean {  
  const stations \= new Set(order.items.map(item \=\> item.product.station));  
  return \[...stations\].every(station \=\> stationCompletions.get(station) \=== true);  
}

// Quando estacao faz bump:  
// 1\. Marca seus itens como completos  
// 2\. Verifica isOrderReady()  
// 3\. Se true \-\> Order.status \= READY, notifica todos  
// 4\. Se false \-\> Atualiza progresso: "BAR pronto, aguardando KITCHEN"

# **Especificação de API — Endpoints**

Todos os endpoints requerem autenticação JWT. Roles permitidos: BARTENDER, COOK, MANAGER, OWNER (exceto onde indicado). Isolamento por unitId. Prefixo: /api/v1.

## **KDS Queue Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /kds/queue | BARTENDER, COOK, MANAGER | Fila ativa de pedidos filtrada por estação |
| GET | /kds/queue/ready | BARTENDER, COOK, MANAGER, WAITER | Pedidos prontos aguardando retirada |
| POST | /kds/orders/:id/start | BARTENDER, COOK, MANAGER | Iniciar preparo (RECEIVED → PREPARING) |
| POST | /kds/orders/:id/bump | BARTENDER, COOK, MANAGER | Marcar como pronto (PREPARING → READY) |
| POST | /kds/orders/:id/hold | BARTENDER, COOK, MANAGER, WAITER | Segurar pedido (RECEIVED → HELD) |
| POST | /kds/orders/:id/release | BARTENDER, COOK, MANAGER, WAITER | Liberar pedido retido (HELD → RECEIVED) |
| POST | /kds/orders/:id/recall | MANAGER | Recall: devolver para fila (READY → PREPARING) |
| GET | /kds/stats | BARTENDER, COOK, MANAGER, OWNER | Estatísticas: tempo médio, fila, throughput |

## **Pickup Board Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /kds/pickup-board | PUBLIC (por unit slug) | Senhas prontas para o painel de retirada |

## **Cortesia Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /kds/orders/:id/courtesy | MANAGER, OWNER | Marca pedido como cortesia (não cobrar) |
| POST | /kds/orders/:id/staff-meal | MANAGER, OWNER | Marca como consumo interno de funcionário |

# **Detalhamento — Fila de Pedidos (GET /kds/queue)**

Endpoint principal do KDS. Retorna a fila ativa de pedidos filtrada por estação e status.

### **Query Parameters**

const KDSQueueQuerySchema \= z.object({  
  station: z.enum(\["BAR", "KITCHEN", "GRILL", "DESSERT", "ALL"\]).default("ALL"),  
  status: z.enum(\["RECEIVED", "PREPARING", "HELD", "ALL"\]).default("ALL"),  
  limit: z.number().int().min(1).max(100).default(50),  
});

### **Response (200)**

{  
  "station": "BAR",  
  "queueLength": 12,  
  "avgPrepTime": 180,  // segundos (media historica)  
  "orders": \[  
    {  
      "id": "clx2ord...",  
      "orderNumber": 42,  
      "status": "RECEIVED",  
      "source": "WEB\_MENU",  
      "courseType": "DRINK",  
      "tableNumber": 5,  
      "zoneName": "Salao Principal",  
      "customerName": null,  
      "createdAt": "2026-03-02T20:16:00Z",  
      "elapsedSeconds": 124,  
      "isHeld": false,  
      "holdUntil": null,  
      "items": \[  
        {  
          "id": "clx0item...",  
          "productName": "Chopp Pilsen 300ml",  
          "quantity": 2,  
          "station": "BAR",  
          "isThisStation": true,  
          "modifiers": \["Bem gelado"\],  
          "notes": null,  
          "isComplete": false  
        },  
        {  
          "id": "clx0item2...",  
          "productName": "Porcao de Fritas",  
          "quantity": 1,  
          "station": "KITCHEN",  
          "isThisStation": false,  
          "isComplete": false  
        }  
      \],  
      "stationProgress": {  
        "BAR": false,  
        "KITCHEN": false  
      },  
      "preparationTime": 60,  // segundos estimados  
      "priority": "NORMAL"  
    }  
  \]  
}

### **Ordenação da Fila**

A fila é ordenada por prioridade e tempo. Pedidos mais antigos primeiro (FIFO), com exceções:

| Prioridade | Condição | Comportamento |
| :---- | :---- | :---- |
| RUSH | Tempo \> 2x média do produto | Sobe para o topo. Cor vermelha no ticket. |
| DELAYED | Tempo \> 1.5x média do produto | Highlight amarelo. Permanece na posição. |
| NORMAL | Dentro do tempo esperado | FIFO padrão. |
| HELD | Pedido segurado | Vai para seção separada "Retidos". Não ocupa fila ativa. |

# **Bump — Marcar como Pronto**

## **POST /kds/orders/:id/bump**

Marcar estação como completa. Se todas as estações completaram, pedido transiciona para READY.

### **Request Body**

const BumpOrderSchema \= z.object({  
  station: z.enum(\["BAR", "KITCHEN", "GRILL", "DESSERT"\]),  
  // Estacao que esta fazendo bump dos seus itens  
});

// Exemplo: BAR completou seus itens  
{ "station": "BAR" }

### **Response (200)**

{  
  "orderId": "clx2ord...",  
  "orderNumber": 42,  
  "stationBumped": "BAR",  
  "stationProgress": {  
    "BAR": true,  
    "KITCHEN": false  
  },  
  "isFullyReady": false,  
  "status": "PREPARING",  
  "message": "BAR concluiu. Aguardando KITCHEN."  
}

// Quando ultima estacao faz bump:  
{  
  "orderId": "clx2ord...",  
  "orderNumber": 42,  
  "stationBumped": "KITCHEN",  
  "stationProgress": {  
    "BAR": true,  
    "KITCHEN": true  
  },  
  "isFullyReady": true,  
  "status": "READY",  
  "message": "Pedido \#42 PRONTO\! Mesa 5 notificada."  
}

### **Regras de Negócio**

R1. Pedido deve estar em status PREPARING. Se RECEIVED, fazer auto-start (RECEIVED → PREPARING → bump).

R2. A estação informada deve ter itens neste pedido. Se não, retornar 400: "Esta estação não tem itens neste pedido".

R3. Se já fez bump desta estação, retornar 200 idempotente (não reprocessar).

R4. Verificar isOrderReady(). Se todas as estações completaram: Order.status \= READY.

R5. Quando READY: disparar WebSocket order.ready para garçom (PRD-04) e cliente (PRD-03 web-menu).

R6. Registrar prepTime \= now() \- order.createdAt. Alimentar cálculo de tempo médio.

R7. Gravar Order.notifiedAt \= now() para evitar notificação duplicada.

## **Notificação ao Cliente quando READY**

A notificação ao cliente é a feature mais impactante deste PRD. O cliente que fez pedido pelo web-menu (PRD-03) recebe uma notificação instantânea no celular quando o pedido fica pronto.

| Canal | Mecanismo | UX no Cliente |
| :---- | :---- | :---- |
| WebSocket (web-menu aberto) | Evento order.ready no canal do session token | Toast com som \+ vibração \+ tela de status atualiza |
| Polling fallback | GET /menu/:slug/orders/:id/status a cada 5s | Atualização quando polling detecta READY |
| Notificação garçom | WebSocket para web-waiter (PRD-04) | Mesa fica amarela no mapa |

### **Payload da Notificação**

// WebSocket event: order.ready  
{  
  "type": "order.ready",  
  "orderId": "clx2ord...",  
  "orderNumber": 42,  
  "tableNumber": 5,  
  "items": \["2x Chopp Pilsen", "1x Porcao de Fritas"\],  
  "message": "Seu pedido \#42 esta pronto\!",  
  "timestamp": "2026-03-02T20:22:00Z"  
}  
A notificação é enviada UMA única vez. O campo Order.notifiedAt previne duplicatas. Se o WebSocket não entregar (cliente fechou o app), a próxima verificação de status via polling captura a mudança.

# **Sequenciamento de Cursos**

Cursos (courseType) permitem que a cozinha saiba a ORDEM de preparo. Em um jantar, a entrada deve sair antes do prato principal. Sem sequenciamento, a cozinha prepara tudo ao mesmo tempo e a entrada chega junto com o principal.

## **Tipos de Curso**

| courseType | Ordem | Descrição | Comportamento no KDS |
| :---- | :---- | :---- | :---- |
| DRINK | 0 | Bebidas — prioridade máxima | Entra imediatamente na fila. Não espera outros cursos. |
| STARTER | 1 | Entrada / aperitivo / petisco | Entra na fila. Quando despachado, libera MAIN. |
| MAIN | 2 | Prato principal | HELD até STARTER ser despachado (ou override manual). |
| DESSERT | 3 | Sobremesa / café | HELD até MAIN ser despachado (ou override manual). |
| null | — | Sem curso definido | Entra imediatamente. Sem sequenciamento. |

## **Lógica de Sequenciamento**

Quando um pedido tem múltiplos cursos, apenas o curso de menor ordem (DRINK, depois STARTER) entra na fila ativa. Cursos posteriores ficam automaticamente em HELD com motivo "Aguardando curso anterior".

// Pedido \#42 \- Mesa 5 (feito de uma vez):  
// 2x Chopp Pilsen     \-\> courseType: DRINK   \-\> RECEIVED (fila ativa)  
// 1x Bruschetta       \-\> courseType: STARTER \-\> RECEIVED (fila ativa)  
// 1x Linguica         \-\> courseType: MAIN    \-\> HELD (aguardando STARTER)  
// 1x Sorvete          \-\> courseType: DESSERT \-\> HELD (aguardando MAIN)

// Quando STARTER e despachado (READY):  
// \-\> MAIN automaticamente liberado (HELD \-\> RECEIVED)  
// \-\> KDS operador ve MAIN entrar na fila

// Quando MAIN e despachado (READY):  
// \-\> DESSERT liberado automaticamente

function releasNextCourse(order: Order, completedCourseType: string) {  
  const courseOrder \= { DRINK: 0, STARTER: 1, MAIN: 2, DESSERT: 3 };  
  const currentLevel \= courseOrder\[completedCourseType\];  
  const nextLevel \= currentLevel \+ 1;

  // Encontrar itens do proximo curso neste pedido  
  const nextItems \= order.items.filter(  
    item \=\> courseOrder\[item.courseType\] \=== nextLevel  
  );

  if (nextItems.length \> 0\) {  
    // Liberar: HELD \-\> RECEIVED  
    // Atualizar no banco \+ notificar KDS via WebSocket  
  }  
}

### **Override Manual**

O operador do KDS pode liberar um curso manualmente sem esperar o anterior. Caso de uso: "o cliente pediu para trazer tudo junto" ou "a cozinha está tranquila". O override é feito via POST /kds/orders/:id/release com o campo force: true.

### **Cursos e Multi-estação**

Cursos são avaliados por ORDER, não por estação. Se um pedido tem DRINK (BAR) \+ STARTER (KITCHEN), ambos entram imediatamente (DRINK tem ordem 0, STARTER tem ordem 1, mas como são do mesmo batch e o DRINK não é bloqueio para STARTER, ambos produzem em paralelo). O sequenciamento só bloqueia quando há dependência explícita (STARTER bloqueia MAIN).

# **Hold / Pause de Pedido**

Segurar um pedido impede que ele entre em produção. O pedido sai da fila ativa e vai para a seção "Retidos". Pode ser liberado manualmente ou por timer.

## **POST /kds/orders/:id/hold**

### **Request Body**

const HoldOrderSchema \= z.object({  
  reason: z.string().min(3).max(200),  
  holdUntil: z.string().datetime().optional(),  
  // Se informado, libera automaticamente no horario.  
  // Se nao informado, liberaçao manual.  
});

// Exemplo 1: segurar ate 21:30  
{  
  "reason": "Cliente pediu para esperar o amigo chegar",  
  "holdUntil": "2026-03-02T21:30:00Z"  
}

// Exemplo 2: segurar ate liberacao manual  
{ "reason": "Mesa quer sincronizar entrada com principal" }

### **Response (200)**

{  
  "orderId": "clx2ord...",  
  "orderNumber": 42,  
  "status": "HELD",  
  "holdReason": "Cliente pediu para esperar o amigo chegar",  
  "holdUntil": "2026-03-02T21:30:00Z",  
  "message": "Pedido \#42 retido. Liberacao automatica em 14 minutos."  
}

### **Regras de Negócio**

R1. Pedido deve estar em status RECEIVED. Não pode segurar pedido já em PREPARING (já começou).

R2. Atualizar Order.status \= HELD e Order.holdUntil se informado.

R3. Se holdUntil informado: agendar job (setTimeout ou agenda) para liberar automaticamente.

R4. Pedido HELD sai da fila ativa e vai para seção "Retidos" no KDS.

R5. Timer visual no ticket mostrando tempo restante até liberação.

## **POST /kds/orders/:id/release**

### **Request Body**

const ReleaseOrderSchema \= z.object({  
  force: z.boolean().default(false),  
  // force=true: libera mesmo que curso anterior nao tenha sido despachado  
});

### **Regras de Negócio**

R1. Pedido deve estar em status HELD.

R2. Atualizar Order.status \= RECEIVED. Limpar Order.holdUntil.

R3. Pedido volta para a fila ativa na posição cronológica (pelo createdAt original, não pelo release).

R4. Cancelar job agendado de liberação se existir.

# **Painel de Retirada (TV Mode)**

O painel de retirada é uma tela fullscreen projetada para TV ou monitor grande no balcão. Exibe as senhas dos pedidos prontos para que clientes de balcão e takeout saibam quando retirar. Atualiza em tempo real via WebSocket.

## **GET /kds/pickup-board**

Endpoint público (não requer auth) acessível por slug da unidade. Retorna pedidos com status READY que têm orderNumber (senha) e são originários de balcão ou web-menu.

### **Query Parameters**

const PickupBoardQuerySchema \= z.object({  
  slug: z.string(),  
  limit: z.number().int().min(1).max(30).default(20),  
});

### **Response (200)**

{  
  "unitName": "Boteco do Ze \- Pinheiros",  
  "ready": \[  
    {  
      "orderNumber": 42,  
      "customerName": "Joao",  
      "readyAt": "2026-03-02T20:22:00Z",  
      "elapsedSinceReady": 45,  // segundos desde que ficou pronto  
      "items": \["2x Chopp Pilsen", "1x Fritas"\]  
    },  
    {  
      "orderNumber": 47,  
      "customerName": "Maria",  
      "readyAt": "2026-03-02T20:24:00Z",  
      "elapsedSinceReady": 12,  
      "items": \["1x Gin Tonica", "1x Bruschetta"\]  
    }  
  \],  
  "preparing": \[  
    { "orderNumber": 51, "estimatedMinutes": 3 },  
    { "orderNumber": 52, "estimatedMinutes": 8 }  
  \],  
  "lastUpdated": "2026-03-02T20:24:12Z"  
}

## **UI do Painel de Retirada**

┌─────────────────────────────────────────────────────────┐  
│  BOTECO DO ZE                             20:24  │  
├─────────────────────────────────────────────────────────┤  
│                                                         │  
│               PEDIDOS PRONTOS                           │  
│                                                         │  
│  ┌────────────────┐  ┌────────────────┐             │  
│  │                │  │                │             │  
│  │      42        │  │      47        │             │  
│  │     JOAO       │  │     MARIA      │             │  
│  │                │  │                │             │  
│  │  2x Chopp      │  │  1x Gin Ton.   │             │  
│  │  1x Fritas     │  │  1x Bruschetta │             │  
│  │                │  │                │             │  
│  └────────────────┘  └────────────────┘             │  
│                                                         │  
├─────────────────────────────────────────────────────────┤  
│                                                         │  
│  PREPARANDO:   \#51 (\~3 min)   \#52 (\~8 min)             │  
│                                                         │  
└─────────────────────────────────────────────────────────┘

### **Requisitos Visuais**

Fonte grande (número da senha: 120px+). Alto contraste (fundo escuro, texto claro). Sem interação (display only). Animação suave quando nova senha aparece (fade-in). Senhas prontas há mais de 5 minutos piscam (indicar que cliente não retirou). Auto-refresh via WebSocket (não precisa polling).

### **URL de Acesso**

// Acesso publico (sem login), configuravel em TV/Chromecast:  
https://kds.oasys.com.br/{slug}/pickup

// Exemplo:  
https://kds.oasys.com.br/boteco-do-ze/pickup

# **Cortesia e Consumo Interno**

Cortesias (drinks por conta da casa) e consumo interno (refeição do funcionário) são ocorrências comuns em bares. Devem ser registradas para não distorcer o CMV e para auditoria.

## **POST /kds/orders/:id/courtesy**

### **Request Body**

const CourtesySchema \= z.object({  
  reason: z.string().min(3).max(500),  
  authorizedBy: z.string().cuid().optional(),  
  // authorizedBy obrigatorio se valor \> R$50  
});

// Exemplo:  
{ "reason": "Aniversario do cliente \- drink cortesia" }

### **Regras de Negócio**

R1. Marca o pedido como cortesia: Order.isCortesia \= true (ou cria registro em AuditLog com tipo COURTESY).

R2. Itens da cortesia SÃO produzidos normalmente (KDS processa igual).

R3. Itens da cortesia NÃO são cobrados no Check (excluídos do cálculo de total).

R4. Baixa de estoque OCORRE normalmente (insumos foram consumidos).

R5. Cortesia acima de R$50 requer authorizedBy (gerente/dono).

R6. Registrar no AuditLog: quem autorizou, motivo, valor dos itens.

## **POST /kds/orders/:id/staff-meal**

Consumo interno de funcionários. Mesmo fluxo da cortesia, mas categorizado separadamente para relatórios (custo de pessoal vs. custo comercial).

### **Request Body**

const StaffMealSchema \= z.object({  
  employeeId: z.string().cuid(),  
  // Funcionario que vai consumir  
});  
R1. Registra como consumo interno vinculado ao funcionário. R2. Não cobra no Check. R3. Baixa estoque normalmente. R4. Aparece separado no relatório de fechamento (PRD-07): "Consumo Interno: R$X.XX".

# **Estatísticas do KDS (GET /kds/stats)**

Endpoint de métricas operacionais para o KDS. Exibido em painel lateral ou header do web-kds. Também consumido pelo dashboard do dono (PRD-07/10).

### **Response (200)**

{  
  "period": "today",  
  "overall": {  
    "totalOrders": 147,  
    "completedOrders": 132,  
    "cancelledOrders": 3,  
    "courtesyOrders": 5,  
    "staffMeals": 4,  
    "avgPrepTimeSeconds": 312,  
    "currentQueueLength": 8,  
    "currentHeldOrders": 2  
  },  
  "byStation": {  
    "BAR": {  
      "totalOrders": 89,  
      "avgPrepTimeSeconds": 95,  
      "currentQueue": 3,  
      "peakHour": "22:00",  
      "peakQueueLength": 15  
    },  
    "KITCHEN": {  
      "totalOrders": 58,  
      "avgPrepTimeSeconds": 620,  
      "currentQueue": 5,  
      "peakHour": "21:00",  
      "peakQueueLength": 12  
    }  
  },  
  "topProducts": \[  
    { "name": "Chopp Pilsen 300ml", "count": 87, "avgPrepSeconds": 45 },  
    { "name": "Caipirinha Limao", "count": 34, "avgPrepSeconds": 180 },  
    { "name": "Porcao de Fritas", "count": 28, "avgPrepSeconds": 720 }  
  \],  
  "hourlyThroughput": \[  
    { "hour": "17:00", "orders": 12 },  
    { "hour": "18:00", "orders": 18 },  
    { "hour": "19:00", "orders": 24 },  
    { "hour": "20:00", "orders": 31 },  
    { "hour": "21:00", "orders": 35 },  
    { "hour": "22:00", "orders": 27 }  
  \]  
}

# **UI — Telas do Web KDS**

## **Tela Principal: Fila do KDS**

┌─────────────────────────────────────────────────────────┐  
│  BAR │ KITCHEN │ GRILL │ ALL     Stats  Retirada  │  
├─────────────────────────────────────────────────────────┤  
│  Fila: 8 pedidos    Tempo medio: 1m35s    Retidos: 2  │  
├─────────────────────────────────────────────────────────┤  
│                                                         │  
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ │  
│ │ \#42 Mesa 5   📱 │ │ \#43 Mesa 2      │ │ \#44 Balcao     │ │  
│ │ ⏱ 2:04       │ │ ⏱ 1:45  🟡    │ │ ⏱ 0:32         │ │  
│ │                │ │                │ │                │ │  
│ │ 2x Chopp 300  │ │ 3x IPA 300     │ │ 1x Moscow Mule │ │  
│ │ 1x Caipirinha │ │ 1x Gin Tonica  │ │ 1x Aperol      │ │  
│ │   \>Bem gelado │ │                │ │                │ │  
│ │ (KIT) Fritas  │ │                │ │                │ │  
│ │                │ │                │ │                │ │  
│ │ \[  PRONTO   \] │ │ \[  PRONTO   \] │ │ \[  PRONTO   \] │ │  
│ │ \[  SEGURAR  \] │ │ \[  SEGURAR  \] │ │ \[  SEGURAR  \] │ │  
│ └────────────────┘ └────────────────┘ └────────────────┘ │  
│                                                         │  
├─────────────────────────────────────────────────────────┤  
│  Retidos (2):                                           │  
│  \#39 Mesa 8 • "Esperando amigo" • libera 21:30 (14min)  │  
│  \#41 Mesa 3 • "Sincronizar cursos" • manual             │  
└─────────────────────────────────────────────────────────┘

### **Legenda Visual dos Tickets**

| Elemento | Significado |
| :---- | :---- |
| 📱 | Pedido veio do web-menu (cardápio digital) |
| 🟡 Timer amarelo | Tempo \> 1.5x média. Atrasando. |
| 🔴 Timer vermelho | Tempo \> 2x média. Crítico. Sobe para RUSH. |
| (KIT) prefixo | Item de outra estação (referência, não produz aqui) |
| \> texto itálico | Modificador / observação do cliente |
| DRINK / STARTER / MAIN | Badge de courseType quando sequenciamento ativo |

# **Componentes React**

| Componente | Arquivo | Status | Responsabilidade |
| :---- | :---- | :---- | :---- |
| KDSQueue | pages/KDSQueue.tsx | Modificar | Fila principal: tabs de estação, seção retidos, filtragem |
| OrderTicket | components/OrderTicket.tsx | Modificar | Ticket individual: itens, timer, bump, hold, source badge |
| StationSelector | components/StationSelector.tsx | Modificar | Tabs de estação: BAR, KITCHEN, GRILL, DESSERT, ALL |
| KDSHeader | components/KDSHeader.tsx | Modificar | Stats bar: fila, tempo médio, retidos |
| TimerBadge | components/TimerBadge.tsx | Modificar | Timer com cores: verde → amarelo → vermelho |
| TicketItemRow | components/TicketItemRow.tsx | Modificar | Item com estação, modifiers, notes, complete status |
| SourceBadge | components/SourceBadge.tsx | Novo | Badge: WAITER, WEB\_MENU, WHATSAPP |
| CourseBadge | components/CourseBadge.tsx | Novo | Badge: DRINK, STARTER, MAIN, DESSERT |
| HoldModal | components/HoldModal.tsx | Novo | Input de motivo \+ timer opcional |
| HeldSection | components/HeldSection.tsx | Novo | Seção de pedidos retidos com countdown |
| PickupBoard | pages/PickupBoard.tsx | Novo | Tela fullscreen TV mode |
| PickupCard | components/PickupCard.tsx | Novo | Card de senha pronta: número grande \+ nome |
| StationProgress | components/StationProgress.tsx | Novo | Barra: "BAR ✓ | KITCHEN ..." |
| CourtesyModal | components/CourtesyModal.tsx | Novo | Input de motivo para cortesia |
| StaffMealModal | components/StaffMealModal.tsx | Novo | Seletor de funcionário para consumo interno |
| KDSStats | pages/KDSStats.tsx | Novo | Painel de métricas: throughput, tempo, ranking |
| RecallButton | components/RecallButton.tsx | Novo | Botão recall para devolver pedido READY → PREPARING |
| BumpButton | components/BumpButton.tsx | Novo | Botão grande de bump com feedback tátil e sonoro |

# **Estrutura de Arquivos**

## **Frontend — apps/web-kds**

apps/web-kds/src/  
├── pages/  
│   ├── KDSQueue.tsx              \# MODIFICAR: multi-station, course, hold  
│   ├── PickupBoard.tsx           \# NOVO: TV mode fullscreen  
│   └── KDSStats.tsx              \# NOVO: metricas  
├── components/  
│   ├── OrderTicket.tsx           \# MODIFICAR: source badge, course badge, hold  
│   ├── StationSelector.tsx       \# MODIFICAR: adicionar GRILL, DESSERT  
│   ├── KDSHeader.tsx             \# MODIFICAR: stats bar  
│   ├── TimerBadge.tsx            \# MODIFICAR: cores graduais  
│   ├── TicketItemRow.tsx         \# MODIFICAR: station prefix, complete status  
│   ├── SourceBadge.tsx           \# NOVO  
│   ├── CourseBadge.tsx           \# NOVO  
│   ├── HoldModal.tsx             \# NOVO  
│   ├── HeldSection.tsx           \# NOVO  
│   ├── PickupCard.tsx            \# NOVO  
│   ├── StationProgress.tsx       \# NOVO  
│   ├── CourtesyModal.tsx         \# NOVO  
│   ├── StaffMealModal.tsx        \# NOVO  
│   ├── RecallButton.tsx          \# NOVO  
│   └── BumpButton.tsx            \# NOVO  
├── stores/  
│   └── kds.store.ts              \# MODIFICAR: courseType, held orders, station progress  
└── hooks/  
    ├── useKDSQueue.ts            \# MODIFICAR: WebSocket integration  
    └── usePickupBoard.ts         \# NOVO: WebSocket for TV mode

## **Backend — apps/api**

apps/api/src/modules/kds/  
├── kds.routes.ts                \# MODIFICAR: novas rotas  
├── kds.service.ts               \# MODIFICAR: bump multi-station, hold, course, courtesy  
├── kds.schemas.ts               \# NOVO: schemas Zod para todos os endpoints  
├── course-sequencer.ts          \# NOVO: logica de sequenciamento de cursos  
├── station-router.ts            \# NOVO: roteamento de itens para estacoes  
└── \_\_tests\_\_/  
    ├── kds.test.ts                \# NOVO: testes unitarios  
    └── course-sequencer.test.ts   \# NOVO: testes de sequenciamento

apps/api/src/websocket/  
├── kds.ws.ts                    \# NOVO: WebSocket handler for KDS  
└── channels.ts                  \# MODIFICAR: adicionar kds-orders, kds-updates

# **Tratamento de Erros e Edge Cases**

| Cenário | Comportamento Esperado | HTTP |
| :---- | :---- | :---- |
| Bump de estação sem itens neste pedido | 400: "Esta estação não tem itens neste pedido" | 400 |
| Bump duplicado (mesma estação) | 200: idempotente, não reprocessa | 200 |
| Hold de pedido já em PREPARING | 400: "Pedido já está em preparo. Não pode segurar." | 400 |
| Release de pedido não HELD | 400: "Pedido não está retido" | 400 |
| Recall de pedido não READY | 400: "Pedido não está pronto" | 400 |
| Cancelar pedido em PREPARING | Requer MANAGER+. Registra motivo. Notifica KDS. | 200 |
| Cancelar pedido já READY | Requer MANAGER+. Notifica garçom e cliente. | 200 |
| Cortesia \> R$50 sem authorizedBy | 403: "Cortesia acima de R$50 requer autorização" | 403 |
| Pedido multi-estação: 1 completa, 1 não | PREPARING com progresso parcial visível | N/A |
| holdUntil no passado | 400: "Horário de liberação deve ser no futuro" | 400 |
| Course sequencing: MAIN sem STARTER | Se pedido não tem STARTER, MAIN entra direto (sem bloqueio) | N/A |
| WebSocket desconectou no KDS | Reconexão automática. Indicador "Offline" no header. | N/A |
| TV mode perde conexão | Reconnect \+ fallback polling a cada 10s | N/A |
| Pedido de unit diferente | Filtrado automaticamente. KDS só vê sua unit. | N/A |

# **Estratégia de Testes**

## **Cenários de Teste — Backend**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Bump single-station — sucesso | Unit | PREPARING → READY, notificação disparada |
| Bump multi-station — parcial | Unit | BAR completa, KITCHEN não. Pedido continua PREPARING. |
| Bump multi-station — completo | Unit | Última estação completa → READY |
| Bump duplicado | Unit | Retorna 200, não reprocessa |
| Hold — com timer | Unit | HELD com holdUntil. Job agendado. |
| Hold — pedido já PREPARING | Unit | Retorna 400 |
| Release — sucesso | Unit | HELD → RECEIVED. Posição cronológica mantida. |
| Course sequencing — STARTER bloqueia MAIN | Unit | MAIN começa HELD. Quando STARTER \= READY, MAIN libera. |
| Course sequencing — sem STARTER | Unit | MAIN entra direto na fila (sem bloqueio) |
| Course override — force release | Unit | MAIN liberado sem STARTER completar |
| Cortesia — não cobra no Check | Integration | Itens produzidos mas excluídos do total da conta |
| Cortesia — baixa estoque | Integration | StockMovement registrado (insumo consumido) |
| Recall — READY → PREPARING | Unit | Pedido volta para fila ativa |
| Pickup board — lista corretas | Unit | Apenas READY de balcão/web-menu |
| Stats — tempo médio | Unit | Cálculo correto de avgPrepTime |

## **Cenários de Teste — Frontend**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| BumpButton — feedback sonoro | Component | Som \+ vibração no toque |
| TimerBadge — cores graduais | Component | Verde → amarelo (1.5x) → vermelho (2x) |
| SourceBadge — render correto | Component | WEB\_MENU, WAITER, WHATSAPP badges |
| HeldSection — countdown | Component | Timer regressivo para holdUntil |
| StationProgress — multi-station | Component | Progresso parcial BAR✓ | KITCHEN... |
| PickupBoard — auto-update | Component | Nova senha aparece sem refresh |
| KDS store — WebSocket events | Unit (Zustand) | Eventos atualizam fila corretamente |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-05**

| PRD | Módulo | Como Usa KDS |
| :---- | :---- | :---- |
| PRD-03 | Cardápio Digital | Web-menu envia pedidos e recebe notificação de READY via WebSocket. |
| PRD-04 | PDV & Gestão | Garçom recebe notificação de READY. Confirma DELIVERED. Mesa muda de cor. |
| PRD-07 | Fechamento | Stats de produção (tempo médio, throughput) alimentam relatório do dia. Cortesias e consumo interno segregados. |
| PRD-09 | WhatsApp | Isis envia pedidos para KDS (novo canal). Cliente recebe status via WhatsApp. |
| PRD-10 | Dashboard BI | Dados históricos de produção: gargalos, picos, eficiência por estação. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Sequenciamento confuso para operador | Média | Médio | Badge de curso grande e claro no ticket. Seção 'Retidos' separada visualmente. Override fácil. |
| Multi-station deadlock (uma estação nunca faz bump) | Baixa | Alto | Timer de alerta quando estação está pendente \> 2x média. Recall disponível para manager. |
| TV mode perde WebSocket sem perceber | Média | Médio | Indicador de conexão visível. Fallback polling 10s. Auto-reconnect. |
| Notificação duplicada ao cliente | Baixa | Baixo | Order.notifiedAt previne duplicatas. Verificar antes de enviar. |
| holdUntil job não dispara (server restart) | Média | Médio | Cronjob a cada 1 minuto verifica pedidos HELD com holdUntil expirado. Não depende só de setTimeout. |
| KDS tablet com tela pequena | Alta | Baixo | Layout responsivo. Ticket compacto em tela \< 768px. Scroll horizontal em fila. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| Bump por estação (não por pedido) | Bump geral no pedido todo | Em multi-estação, BAR termina antes de KITCHEN. Bump por estação reflete realidade operacional. |
| HELD como status de Order | Flag separada isHeld | Status na state machine é mais claro. Previne preparo acidental. Visível na fila como seção separada. |
| Course sequencing por Order | Por OrderItem individual | Simplifica UX. Se o pedido tem STARTER \+ MAIN, o MAIN inteiro espera. Granularidade por item seria confusa. |
| TV mode público (sem auth) | Auth obrigatória | TV no balcão não tem teclado/mouse para login. URL com slug é suficiente. Dados exibidos não são sensíveis. |
| Cronjob para holdUntil (não só setTimeout) | Apenas setTimeout | setTimeout não sobrevive a restart do server. Cronjob é resiliente. |
| Stats em endpoint (não pre-computed) | Tabela materializada | Volume de Phase 1 não justifica materialização. Query direta é suficiente. Otimizar em Phase 2 se necessário. |

# **Sequência de Implementação (2 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: Bump multi-station \+ DELIVERED integration \+ Hold/Release \+ Course sequencing \+ Courtesy \+ Stats endpoint. WebSocket: kds-orders \+ kds-updates \+ client notification. | Todos os endpoints KDS funcionais. Notificação ao cliente via WebSocket. Sequenciamento de cursos. Testes unitários completos. |
| Sprint 2 | Frontend: Refactor KDS queue (source badge, course badge, hold section, station progress) \+ TV Mode (PickupBoard fullscreen) \+ KDSStats page. Integration tests E2E. | UI completa do KDS com todas as features. Painel de retirada funcional. Stats visível. Testes de integração. |

OASYS PRD-05 — KDS & Produção  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*