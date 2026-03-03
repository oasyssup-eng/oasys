

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-09 — WhatsApp & Isis**  
Agente virtual, envio real via Graph API, upsell, campanhas, notificações

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 2 — Growth & Scale |
| **Sprints Estimados** | 4 sprints |
| **Complexidade** | Alta |
| **Cobertura Atual** | \~35% |
| **Dependências** | PRD-03 (Cardápio Digital), PRD-05 (KDS & Produção) |
| **Gap Modules** | M1 — WhatsApp / Client (Isis) |
| **Apps Afetadas** | apps/api (whatsapp module) |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-09 (WhatsApp & Isis) transforma o OASYS de um sistema operacional acessível apenas dentro do bar para uma plataforma que alcanca o cliente no canal mais usado do Brasil: WhatsApp. Isis é a agente virtual do estabelecimento — recebe pedidos, notifica status, sugere itens, e cria uma experiência personalizada para cada cliente.

A cobertura atual é \~35%: existe uma state machine com 7 estados (IDLE, GREETING, BROWSING\_MENU, BUILDING\_ORDER, CONFIRMING\_ORDER, AWAITING\_PAYMENT, ORDER\_PLACED), parse de intencoes, e integração básica com o fluxo de pedidos. Porém, NENHUMA mensagem é enviada realmente — tudo vai para console.log. Este PRD substitui console.log por envio real via Meta Graph API com retry e fila persistente.

Este é Phase 2 porque o cardápio digital (PRD-03, Phase 1\) cobre a experiência básica do cliente. WhatsApp ADICIONA canal, não substitui. A decisão de diferir foi correta — Phase 1 valida o produto com web app; Phase 2 escala via WhatsApp.

Este PRD cobre seis subsistemas:

**1\. Envio Real de Mensagens —** sendWhatsAppMessage() conectado à Meta Graph API v19.0. Suporta texto, botões interativos, listas, imagens e documentos. Substituir TODO console.log existente.

**2\. Fluxo Conversacional Completo —** State machine atualizada com novos estados para navegação de cardápio com imagens, pagamento inline (PIX QR via WhatsApp), e feedback pós-consumo.

**3\. Notificações de Status em Tempo Real —** Quando pedido muda de status (RECEIVED → PREPARING → READY → DELIVERED), Isis envia mensagem automática ao cliente.

**4\. Upsell Automático —** Scheduler que, após N minutos sem interação, sugere itens complementares baseados no que o cliente já pediu e no contexto (horário, clima, promoções).

**5\. Chamar Garçom —** Cliente envia "chamar garçom" pelo WhatsApp, garçom recebe notificação real no web-waiter com mesa e contexto.

**6\. Fila Persistente com Retry —** Redis Streams para garantir entrega de mensagens. Retry automático com backoff exponencial. Dead letter queue para falhas permanentes.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Código Existente Modificado | \~15 arquivos | Substituir console.log por envio real em toda a state machine |
| Serviços Novos | 4 | MessageSender, UpsellEngine, NotificationDispatcher, QueueManager |
| Endpoints Novos | 3 | Webhook Meta, configuração WhatsApp, status de fila |
| Endpoints Modificados | 2 | Order status change dispara notificação, Waiter call real |
| Infraestrutura | 1 | Redis para fila persistente (Redis Streams) |
| Templates WhatsApp | \~8 | Templates pré-aprovados pela Meta para notificações |
| Componentes React (web-owner) | \~4 | Configuração WhatsApp, métricas de mensagens, templates |

## **Critério de Sucesso (Done Definition)**

O PRD-09 está concluído quando TODOS os seguintes critérios são atendidos:

1\. sendWhatsAppMessage() envia mensagem real via Graph API. Console.log eliminado de toda a codebase WhatsApp.

2\. Cliente faz pedido completo via WhatsApp: navega cardápio → escolhe itens → confirma → paga (se pré-pagamento) → acompanha status.

3\. Notificações de status enviadas automaticamente: pedido recebido, em preparo, pronto, entregue.

4\. Upsell automático funcional: após 15 minutos, sugere itens complementares.

5\. "Chamar garçom" via WhatsApp gera notificação real no web-waiter.

6\. Fila Redis Streams operacional com retry (3 tentativas, backoff exponencial).

7\. Templates WhatsApp aprovados pela Meta (mínimo: boas-vindas, status pedido, upsell, feedback).

8\. Métricas de mensagens visíveis no web-owner: enviadas, entregues, lidas, falhas.

9\. Zero erros de tipo no monorepo.

# **Estado Atual (\~35%)**

O módulo WhatsApp é o mais desenvolvido em termos de lógica de negócio, mas o mais "falso" em termos de entrega real. A state machine é sofisticada; o envio é inexistente.

| Feature | Estado Atual | PRD-09 Adiciona |
| :---- | :---- | :---- |
| State machine (7 estados) | Funcional com transições | Novos estados: VIEWING\_PRODUCT, PAYING, POST\_ORDER\_FEEDBACK |
| Intent parser | Funcional (regex \+ keywords) | Melhorar com NLP básico (compromise.js ou similar) |
| sendWhatsAppMessage() | console.log apenas | Envio real via Meta Graph API v19.0 |
| Webhook de recebimento (Meta) | Não implementado | Implementar POST /whatsapp/webhook com verificação |
| Sessão (WhatsAppSession) | Model existe e funciona | Adicionar campos: lastMessageAt, messageCount, context |
| Cardápio via WhatsApp | Texto simples (sem imagens) | Listas interativas, imagens de produtos, botões |
| Notificações de status | Não implementado | Automáticas em cada transição de status do pedido |
| Upsell | Lógica básica existe | Scheduler com regras de timing, contexto, e complementaridade |
| Chamar garçom | Intent reconhecida | Notificação real no web-waiter via WebSocket |
| Retry / fila | Não existe | Redis Streams com retry e dead letter queue |
| Templates Meta | Não existe | 8 templates submetidos e aprovados |
| Métricas | Não existe | Contadores de mensagens, taxas de leitura, erros |

# **Arquitetura**

## **Visão Geral de Integração**

┌───────────┐     ┌───────────────┐     ┌───────────────┐  
│  Cliente  │ ←→←→ │  WhatsApp     │ ←→←→ │  Meta Graph   │  
│ (celular) │     │  Cloud API    │     │  API v19.0    │  
└───────────┘     └───────┬───────┘     └───────────────┘  
                    │  
              Webhook (POST)  
                    │  
              ┌─────▼─────────┐  
              │  OASYS API      │  
              │  /whatsapp/     │  
              │  webhook        │  
              └─────┬─────────┘  
                    │  
              ┌─────▼─────────┐  
              │ Conversation    │  
              │ Router          │  
              │ (state machine) │  
              └─┬─────────┬───┘  
                │           │  
          ┌────▼───┐ ┌──▼──────┐  
          │ Response │ │ Side      │  
          │ Builder  │ │ Effects   │  
          └────┬────┘ │(orders,   │  
               │      │ alerts,   │  
               │      │ stock)    │  
               │      └──────────┘  
          ┌────▼─────────┐  
          │ Redis Streams  │  
          │ (message       │  
          │  queue)        │  
          └────┬─────────┘  
               │  
          ┌────▼─────────┐  
          │ Message Sender │ →→ Meta Graph API  
          │ (consumer)     │ →→ Retry \+ DLQ  
          └──────────────┘

## **State Machine — Atualizada**

A state machine existente tem 7 estados. PRD-09 adiciona 3 novos estados e refina as transições para suportar o fluxo completo com envio real.

| Estado | Status | Descrição | Mensagem Isis Envia |
| :---- | :---- | :---- | :---- |
| IDLE | Existente | Sem sessão ativa. Aguardando primeira mensagem. | — |
| GREETING | Existente | Cliente mandou primeira mensagem. Isis se apresenta. | Boas-vindas \+ perguntar como ajudar |
| BROWSING\_MENU | Existente | Cliente navegando categorias do cardápio. | Lista interativa de categorias |
| VIEWING\_PRODUCT | NOVO | Cliente vendo detalhes de um produto específico. | Imagem \+ descrição \+ preço \+ botão "Adicionar" |
| BUILDING\_ORDER | Existente | Cliente montando pedido (carrinho). | Resumo do carrinho \+ botões "Adicionar mais" / "Finalizar" |
| CONFIRMING\_ORDER | Existente | Revisão final antes de enviar. | Detalhamento com preços \+ total \+ botão "Confirmar" |
| AWAITING\_PAYMENT | Existente | Pré-pagamento: aguardando PIX/cartão. | QR Code PIX ou link de pagamento |
| PAYING | NOVO | Pagamento em andamento (PIX gerado, aguardando). | Timer \+ status \+ botão "Já paguei" |
| ORDER\_PLACED | Existente | Pedido confirmado e na fila de produção. | Confirmação \+ número \+ tempo estimado |
| POST\_ORDER\_FEEDBACK | NOVO | Após entrega, coleta feedback/oferece reorder. | "Como foi? Quer pedir mais alguma coisa?" |

### **Transições Críticas**

| De | Para | Trigger | Condição |
| :---- | :---- | :---- | :---- |
| IDLE | GREETING | Qualquer mensagem do cliente | Sessão nova ou expirada (\>24h) |
| GREETING | BROWSING\_MENU | Cliente pede cardápio | Intent: "ver cardápio", "menu", "o que tem" |
| BROWSING\_MENU | VIEWING\_PRODUCT | Cliente seleciona item da lista | Botão interativo ou nome do produto |
| VIEWING\_PRODUCT | BUILDING\_ORDER | Cliente clica "Adicionar" | Item adicionado ao carrinho |
| BUILDING\_ORDER | CONFIRMING\_ORDER | Cliente clica "Finalizar pedido" | Carrinho não vazio |
| CONFIRMING\_ORDER | AWAITING\_PAYMENT | OrderPolicy \= PRE\_PAYMENT | Pedido criado, aguardando pagamento |
| CONFIRMING\_ORDER | ORDER\_PLACED | OrderPolicy \= POST\_PAYMENT | Pedido criado e enviado ao KDS |
| AWAITING\_PAYMENT | PAYING | QR PIX gerado ou link enviado | Payment criado como PENDING |
| PAYING | ORDER\_PLACED | Webhook confirma pagamento | Payment.status \= CONFIRMED |
| ORDER\_PLACED | POST\_ORDER\_FEEDBACK | Order.status \= DELIVERED | 15 min após entrega |
| Qualquer | IDLE | Timeout 24h sem interação | Sessão expira |
| Qualquer | GREETING | "chamar garcom" | Notifica garçom e confirma ao cliente |

# **Integração Meta Graph API**

## **Configuração**

| Env Var | Valor | Propósito |
| :---- | :---- | :---- |
| META\_WHATSAPP\_TOKEN | EAAG... | Token de acesso permanente (System User token) |
| META\_PHONE\_NUMBER\_ID | 1234567890 | ID do número de telefone do business |
| META\_BUSINESS\_ACCOUNT\_ID | 9876543210 | ID da conta business (WABA) |
| META\_WEBHOOK\_VERIFY\_TOKEN | oasys\_webhook\_secret\_2026 | Token de verificação do webhook |
| META\_APP\_SECRET | abc123... | App secret para validar assinatura do webhook |
| META\_API\_VERSION | v19.0 | Versão da Graph API |
| REDIS\_URL | redis://localhost:6379 | Conexão Redis para filas |

## **Autenticação**

// Todas as chamadas usam Bearer token  
const headers \= {  
  "Authorization": \`Bearer ${process.env.META\_WHATSAPP\_TOKEN}\`,  
  "Content-Type": "application/json",  
};

// Base URL  
const baseUrl \= \`https://graph.facebook.com/${META\_API\_VERSION}/${META\_PHONE\_NUMBER\_ID}\`;

## **Tipos de Mensagem**

### **1\. Mensagem de Texto**

// POST https://graph.facebook.com/v19.0/{phone\_id}/messages  
{  
  "messaging\_product": "whatsapp",  
  "to": "5511999998888",  
  "type": "text",  
  "text": {  
    "body": "Ola\! Sou a Isis, assistente do Boteco do Ze. Como posso ajudar?"  
  }  
}

### **2\. Botões Interativos (máx. 3 botões)**

{  
  "messaging\_product": "whatsapp",  
  "to": "5511999998888",  
  "type": "interactive",  
  "interactive": {  
    "type": "button",  
    "body": { "text": "O que voce gostaria de fazer?" },  
    "action": {  
      "buttons": \[  
        { "type": "reply", "reply": { "id": "btn\_menu", "title": "Ver Cardapio" } },  
        { "type": "reply", "reply": { "id": "btn\_order\_status", "title": "Status Pedido" } },  
        { "type": "reply", "reply": { "id": "btn\_call\_waiter", "title": "Chamar Garcom" } }  
      \]  
    }  
  }  
}

### **3\. Lista Interativa (cardápio por categorias)**

{  
  "messaging\_product": "whatsapp",  
  "to": "5511999998888",  
  "type": "interactive",  
  "interactive": {  
    "type": "list",  
    "header": { "type": "text", "text": "Cardapio Boteco do Ze" },  
    "body": { "text": "Escolha uma categoria para ver os produtos:" },  
    "action": {  
      "button": "Ver Categorias",  
      "sections": \[  
        {  
          "title": "Bebidas",  
          "rows": \[  
            { "id": "cat\_cervejas", "title": "Cervejas", "description": "Chopp, Long Neck, Lata" },  
            { "id": "cat\_drinks", "title": "Drinks", "description": "Caipirinha, Gin, Moscow" },  
            { "id": "cat\_sem\_alcool", "title": "Sem Alcool", "description": "Agua, Suco, Refri" }  
          \]  
        },  
        {  
          "title": "Comidas",  
          "rows": \[  
            { "id": "cat\_petiscos", "title": "Petiscos", "description": "Fritas, Bolinho, Torresmo" }  
          \]  
        }  
      \]  
    }  
  }  
}

### **4\. Mensagem com Imagem (produto)**

{  
  "messaging\_product": "whatsapp",  
  "to": "5511999998888",  
  "type": "image",  
  "image": {  
    "link": "https://oasys-cdn.com/products/caipirinha-limao.jpg",  
    "caption": "Caipirinha Limao \- R$ 22,90\\nCachaca, limao, acucar e gelo\\n\\nDigite a quantidade ou toque em Adicionar"  
  }  
}

### **5\. Template Message (notificações fora da janela de 24h)**

// Templates sao OBRIGATORIOS para iniciar conversa ou mensagens apos 24h  
{  
  "messaging\_product": "whatsapp",  
  "to": "5511999998888",  
  "type": "template",  
  "template": {  
    "name": "order\_status\_update",  
    "language": { "code": "pt\_BR" },  
    "components": \[  
      {  
        "type": "body",  
        "parameters": \[  
          { "type": "text", "text": "Joao" },  
          { "type": "text", "text": "\#1234" },  
          { "type": "text", "text": "pronto para retirada" }  
        \]  
      }  
    \]  
  }  
}

# **Templates WhatsApp (Meta Approval)**

Templates precisam ser submetidos e aprovados pela Meta antes de uso. São obrigatórios para: (a) iniciar conversa proativamente (notificações), (b) enviar mensagens fora da janela de 24h. Dentro da janela de 24h após última mensagem do cliente, pode-se enviar mensagens de formato livre (session messages).

| Template Name | Categoria | Quando Usar | Corpo (com placeholders) |
| :---- | :---- | :---- | :---- |
| welcome\_greeting | MARKETING | Primeiro contato proativo | Olá {{1}}\! Sou a Isis do {{2}}. Quer ver nosso cardápio? 🍻 |
| order\_confirmation | UTILITY | Pedido confirmado | Pedido \#{{1}} confirmado\! {{2}} itens, total R$ {{3}}. Acompanhe o status aqui. |
| order\_status\_update | UTILITY | Mudança de status | {{1}}, seu pedido \#{{2}} está {{3}}\! {{4}} |
| order\_ready\_pickup | UTILITY | Pedido pronto para retirada | 🌟 {{1}}, seu pedido \#{{2}} está pronto\! Retire no balcão. Senha: {{3}} |
| payment\_pix\_qr | UTILITY | Envio de QR PIX | {{1}}, aqui está o QR Code PIX de R$ {{2}}. Válido por 30 minutos. |
| upsell\_suggestion | MARKETING | Sugestão de upsell | {{1}}, que tal uma {{2}} para acompanhar? Hoje por apenas R$ {{3}}\! 😋 |
| feedback\_request | MARKETING | Pós-entrega | {{1}}, como foi a experiência? De 1 a 5, como avalia o atendimento? |
| daily\_promotion | MARKETING | Promoção do dia | 🍺 {{1}}\! Hoje no {{2}}: {{3}}. Vem aproveitar\! |

## **Janela de 24h — Regras da Meta**

| Cenário | Tipo de Mensagem | Custo |
| :---- | :---- | :---- |
| Cliente mandou mensagem nas últimas 24h | Session message (formato livre) | Incluso na janela (mais barato) |
| Notificar cliente fora da janela de 24h | Template message (pré-aprovado) | Cobrado por mensagem pela Meta |
| Cliente respondeu a template | Abre nova janela de 24h | Próximas 24h são session messages |
| Notificação de status de pedido | Template (UTILITY) | Tarifa utility (mais barato que marketing) |
| Upsell / promoção | Template (MARKETING) | Tarifa marketing (mais caro) |

IMPORTANTE: O OASYS deve rastrear a janela de 24h para cada conversa. Se a janela está aberta, usar session message (mais barato). Se fechada, usar template (mais caro). Nunca tentar enviar session message fora da janela — a Meta rejeita com erro 131047\.

# **Webhook de Recebimento**

A Meta envia webhooks quando o cliente manda mensagem, clica em botão, ou quando o status de mensagem muda (enviada, entregue, lida). O OASYS deve processar esses webhooks para alimentar a state machine.

## **GET /whatsapp/webhook — Verificação**

// Meta envia GET para verificar o webhook durante setup  
app.get("/whatsapp/webhook", (req, reply) \=\> {  
  const mode \= req.query\["hub.mode"\];  
  const token \= req.query\["hub.verify\_token"\];  
  const challenge \= req.query\["hub.challenge"\];

  if (mode \=== "subscribe" && token \=== process.env.META\_WEBHOOK\_VERIFY\_TOKEN) {  
    reply.status(200).send(challenge);  
  } else {  
    reply.status(403).send("Forbidden");  
  }  
});

## **POST /whatsapp/webhook — Mensagens**

app.post("/whatsapp/webhook", async (req, reply) \=\> {

  // 1\. Validar assinatura X-Hub-Signature-256  
  const signature \= req.headers\["x-hub-signature-256"\];  
  if (\!validateMetaSignature(req.rawBody, signature, META\_APP\_SECRET)) {  
    return reply.status(401).send("Invalid signature");  
  }

  // 2\. Responder 200 IMEDIATAMENTE (Meta faz retry se demora)  
  reply.status(200).send("EVENT\_RECEIVED");

  // 3\. Processar assincronamente  
  const entries \= req.body.entry || \[\];  
  for (const entry of entries) {  
    const changes \= entry.changes || \[\];  
    for (const change of changes) {  
      if (change.field \=== "messages") {  
        const value \= change.value;  
        const messages \= value.messages || \[\];  
        const statuses \= value.statuses || \[\];

        // Processar mensagens recebidas  
        for (const msg of messages) {  
          await processIncomingMessage({  
            from: msg.from,  
            messageId: msg.id,  
            timestamp: msg.timestamp,  
            type: msg.type,  
            text: msg.text?.body,  
            interactive: msg.interactive,  
            image: msg.image,  
          });  
        }

        // Processar status updates (sent, delivered, read)  
        for (const status of statuses) {  
          await processStatusUpdate({  
            messageId: status.id,  
            status: status.status,  // sent, delivered, read, failed  
            timestamp: status.timestamp,  
            recipientId: status.recipient\_id,  
            errors: status.errors,  
          });  
        }  
      }  
    }  
  }  
});

# **Notificações de Status em Tempo Real**

Quando um pedido muda de status, o OASYS envia automaticamente uma mensagem WhatsApp ao cliente. Só envia se o pedido foi feito via WhatsApp (source \= WHATSAPP) e o cliente tem sessão ativa.

| Transição | Template / Session | Mensagem | Adicional |
| :---- | :---- | :---- | :---- |
| RECEIVED → PREPARING | Session (se janela aberta) | "👨‍🍳 Seu pedido \#1234 está sendo preparado\!" | Tempo estimado de preparo |
| PREPARING → READY | Template: order\_ready\_pickup | "🌟 Pedido \#1234 pronto\! Senha: 42" | Senha de retirada \+ instrução |
| READY → DELIVERED | Session (se janela aberta) | "✅ Pedido \#1234 entregue. Bom apetite\!" | Nenhum |
| Qualquer → CANCELLED | Session (se janela aberta) | "❌ Pedido \#1234 foi cancelado. Motivo: ..." | Motivo do cancelamento |

## **NotificationDispatcher**

// Chamado pelo OrderService quando status muda  
async function dispatchOrderNotification(  
  order: Order,  
  previousStatus: OrderStatus,  
  newStatus: OrderStatus  
): Promise\<void\> {

  // So notifica pedidos feitos via WhatsApp  
  if (order.source \!== "WHATSAPP") return;

  const session \= await prisma.whatsAppSession.findFirst({  
    where: { checkId: order.checkId, state: { not: "IDLE" } },  
  });  
  if (\!session) return;

  const customerPhone \= session.phone;  
  const isWindowOpen \= isWithin24Hours(session.lastMessageAt);

  // Determinar mensagem baseada na transicao  
  switch (newStatus) {  
    case "PREPARING":  
      await enqueueMessage({  
        to: customerPhone,  
        type: isWindowOpen ? "session" : "template",  
        template: "order\_status\_update",  
        params: { name: session.customerName, orderNumber: order.orderNumber, status: "em preparo" },  
        sessionText: \`\\ud83d\\udc68\\u200d\\ud83c\\udf73 Seu pedido \#${order.orderNumber} esta sendo preparado\! Tempo estimado: \~${order.estimatedTime}min\`,  
      });  
      break;

    case "READY":  
      await enqueueMessage({  
        to: customerPhone,  
        type: "template",  // Sempre template (garantir entrega)  
        template: "order\_ready\_pickup",  
        params: { name: session.customerName, orderNumber: order.orderNumber, pickupCode: order.orderNumber },  
      });  
      break;

    case "DELIVERED":  
      if (isWindowOpen) {  
        await enqueueMessage({  
          to: customerPhone,  
          type: "session",  
          sessionText: \`\\u2705 Pedido \#${order.orderNumber} entregue. Bom apetite\! Quer pedir mais alguma coisa?\`,  
        });  
      }  
      // Agendar feedback em 15 min  
      await scheduleMessage(customerPhone, "feedback\_request", 15 \* 60 \* 1000);  
      break;  
  }  
}

# **Upsell Automático**

O upsell é uma das features diferenciais do OASYS. Após um período configurado sem interação (default: 15 minutos), Isis sugere itens complementares baseados no contexto.

## **Regras do Engine de Upsell**

| Regra | Condição | Sugestão | Exemplo |
| :---- | :---- | :---- | :---- |
| Complemento de bebida | Pediu só bebida, sem comida | Petisco popular | "Que tal uma Porção de Fritas para acompanhar?" |
| Refil de chopp | Pediu chopp há \>20min | Mesmo chopp novamente | "Mais um Chopp Pilsen? 🍺" |
| Upgrade de tamanho | Pediu 300ml | Oferecer 500ml | "Sabia que o 500ml sai por apenas R$6 a mais?" |
| Drink complementar | Pediu petisco, sem bebida | Drink combinante | "Uma Caipirinha vai bem com essa Linguica\!" |
| Happy Hour | Horario de happy hour ativo | Item com preco especial | "Happy Hour\! Gin Tonica por R$22,90 ate 19h" |
| Sobremesa | Pediu principal há \>30min | Sobremesa (se existir) | "Para fechar, que tal uma sobremesa?" |
| Agua | Pediu bebida alcoolica há \>45min | Agua mineral | "Uma agua mineral para refrescar? R$5,90" |

## **Configuração do Upsell**

// Configuravel por Unit no web-owner  
interface UpsellConfig {  
  enabled: boolean;                // Ativar/desativar upsell  
  delayMinutes: number;            // Tempo apos ultima interacao (default: 15\)  
  maxSuggestionsPerSession: number; // Maximo por sessao (default: 3\)  
  cooldownMinutes: number;          // Intervalo entre sugestoes (default: 20\)  
  quietHoursStart?: string;         // Horario para parar (ex: "01:00")  
  quietHoursEnd?: string;           // Horario para retomar (ex: "10:00")  
}

## **UpsellEngine**

async function generateUpsellSuggestion(  
  session: WhatsAppSession,  
  check: CheckWithOrders  
): Promise\<UpsellSuggestion | null\> {

  const config \= await getUpsellConfig(session.unitId);  
  if (\!config.enabled) return null;

  // Verificar limites  
  if (session.upsellCount \>= config.maxSuggestionsPerSession) return null;

  // Coletar contexto  
  const orderedProducts \= check.orders.flatMap(o \=\> o.items.map(i \=\> i.product));  
  const categories \= \[...new Set(orderedProducts.map(p \=\> p.categoryId))\];  
  const hasFood \= categories.some(c \=\> c \=== "petiscos");  
  const hasDrink \= categories.some(c \=\> \["cervejas", "drinks"\].includes(c));  
  const isHappyHour \= checkHappyHour(session.unitId);  
  const timeSinceLastOrder \= minutesSince(check.orders.at(-1)?.createdAt);

  // Aplicar regras em ordem de prioridade  
  if (isHappyHour) return happyHourSuggestion(session.unitId);  
  if (hasDrink && \!hasFood) return foodComplementSuggestion(orderedProducts);  
  if (hasFood && \!hasDrink) return drinkComplementSuggestion(orderedProducts);  
  if (timeSinceLastOrder \> 20\) return refilSuggestion(orderedProducts);  
  if (timeSinceLastOrder \> 30\) return dessertSuggestion(session.unitId);

  return null; // Nenhuma regra aplicavel  
}

# **Fila de Mensagens (Redis Streams)**

Todas as mensagens WhatsApp passam por uma fila antes de serem enviadas à Meta API. Isso garante: (a) retry automático em caso de falha, (b) rate limiting (Meta limita a 80 msg/seg por número), (c) persistência (mensagem não perde se API cair), (d) observabilidade (métricas de envio).

## **Arquitetura da Fila**

┌────────────────┐  
│ State Machine  │  
│ Notification   │ ──→ enqueueMessage()  
│ Upsell Engine  │  
└────────────────┘  
                           │  
                     ┌────▼────────────┐  
                     │  Redis Streams     │  
                     │  stream:wa:outgoing │  
                     └────┬────────────┘  
                          │  
                     ┌────▼────────────┐  
                     │  MessageSender     │  
                     │  (consumer worker)  │  
                     └────┬─────┬──────┘  
                          │     │  
                    sucesso  falha  
                          │     │  
                     ┌───▼┐ ┌─▼─────────┐  
                     │ ACK │ │  Retry?      │  
                     └────┘ │  \< 3: re-queue │  
                            │  \>= 3: DLQ    │  
                            └────────────┘  
                                   │  
                            ┌─────▼──────┐  
                            │ Dead Letter  │  
                            │ Queue (DLQ)  │  
                            │ \+ Alert HIGH │  
                            └────────────┘

## **Retry Strategy**

| Tentativa | Delay | Comportamento |
| :---- | :---- | :---- |
| 1ª | 0s (imediato) | Envio normal via Graph API |
| 2ª | 5 segundos | Re-enfileirar com delay. Log warning. |
| 3ª | 30 segundos | Re-enfileirar com delay. Log warning. |
| Após 3ª falha | N/A | Mover para DLQ. Alert HIGH. Manual intervention. |

## **Rate Limiting**

A Meta limita a 80 mensagens por segundo por número de telefone (Business tier). O consumer worker implementa um token bucket rate limiter: máximo 70 msg/seg (margem de segurança). Se o bucket estiver vazio, a mensagem espera no stream. Em horário de pico de um bar grande (200 clientes simultâneos), o volume estimado é \~5 msg/seg — bem abaixo do limite.

# **Chamar Garçom via WhatsApp**

Feature de conveniência: cliente envia "chamar garçom" ou "garçom" pelo WhatsApp, e o garçom responsável pela mesa recebe notificação em tempo real no web-waiter.

## **Fluxo**

┌───────────┐     ┌───────────────┐     ┌───────────────┐  
│  Cliente  │ →→→ │  Isis (state  │ →→→ │  WebSocket    │  
│ "garcom" │     │  machine)     │     │  broadcast    │  
└───────────┘     └─────┬─────────┘     └─────┬─────────┘  
                    │                       │  
              ┌─────▼─────┐         ┌─────▼─────┐  
              │ Identifica │         │  Garcom da │  
              │ mesa via   │         │  zona recebe│  
              │ session    │         │  notificacao│  
              └─────┬─────┘         └───────────┘  
                    │  
              ┌─────▼─────┐  
              │ Responde:  │  
              │ "Garcom a │  
              │ caminho\!" │  
              └───────────┘  
R1. Identificar mesa pelo WhatsAppSession (session contém tableId e checkId).

R2. Identificar garçom responsável pela zona da mesa (Zone.employeeId).

R3. Se garçom não está online, notificar todos os garçons da unidade.

R4. Cooldown de 3 minutos entre chamadas (evitar spam).

R5. Responder ao cliente: "Garçom notificado\! Ele está a caminho da mesa N."

# **Métricas e Observabilidade**

## **Contadores de Mensagens**

| Métrica | Descrição | Fonte |
| :---- | :---- | :---- |
| messages\_sent | Total de mensagens enviadas com sucesso | Graph API 200 response |
| messages\_delivered | Entregues ao dispositivo do cliente | Webhook status: delivered |
| messages\_read | Lidas pelo cliente | Webhook status: read |
| messages\_failed | Falha no envio (após retries) | DLQ entries |
| sessions\_started | Novas sessões WhatsApp iniciadas | IDLE → GREETING transition |
| orders\_via\_whatsapp | Pedidos feitos pelo canal WhatsApp | Order.source \= WHATSAPP |
| upsell\_sent | Sugestões de upsell enviadas | UpsellEngine execution |
| upsell\_accepted | Upsell que resultou em pedido | Order criado após upsell |
| upsell\_conversion\_rate | % de upsell aceitos | accepted / sent \* 100 |
| waiter\_calls | Vezes que cliente chamou garçom via WA | Intent "chamar garçom" |
| avg\_response\_time\_ms | Tempo médio entre mensagem e resposta | Timestamp diff |
| queue\_depth | Mensagens na fila aguardando envio | Redis XLEN |
| dlq\_depth | Mensagens na dead letter queue | Redis XLEN (DLQ stream) |

## **Dashboard WhatsApp (web-owner)**

Seção no web-owner para o dono acompanhar o uso do WhatsApp. KPIs do dia: mensagens enviadas, entregues, lidas, taxa de leitura, pedidos via WA, upsell conversion rate. Gráfico de mensagens por hora. Lista de falhas (DLQ) para investigação.

# **Estrutura de Arquivos**

apps/api/src/modules/whatsapp/  
├── whatsapp.routes.ts            \# Webhook \+ config endpoints  
├── whatsapp.service.ts           \# State machine (EXISTENTE \- modificar)  
├── whatsapp.schemas.ts           \# Schemas Zod  
├── conversation-router.ts        \# Router de intencoes (EXISTENTE \- melhorar)  
├── intent-parser.ts              \# Parse de intencoes (EXISTENTE \- melhorar)  
├── message-builder.ts            \# Constroi payloads de mensagem por tipo  
├── graph-api.service.ts          \# NOVO: Integracao Meta Graph API  
├── queue-manager.ts              \# NOVO: Redis Streams producer/consumer  
├── message-sender.ts             \# NOVO: Consumer worker (dequeue \+ send)  
├── notification-dispatcher.ts    \# NOVO: Notificacoes de status  
├── upsell-engine.ts              \# Existente parcial \- completar  
├── upsell-rules.ts               \# NOVO: Regras de sugestao  
├── upsell-scheduler.ts           \# NOVO: Scheduler de upsell  
├── metrics.ts                    \# NOVO: Contadores e metricas  
└── \_\_tests\_\_/  
    ├── graph-api.test.ts           \# Testes da API Meta (mock)  
    ├── queue-manager.test.ts       \# Testes da fila Redis  
    ├── notification.test.ts        \# Testes de notificacao  
    ├── upsell-engine.test.ts       \# Testes do engine de upsell  
    └── graph-api.mock.ts           \# Mock da Graph API

apps/web-owner/src/  
├── pages/  
│   └── WhatsAppDashboard.tsx     \# Metricas e configuracao  
└── components/  
    ├── WhatsAppMetrics.tsx        \# KPIs de mensagens  
    ├── UpsellConfig.tsx           \# Configuracao do upsell  
    └── MessageFailures.tsx        \# DLQ lista para investigacao

# **Tratamento de Erros e Edge Cases**

| Cenário | Comportamento Esperado | Gravidade |
| :---- | :---- | :---- |
| Meta API retorna 401 (token expirado) | Alert CRITICAL. Parar envio. Notificar dono para renovar token. | Crítica |
| Meta API retorna 429 (rate limit) | Pausar consumer por 60s. Não contar como falha. | Média |
| Meta API retorna 131047 (fora da janela 24h) | Trocar para template message e reenviar. | Baixa |
| Webhook com assinatura inválida | 401\. Não processar. Log warning. | Média |
| Webhook duplicado (mesmo message\_id) | Idempotente: ignorar se já processado. | Baixa |
| Cliente envia imagem/audio (não suportado) | Responder: "Desculpe, ainda não entendo imagens. Me diga o que precisa\!" | Baixa |
| Cliente envia mensagem em idioma não-PT | Responder em português. Intent parser ignora idioma. | Baixa |
| Sessão expirada (24h sem mensagem) | Resetar para IDLE. Próxima mensagem inicia nova sessão. | Baixa |
| Redis indisponível | Fallback: enviar diretamente (sem fila). Log error. Alert HIGH. | Alta |
| Produto esgotado após montar pedido | Notificar: "Item X indisponível. Deseja substituir ou remover?" | Média |
| Upsell após cliente encerrou (saiu do bar) | Se último pedido \> 2h, não enviar upsell. | Baixa |
| Dois dispositivos do mesmo número | Mensagem chega em ambos. Sessão única por phone. | Baixa |
| Número de telefone inválido | Graph API rejeita. Mover para DLQ. Não retentar. | Baixa |
| Template rejeitado pela Meta | Não pode enviar notificações fora da janela. Alert para dono. | Alta |

# **Estratégia de Testes**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Envio texto — Graph API sucesso | Unit (mock) | POST chamado com payload correto, message\_id retornado |
| Envio botões interativos | Unit (mock) | Payload interactive/button correto |
| Envio lista interativa | Unit (mock) | Payload interactive/list com sections correto |
| Envio imagem com caption | Unit (mock) | Payload image com link e caption |
| Envio template com params | Unit (mock) | Payload template com components e parameters |
| Webhook — mensagem texto recebida | Unit | processIncomingMessage chamado, state machine avanca |
| Webhook — botão interativo clicado | Unit | Button reply ID parseado corretamente |
| Webhook — assinatura inválida | Unit | 401, não processa |
| Webhook — status delivered/read | Unit | Métricas atualizadas |
| Fila — enqueue e dequeue | Integration | Mensagem entra no stream e sai no consumer |
| Fila — retry após falha | Integration | Mensagem re-enfileirada com delay |
| Fila — DLQ após 3 falhas | Integration | Mensagem vai para DLQ, Alert criado |
| Notificação — PREPARING | Unit | Mensagem de status enviada ao cliente |
| Notificação — READY (template) | Unit | Template order\_ready\_pickup usado |
| Notificação — pedido não-WhatsApp ignorado | Unit | Nenhuma mensagem enviada |
| Upsell — complemento de bebida | Unit | Sugere petisco quando só tem bebida |
| Upsell — respeita maxSuggestions | Unit | Não sugere após atingir limite |
| Upsell — respeita cooldown | Unit | Não sugere antes do cooldown |
| Chamar garçom — notificação real | Integration | WebSocket event enviado ao garçom da zona |
| Chamar garçom — cooldown 3min | Unit | Rejeita chamada repetida em \< 3min |
| Janela 24h — session vs template | Unit | Usa session dentro da janela, template fora |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-09**

| PRD | Módulo | Como Usa WhatsApp |
| :---- | :---- | :---- |
| PRD-11 | CRM & Fidelização | Campanhas de marketing enviadas via WhatsApp. Cupons e promoções personalizadas. |
| PRD-10 | Dashboard BI | Métricas de WhatsApp no dashboard. Conversão de upsell como KPI. |
| PRD-07 | Fechamento | Lembrete de fechamento enviado via WhatsApp ao dono (FUP diário). |
| PRD-12 | Pessoas | Notificações de escala e turno para funcionários via WhatsApp. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Meta suspende conta por spam | Baixa | Crítico | Limitar upsell (max 3/sessão). Quiet hours. Opt-out claro. Seguir políticas Meta. |
| Token expira e mensagens falham | Média | Alto | System User token (não expira). Fallback: alert imediato para renovar. |
| Redis falha e fila perde mensagens | Baixa | Alto | Redis com persistência AOF. Fallback: envio direto sem fila. |
| Template rejeitado pela Meta | Média | Médio | Submeter templates genéricos. Ter backup template para cada categoria. |
| Cliente não entende Isis (NLP limitado) | Alta | Baixo | Fallback: "Não entendi. Use os botões abaixo." Botões sempre disponíveis. |
| Custo de mensagens escala | Média | Médio | Priorizar session messages (janela 24h). Templates só quando necessário. Métricas de custo. |
| Janela de 24h fecha no meio de conversa | Alta | Baixo | Detectar janela fechando (\>20h). Enviar template proativo com botões para reabrir. |
| Volume em pico sobrecarrega consumer | Baixa | Baixo | Consumer auto-escala lendo batch. Rate limit protege. Volume Phase 2 é gerenciável. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| Meta Cloud API (hosted) | On-premise API | Cloud API é gratuita, mantida pela Meta, sem infraestrutura. On-premise requer servidor dedicado. |
| Redis Streams (fila) | BullMQ / RabbitMQ | Redis já será usado em Phase 2\. Streams é nativo, persistente, consumer groups. Não justifica infra extra. |
| NLP básico (regex \+ keywords) | LLM para parse de intent | LLM é overkill para o domínio limitado de um bar. Regex cobre 95% dos casos. LLM na Phase 3 se necessário. |
| Botões interativos como fallback | Apenas texto livre | Botões garantem UX consistente. Texto livre é suplementar. Reduz erro de interpretação. |
| Templates UTILITY para status | Session message para tudo | Templates garantem entrega fora da janela 24h. Status de pedido pronto é crítico demais para depender da janela. |
| Upsell configuravel por Unit | Regras fixas | Cada bar tem perfil diferente. Dono deve poder ativar/desativar e ajustar timing. |

# **Sequência de Implementação (4 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Infraestrutura: Graph API service \+ Redis Streams queue \+ message sender worker \+ webhook (GET verify \+ POST receive \+ signature validation). Substituir console.log nos estados GREETING e BROWSING\_MENU. | Envio real de mensagens texto e botões. Webhook funcional. Fila operacional com retry. State machine envia mensagens reais nos 2 primeiros estados. |
| Sprint 2 | Fluxo completo: Substituir console.log em TODOS os estados restantes. Listas interativas para cardápio. Imagens de produtos. Carrinho. Confirmação. Pagamento (integrar PIX do PRD-02). Novos estados: VIEWING\_PRODUCT, PAYING. | Pedido completo via WhatsApp end-to-end. Cliente navega cardápio com imagens, monta pedido, confirma, paga (se pre-pag), acompanha. |
| Sprint 3 | Notificações: NotificationDispatcher para todas as transições de status. Templates submetidos e aprovados. Chamar garçom com notificação WebSocket real. POST\_ORDER\_FEEDBACK state. Métricas básicas. | Notificações automáticas em tempo real. Chamar garçom funcional. Feedback pós-entrega. Templates aprovados. |
| Sprint 4 | Upsell: UpsellEngine \+ UpsellScheduler \+ regras \+ configuração por Unit. Dashboard WhatsApp no web-owner. Métricas completas. Testes E2E. Polish e edge cases. | Upsell automático funcional. Dashboard com métricas. Configuração pelo dono. Sistema completo e polido. |

## **LGPD e Consentimento**

OASYS já tem modelo de consentimento LGPD (Customer \+ CustomerConsent). Para WhatsApp, o consentimento é implícito quando o cliente inicia a conversa (ele mandou a primeira mensagem). Para mensagens proativas (upsell, campanhas), o consentimento explícito é necessário. Na primeira interação, Isis pergunta: "Posso enviar novidades e promoções?" com botões Sim/Não. Registrado no CustomerConsent.type \= MARKETING\_WHATSAPP. Opt-out a qualquer momento: cliente envia "parar" ou "sair" e marketing é desativado.

OASYS PRD-09 — WhatsApp & Isis  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*