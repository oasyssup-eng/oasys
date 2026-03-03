

**OASYS**

Sistema Operacional para Bares de Alto Volume

**PRD-02 — Payments & CashRegister**

Dinheiro, PIX, Cartão Online, Abertura/Fechamento de Caixa

| Campo | Valor |
| :---- | :---- |
| Versão | 1.0 |
| Data | 02 de Março de 2026 |
| Fase | Phase 1 — Go-Live |
| Sprints Estimados | 3 sprints |
| Complexidade | Alta |
| Cobertura Atual | 0% |
| Dependências | PRD-01 (Schema Foundation) |
| Gap Modules | M4 — Pagamentos / Fiscal |
| Apps Afetadas | apps/api \+ apps/web-waiter |
| Autor | Claude (Opus 4.6) — Geração Automatizada |
| Classificação | Documento confidencial — Uso interno |

# **Índice**

# **Resumo Executivo**

PRD-02 (Payments & CashRegister) é o gap mais crítico do OASYS. O Gap Analysis registra 0% de cobertura — o diretório modules/payments/ está vazio. Sem pagamento, o sistema é uma vitrine: o cliente vê o cardápio, faz o pedido, consome, mas não existe mecanismo para cobrar. Toda a cadeia downstream — cardápio digital (PRD-03), fiscal (PRD-06), fechamento (PRD-07) — depende deste módulo.

Este PRD cobre três subsistemas interdependentes:

1\. Payment Processing — registro e processamento de pagamentos em dinheiro, PIX (QR dinâmico via Pagar.me) e cartão (link de pagamento via Pagar.me). Inclui pagamentos parciais, múltiplos métodos por conta, e webhook de confirmação assíncrona.

2\. CashRegister Lifecycle — abertura de caixa com fundo de troco, operações intermediárias (sangria, suprimento), fechamento com reconciliação automática (esperado vs. realizado), e caixa digital para pagamentos online.

3\. Payment Orchestration — lógica que coordena o estado do Check com os pagamentos recebidos: quando a soma de pagamentos confirmados iguala ou excede o total da conta (incluindo taxa de serviço), o Check transiciona para PAID automaticamente.

## **Critério de Sucesso (Done Definition)**

O PRD-02 está concluído quando TODOS os seguintes critérios são atendidos:

1\. POST /payments/cash registra pagamento em dinheiro, atualiza CashRegister e verifica se Check está totalmente pago.

2\. POST /payments/pix gera QR Code PIX dinâmico via Pagar.me, retorna payload e imagem base64.

3\. POST /payments/card gera link de pagamento via Pagar.me, retorna URL com expiração.

4\. POST /payments/webhook recebe confirmação do Pagar.me, atualiza Payment.status para CONFIRMED, e verifica auto-close do Check.

5\. CashRegister abre, aceita operações (sangria/suprimento), e fecha com reconciliação (expectedBalance calculado automaticamente).

6\. Pagamentos parciais funcionam — uma conta de R$100 pode ser paga com R$60 em dinheiro \+ R$40 em PIX.

7\. Check transiciona automaticamente para PAID quando soma de pagamentos confirmados \>= total.

8\. UI no web-waiter permite registrar pagamento presencial (dinheiro e sinalizar cartão na maquininha).

9\. Zero erros de tipo no monorepo. Todos os endpoints com validação Zod.

# **Arquitetura de Pagamentos**

O módulo de pagamentos opera em duas modalidades: síncrono (dinheiro — confirmação imediata) e assíncrono (PIX e cartão — confirmação via webhook). A arquitetura separa claramente o registro do pagamento (criação do Payment no banco) da confirmação (atualização de status).

## **Diagrama de Fluxo — Pagamento em Dinheiro**

┌──────────┐    POST /payments/cash    ┌─────────────┐  
│  Garçom  │ ─────────────────────── │  API Server │  
│ (waiter) │                          │             │  
└──────────┘                          └──────┬──────┘  
                                             │  
                                    ┌────────▼────────┐  
                                    │ 1\. Validar Check │  
                                    │    (existe,      │  
                                    │     aberto,      │  
                                    │     mesmo unit)  │  
                                    └────────┬────────┘  
                                             │  
                                    ┌────────▼────────┐  
                                    │ 2\. Buscar caixa  │  
                                    │    aberto do     │  
                                    │    operador      │  
                                    └────────┬────────┘  
                                             │  
                                    ┌────────▼─────────────┐  
                                    │ 3\. Criar Payment     │  
                                    │    status: CONFIRMED  │  
                                    │    method: CASH       │  
                                    │    cashRegisterId: X  │  
                                    └────────┬─────────────┘  
                                             │  
                                    ┌────────▼────────┐  
                                    │ 4\. Verificar se  │  
                                    │    Check está    │  
                                    │    totalmente    │  
                                    │    pago          │  
                                    └────────┬────────┘  
                                             │  
                                    ┌────────▼────────┐  
                                    │ 5\. Se sim:       │  
                                    │    Check.status  │  
                                    │    → PAID        │  
                                    └─────────────────┘

## **Diagrama de Fluxo — Pagamento PIX (Assíncrono)**

┌──────────┐  POST /payments/pix   ┌─────────────┐  POST /orders  ┌───────────┐  
│ Cliente  │ ────────────────── │  API Server │ ────────────── │  Pagar.me │  
│ ou       │                    │             │                │           │  
│ Garçom   │                    └──────┬──────┘                └─────┬─────┘  
└──────────┘                          │                              │  
                                      │   ◄── QR Code \+ payload ────┘  
                             ┌────────▼────────┐  
                             │ Criar Payment   │  
                             │ status: PENDING │  
                             │ pixQrCode: ...  │  
                             │ expiresAt: \+30m │  
                             └────────┬────────┘  
                                      │  
                              retorna QR ao cliente  
                                      │  
           ┌──────────────────────────┼──────────────────────────┐  
           │         CLIENTE PAGA PIX NO BANCO                   │  
           └──────────────────────────┼──────────────────────────┘  
                                      │  
┌───────────┐  POST /payments/webhook │  
│  Pagar.me │ ────────────────────── ▼  
│ (webhook) │                ┌───────────────┐  
└───────────┘                │ Validar assin.│  
                             │ Atualizar:    │  
                             │ PENDING →     │  
                             │ CONFIRMED     │  
                             │ paidAt: now() │  
                             └───────┬───────┘  
                                     │  
                             ┌───────▼───────┐  
                             │ Check pago?   │  
                             │ Se sim → PAID │  
                             └───────────────┘

## **Diagrama de Fluxo — Pagamento Cartão (Link)**

Fluxo idêntico ao PIX, exceto:  
\- Pagar.me retorna paymentUrl em vez de QR Code  
\- Cliente abre URL no navegador e paga  
\- Webhook confirma da mesma forma  
\- expiresAt: \+60 minutos (link dura mais que PIX)

## **CashRegister — Ciclo de Vida**

┌───────────┐     POST /cash-registers/open     ┌────────────┐  
│   Caixa   │ ──────────────────────────────── │   OPEN     │  
│ (operador)│     openingBalance: R$200        │            │  
└───────────┘                                  └─────┬──────┘  
                                                     │  
                          ┌──────────────────────────┤  
                          │                          │  
                 ┌────────▼────────┐        ┌───────▼────────┐  
                 │ Recebe pagamentos│        │ Sangria/       │  
                 │ em dinheiro      │        │ Suprimento     │  
                 │ (automático)     │        │ (manual)       │  
                 └────────┬────────┘        └───────┬────────┘  
                          │                          │  
                          └──────────┬───────────────┘  
                                     │  
               POST /cash-registers/:id/close  
                                     │  
                             ┌───────▼───────┐  
                             │   CLOSED      │  
                             │               │  
                             │ expectedBal \= │  
                             │  opening      │  
                             │  \+ cash in    │  
                             │  \- sangrias   │  
                             │  \+ suprimentos│  
                             │               │  
                             │ closingBal \=  │  
                             │  informado    │  
                             │  pelo operador│  
                             │               │  
                             │ difference \=  │  
                             │  closing \-    │  
                             │  expected     │  
                             └───────────────┘

# **Especificação de API — Endpoints**

Todos os endpoints seguem o padrão existente do OASYS: Fastify \+ Zod validation, JWT auth via requireRole(), isolamento por unitId. Prefixo: /api/v1.

## **Payment Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /payments/cash | WAITER, CASHIER, MANAGER | Registra pagamento em dinheiro (confirmação imediata) |
| POST | /payments/pix | WAITER, CASHIER, MANAGER, PUBLIC\* | Gera QR Code PIX via Pagar.me |
| POST | /payments/card | WAITER, CASHIER, MANAGER, PUBLIC\* | Gera link de pagamento via Pagar.me |
| POST | /payments/webhook | PUBLIC (validação por assinatura) | Webhook do Pagar.me — confirmação assíncrona |
| GET | /payments/check/:checkId | WAITER, CASHIER, MANAGER, OWNER | Lista todos os pagamentos de um Check |
| GET | /payments/:id | WAITER, CASHIER, MANAGER, OWNER | Detalhe de um pagamento específico |
| POST | /payments/:id/refund | MANAGER, OWNER | Solicita estorno de pagamento confirmado |
| GET | /payments/check/:checkId/summary | WAITER, CASHIER, MANAGER, OWNER | Resumo: total pago, saldo restante, métodos usados |

*\* PUBLIC: endpoints acessíveis pelo web-menu (PRD-03) sem login — autenticados por session token do Check.*

## **CashRegister Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /cash-registers/open | CASHIER, MANAGER | Abre novo caixa com fundo de troco |
| GET | /cash-registers/active | CASHIER, MANAGER, OWNER | Retorna caixa aberto do operador/unidade |
| POST | /cash-registers/:id/operation | CASHIER, MANAGER | Registra sangria ou suprimento |
| POST | /cash-registers/:id/close | CASHIER, MANAGER | Fecha caixa com reconciliação |
| GET | /cash-registers/:id | CASHIER, MANAGER, OWNER | Detalhe do caixa com operações e pagamentos |
| GET | /cash-registers | MANAGER, OWNER | Lista histórico de caixas (filtro por data/operador) |
| GET | /cash-registers/:id/report | MANAGER, OWNER | Relatório detalhado do caixa para fechamento |

# **Detalhamento de Endpoints**

## **POST /payments/cash**

Registra pagamento em dinheiro. Confirmação imediata (status \= CONFIRMED). Deve vincular ao CashRegister aberto do operador.

### **Request Body (Zod Schema)**

const CreateCashPaymentSchema \= z.object({  
  checkId: z.string().cuid(),  
  amount: z.number().positive(),  
  receivedAmount: z.number().positive().optional(),  
  // receivedAmount \= valor entregue pelo cliente (para cálculo de troco)  
  // Se não informado, assume amount exato (sem troco)  
});  
   
// Exemplo:  
{  
  "checkId": "clx1abc...",  
  "amount": 85.50,  
  "receivedAmount": 100.00  
}

### **Response (200)**

{  
  "id": "clx2def...",  
  "checkId": "clx1abc...",  
  "amount": 85.50,  
  "method": "CASH",  
  "status": "CONFIRMED",  
  "paidAt": "2026-03-02T22:15:00Z",  
  "cashRegisterId": "clx3ghi...",  
  "change": 14.50,  
  "checkStatus": "PAID",        // ou "OPEN" se pagamento parcial  
  "remainingBalance": 0.00      // quanto falta pagar  
}

### **Regras de Negócio**

R1. Validar que Check existe, está OPEN, e pertence ao mesmo unitId do operador.

R2. Validar que amount \<= saldo restante do Check (total \- soma de pagamentos confirmados). Retornar 400 se exceder.

R3. Buscar CashRegister OPEN do employeeId (JWT). Se não encontrar, retornar 400 com mensagem: 'Nenhum caixa aberto. Abra um caixa antes de registrar pagamento.'

R4. Criar Payment com status CONFIRMED e paidAt \= now() (dinheiro é confirmação imediata).

R5. Calcular troco: change \= receivedAmount \- amount (se receivedAmount informado).

R6. Chamar checkPaymentCompletion(checkId) para verificar auto-close.

## **POST /payments/pix**

Gera QR Code PIX dinâmico via Pagar.me. Pagamento assíncrono — criado como PENDING, confirmado via webhook.

### **Request Body**

const CreatePixPaymentSchema \= z.object({  
  checkId: z.string().cuid(),  
  amount: z.number().positive(),  
  customerName: z.string().optional(),  
  customerCpf: z.string().length(11).optional(),  
});  
   
// Exemplo:  
{  
  "checkId": "clx1abc...",  
  "amount": 85.50,  
  "customerName": "João Silva"  
}

### **Response (201)**

{  
  "id": "clx2def...",  
  "checkId": "clx1abc...",  
  "amount": 85.50,  
  "method": "PIX",  
  "status": "PENDING",  
  "pixQrCode": "00020126580014br.gov.bcb.pix...",  
  "pixQrCodeBase64": "data:image/png;base64,iVBORw0K...",  
  "expiresAt": "2026-03-02T22:45:00Z",  
  "externalId": "or\_abc123def456"  
}

### **Regras de Negócio**

R1. Mesmas validações de Check que pagamento em dinheiro (existe, aberto, mesmo unit, saldo suficiente).

R2. Chamar Pagar.me POST /orders com amount em centavos, payment\_method: 'pix', e pix.expires\_in: 1800 (30 min).

R3. Criar Payment com status PENDING, externalId do Pagar.me, pixQrCode e pixQrCodeBase64 do response.

R4. Vincular ao CashRegister DIGITAL da unidade (caixa automático para pagamentos online).

R5. Expiração: se webhook não confirmar em 30 minutos, um job deve marcar como CANCELLED (implementar via setTimeout ou agenda).

## **POST /payments/card**

Gera link de pagamento para cartão de crédito/débito via Pagar.me. O cliente abre o link no celular e paga.

### **Request Body**

const CreateCardPaymentSchema \= z.object({  
  checkId: z.string().cuid(),  
  amount: z.number().positive(),  
  customerName: z.string().optional(),  
  customerEmail: z.string().email().optional(),  
});

### **Response (201)**

{  
  "id": "clx2def...",  
  "checkId": "clx1abc...",  
  "amount": 85.50,  
  "method": "CARD",  
  "status": "PENDING",  
  "paymentUrl": "https://pagar.me/pay/abc123...",  
  "expiresAt": "2026-03-02T23:15:00Z",  
  "externalId": "or\_abc123def456"  
}

### **Regras de Negócio**

R1. Mesmas validações de Check.

R2. Chamar Pagar.me POST /orders com payment\_method: 'checkout', gerando link de pagamento.

R3. Payment criado como PENDING. Confirmação via webhook (mesmo endpoint que PIX).

R4. expiresAt: 60 minutos (link de cartão dura mais que PIX).

## **POST /payments/webhook**

Endpoint público que recebe notificações do Pagar.me quando um pagamento PIX ou cartão é confirmado, falha ou é cancelado.

### **Validação de Segurança**

CRÍTICO: Validar a assinatura do webhook para evitar fraude. O Pagar.me envia um header x-hub-signature com HMAC-SHA256 do body usando a API key como secret.

// Validação da assinatura  
const crypto \= require('crypto');  
   
function validateWebhookSignature(  
  body: string,  
  signature: string,  
  secret: string  
): boolean {  
  const hmac \= crypto  
    .createHmac('sha256', secret)  
    .update(body)  
    .digest('hex');  
  return crypto.timingSafeEqual(  
    Buffer.from(hmac),  
    Buffer.from(signature)  
  );  
}

### **Lógica do Webhook**

1\. Validar assinatura HMAC. Se inválida, retornar 401\.

2\. Extrair externalId (order.id) do payload.

3\. Buscar Payment por externalId. Se não encontrar, retornar 200 (idempotente — pode ser evento de outra coisa).

4\. Se evento \= 'order.paid': atualizar Payment.status para CONFIRMED, Payment.paidAt \= now().

5\. Se evento \= 'order.payment\_failed': atualizar Payment.status para FAILED.

6\. Se evento \= 'order.canceled': atualizar Payment.status para CANCELLED.

7\. Após confirmação (CONFIRMED), chamar checkPaymentCompletion(checkId).

8\. Retornar 200 sempre (Pagar.me faz retry se receber 4xx/5xx).

## **GET /payments/check/:checkId/summary**

Retorna resumo financeiro da conta, incluindo total, pagamentos confirmados, saldo restante, e breakdown por método.

// Response  
{  
  "checkId": "clx1abc...",  
  "checkTotal": 285.50,           // soma de OrderItems \+ serviceFee  
  "serviceFeeAmount": 25.95,      // 10% de taxa de serviço  
  "tipAmount": 0.00,  
  "discountAmount": 0.00,  
  "grossTotal": 285.50,  
  "totalPaid": 200.00,            // soma de pagamentos CONFIRMED  
  "remainingBalance": 85.50,      // grossTotal \- totalPaid  
  "isPaid": false,  
  "payments": \[  
    {  
      "id": "...",  
      "method": "CASH",  
      "amount": 100.00,  
      "status": "CONFIRMED",  
      "paidAt": "2026-03-02T22:10:00Z"  
    },  
    {  
      "id": "...",  
      "method": "PIX",  
      "amount": 100.00,  
      "status": "CONFIRMED",  
      "paidAt": "2026-03-02T22:12:00Z"  
    }  
  \],  
  "breakdown": {  
    "CASH": 100.00,  
    "PIX": 100.00,  
    "CARD": 0.00  
  }  
}

# **CashRegister — Detalhamento**

## **POST /cash-registers/open**

// Request  
const OpenCashRegisterSchema \= z.object({  
  openingBalance: z.number().min(0),  // fundo de troco  
  type: z.enum(\["OPERATOR", "DIGITAL"\]).default("OPERATOR"),  
});  
   
// Response (201)  
{  
  "id": "clx3ghi...",  
  "unitId": "clx0unit...",  
  "employeeId": "clx0emp...",  
  "type": "OPERATOR",  
  "status": "OPEN",  
  "openedAt": "2026-03-02T17:00:00Z",  
  "openingBalance": 200.00  
}

R1. Validar que o operador não tem outro caixa OPEN (um por vez). Retornar 409 se já existir.

R2. Caixa DIGITAL é único por Unit — só pode existir 1 aberto. Criado no seed, não pelo operador.

R3. openingBalance é o fundo de troco físico. Para DIGITAL, sempre 0\.

## **POST /cash-registers/:id/operation**

// Request  
const CashRegisterOperationSchema \= z.object({  
  type: z.enum(\["WITHDRAWAL", "SUPPLY", "ADJUSTMENT"\]),  
  amount: z.number().positive(),  
  reason: z.string().min(3).max(500),  
  authorizedBy: z.string().cuid().optional(),  
});  
   
// Exemplo: Sangria de R$500  
{  
  "type": "WITHDRAWAL",  
  "amount": 500.00,  
  "reason": "Sangria noturna — cofre",  
  "authorizedBy": "clx0manager..."  
}

R1. Caixa deve estar OPEN.

R2. WITHDRAWAL (sangria): retira dinheiro do caixa. SUPPLY (suprimento): adiciona dinheiro. ADJUSTMENT: correção.

R3. Sangria acima de R$200 requer authorizedBy (gerente/dono). Retornar 403 se não informado.

## **POST /cash-registers/:id/close**

// Request  
const CloseCashRegisterSchema \= z.object({  
  closingBalance: z.number().min(0),  // contagem física  
  closingNotes: z.string().optional(),  
});  
   
// Response (200)  
{  
  "id": "clx3ghi...",  
  "status": "CLOSED",  
  "closedAt": "2026-03-03T02:30:00Z",  
  "openingBalance": 200.00,  
  "closingBalance": 1847.30,     // informado pelo operador  
  "expectedBalance": 1852.50,    // calculado pelo sistema  
  "difference": \-5.20,           // negativo \= falta dinheiro  
  "closingNotes": "Faltando R$5,20 \- possível troco errado",  
  "summary": {  
    "totalCashIn": 2152.50,      // pagamentos em dinheiro  
    "totalWithdrawals": 500.00,  // sangrias  
    "totalSupplies": 0.00,       // suprimentos  
    "transactionCount": 47       // qtd de pagamentos em dinheiro  
  }  
}

### **Cálculo do expectedBalance**

expectedBalance \=   
  openingBalance                    // fundo de troco  
  \+ SUM(payments WHERE method=CASH  // entradas de dinheiro  
        AND cashRegisterId=THIS       
        AND status=CONFIRMED)  
  \- SUM(operations WHERE type=WITHDRAWAL)  // sangrias  
  \+ SUM(operations WHERE type=SUPPLY)      // suprimentos  
  \+/- SUM(operations WHERE type=ADJUSTMENT) // ajustes

R1. Caixa DIGITAL não precisa de fechamento manual (fecha com o dia no PRD-07).

R2. closingBalance é a contagem física informada pelo operador.

R3. difference \= closingBalance \- expectedBalance. Positivo \= sobra. Negativo \= falta.

R4. Se |difference| \> R$50, criar Alert para o dono com severidade HIGH.

# **Integração Pagar.me — Especificação Técnica**

O OASYS integra com Pagar.me v5 (API REST) para processamento de PIX e cartão online. A integração não cobre TEF/maquininhas físicas — pagamentos presenciais em cartão são registrados manualmente pelo garçom (o valor já foi processado na maquininha).

## **Configuração**

| Env Var | Valor | Propósito |
| :---- | :---- | :---- |
| PAGARME\_API\_KEY | sk\_live\_xxx ou sk\_test\_xxx | Chave secreta da API |
| PAGARME\_PUBLIC\_KEY | pk\_live\_xxx ou pk\_test\_xxx | Chave pública (checkout) |
| PAGARME\_WEBHOOK\_SECRET | whsec\_xxx | Secret para validação de webhook |
| PAGARME\_BASE\_URL | https://api.pagar.me/core/v5 | Base URL da API v5 |

## **Autenticação**

// Pagar.me v5 usa Basic Auth com a API key como username  
const auth \= Buffer.from(PAGARME\_API\_KEY \+ ':').toString('base64');  
   
const headers \= {  
  'Authorization': 'Basic ' \+ auth,  
  'Content-Type': 'application/json',  
  'Accept': 'application/json',  
};

## **Criar Pedido com PIX**

// POST https://api.pagar.me/core/v5/orders  
{  
  "items": \[{  
    "amount": 8550,        // centavos (R$85,50)  
    "description": "Conta \#1234 \- Boteco do Zé",  
    "quantity": 1,  
    "code": "check\_clx1abc"  
  }\],  
  "payments": \[{  
    "payment\_method": "pix",  
    "pix": {  
      "expires\_in": 1800   // 30 minutos em segundos  
    }  
  }\],  
  "customer": {            // opcional  
    "name": "João Silva",  
    "type": "individual",  
    "document": "12345678901",  
    "document\_type": "cpf"  
  }  
}  
   
// Response relevante:  
{  
  "id": "or\_abc123def456",  
  "status": "pending",  
  "charges": \[{  
    "id": "ch\_xyz...",  
    "last\_transaction": {  
      "qr\_code": "00020126580014br.gov.bcb.pix...",  
      "qr\_code\_url": "https://api.pagar.me/..../qrcode.png"  
    }  
  }\]  
}

## **Criar Pedido com Link de Pagamento (Cartão)**

// POST https://api.pagar.me/core/v5/orders  
{  
  "items": \[{  
    "amount": 8550,  
    "description": "Conta \#1234 \- Boteco do Zé",  
    "quantity": 1,  
    "code": "check\_clx1abc"  
  }\],  
  "payments": \[{  
    "payment\_method": "checkout",  
    "checkout": {  
      "accepted\_payment\_methods": \["credit\_card", "debit\_card"\],  
      "success\_url": "https://app.oasys.com.br/payment/success",  
      "skip\_checkout\_success\_page": false,  
      "customer\_editable": false  
    }  
  }\],  
  "customer": {  
    "name": "João Silva",  
    "type": "individual",  
    "email": "joao@email.com"  
  }  
}  
   
// Response inclui:  
{  
  "id": "or\_abc123def456",  
  "checkouts": \[{  
    "payment\_url": "https://pagar.me/pay/abc123..."  
  }\]  
}

## **Webhook Events**

| Evento | Quando | Ação no OASYS |
| :---- | :---- | :---- |
| order.paid | Pagamento confirmado (PIX recebido, cartão aprovado) | Payment.status → CONFIRMED, paidAt \= now(), verificar auto-close Check |
| order.payment\_failed | Pagamento falhou (cartão recusado, PIX expirou) | Payment.status → FAILED |
| order.canceled | Pedido cancelado no Pagar.me | Payment.status → CANCELLED |
| charge.refunded | Estorno processado | Payment.status → REFUNDED |

## **Serviço de Integração — Estrutura**

// apps/api/src/modules/payments/pagarme.service.ts  
   
export class PagarmeService {  
  private baseUrl: string;  
  private authHeader: string;  
   
  constructor() {  
    this.baseUrl \= process.env.PAGARME\_BASE\_URL\!;  
    this.authHeader \= 'Basic ' \+  
      Buffer.from(process.env.PAGARME\_API\_KEY \+ ':')  
        .toString('base64');  
  }  
   
  async createPixOrder(params: {  
    amountCents: number;  
    description: string;  
    referenceCode: string;  
    customerName?: string;  
    customerCpf?: string;  
    expiresInSeconds?: number;  
  }): Promise\<PagarmePixResponse\> { ... }  
   
  async createCardCheckout(params: {  
    amountCents: number;  
    description: string;  
    referenceCode: string;  
    successUrl: string;  
    customerName?: string;  
    customerEmail?: string;  
  }): Promise\<PagarmeCheckoutResponse\> { ... }  
   
  async getOrder(orderId: string): Promise\<PagarmeOrder\> { ... }  
   
  validateWebhookSignature(  
    body: string,  
    signature: string  
  ): boolean { ... }  
}

# **Lógica Central — Payment Orchestration**

O coração do módulo é a função checkPaymentCompletion, chamada após cada pagamento confirmado. Ela determina se o Check foi totalmente pago e transiciona o estado.

## **checkPaymentCompletion**

// apps/api/src/modules/payments/payments.service.ts  
   
async function checkPaymentCompletion(  
  checkId: string,  
  prisma: PrismaClient  
): Promise\<{ isPaid: boolean; remainingBalance: number }\> {  
   
  // 1\. Buscar Check com Orders e Payments  
  const check \= await prisma.check.findUnique({  
    where: { id: checkId },  
    include: {  
      orders: { include: { items: true } },  
      payments: { where: { status: 'CONFIRMED' } },  
    },  
  });  
   
  // 2\. Calcular total da conta  
  const itemsTotal \= check.orders.reduce((sum, order) \=\>  
    sum \+ order.items.reduce((s, item) \=\>  
      s \+ (item.price \* item.quantity), 0  
    ), 0  
  );  
   
  const serviceFee \= check.serviceFeeAmount  
    ?? (check.unit.serviceFeeRate  
        ? itemsTotal \* check.unit.serviceFeeRate  
        : 0);  
   
  const tip \= check.tipAmount ?? 0;  
  const discount \= check.discountAmount ?? 0;  
  const grossTotal \= itemsTotal \+ serviceFee \+ tip \- discount;  
   
  // 3\. Calcular total pago  
  const totalPaid \= check.payments.reduce(  
    (sum, p) \=\> sum \+ p.amount, 0  
  );  
   
  // 4\. Verificar se está pago  
  const remainingBalance \= grossTotal \- totalPaid;  
  const isPaid \= remainingBalance \<= 0.01; // tolerância de centavo  
   
  // 5\. Se pago, atualizar Check  
  if (isPaid && check.status \!== 'PAID') {  
    await prisma.check.update({  
      where: { id: checkId },  
      data: {  
        status: 'PAID',  
        closedAt: new Date(),  
        serviceFeeAmount: serviceFee,  
      },  
    });  
  }  
   
  return { isPaid, remainingBalance: Math.max(0, remainingBalance) };  
}

## **Cálculo da Taxa de Serviço**

A taxa de serviço (gorjeta sugerida) é calculada sobre o total de itens consumidos. Ela é apresentada ao cliente no momento do pagamento, mas o pagamento é sobre o grossTotal que inclui a taxa.

// Cálculo:  
serviceFeeAmount \= SUM(orderItems.price \* quantity) \* unit.serviceFeeRate  
   
// Exemplo: conta de R$259,10 com 10% de serviço  
// serviceFeeAmount \= 259.10 \* 0.10 \= R$25.91  
// grossTotal \= 259.10 \+ 25.91 \= R$285.01

A taxa de serviço é SUGERIDA, não obrigatória. O cliente pode solicitar remoção. Neste caso, o garçom atualiza Check.serviceFeeAmount \= 0 via endpoint existente de update do Check.

## **Pagamento Parcial — Fluxo**

Uma conta pode ser paga com múltiplos pagamentos de métodos diferentes. Cada pagamento é independente e tem seu próprio status.

// Exemplo: Conta de R$285,01  
   
// Pagamento 1: Dinheiro (R$150)  
POST /payments/cash { checkId: "...", amount: 150.00 }  
→ remainingBalance: 135.01, checkStatus: "OPEN"  
   
// Pagamento 2: PIX (R$100)  
POST /payments/pix { checkId: "...", amount: 100.00 }  
→ status: PENDING (aguardando webhook)  
→ Webhook confirma → remainingBalance: 35.01  
   
// Pagamento 3: Cartão (R$35.01)  
POST /payments/card { checkId: "...", amount: 35.01 }  
→ Webhook confirma → remainingBalance: 0.00  
→ Check.status → PAID (auto-close)

## **Registro de Pagamento Presencial em Cartão**

Quando o cliente paga na maquininha física, o OASYS não processa o pagamento — a maquininha já fez isso. O garçom apenas registra que o pagamento foi feito.

// POST /payments/card-present  
const CreateCardPresentSchema \= z.object({  
  checkId: z.string().cuid(),  
  amount: z.number().positive(),  
  cardBrand: z.string().optional(),  // VISA, MASTERCARD, etc  
  lastFourDigits: z.string().length(4).optional(),  
  isDebit: z.boolean().default(false),  
});  
   
// Comportamento:  
// \- Cria Payment com status CONFIRMED (presencial \= confirmado)  
// \- method: CARD  
// \- Vincula ao CashRegister do operador (embora seja cartão)  
// \- Não chama Pagar.me (maquininha já processou)

# **Estrutura de Arquivos**

Todos os arquivos devem ser criados seguindo o padrão modular do OASYS — cada módulo tem routes, service, e schemas.

apps/api/src/modules/payments/  
├── payments.routes.ts          \# Registro de rotas Fastify  
├── payments.service.ts         \# Lógica de negócio (create, complete, refund)  
├── payments.schemas.ts         \# Schemas Zod (request/response)  
├── pagarme.service.ts          \# Integração Pagar.me (HTTP calls)  
├── pagarme.types.ts            \# Tipos do Pagar.me (request/response)  
├── webhook.handler.ts          \# Processamento do webhook  
└── \_\_tests\_\_/  
    ├── payments.test.ts        \# Testes unitários  
    └── pagarme.mock.ts         \# Mock do Pagar.me para testes  
   
apps/api/src/modules/cash-registers/  
├── cash-registers.routes.ts    \# Registro de rotas  
├── cash-registers.service.ts   \# Lógica (open, operate, close, report)  
├── cash-registers.schemas.ts   \# Schemas Zod  
└── \_\_tests\_\_/  
    └── cash-registers.test.ts

## **Registro de Rotas**

// apps/api/src/modules/payments/payments.routes.ts  
import { FastifyInstance } from 'fastify';  
import { requireRole } from '../../lib/auth';  
import {  
  createCashPayment,  
  createPixPayment,  
  createCardPayment,  
  createCardPresentPayment,  
  handleWebhook,  
  getPaymentsByCheck,  
  getPaymentSummary,  
  getPaymentById,  
  refundPayment,  
} from './payments.service';  
import \* as schemas from './payments.schemas';  
   
export async function paymentRoutes(app: FastifyInstance) {  
  // Public webhook (no auth, validated by signature)  
  app.post('/payments/webhook', handleWebhook);  
   
  // Authenticated endpoints  
  app.post('/payments/cash', {  
    preHandler: requireRole(\['WAITER','CASHIER','MANAGER'\]),  
    schema: { body: schemas.CreateCashPaymentSchema },  
    handler: createCashPayment,  
  });  
   
  app.post('/payments/pix', {  
    preHandler: requireRole(\['WAITER','CASHIER','MANAGER'\]),  
    schema: { body: schemas.CreatePixPaymentSchema },  
    handler: createPixPayment,  
  });  
   
  app.post('/payments/card', {  
    preHandler: requireRole(\['WAITER','CASHIER','MANAGER'\]),  
    schema: { body: schemas.CreateCardPaymentSchema },  
    handler: createCardPayment,  
  });  
   
  app.post('/payments/card-present', {  
    preHandler: requireRole(\['WAITER','CASHIER','MANAGER'\]),  
    schema: { body: schemas.CreateCardPresentSchema },  
    handler: createCardPresentPayment,  
  });  
   
  app.get('/payments/check/:checkId', {  
    preHandler: requireRole(\['WAITER','CASHIER','MANAGER','OWNER'\]),  
    handler: getPaymentsByCheck,  
  });  
   
  app.get('/payments/check/:checkId/summary', {  
    preHandler: requireRole(\['WAITER','CASHIER','MANAGER','OWNER'\]),  
    handler: getPaymentSummary,  
  });  
   
  app.get('/payments/:id', {  
    preHandler: requireRole(\['WAITER','CASHIER','MANAGER','OWNER'\]),  
    handler: getPaymentById,  
  });  
   
  app.post('/payments/:id/refund', {  
    preHandler: requireRole(\['MANAGER','OWNER'\]),  
    handler: refundPayment,  
  });  
}

# **UI — Web Waiter (apps/web-waiter)**

O web-waiter recebe uma nova tela de pagamento acessível a partir do detalhe da mesa/comanda. A UI é mobile-first (garçom usa celular) com foco em velocidade — máximo 2 toques para registrar um pagamento.

## **Tela: Pagamento da Conta**

Acessível via botão 'Pagar' no TableDetail.tsx ou no detalhe da conta flutuante.

### **Layout**

┌─────────────────────────────────────────┐  
│  ← Voltar          Conta \#1234          │  
├─────────────────────────────────────────┤  
│                                         │  
│  Total da conta         R$ 259,10       │  
│  Taxa de serviço (10%)  R$  25,91       │  
│  ──────────────────────────────────     │  
│  TOTAL                  R$ 285,01       │  
│  Já pago                R$ 150,00       │  
│  ──────────────────────────────────     │  
│  RESTANTE               R$ 135,01       │  
│                                         │  
├─────────────────────────────────────────┤  
│                                         │  
│  Valor a pagar:  \[ R$ 135,01         \]  │  
│                                         │  
│  ┌───────────┐ ┌──────┐ ┌───────────┐  │  
│  │    💵     │ │  PIX │ │   💳     │  │  
│  │ Dinheiro  │ │      │ │  Cartão   │  │  
│  └───────────┘ └──────┘ └───────────┘  │  
│                                         │  
│  \[ \] Pagar total restante               │  
│                                         │  
├─────────────────────────────────────────┤  
│  Pagamentos realizados:                 │  
│  ✅ Dinheiro    R$ 150,00  22:10        │  
│                                         │  
└─────────────────────────────────────────┘

## **Componentes React**

| Componente | Arquivo | Responsabilidade |
| :---- | :---- | :---- |
| PaymentScreen | pages/Payment.tsx | Tela principal — resumo da conta \+ seleção de método |
| PaymentSummary | components/PaymentSummary.tsx | Cards com total, pago, restante |
| PaymentMethodSelector | components/PaymentMethodSelector.tsx | 3 botões: Dinheiro, PIX, Cartão |
| CashPaymentModal | components/CashPaymentModal.tsx | Input de valor recebido, cálculo de troco |
| PixPaymentModal | components/PixPaymentModal.tsx | Exibe QR Code, timer de expiração, status |
| CardPaymentModal | components/CardPaymentModal.tsx | Exibe link/QR do link, botão copiar |
| CardPresentModal | components/CardPresentModal.tsx | Registro simples: valor \+ bandeira |
| PaymentHistory | components/PaymentHistory.tsx | Lista de pagamentos já feitos |

## **Zustand Store**

// apps/web-waiter/src/stores/payment.store.ts  
   
interface PaymentStore {  
  // State  
  currentCheckId: string | null;  
  summary: PaymentSummary | null;  
  pendingPayment: Payment | null; // PIX/card aguardando  
  isLoading: boolean;  
   
  // Actions  
  loadSummary: (checkId: string) \=\> Promise\<void\>;  
  createCashPayment: (amount: number, received?: number) \=\> Promise\<Payment\>;  
  createPixPayment: (amount: number) \=\> Promise\<Payment\>;  
  createCardPayment: (amount: number) \=\> Promise\<Payment\>;  
  createCardPresentPayment: (amount: number, brand?: string) \=\> Promise\<Payment\>;  
  pollPaymentStatus: (paymentId: string) \=\> void;  
  stopPolling: () \=\> void;  
}

O store usa polling para pagamentos assíncronos (PIX/cartão): a cada 3 segundos, verifica se o Payment mudou de PENDING para CONFIRMED. Quando confirmar, atualiza o summary automaticamente. WebSocket é preferível mas polling é aceitável como MVP.

## **Tela: CashRegister (Caixa)**

Acessível pelo menu lateral do web-waiter, visível apenas para roles CASHIER e MANAGER.

┌─────────────────────────────────────────┐  
│  Caixa                     Status: 🟢   │  
├─────────────────────────────────────────┤  
│                                         │  
│  Operador: Lucia Ferreira               │  
│  Aberto em: 17:00                       │  
│  Fundo: R$ 200,00                       │  
│                                         │  
│  ┌─────────────────────────────────┐    │  
│  │  Resumo em tempo real           │    │  
│  │  Entradas (dinheiro): R$ 2.152  │    │  
│  │  Sangrias:            R$   500  │    │  
│  │  Suprimentos:         R$     0  │    │  
│  │  Saldo estimado:      R$ 1.852  │    │  
│  └─────────────────────────────────┘    │  
│                                         │  
│  ┌────────────┐  ┌────────────────┐     │  
│  │  Sangria   │  │   Suprimento   │     │  
│  └────────────┘  └────────────────┘     │  
│                                         │  
│  ┌────────────────────────────────┐     │  
│  │     🔒 Fechar Caixa            │     │  
│  └────────────────────────────────┘     │  
│                                         │  
│  Últimas operações:                     │  
│  22:30  Sangria     R$ 500  (Maria)     │  
│  21:15  Pagamento   R$ 85   Mesa 4      │  
│  20:48  Pagamento   R$ 42   Mesa 7      │  
│                                         │  
└─────────────────────────────────────────┘

# **Tratamento de Erros e Edge Cases**

Cada edge case deve ser tratado explicitamente. Falhas silenciosas em pagamento são inadmissíveis.

| Cenário | Comportamento Esperado | HTTP Status |
| :---- | :---- | :---- |
| Check não existe | Retornar erro: 'Conta não encontrada' | 404 |
| Check já está PAID | Retornar erro: 'Conta já foi paga' | 400 |
| Check está CANCELLED | Retornar erro: 'Conta foi cancelada' | 400 |
| amount \> saldo restante | Retornar erro com remainingBalance: 'Valor excede saldo restante de R$ X' | 400 |
| amount \<= 0 | Validação Zod rejeita | 400 |
| Nenhum caixa aberto (dinheiro) | Retornar: 'Nenhum caixa aberto. Abra um caixa primeiro.' | 400 |
| Pagar.me indisponível (PIX/card) | Retornar: 'Serviço de pagamento indisponível. Tente novamente.' \+ log | 503 |
| Pagar.me retorna erro | Retornar mensagem do Pagar.me ao usuário \+ log detalhado | 502 |
| Webhook com assinatura inválida | Retornar 401, NÃO processar | 401 |
| Webhook para Payment inexistente | Retornar 200 (idempotente, ignorar) | 200 |
| Webhook duplicado (já CONFIRMED) | Retornar 200 (idempotente, não reprocessar) | 200 |
| PIX expirou sem pagamento | Job marca Payment como CANCELLED após 30 min | N/A |
| Operador tenta abrir 2 caixas | Retornar: 'Você já tem um caixa aberto' | 409 |
| Sangria \> R$200 sem autorização | Retornar: 'Sangria acima de R$200 requer autorização do gerente' | 403 |
| Fechar caixa com pagamentos pendentes | Warning no response: 'X pagamentos pendentes de confirmação' | 200 (warning) |
| Check de outra unidade | Retornar: 'Conta não pertence a esta unidade' | 403 |

## **Logging**

Toda operação de pagamento deve gerar log estruturado. Usar o logger do Fastify com contexto:

// Nível INFO para operações normais  
app.log.info({  
  event: 'payment.created',  
  paymentId: payment.id,  
  checkId: check.id,  
  method: 'PIX',  
  amount: 85.50,  
  unitId: unit.id,  
  employeeId: employee.id,  
}, 'Payment created');  
   
// Nível ERROR para falhas  
app.log.error({  
  event: 'payment.pagarme\_error',  
  checkId: check.id,  
  error: pagarmeResponse.errors,  
  statusCode: pagarmeResponse.status,  
}, 'Pagar.me integration failed');  
   
// Nível WARN para edge cases tratados  
app.log.warn({  
  event: 'payment.webhook\_unknown',  
  externalId: webhookPayload.id,  
}, 'Webhook received for unknown payment');

# **Estratégia de Testes**

PRD-02 inaugura a cobertura de testes do OASYS (atualmente 0%). Os testes são unitários com Vitest, mockando o Prisma e a integração Pagar.me.

## **Cenários de Teste — Pagamentos**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Pagamento dinheiro \- sucesso | Unit | Cria Payment CONFIRMED, calcula troco, verifica Check |
| Pagamento dinheiro \- sem caixa | Unit | Retorna 400 quando não há CashRegister OPEN |
| Pagamento dinheiro \- excede saldo | Unit | Retorna 400 quando amount \> remainingBalance |
| Pagamento PIX \- gera QR | Unit (mock Pagar.me) | Cria Payment PENDING com pixQrCode |
| Pagamento PIX \- Pagar.me down | Unit (mock) | Retorna 503, Payment não criado |
| Webhook \- confirmação PIX | Unit | Payment PENDING → CONFIRMED, Check auto-close |
| Webhook \- assinatura inválida | Unit | Retorna 401, não processa |
| Webhook \- duplicado | Unit | Retorna 200, não reprocessa |
| Pagamento parcial \- 3 pagamentos | Integration | 3 pagamentos de métodos diferentes, Check fecha no 3o |
| Check auto-close | Unit | checkPaymentCompletion transiciona Check para PAID |
| Taxa de serviço no total | Unit | grossTotal inclui serviceFee corretamente |

## **Cenários de Teste — CashRegister**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Abrir caixa \- sucesso | Unit | Cria CashRegister OPEN com openingBalance |
| Abrir caixa \- já tem um aberto | Unit | Retorna 409 |
| Sangria \- com autorização | Unit | Cria operação WITHDRAWAL |
| Sangria \- sem autorização (\> R$200) | Unit | Retorna 403 |
| Fechar caixa \- reconciliação | Unit | Calcula expectedBalance, registra difference |
| Fechar caixa \- alerta de diferença | Unit | Cria Alert quando |difference| \> R$50 |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-02**

| PRD | Módulo | Como Usa Payments |
| :---- | :---- | :---- |
| PRD-03 | Cardápio Digital | Cliente paga PIX/cartão direto do web-menu (pré-pagamento). Usa POST /payments/pix e /payments/card com session token. |
| PRD-06 | Fiscal & NFC-e | NFC-e é emitida ao fechar conta com pagamento. Precisa de Payment.status \= CONFIRMED e Payment.method para dados da nota. |
| PRD-07 | Fechamento & Relatórios | DailyReport consolida pagamentos por método. CashRegister.close alimenta o fechamento do dia. |
| PRD-14 | Delivery | Pedidos delivery usam pagamento online (PIX/cartão). Reutiliza toda a infraestrutura. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Pagar.me API instável | Baixa | Alto | Retry com backoff exponencial (3 tentativas). Timeout de 10s. Fallback: registrar como PENDING e processar depois. |
| Webhook não chega | Média | Alto | Job de reconciliação a cada 5 min verifica pagamentos PENDING com mais de 5 min. Consulta GET /orders/:id no Pagar.me. |
| Fraude de webhook | Média | Crítico | Validação HMAC obrigatória. Nunca processar sem assinatura válida. |
| Diferença de centavos no cálculo | Alta | Baixo | Usar Decimal do Prisma (não float). Tolerância de R$0.01 no checkPaymentCompletion. |
| Caixa não fechado (operador esqueceu) | Alta | Médio | Alert automático se CashRegister OPEN por mais de 12h. Aviso no dashboard do dono. |
| Pagamento duplo (cliente paga 2x) | Baixa | Alto | Validar amount \<= remainingBalance antes de cada pagamento. Se PIX pago e saldo negativo, marcar para estorno. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| Pagar.me v5 (REST) | Stripe | Pagar.me tem PIX nativo e é mais comum no mercado brasileiro. Env vars já apontam para Pagar.me. |
| Webhook \+ polling (PIX/card) | Apenas WebSocket | Webhook é o padrão do Pagar.me. Polling é fallback para UI em tempo real. WebSocket seria over-engineering para MVP. |
| CashRegister DIGITAL (auto) | Só OPERATOR | Pagamentos online (PIX/cartão) não passam por caixa humano. Caixa digital é automático e sempre aberto. |
| Registro manual de cartão presencial | Integração TEF | TEF requer certificação com cada adquirente (Cielo, Stone, Rede). Inviável para MVP. Garçom registra manualmente. |
| Amount em Decimal (Prisma) | Float/Int centavos | Decimal evita erros de arredondamento. Pagar.me recebe centavos (convertemos na camada de integração). |

## **Sequência de Implementação (3 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: Payment em dinheiro \+ CashRegister completo | API funcional para cash, open/close caixa, reconciliação. Testes unitários. |
| Sprint 2 | Backend: Pagar.me \+ PIX \+ Cartão \+ Webhook | API funcional para PIX (QR) e cartão (link). Webhook processando. Testes com mock. |
| Sprint 3 | Frontend: UI Payment \+ CashRegister no web-waiter | Telas de pagamento, CashRegister, polling de status. Integração end-to-end. |

OASYS PRD-02 — Payments & CashRegister  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026

Documento confidencial — Uso interno