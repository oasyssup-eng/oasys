

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-03 — Cardápio Digital**  
web-menu: QR Code → cardápio → pedido → pagamento → status

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 1 — Go-Live |
| **Sprints Estimados** | 4 sprints |
| **Complexidade** | Alta |
| **Cobertura Atual** | \~15% |
| **Dependências** | PRD-01 (Schema Foundation), PRD-02 (Payments & CashRegister) |
| **Gap Modules** | M1 — WhatsApp/Client, M5 — Menu/Pricing |
| **Apps Afetadas** | apps/web-menu (NOVO) \+ apps/api |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-03 (Cardápio Digital) é o principal ponto de contato do cliente com o OASYS na Phase 1\. Este módulo cria uma nova aplicação web (apps/web-menu) que permite ao cliente escanear um QR Code na mesa, navegar pelo cardápio, montar seu pedido com modificadores, pagar (se pré-pagamento) e acompanhar o status em tempo real — tudo sem instalar nada, direto do navegador do celular.

O cardápio digital substitui o cardápio físico e reduz a dependência do garçom para anotação de pedidos. Em bares de alto volume com clientes em pé, ele elimina a fila no balcão: o cliente pede e paga do próprio celular. Para mesas, ele complementa o garçom — o cliente pode fazer pedidos adicionais sem esperar atendimento.

Este PRD cobre quatro subsistemas interdependentes:

**1\. Cardápio Público —** App React acessível via URL pública (/{slug}/{mesa}), com navegação por categorias, busca por texto, filtros por tags (vegano, sem glúten), preço dinâmico via PriceSchedule (happy hour), e imagens de produto.

**2\. Montagem de Pedido —** Carrinho com itens, modificadores (grupos obrigatórios e opcionais), observações por item, validação de disponibilidade (isAvailable \+ estoque) e confirmação antes do envio.

**3\. Fluxo de Pagamento —** Integração com PRD-02: em modo PRE\_PAYMENT, o cliente paga PIX/cartão antes do pedido entrar em produção. Em modo POST\_PAYMENT, o pedido vai direto para o KDS e o pagamento é feito ao fechar a conta.

**4\. Acompanhamento em Tempo Real —** WebSocket para atualização de status do pedido (RECEIVED → PREPARING → READY → DELIVERED), com notificação visual e sonora quando o pedido fica pronto.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Nova App | 1 | apps/web-menu (React \+ Vite \+ Tailwind \+ Zustand) |
| Novos Endpoints API | 11 | Menu público, pedidos, sessão, status, carrinho |
| Endpoints Modificados | 3 | Order creation, WebSocket, Product listing |
| Componentes React | \~25 | Páginas, componentes, modais, stores |
| WebSocket Channels | 2 | order-status, check-updates |
| Integrações | 1 | PRD-02 Payments (PIX/cartão no menu) |

## **Critério de Sucesso (Done Definition)**

O PRD-03 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Cliente escaneia QR Code da mesa e acessa o cardápio sem login ou instalação.

2\. Cardápio exibe produtos com categorias, imagens, preços (incluindo happy hour ativo) e filtros por tags.

3\. Cliente monta pedido com modificadores obrigatórios/opcionais e observações por item.

4\. Em modo PRE\_PAYMENT: cliente paga via PIX ou cartão antes do pedido entrar em produção.

5\. Em modo POST\_PAYMENT: pedido vai diretamente para o KDS após confirmação.

6\. Em modo HYBRID: balcão/takeout exige pré-pagamento; mesa permite pós-pagamento.

7\. Cliente acompanha status do pedido em tempo real via WebSocket (RECEIVED → PREPARING → READY → DELIVERED).

8\. Notificação visual e sonora quando pedido fica READY.

9\. Cliente no balcão recebe senha de retirada (orderNumber) após confirmar pedido.

10\. Produto indisponível (isAvailable \= false ou estoque zerado) não pode ser adicionado ao carrinho.

11\. Zero erros de tipo no monorepo. App web-menu builda e serve sem erros.

# **Arquitetura do Cardápio Digital**

O cardápio digital é uma Single Page Application (SPA) React servida como assets estáticos. Não requer autenticação por PIN/JWT — o acesso é público via URL com slug do estabelecimento. A identificação do contexto (qual unidade, qual mesa) é feita via parâmetros na URL e persistida em session storage.

## **Fluxo Completo — QR Code até Pedido Entregue**

┌────────────┐    Escaneia QR     ┌────────────────────────┐  
│  Cliente   │ ────────────▶ │  /boteco-do-ze/mesa/5  │  
│  (celular) │                  │  app.oasys.com.br       │  
└────────────┘                  └────────────┬───────────┘  
                                        │  
                               ┌────────▼─────────┐  
                               │ 1\. Resolver slug     │  
                               │    \+ mesa (API)      │  
                               │    GET /menu/session  │  
                               └────────┬─────────┘  
                                        │  
                               ┌────────▼─────────┐  
                               │ 2\. Retorna:          │  
                               │    \- unitId           │  
                               │    \- tableId          │  
                               │    \- orderPolicy      │  
                               │    \- sessionToken     │  
                               │    \- serviceFeeRate   │  
                               └────────┬─────────┘  
                                        │  
                               ┌────────▼─────────┐  
                               │ 3\. Exibir cardápio   │  
                               │    (categorias,      │  
                               │     produtos, preços)│  
                               └────────┬─────────┘  
                                        │  
                               ┌────────▼─────────┐  
                               │ 4\. Montar pedido     │  
                               │    \+ modificadores    │  
                               │    \+ observações     │  
                               └────────┬─────────┘  
                                        │  
                          ┌─────────┼──────────┐  
                          │                          │  
                 PRE\_PAYMENT              POST\_PAYMENT  
                          │                          │  
                 ┌───────▼──────┐    ┌───────▼──────┐  
                 │ 5a. Pagar     │    │ 5b. Enviar   │  
                 │ (PIX/Cartão) │    │ pedido       │  
                 │ via PRD-02   │    │ direto       │  
                 └──────┬───────┘    └──────┬───────┘  
                        │                    │  
                        └─────────┬────────┘  
                                  │  
                         ┌───────▼────────┐  
                         │ 6\. Pedido no KDS  │  
                         │    WebSocket →    │  
                         │    status update  │  
                         └───────┬────────┘  
                                  │  
                         ┌───────▼────────┐  
                         │ 7\. Cliente vê:   │  
                         │    RECEIVED      │  
                         │    PREPARING     │  
                         │    READY 🔔      │  
                         │    DELIVERED     │  
                         └────────────────┘

## **Estrutura de URLs**

O web-menu usa URLs semânticas com o slug do estabelecimento. Cada URL é acessível publicamente sem autenticação.

| URL Pattern | Página | Descrição |
| :---- | :---- | :---- |
| /{slug}/mesa/{number} | Splash \+ Cardápio | Entrada via QR Code da mesa. Cria sessão com tableId. |
| /{slug}/balcao | Identificação \+ Cardápio | Entrada via QR do balcão. Pede nome/apelido para retirada. |
| /{slug}/menu | Cardápio | Acesso direto ao cardápio (sem mesa/balcão definido). |
| /{slug}/produto/{id} | Detalhe do Produto | Produto com modificadores, foto e descrição. |
| /{slug}/carrinho | Carrinho | Revisão do pedido com total e modificações. |
| /{slug}/checkout | Pagamento | Pagamento PIX/cartão (só em PRE\_PAYMENT). |
| /{slug}/pedido/{id} | Status do Pedido | Acompanhamento em tempo real via WebSocket. |
| /{slug}/pedidos | Meus Pedidos | Lista de pedidos da sessão atual. |

## **Gestão de Sessão**

O web-menu não usa JWT. Em vez disso, usa um session token opaco gerado pelo backend quando o cliente acessa a URL. O token identifica o contexto (unidade \+ mesa/balcão) e é usado para autorizar ações.

**Session Token:** CUID gerado no backend, armazenado em sessionStorage do navegador. Expira em 4 horas ou quando o Check é fechado (PAID/CANCELLED).

**Identificação Mesa:** Parâmetro na URL (/mesa/{number}) resolve para tableId na Unit. Sessão fica vinculada ao Check ativo da mesa.

**Identificação Balcão:** Cliente informa nome/apelido. Cria FloatingAccount com pickupCode. orderNumber é a senha de retirada.

**Multi-dispositivo:** Dois celulares na mesma mesa podem fazer pedidos — ambos vinculam ao mesmo Check ativo da mesa.

# **Especificação de API — Endpoints**

Todos os endpoints do cardápio digital são públicos (sem JWT), exceto onde indicado. Autenticação é via session token no header X-Session-Token. Prefixo: /api/v1/menu.

## **Menu Endpoints — Leitura Pública**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /menu/:slug/session | PUBLIC | Cria sessão. Recebe slug \+ tableNumber ou mode=counter. Retorna sessionToken \+ unit config. |
| GET | /menu/:slug/categories | SESSION | Lista categorias ativas com contagem de produtos. |
| GET | /menu/:slug/products | SESSION | Lista produtos disponíveis com preço (respeitando PriceSchedule ativo). |
| GET | /menu/:slug/products/:id | SESSION | Detalhe do produto com ModifierGroups, ingredientes alergia e imagem. |
| GET | /menu/:slug/search | SESSION | Busca textual em produtos (nome, descrição, tags). |

## **Order Endpoints — Pedido**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /menu/:slug/orders | SESSION | Cria pedido a partir do carrinho. Valida disponibilidade e estoque. |
| GET | /menu/:slug/orders/:id | SESSION | Detalhe do pedido com status atual e itens. |
| GET | /menu/:slug/orders | SESSION | Lista pedidos da sessão (meus pedidos). |
| GET | /menu/:slug/orders/:id/status | SESSION (WS) | WebSocket para atualização de status em tempo real. |
| POST | /menu/:slug/orders/:id/payment | SESSION | Inicia pagamento PIX/cartão (PRE\_PAYMENT). Delega para PRD-02. |
| GET | /menu/:slug/check | SESSION | Resumo da conta ativa (total, itens, pagamentos) para mesa. |

# **Detalhamento de Endpoints**

## **GET /menu/:slug/session**

Ponto de entrada do cardápio digital. Resolve o slug para a Unit, valida o contexto (mesa ou balcão) e retorna um session token com as configurações necessárias para o frontend operar.

### **Query Parameters**

| Parâmetro | Tipo | Obrigatório | Descrição |
| :---- | :---- | :---- | :---- |
| table | Int | Condicional | Número da mesa (obrigatório se mode não informado) |
| mode | String | Condicional | "counter" para balcão (obrigatório se table não informado) |
| name | String | Só balcão | Nome/apelido do cliente para retirada |

### **Response (200)**

{

  "sessionToken": "clx9session...",

  "unit": {

    "id": "clx0unit...",

    "name": "Boteco do Zé — Pinheiros",

    "slug": "boteco-do-ze",

    "orderPolicy": "POST\_PAYMENT",

    "serviceFeeRate": 0.10,

    "tipSuggestions": \[10, 12, 15\],

    "operatingHoursStart": "17:00",

    "operatingHoursEnd": "02:00"

  },

  "context": {

    "type": "TABLE",       // ou "COUNTER"

    "tableId": "clx0tbl...",

    "tableNumber": 5,

    "zoneName": "Salão Principal",

    "checkId": "clx0chk...", // Check ativo da mesa (ou null)

    "customerName": null    // preenchido se balcão

  }

}

### **Regras de Negócio**

R1. Resolver slug para Unit ativa. Se não encontrar, retornar 404: "Estabelecimento não encontrado".

R2. Se table informado: resolver número para Table na Unit. Se não encontrar, retornar 404: "Mesa não encontrada".

R3. Se mode=counter: criar ou reusar FloatingAccount com customerName. Gerar pickupCode aleatório de 4 dígitos.

R4. Verificar horário de funcionamento (operatingHoursStart/End). Se fora do horário, retornar 200 com flag isOpen: false. Frontend exibe mensagem de fechado.

R5. Se mesa já tem Check OPEN, vincular sessão ao Check existente (multi-dispositivo).

R6. Session token expira em 4 horas. Incluir expiresAt no response.

## **GET /menu/:slug/products**

Retorna todos os produtos disponíveis da unidade, agrupados por categoria, com preço efetivo (considerando PriceSchedule ativo se houver).

### **Query Parameters**

| Parâmetro | Tipo | Default | Descrição |
| :---- | :---- | :---- | :---- |
| category | String | null | Filtrar por categoryId |
| search | String | null | Busca textual (nome, descrição, tags) |
| tags | String | null | Filtrar por tags (comma-separated: "vegano,sem\_gluten") |

### **Response (200)**

{

  "categories": \[

    {

      "id": "clx0cat...",

      "name": "Cervejas",

      "sortOrder": 1,

      "products": \[

        {

          "id": "clx0prod...",

          "name": "Chopp Pilsen 300ml",

          "description": "Chopp artesanal gelado",

          "basePrice": 12.90,

          "effectivePrice": 9.90,    // PriceSchedule ativo

          "priceLabel": "Happy Hour", // label do PriceSchedule

          "imageUrl": "https://...",

          "isAvailable": true,

          "preparationTime": 1,

          "station": "BAR",

          "tags": \["gelado"\],

          "sortOrder": 1,

          "hasModifiers": true

        }

      \]

    }

  \]

}

### **Regras de Negócio**

R1. Filtrar apenas produtos com isAvailable \= true.

R2. Aplicar PriceSchedule: verificar se existe PriceSchedule ativo para o produto na data/hora atual (dayOfWeek \+ startTime/endTime). Se sim, effectivePrice \= PriceSchedule.price e priceLabel \= PriceSchedule.label. Se não, effectivePrice \= basePrice.

R3. Ordenar categorias por sortOrder, produtos por sortOrder dentro de cada categoria.

R4. Busca textual (search): case-insensitive em Product.name e tags. Usar ILIKE no Prisma.

R5. Cache: response pode ser cacheado por 60 segundos (produtos raramente mudam durante operação).

## **GET /menu/:slug/products/:id**

Retorna detalhe completo de um produto, incluindo ModifierGroups com seus Modifiers, para o cliente montar o item.

### **Response (200)**

{

  "id": "clx0prod...",

  "name": "Caipirinha Limão",

  "description": "Caipirinha clássica com cachaça e limão tahiti",

  "basePrice": 22.90,

  "effectivePrice": 22.90,

  "imageUrl": "https://...",

  "preparationTime": 3,

  "station": "BAR",

  "tags": \["classico", "refrescante"\],

  "isAvailable": true,

  "modifierGroups": \[

    {

      "id": "clx0mg...",

      "name": "Tipo de Açúcar",

      "required": true,

      "min": 1,

      "max": 1,

      "modifiers": \[

        { "id": "clx0m1...", "name": "Açúcar", "price": 0 },

        { "id": "clx0m2...", "name": "Adoçante", "price": 0 },

        { "id": "clx0m3...", "name": "Sem açúcar", "price": 0 }

      \]

    },

    {

      "id": "clx0mg2...",

      "name": "Extras",

      "required": false,

      "min": 0,

      "max": 3,

      "modifiers": \[

        { "id": "clx0m4...", "name": "Dose extra", "price": 8.00 },

        { "id": "clx0m5...", "name": "Gengibre", "price": 2.00 }

      \]

    }

  \]

}

### **Regras de Negócio**

R1. Se produto não encontrado ou isAvailable \= false, retornar 404\.

R2. ModifierGroups devem incluir regras de validação (required, min, max) para o frontend validar antes de enviar.

R3. Modifier.price é o valor adicional cobrado (0 se sem custo).

## **POST /menu/:slug/orders**

Cria um novo pedido a partir do carrinho do cliente. Valida disponibilidade, estoque, modificadores obrigatórios, e aplica a política de pagamento da unidade.

### **Request Body (Zod Schema)**

const CreateMenuOrderSchema \= z.object({

  items: z.array(z.object({

    productId: z.string().cuid(),

    quantity: z.number().int().positive(),

    notes: z.string().max(200).optional(),

    modifiers: z.array(z.object({

      modifierId: z.string().cuid(),

      quantity: z.number().int().positive().default(1),

    })).optional(),

  })).min(1),

  customerName: z.string().max(100).optional(),

  // customerName obrigatório para mode=counter

});

// Exemplo:

{

  "items": \[

    {

      "productId": "clx0prod...",

      "quantity": 2,

      "notes": "Bem gelado",

      "modifiers": \[

        { "modifierId": "clx0m1...", "quantity": 1 }

      \]

    },

    {

      "productId": "clx0prod2...",

      "quantity": 1

    }

  \]

}

### **Response (201) — POST\_PAYMENT**

{

  "orderId": "clx2ord...",

  "orderNumber": 42,           // senha de retirada

  "status": "RECEIVED",

  "checkId": "clx0chk...",

  "items": \[...\],

  "total": 57.70,

  "paymentRequired": false,    // POST\_PAYMENT \= paga depois

  "message": "Pedido \#42 recebido\! Acompanhe o status."

}

### **Response (201) — PRE\_PAYMENT**

{

  "orderId": "clx2ord...",

  "orderNumber": 42,

  "status": "HELD",            // retido até pagamento

  "checkId": "clx0chk...",

  "items": \[...\],

  "total": 57.70,

  "paymentRequired": true,     // PRE\_PAYMENT \= paga antes

  "paymentOptions": {

    "pix": true,

    "card": true

  },

  "message": "Pedido montado\! Realize o pagamento para enviar."

}

### **Regras de Negócio**

R1. Validar session token. Se inválido/expirado, retornar 401\.

R2. Para cada item: verificar Product.isAvailable \= true. Se indisponível, retornar 400 com lista de itens indisponíveis.

R3. Para cada item: verificar estoque (se ProductIngredient configurado via PRD-08). Se insuficiente, retornar 400\.

R4. Validar ModifierGroups obrigatórios: se required=true e nenhum modifier selecionado, retornar 400\.

R5. Validar min/max de cada ModifierGroup: count(modifiers) \>= min e \<= max.

R6. Calcular preço total: SUM(effectivePrice \* quantity) \+ SUM(modifier.price \* modifier.quantity) para cada item.

R7. Se orderPolicy \= PRE\_PAYMENT: criar Order com status HELD. Não enviar ao KDS até pagamento confirmado.

R8. Se orderPolicy \= POST\_PAYMENT: criar Order com status RECEIVED. Enviar ao KDS imediatamente via WebSocket.

R9. Se orderPolicy \= HYBRID: aplicar PRE\_PAYMENT para context.type=COUNTER e POST\_PAYMENT para context.type=TABLE.

R10. Se mesa: vincular ao Check ativo. Se não existe Check, criar um novo.

R11. Gerar orderNumber sequencial por unit (via autoincrement ou sequence). Este é a senha de retirada.

R12. Registrar Order.source \= "WEB\_MENU".

R13. Notificar garçom via WebSocket que novo pedido foi criado pela mesa.

## **POST /menu/:slug/orders/:id/payment**

Inicia pagamento para pedido em modo PRE\_PAYMENT. Delega para os endpoints de PRD-02 (POST /payments/pix ou /payments/card).

### **Request Body**

const CreateMenuPaymentSchema \= z.object({

  method: z.enum(\["PIX", "CARD"\]),

  customerName: z.string().optional(),

  customerCpf: z.string().length(11).optional(),

  customerEmail: z.string().email().optional(),

});

### **Response (201)**

// Se method \= PIX:

{

  "paymentId": "clx2pay...",

  "method": "PIX",

  "status": "PENDING",

  "pixQrCode": "00020126580014br.gov.bcb.pix...",

  "pixQrCodeBase64": "...",

  "expiresAt": "2026-03-02T22:45:00Z",

  "amount": 57.70

}

// Se method \= CARD:

{

  "paymentId": "clx2pay...",

  "method": "CARD",

  "status": "PENDING",

  "paymentUrl": "https://pagar.me/pay/abc123...",

  "expiresAt": "2026-03-02T23:15:00Z",

  "amount": 57.70

}

### **Regras de Negócio**

R1. Só disponível quando Order.status \= HELD (pré-pagamento pendente).

R2. Delegar para PagarmeService do PRD-02 (createPixOrder ou createCardCheckout).

R3. Quando webhook confirma pagamento: Order.status HELD → RECEIVED. Enviar ao KDS.

R4. Vincular Payment ao CashRegister DIGITAL da unidade.

R5. Se pagamento expira sem confirmação: manter Order como HELD. Cliente pode gerar novo pagamento.

# **OrderPolicy — Fluxos por Política de Pagamento**

A OrderPolicy definida no PRD-01 determina como o cardápio digital se comporta. Cada política tem um fluxo distinto que afeta a UX e o backend.

## **PRE\_PAYMENT — Paga Antes**

Ideal para: bar lotado com cliente em pé, balcão, takeout, eventos.

Cliente monta pedido  
        │  
        ▼  
Confirma carrinho  
        │  
        ▼  
Tela de pagamento (PIX ou Cartão)  
        │  
        ▼  
Order criado com status HELD  
        │  
   \[Aguardando pagamento...\]  
        │  
Webhook confirma pagamento  
        │  
        ▼  
Order.status → RECEIVED  
Pedido enviado ao KDS  
        │  
        ▼  
Cliente acompanha status  
Recebe senha de retirada (\#42)

## **POST\_PAYMENT — Paga Depois**

Ideal para: restaurante com mesa, modelo tradicional.

Cliente monta pedido  
        │  
        ▼  
Confirma carrinho  
        │  
        ▼  
Order criado com status RECEIVED  
Pedido enviado ao KDS imediatamente  
        │  
        ▼  
Cliente acompanha status  
        │  
        ▼  
Pedido entregue na mesa  
        │  
   \[...cliente consome...\]  
        │  
        ▼  
Garçom fecha conta (PRD-04)  
Pagamento via PRD-02

## **HYBRID — Misto**

Combina ambos: balcão/takeout usa PRE\_PAYMENT, mesa usa POST\_PAYMENT. A decisão é automática baseada no context.type da sessão.

| Contexto | Política Aplicada | Razão |
| :---- | :---- | :---- |
| context.type \= TABLE | POST\_PAYMENT | Mesa tem garçom, cliente consome e paga ao sair |
| context.type \= COUNTER | PRE\_PAYMENT | Balcão sem garçom, reduz calote e agiliza fila |

# **WebSocket — Status em Tempo Real**

O cliente acompanha o status do pedido via WebSocket. A conexão é aberta na página de status do pedido e recebe eventos a cada mudança de estado.

## **Conexão**

// URL de conexão:

ws://api.oasys.com.br/ws/menu/order-status

// Handshake (primeira mensagem do cliente):

{

  "type": "subscribe",

  "sessionToken": "clx9session...",

  "orderId": "clx2ord..."

}

## **Eventos Server → Client**

| Evento | Quando | Payload Extra | UX no Cliente |
| :---- | :---- | :---- | :---- |
| order.received | Pedido recebido pelo KDS | estimatedTime: 12 | "Pedido recebido\! Tempo estimado: 12 min" |
| order.preparing | Cozinha/bar iniciou preparo | stationName: "BAR" | "Seu pedido está sendo preparado" |
| order.ready | Pedido pronto para retirada/entrega | orderNumber: 42 | Notificação sonora \+ "Pedido \#42 PRONTO\!" |
| order.delivered | Confirmado como entregue | — | "Pedido entregue. Bom apetite\!" |
| order.cancelled | Pedido cancelado | reason: "..." | "Pedido cancelado: \[motivo\]" |
| payment.confirmed | Pagamento PIX/cartão confirmado | paymentId | "Pagamento confirmado\!" (PRE\_PAYMENT: pedido vai ao KDS) |

### **Exemplo de Mensagem WebSocket**

{

  "event": "order.ready",

  "orderId": "clx2ord...",

  "orderNumber": 42,

  "timestamp": "2026-03-02T22:27:00Z",

  "data": {

    "stationName": "BAR",

    "items": \["Chopp Pilsen 300ml x2", "Caipirinha Limão x1"\]

  }

}

### **Fallback: Polling**

Se WebSocket falhar (rede instável, proxy corporativo), o frontend faz fallback para polling via GET /menu/:slug/orders/:id a cada 5 segundos. O store detecta falha no WebSocket e ativa polling automaticamente.

# **Preço Dinâmico — PriceSchedule**

O cardápio digital respeita a tabela de preços por horário definida no PRD-01 (model PriceSchedule). Quando um PriceSchedule está ativo, o preço exibido ao cliente é o preço promocional, com indicação visual.

## **Lógica de Resolução de Preço**

function getEffectivePrice(product, unitId, now \= new Date()) {

  const dayOfWeek \= now.getDay(); // 0=Dom ... 6=Sab

  const currentTime \= format(now, "HH:mm");

  const schedule \= await prisma.priceSchedule.findFirst({

    where: {

      productId: product.id,

      unitId,

      dayOfWeek,

      startTime: { lte: currentTime },

      endTime: { gte: currentTime },

      isActive: true,

    },

  });

  if (schedule) {

    return {

      effectivePrice: schedule.price,

      basePrice: product.price,

      priceLabel: schedule.label, // "Happy Hour"

      isPromotional: true,

    };

  }

  return {

    effectivePrice: product.price,

    basePrice: product.price,

    priceLabel: null,

    isPromotional: false,

  };

}

A resolução de preço acontece no backend (não no frontend) para evitar manipulação. O frontend recebe effectivePrice já calculado. O preço usado no Order é sempre o effectivePrice no momento da criação — se o happy hour acabar enquanto o cliente monta o pedido, o preço usado é o do momento do POST.

# **UI — Web Menu (apps/web-menu)**

O web-menu é uma nova app no monorepo OASYS. Mobile-first, zero instalação, otimizada para velocidade em 4G. O design prioriza legibilidade ao sol (outdoor) e operação com uma mão (cliente segurando drink na outra).

## **Tech Stack**

| Tecnologia | Versão | Propósito |
| :---- | :---- | :---- |
| React | 18 | UI components |
| Vite | 5 | Build tool \+ dev server |
| TailwindCSS | 3 | Utility-first styling |
| Zustand | 4 | State management (cart, session, orders) |
| React Query | 5 | Server state \+ caching |
| React Router | 6 | Client-side routing |
| Framer Motion | 11 | Animações de transição (sutil) |

## **Tela: Splash / Boas-vindas**

Exibida por 1.5s ao acessar a URL. Mostra logo/nome do estabelecimento enquanto a sessão é criada no backend.

┌───────────────────────────────────────┐  
│                                       │  
│           🍺 BOTECO DO ZÉ              │  
│              Pinheiros                │  
│                                       │  
│           Mesa 5 — Salão              │  
│                                       │  
│           \[  Carregando...  \]          │  
│                                       │  
└───────────────────────────────────────┘

## **Tela: Cardápio**

A tela principal. Exibe categorias como tabs horizontais scrolláveis no topo, com lista de produtos abaixo. Busca acessível no header.

┌───────────────────────────────────────┐  
│  Boteco do Zé     Mesa 5     🔍 🛒(3)│  
├───────────────────────────────────────┤  
│ 🍺 Cervejas | 🍸 Drinks | 🍟 Petiscos |│  
├───────────────────────────────────────┤  
│                                       │  
│  ┌───────────────────────────────────┐  │  
│  │ Chopp Pilsen 300ml          📷 │  │  
│  │ R$ 9,90  ̶R̶$̶ ̶$̶1̶2̶,̶9̶0̶ HAPPY HOUR │  │  
│  │ BAR • 1 min                      │  │  
│  │                    \[ \+ Adicionar \] │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
│  ┌───────────────────────────────────┐  │  
│  │ Chopp Pilsen 500ml          📷 │  │  
│  │ R$ 18,90                        │  │  
│  │ BAR • 1 min                      │  │  
│  │                    \[ \+ Adicionar \] │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
│  ┌───────────────────────────────────┐  │  
│  │ IPA Artesanal 300ml         📷 │  │  
│  │ R$ 16,90                        │  │  
│  │ BAR • 1 min                      │  │  
│  │                    \[ \+ Adicionar \] │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
├───────────────────────────────────────┤  
│  🛒 Ver carrinho (3 itens) R$ 39,70  │  
└───────────────────────────────────────┘

## **Tela: Detalhe do Produto**

Abre como bottom sheet ou página completa. Exibe foto grande, descrição, modificadores com validação e campo de observações.

┌───────────────────────────────────────┐  
│  ← Voltar                              │  
├───────────────────────────────────────┤  
│  ┌───────────────────────────────────┐  │  
│  │         \[FOTO DO PRODUTO\]          │  │  
│  │                                     │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
│  Caipirinha Limão               R$ 22,90│  
│  Cachaça, limão tahiti, açúcar     │  
│  BAR • 3 min                          │  
│                                       │  
│  ── Tipo de Açúcar (obrigatório) ──   │  
│  ○ Açúcar                              │  
│  ○ Adoçante                            │  
│  ○ Sem açúcar                          │  
│                                       │  
│  ── Extras (opcional, até 3\) ─────   │  
│  ☐ Dose extra              \+ R$ 8,00  │  
│  ☐ Gengibre                \+ R$ 2,00  │  
│                                       │  
│  Observações:                          │  
│  ┌───────────────────────────────────┐  │  
│  │ Ex: pouco gelo, limão extra       │  │  
│  └───────────────────────────────────┘  │  
│                                       │  
│      \[ \- \]    1    \[ \+ \]               │  
│                                       │  
│  ┌───────────────────────────────────┐  │  
│  │  Adicionar ao carrinho   R$ 22,90  │  │  
│  └───────────────────────────────────┘  │  
└───────────────────────────────────────┘

## **Tela: Carrinho**

Revisão completa do pedido antes do envio. Permite editar quantidade, remover itens e adicionar mais produtos.

┌───────────────────────────────────────┐  
│  ← Carrinho                    (3)    │  
├───────────────────────────────────────┤  
│                                       │  
│  Chopp Pilsen 300ml            x2     │  
│  Açúcar                                 │  
│  "Bem gelado"                          │  
│  \[ \- \] 2 \[ \+ \]          R$ 19,80  🗑  │  
│                                       │  
│  Caipirinha Limão              x1     │  
│  Adoçante, Dose extra                 │  
│  \[ \- \] 1 \[ \+ \]          R$ 30,90  🗑  │  
│                                       │  
│  ─────────────────────────────────   │  
│  \+ Adicionar mais itens                │  
│  ─────────────────────────────────   │  
│                                       │  
│  Subtotal                    R$ 50,70  │  
│  Taxa de serviço (10%)       R$  5,07  │  
│  ─────────────────────────────────   │  
│  TOTAL                       R$ 55,77  │  
│                                       │  
│  ┌───────────────────────────────────┐  │  
│  │      Enviar pedido                 │  │  
│  └───────────────────────────────────┘  │  
└───────────────────────────────────────┘

## **Tela: Status do Pedido**

Acompanhamento em tempo real. Stepper vertical mostra progresso. Notificação sonora \+ vibração quando READY.

┌───────────────────────────────────────┐  
│  Pedido \#42              Mesa 5      │  
├───────────────────────────────────────┤  
│                                       │  
│  ● Recebido                  22:15    │  
│  │                                    │  
│  ● Preparando                22:16    │  
│  │  BAR está preparando seus drinks    │  
│  │                                    │  
│  ○ Pronto                             │  
│  │                                    │  
│  ○ Entregue                            │  
│                                       │  
│  Tempo estimado: \~3 min               │  
│                                       │  
│  ──────────────────────────────   │  
│  Itens:                               │  
│  2x Chopp Pilsen 300ml                │  
│  1x Caipirinha Limão                  │  
│     \+ Dose extra                       │  
│                                       │  
├───────────────────────────────────────┤  
│  🛒 Fazer novo pedido                  │  
└───────────────────────────────────────┘

# **Componentes React**

| Componente | Arquivo | Responsabilidade |
| :---- | :---- | :---- |
| SplashScreen | pages/Splash.tsx | Tela de boas-vindas com logo e loading da sessão |
| CounterIdentification | pages/CounterIdentification.tsx | Input de nome/apelido para balcão |
| MenuPage | pages/Menu.tsx | Página principal: categorias \+ lista de produtos |
| ProductDetail | pages/ProductDetail.tsx | Detalhe com modificadores, foto, notas |
| CartPage | pages/Cart.tsx | Revisão do carrinho com edição |
| CheckoutPage | pages/Checkout.tsx | Pagamento PIX/cartão (PRE\_PAYMENT) |
| OrderStatus | pages/OrderStatus.tsx | Acompanhamento em tempo real (stepper) |
| MyOrders | pages/MyOrders.tsx | Lista de pedidos da sessão |
| CheckSummary | pages/CheckSummary.tsx | Resumo da conta da mesa |
| ClosedScreen | pages/Closed.tsx | "Estamos fechados" com horário |
| CategoryTabs | components/CategoryTabs.tsx | Tabs horizontais scrolláveis de categorias |
| ProductCard | components/ProductCard.tsx | Card de produto na lista (compacto) |
| ProductImage | components/ProductImage.tsx | Imagem lazy-loaded com placeholder |
| ModifierGroup | components/ModifierGroup.tsx | Grupo de modificadores com validação |
| CartItem | components/CartItem.tsx | Item no carrinho com edição de qtd |
| CartFAB | components/CartFAB.tsx | Botão flutuante do carrinho (badge \+ total) |
| PriceTag | components/PriceTag.tsx | Preço com promoção (riscado \+ label) |
| SearchBar | components/SearchBar.tsx | Busca com debounce e suggestions |
| TagFilter | components/TagFilter.tsx | Filtros por tag (vegano, sem glúten) |
| OrderStepper | components/OrderStepper.tsx | Stepper vertical de status |
| PixPaymentView | components/PixPaymentView.tsx | QR Code PIX \+ timer \+ status |
| CardPaymentView | components/CardPaymentView.tsx | Link de pagamento \+ copiar |
| EmptyCart | components/EmptyCart.tsx | Estado vazio do carrinho |
| HappyHourBanner | components/HappyHourBanner.tsx | Banner de happy hour ativo |
| NotificationToast | components/NotificationToast.tsx | Toast de notificação (pedido pronto) |

# **Zustand Stores**

## **Session Store**

// apps/web-menu/src/stores/session.store.ts

interface SessionStore {

  sessionToken: string | null;

  unit: UnitConfig | null;

  context: SessionContext | null;

  isOpen: boolean;

  expiresAt: string | null;

  initSession: (slug: string, params: SessionParams) \=\> Promise\<void\>;

  clearSession: () \=\> void;

  isExpired: () \=\> boolean;

}

## **Cart Store**

// apps/web-menu/src/stores/cart.store.ts

interface CartItem {

  productId: string;

  product: ProductSummary;

  quantity: number;

  notes?: string;

  modifiers: SelectedModifier\[\];

  unitPrice: number;        // effectivePrice \+ modifiers

  totalPrice: number;       // unitPrice \* quantity

}

interface CartStore {

  items: CartItem\[\];

  itemCount: number;        // computed

  subtotal: number;         // computed

  serviceFee: number;       // computed (subtotal \* serviceFeeRate)

  total: number;            // computed (subtotal \+ serviceFee)

  addItem: (item: CartItem) \=\> void;

  updateQuantity: (index: number, quantity: number) \=\> void;

  removeItem: (index: number) \=\> void;

  clearCart: () \=\> void;

}

## **Order Store**

// apps/web-menu/src/stores/order.store.ts

interface OrderStore {

  currentOrder: Order | null;

  orders: Order\[\];

  pendingPayment: Payment | null;

  wsConnected: boolean;

  submitOrder: () \=\> Promise\<Order\>;

  initiatePayment: (method: "PIX" | "CARD") \=\> Promise\<Payment\>;

  subscribeToStatus: (orderId: string) \=\> void;

  unsubscribeFromStatus: () \=\> void;

  loadOrders: () \=\> Promise\<void\>;

}

# **Estrutura de Arquivos**

apps/web-menu/

├── index.html

├── vite.config.ts

├── tailwind.config.ts

├── tsconfig.json

├── package.json

└── src/

    ├── main.tsx

    ├── App.tsx                    \# Router \+ providers

    ├── pages/

    │   ├── Splash.tsx

    │   ├── CounterIdentification.tsx

    │   ├── Menu.tsx

    │   ├── ProductDetail.tsx

    │   ├── Cart.tsx

    │   ├── Checkout.tsx

    │   ├── OrderStatus.tsx

    │   ├── MyOrders.tsx

    │   ├── CheckSummary.tsx

    │   └── Closed.tsx

    ├── components/

    │   ├── CategoryTabs.tsx

    │   ├── ProductCard.tsx

    │   ├── ProductImage.tsx

    │   ├── ModifierGroup.tsx

    │   ├── CartItem.tsx

    │   ├── CartFAB.tsx

    │   ├── PriceTag.tsx

    │   ├── SearchBar.tsx

    │   ├── TagFilter.tsx

    │   ├── OrderStepper.tsx

    │   ├── PixPaymentView.tsx

    │   ├── CardPaymentView.tsx

    │   ├── EmptyCart.tsx

    │   ├── HappyHourBanner.tsx

    │   └── NotificationToast.tsx

    ├── stores/

    │   ├── session.store.ts

    │   ├── cart.store.ts

    │   └── order.store.ts

    ├── hooks/

    │   ├── useMenu.ts              \# React Query: categories \+ products

    │   ├── useProduct.ts           \# React Query: product detail

    │   ├── useOrderStatus.ts       \# WebSocket hook

    │   └── useSession.ts           \# Session management

    ├── lib/

    │   ├── api.ts                  \# Axios/fetch configured with session token

    │   ├── websocket.ts            \# WebSocket client with reconnect

    │   └── format.ts               \# Price formatting (BRL)

    └── types/

        └── menu.types.ts           \# All shared types

## **Endpoints API — Estrutura Backend**

apps/api/src/modules/menu/

├── menu.routes.ts              \# Registro de rotas públicas

├── menu.service.ts             \# Lógica: session, products, orders

├── menu.schemas.ts             \# Schemas Zod (request/response)

├── price.service.ts            \# Resolução de preço (PriceSchedule)

├── session.service.ts          \# Criação e validação de sessão

└── \_\_tests\_\_/

    ├── menu.test.ts

    ├── session.test.ts

    └── price.test.ts

# **Performance & Otimizações**

O web-menu é acessado no celular do cliente, frequentemente em rede 4G dentro de um bar lotado. Performance é crítica.

| Métrica | Target | Estratégia |
| :---- | :---- | :---- |
| First Contentful Paint | \< 1.5s | SPA com Vite, code splitting por rota, fontes do sistema |
| Largest Contentful Paint | \< 2.5s | Imagens lazy-loaded, WebP com fallback, placeholder blur |
| Bundle Size (gzipped) | \< 100KB | Tree shaking, sem UI library pesada, Tailwind purge |
| Time to Interactive | \< 3s | Skeleton screens, dados essenciais no session response |
| API Response (products) | \< 200ms | Cache 60s, query otimizada, índices Prisma |
| WebSocket Reconnect | \< 2s | Backoff exponencial, max 5 tentativas, fallback polling |

## **Estratégias de Otimização**

**Imagens:** Todas servidas como WebP (compactado). Tamanho máximo 400x400px para card, 800x800px para detalhe. Lazy loading nativo com loading="lazy". Placeholder com blur hash inline.

**Cache:** React Query com staleTime de 60s para produtos (cardápio raramente muda durante operação). Sessão em sessionStorage. Carrinho em memória (Zustand).

**Code Splitting:** React.lazy() para rotas de checkout, status de pedido e meus pedidos. Rota principal (cardápio) carrega imediatamente.

**Fontes:** System font stack (sem download de fontes custom). \-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif.

# **Tratamento de Erros e Edge Cases**

| Cenário | Comportamento Esperado | HTTP |
| :---- | :---- | :---- |
| Slug inválido (unit não existe) | Tela: "Estabelecimento não encontrado" | 404 |
| Mesa não existe na unit | Tela: "Mesa não encontrada. Verifique o QR Code." | 404 |
| Fora do horário de funcionamento | Tela com horário: "Estamos fechados. Abrimos às 17h." | 200 |
| Session token expirado | Redirect para splash com mensagem: "Sessão expirada" | 401 |
| Produto ficou indisponível durante montagem | Toast: "\[Produto\] ficou indisponível". Remove do carrinho. | 400 |
| Estoque insuficiente ao enviar pedido | Toast com lista de itens sem estoque. Sugestão de remover. | 400 |
| Modifier obrigatório não selecionado | Validação no frontend. Botão de adicionar desabilitado. | N/A |
| WebSocket desconectou | Fallback automático para polling (5s). Indicador de reconexão. | N/A |
| Pagamento PIX expirou | Mensagem: "QR Code expirou". Botão para gerar novo. | N/A |
| Pagamento cartão falhou | Mensagem do gateway. Botão para tentar novamente. | N/A |
| Carrinho vazio ao tentar enviar | Botão de enviar desabilitado. Link para cardápio. | N/A |
| Múltiplos dispositivos na mesma mesa | Ambos funcionam. Pedidos vinculam ao mesmo Check. | N/A |
| Rede muito lenta (timeout) | Skeleton persistente → retry automático → msg offline | N/A |
| QR Code de outra unidade | Mostra cardápio da unidade correta (baseado no slug) | 200 |

# **Estratégia de Testes**

## **Cenários de Teste — Backend API**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Session — mesa válida | Unit | Cria sessão com sessionToken, retorna unit config |
| Session — slug inválido | Unit | Retorna 404 |
| Session — fora do horário | Unit | Retorna isOpen: false com horários |
| Products — lista com categorias | Unit | Retorna produtos agrupados, ordenados, apenas disponíveis |
| Products — PriceSchedule ativo | Unit | effectivePrice \= preço promocional quando happy hour ativo |
| Products — busca textual | Unit | Filtro por nome e tags retorna resultados corretos |
| Order — POST\_PAYMENT sucesso | Unit | Cria Order RECEIVED, vincula ao Check, notifica KDS |
| Order — PRE\_PAYMENT sucesso | Unit | Cria Order HELD, retorna paymentRequired: true |
| Order — produto indisponível | Unit | Retorna 400 com lista de indisponíveis |
| Order — modifier obrigatório faltando | Unit | Retorna 400 com detalhes do grupo |
| Order — estoque insuficiente | Integration | Verifica ProductIngredient e nega se não há estoque |
| Payment — PIX no menu | Unit (mock) | Delega para PRD-02, retorna QR Code |
| Payment confirmed → HELD to RECEIVED | Integration | Webhook confirma, Order vai ao KDS |
| Session — expiração | Unit | Token expirado retorna 401 |
| Multi-device — mesmo Check | Integration | Duas sessões na mesma mesa vinculam ao mesmo Check |

## **Cenários de Teste — Frontend**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Cart store — add/remove/update | Unit (Zustand) | Manipulação do carrinho com cálculos corretos |
| ModifierGroup — validação | Component | Obrigatório bloqueia submit. Min/max respeitado. |
| PriceTag — promoção | Component | Exibe preço riscado \+ label quando isPromotional |
| OrderStepper — progressão | Component | Steps atualizam com status correto |
| WebSocket fallback — polling | Integration | Ativa polling quando WS falha |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-03**

| PRD | Módulo | Como Usa Cardápio Digital |
| :---- | :---- | :---- |
| PRD-05 | KDS & Produção | Recebe pedidos do web-menu como novo canal (source: WEB\_MENU). Pedidos chegam via WebSocket. |
| PRD-09 | WhatsApp & Isis | Cardápio compartilha lógica de preço, disponibilidade e criação de pedido. WhatsApp reutiliza menu.service.ts. |
| PRD-11 | CRM & Fidelização | Sessões do web-menu alimentam dados de consumo por cliente (via phone ou nome). |
| PRD-14 | Delivery | web-menu adiciona modo delivery (endereço \+ taxa). Mesma infra de cardápio e pedido. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Performance ruim em 4G | Média | Alto | Bundle \< 100KB, imagens WebP lazy-loaded, skeleton screens, cache agressivo. |
| WebSocket instável em bar lotado | Alta | Médio | Fallback automático para polling. Reconexão com backoff exponencial. |
| Cliente fecha browser antes do pedido | Alta | Baixo | Pedido já está no backend. Sessão permite retornar. sessionStorage persiste. |
| PriceSchedule com horário de verão | Baixa | Médio | Usar timezone do servidor (America/Sao\_Paulo). Não depender do timezone do cliente. |
| QR Code leva para URL errada | Baixa | Alto | Validação de slug \+ mesa no session endpoint. Mensagem clara de erro. |
| Pedidos simultâneos esgotam estoque | Média | Médio | Validação de estoque no POST /orders com Prisma transaction. Race condition resolvida por lock. |
| SEO desnecessário indexa cardápio | Baixa | Baixo | robots.txt com Disallow: /. Meta noindex. Cardápio é privado. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| SPA (React \+ Vite) | SSR (Next.js) | Cardápio não precisa de SEO (privado). SPA é mais simples, menor bundle, sem servidor Node extra. |
| Session token (opaco) | JWT público | JWT exporia dados da unidade. Session token opaco é mais seguro para contexto público. |
| sessionStorage (não localStorage) | localStorage | Sessão do cardápio é temporária (4h). sessionStorage limpa ao fechar aba, evitando dados obsoletos. |
| WebSocket \+ polling fallback | Só polling | WebSocket dá UX em tempo real. Polling é fallback robusto para redes instáveis. |
| Preço resolvido no backend | Preço no frontend | Evita manipulação. PriceSchedule é lógica de negócio, não de apresentação. |
| Tailwind (sem UI lib) | shadcn/ui ou MUI | Bundle menor. Mobile-first custom é mais rápido que adaptar desktop lib. Design sob controle total. |
| Monorepo (apps/web-menu) | App separado | Compartilha types e config do monorepo. Turborepo gerencia build. Consistência de stack. |

# **Sequência de Implementação (4 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: Session \+ Menu API \+ PriceSchedule | Endpoints públicos funcionais: session, categories, products (com preço dinâmico). Testes unitários. |
| Sprint 2 | Backend: Order creation \+ WebSocket \+ Payment delegation | POST /orders com OrderPolicy. WebSocket de status. Integração com PRD-02 payments. Testes. |
| Sprint 3 | Frontend: App setup \+ Cardápio \+ Produto \+ Carrinho | App web-menu no monorepo. Navegação, busca, filtros, modificadores, carrinho funcional. |
| Sprint 4 | Frontend: Checkout \+ Status \+ Polish \+ Integração E2E | Pagamento PIX/cartão no menu. Status em tempo real. Testes E2E. Otimização de performance. |

OASYS PRD-03 — Cardápio Digital  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*