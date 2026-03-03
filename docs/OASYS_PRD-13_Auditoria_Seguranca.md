

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-13 — Auditoria & Segurança**  
Logs completos, LGPD, aprovação dual, dispositivos, health check, multi-unidade

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 2 — Growth & Scale |
| **Sprints Estimados** | 2 sprints |
| **Complexidade** | Média |
| **Cobertura Atual** | \~28% |
| **Dependências** | PRD-01 (Schema Foundation) |
| **Gap Modules** | M11 — Segurança / Admin |
| **Apps Afetadas** | apps/api (middleware) \+ apps/web-owner |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-13 (Auditoria & Segurança) é a camada de proteção, rastreabilidade e compliance do OASYS. Enquanto os outros PRDs constroem funcionalidades, este garante que tudo que acontece no sistema é registrado, auditável, seguro e recuperável. Na Phase 1, o AuditLog existe com \~1% de cobertura — praticamente decorativo. Após PRD-13, toda operação sensível é registrada automaticamente, aprovações duais são obrigatórias para ações críticas, dispositivos são controlados, e o dono tem visão completa de quem fez o quê e quando.

A cobertura atual é \~28%: auth funciona com PIN \+ JWT \+ roles, AuditLog model existe, authorizedBy foi adicionado ao Cancellation pelo PRD-01, e CustomerConsent (LGPD) é funcional. O que falta é o middleware de auditoria automática, a aplicação efetiva da aprovação dual, o controle de dispositivos, o health check de integrações, a UI multi-unidade, e o backup automatizado.

Este PRD é Phase 2 porque não bloqueia operação básica — o bar funciona sem auditoria completa. Porém, para operação sustentável com múltiplos funcionários e múltiplas unidades, é crítico ter trilha de auditoria, segurança e controles. É também pré-requisito implícito para escalar para novos clientes.

Este PRD cobre seis subsistemas:

**1\. Auditoria Automática —** Middleware Prisma que intercepta operações sensíveis (create, update, delete) e grava AuditLog automaticamente. Append-only, imutável, com snapshot before/after do dado alterado. Cobre 100% das operações sensíveis sem código manual nos services.

**2\. Aprovação Dual —** Ações críticas (cancelamento, estorno, desconto acima de threshold, ajuste de estoque, sangria grande) requerem aprovação de um segundo funcionário com role superior. Pipeline de solicitação → aprovação → execução.

**3\. Controle de Dispositivos —** Registro de dispositivos autorizados por unidade. Primeiro login de um dispositivo novo requer aprovação do gerente. Bloqueio e revogação remota. Fingerprint por User-Agent \+ IP.

**4\. Health Check de Integrações —** GET /health retorna status de todas as dependências: PostgreSQL, Redis, Pagar.me, FocusNFe, WhatsApp Graph API. Dashboard do dono exibe status em tempo real. Alerta automático se integração cair.

**5\. UI Multi-Unidade —** Dono com múltiplas unidades pode alternar entre elas no web-owner sem logout. Visão consolidada (todas as unidades) e visão individual. Context switcher no header.

**6\. Backup e Recuperação —** Estratégia de backup automatizado do PostgreSQL. Point-in-time recovery. Política de retenção. Procedimento de disaster recovery documentado.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Models (Schema) | 2 | ApprovalRequest, AuthorizedDevice |
| Models Modificados | 1 | AuditLog (expandir campos) |
| Novos Enums | 2 | ApprovalStatus, ApprovalAction |
| Middleware Novo | 1 | Prisma audit middleware (intercepta todas as queries) |
| Endpoints Novos | 16 | Auditoria, aprovações, dispositivos, health, multi-unit |
| Serviços Novos | 4 | AuditService, ApprovalService, DeviceService, HealthService |
| Componentes React (web-owner) | \~10 | Audit log viewer, approval queue, device manager, health dashboard |

## **Critério de Sucesso (Done Definition)**

O PRD-13 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Middleware Prisma registra automaticamente todas as operações sensíveis no AuditLog (append-only).

2\. Cancelamento de pedido/conta, estorno, e sangria \> R$200 requerem aprovação dual (solicitação \+ aprovação).

3\. Dispositivos novos requerem aprovação na primeira conexão. Gerente pode bloquear dispositivos.

4\. GET /health retorna status de PostgreSQL, Redis, Pagar.me, FocusNFe. Dashboard exibe.

5\. Dono alterna entre unidades sem logout. Visão consolidada funcional.

6\. Audit log pesquisável no web-owner: por funcionário, ação, entidade, período.

7\. Backup automático configurado com retenção documentada.

8\. Zero erros de tipo no monorepo.

# **Estado Atual (\~28%)**

| Feature | Estado Atual | PRD-13 Adiciona |
| :---- | :---- | :---- |
| AuditLog model | Existe: action, entityType, entityId, employeeId, metadata, createdAt | before/after snapshots, ipAddress, userAgent, duration, requestId |
| Cobertura de auditoria | \~1%: AuditLog existe mas quase nada escreve nele | 100% via middleware automático |
| Auth (PIN \+ JWT) | Funcional com roles | Fingerprint de dispositivo no JWT |
| authorizedBy | Campo existe em Cancellation (PRD-01) | Pipeline de solicitação/aprovação formal |
| LGPD (CustomerConsent) | Funcional: consent granular, phone hashing | Exportação e esquecimento movidos para PRD-11 (CRM) |
| Health check | Não existe | GET /health completo |
| Multi-unidade | Organization → Unit\[\] funciona no schema | UI de context switching no web-owner |
| Dispositivos | Não existe controle | AuthorizedDevice \+ aprovação |
| Backup | Nenhuma estratégia definida | pg\_dump automatizado \+ política de retenção |

# **Alterações no Schema**

Migration: prd13\_auditoria\_seguranca. Expande o AuditLog existente e adiciona 2 novos models.

## **Novos Enums**

enum ApprovalStatus {  
  PENDING     // Aguardando aprovacao  
  APPROVED    // Aprovado por autorizador  
  REJECTED    // Rejeitado por autorizador  
  EXPIRED     // Expirou sem resposta (timeout)  
  CANCELLED   // Cancelado pelo solicitante  
}

enum ApprovalAction {  
  CANCEL\_ORDER       // Cancelar pedido  
  CANCEL\_CHECK       // Cancelar conta inteira  
  REFUND\_PAYMENT     // Estornar pagamento  
  LARGE\_DISCOUNT     // Desconto acima do threshold  
  LARGE\_WITHDRAWAL   // Sangria acima do threshold  
  STOCK\_ADJUSTMENT   // Ajuste de estoque manual  
  VOID\_FISCAL\_NOTE   // Cancelar nota fiscal  
  DELETE\_EMPLOYEE     // Desativar funcionario  
  PRICE\_OVERRIDE     // Alterar preco manualmente  
  REOPEN\_DAILY\_REPORT // Reabrir fechamento do dia  
}

## **Expansão do AuditLog**

| Campo | Tipo Prisma | Obrigatório | Default | Propósito |
| :---- | :---- | :---- | :---- | :---- |
| before | String? | Não | null | JSON snapshot do estado antes da alteração |
| after | String? | Não | null | JSON snapshot do estado após a alteração |
| ipAddress | String? | Não | null | IP do cliente que executou a ação |
| userAgent | String? | Não | null | User-Agent do navegador/dispositivo |
| deviceId | String? | Não | null | FK para AuthorizedDevice (se identificado) |
| requestId | String? | Não | null | UUID da requisição HTTP (correlação) |
| duration | Int? | Não | null | Duração da operação em ms |
| unitId | String? | Não | null | Unidade onde ocorreu (para filtro multi-unit) |
| severity | String | Sim | INFO | INFO, WARNING, CRITICAL |

## **Novo Model: ApprovalRequest**

Pipeline formal de solicitação e aprovação para ações críticas. Imutável após resolução (não pode alterar depois de aprovada/rejeitada).

model ApprovalRequest {  
  id              String          @id @default(cuid())  
  unitId          String  
  unit            Unit            @relation(fields: \[unitId\], references: \[id\])  
  requestedBy     String          // Employee.id do solicitante  
  requestedByEmployee Employee    @relation("ApprovalRequester", fields: \[requestedBy\], references: \[id\])  
  action          ApprovalAction  // Tipo de acao  
  entityType      String          // "Order", "Check", "Payment", "StockItem", etc  
  entityId        String          // ID da entidade afetada  
  reason          String          // Motivo obrigatorio  
  metadata        String?         // JSON com dados contextuais (valor, detalhes)  
  status          ApprovalStatus  @default(PENDING)  
  resolvedBy      String?         // Employee.id de quem aprovou/rejeitou  
  resolvedByEmployee Employee?    @relation("ApprovalResolver", fields: \[resolvedBy\], references: \[id\])  
  resolvedAt      DateTime?  
  resolvedReason  String?         // Motivo da rejeicao (se rejeitado)  
  expiresAt       DateTime        // Expira se nao resolvido (default: 30 min)  
  createdAt       DateTime        @default(now())

  @@index(\[unitId, status\])  
  @@index(\[requestedBy, createdAt\])  
}

## **Novo Model: AuthorizedDevice**

model AuthorizedDevice {  
  id              String    @id @default(cuid())  
  unitId          String  
  unit            Unit      @relation(fields: \[unitId\], references: \[id\])  
  fingerprint     String    // Hash de User-Agent \+ screen resolution \+ timezone  
  label           String?   // Nome amigavel: "iPhone do Joao", "Tablet Caixa"  
  lastIpAddress   String?  
  lastUserAgent   String?  
  lastUsedAt      DateTime?  
  lastEmployeeId  String?   // Ultimo funcionario que usou  
  isBlocked       Boolean   @default(false)  
  blockedAt       DateTime?  
  blockedBy       String?   // Employee.id  
  blockedReason   String?  
  isApproved      Boolean   @default(false)  // false \= aguardando aprovacao  
  approvedBy      String?   // Employee.id do gerente que aprovou  
  approvedAt      DateTime?  
  createdAt       DateTime  @default(now())  
  updatedAt       DateTime  @updatedAt

  @@unique(\[unitId, fingerprint\])  
  @@index(\[unitId, isBlocked\])  
}

# **Auditoria Automática**

O core deste PRD é o middleware Prisma que intercepta queries e grava AuditLog automaticamente. Nenhum service precisa chamar auditLog.create() manualmente — o middleware cuida de tudo.

## **Operações Auditadas**

| Model | Create | Update | Delete | Severity | Notas |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Order | INFO | WARNING | CRITICAL | INFO/WARN/CRIT | Status changes \= WARNING. Delete \= CRITICAL. |
| OrderItem | — | WARNING | CRITICAL | WARN/CRIT | Alteração de item após envio é sensível |
| Check | INFO | WARNING | CRITICAL | INFO/WARN/CRIT | Status PAID/CANCELLED \= WARNING |
| Payment | INFO | WARNING | CRITICAL | INFO/WARN/CRIT | Estorno \= CRITICAL |
| Cancellation | WARNING | — | — | WARNING | Todo cancelamento é sensível |
| CashRegister | INFO | WARNING | — | INFO/WARN | Fechar/suspender \= WARNING |
| CashRegisterOperation | WARNING | — | — | WARNING | Sangria/suprimento sempre auditado |
| StockItem | INFO | WARNING | — | INFO/WARN | Ajuste de estoque \= WARNING |
| StockMovement | INFO | — | — | INFO/WARN | ADJUSTMENT/LOSS \= WARNING |
| Product | INFO | INFO | WARNING | INFO/WARN | Alteração de preço \= WARNING |
| Employee | INFO | WARNING | CRITICAL | INFO/WARN/CRIT | Desativação \= CRITICAL |
| FiscalNote | INFO | WARNING | — | INFO/WARN | Cancelamento NFC-e \= WARNING |
| Customer | — | WARNING | CRITICAL | WARN/CRIT | LGPD: alteração/exclusão de dados pessoais |
| DailyReport | INFO | CRITICAL | — | INFO/CRIT | Reabertura \= CRITICAL |
| PriceSchedule | INFO | WARNING | WARNING | INFO/WARN | Mudança de preço é sensível |

## **Implementação do Middleware**

// packages/database/src/audit-middleware.ts

import { Prisma } from "@prisma/client";

const AUDITED\_MODELS \= new Set(\[  
  "Order", "OrderItem", "Check", "Payment", "Cancellation",  
  "CashRegister", "CashRegisterOperation", "StockItem",  
  "StockMovement", "Product", "Employee", "FiscalNote",  
  "Customer", "DailyReport", "PriceSchedule",  
\]);

const SEVERITY\_MAP: Record\<string, Record\<string, string\>\> \= {  
  Order:    { create: "INFO", update: "WARNING", delete: "CRITICAL" },  
  Payment:  { create: "INFO", update: "WARNING", delete: "CRITICAL" },  
  // ... etc para cada model (tabela acima)  
};

export function auditMiddleware(): Prisma.Middleware {  
  return async (params, next) \=\> {  
    const model \= params.model;  
    const action \= params.action;

    // Skip se nao e modelo auditado  
    if (\!model || \!AUDITED\_MODELS.has(model)) {  
      return next(params);  
    }

    // Skip se nao e operacao auditada (findMany, count, etc)  
    const auditableActions \= \["create", "update", "delete", "updateMany", "deleteMany"\];  
    if (\!auditableActions.includes(action || "")) {  
      return next(params);  
    }

    // Capturar "before" para updates e deletes  
    let before: any \= null;  
    if ((action \=== "update" || action \=== "delete") && params.args?.where) {  
      try {  
        before \= await (params as any).\_\_prisma?.\[model\]?.findUnique({  
          where: params.args.where,  
        });  
      } catch { /\* best effort \*/ }  
    }

    // Executar a operacao original  
    const result \= await next(params);

    // Gravar audit log (async, nao bloqueia a resposta)  
    setImmediate(async () \=\> {  
      try {  
        const ctx \= getRequestContext(); // AsyncLocalStorage  
        await prisma.auditLog.create({  
          data: {  
            action: \`${model}.${action}\`,  
            entityType: model,  
            entityId: result?.id || params.args?.where?.id || "batch",  
            employeeId: ctx?.employeeId || null,  
            unitId: ctx?.unitId || null,  
            before: before ? JSON.stringify(sanitize(before)) : null,  
            after: result ? JSON.stringify(sanitize(result)) : null,  
            ipAddress: ctx?.ipAddress || null,  
            userAgent: ctx?.userAgent || null,  
            deviceId: ctx?.deviceId || null,  
            requestId: ctx?.requestId || null,  
            severity: SEVERITY\_MAP\[model\]?.\[action\] || "INFO",  
          },  
        });  
      } catch (err) {  
        // Auditoria NUNCA deve derrubar a operacao principal  
        logger.error({ err, model, action }, "Audit log write failed");  
      }  
    });

    return result;  
  };  
}

## **Sanitização de Dados**

O snapshot before/after NUNCA deve conter dados sensíveis. A função sanitize() remove campos como pin (hash de PIN do Employee), phone (hash LGPD), cpf, e tokens.

const SENSITIVE\_FIELDS \= new Set(\[  
  "pin", "phone", "cpf", "email", "pixQrCode", "pixQrCodeBase64",  
  "xml", "accessKey", "metadata", "token",  
\]);

function sanitize(obj: Record\<string, any\>): Record\<string, any\> {  
  const clean: Record\<string, any\> \= {};  
  for (const \[key, value\] of Object.entries(obj)) {  
    if (SENSITIVE\_FIELDS.has(key)) {  
      clean\[key\] \= "\[REDACTED\]";  
    } else if (value instanceof Date) {  
      clean\[key\] \= value.toISOString();  
    } else if (typeof value \=== "object" && value \!== null) {  
      clean\[key\] \= "\[OBJECT\]";  // Nao serializar relacoes  
    } else {  
      clean\[key\] \= value;  
    }  
  }  
  return clean;  
}

## **Contexto de Requisição (AsyncLocalStorage)**

Para que o middleware tenha acesso ao employeeId, unitId, ipAddress e outros dados da requisição HTTP, usamos AsyncLocalStorage do Node.js. Um hook Fastify popula o contexto no início de cada request.

// apps/api/src/lib/request-context.ts  
import { AsyncLocalStorage } from "async\_hooks";

interface RequestContext {  
  requestId: string;  
  employeeId: string | null;  
  unitId: string | null;  
  ipAddress: string;  
  userAgent: string;  
  deviceId: string | null;  
}

export const requestContext \= new AsyncLocalStorage\<RequestContext\>();

export function getRequestContext(): RequestContext | undefined {  
  return requestContext.getStore();  
}

// Fastify hook (registrado no app)  
app.addHook("onRequest", (req, reply, done) \=\> {  
  const ctx: RequestContext \= {  
    requestId: req.id,  
    employeeId: req.user?.employeeId || null,  
    unitId: req.user?.unitId || null,  
    ipAddress: req.ip,  
    userAgent: req.headers\["user-agent"\] || "",  
    deviceId: req.headers\["x-device-id"\] || null,  
  };  
  requestContext.run(ctx, done);  
});

# **Aprovação Dual**

Aprovação dual (four-eyes principle) exige que ações críticas sejam solicitadas por um funcionário e aprovadas por outro com role superior. Isso previne fraude, erros, e garante que decisões de alto impacto tenham supervisão.

## **Ações que Requerem Aprovação**

| Ação | Quem Solicita | Quem Aprova | Threshold | Timeout |
| :---- | :---- | :---- | :---- | :---- |
| CANCEL\_ORDER | WAITER, BARTENDER | MANAGER, OWNER | Qualquer cancelamento após PREPARING | 30 min |
| CANCEL\_CHECK | WAITER, CASHIER | MANAGER, OWNER | Qualquer cancelamento de conta | 30 min |
| REFUND\_PAYMENT | CASHIER, MANAGER | OWNER | Qualquer estorno | 60 min |
| LARGE\_DISCOUNT | WAITER, MANAGER | MANAGER, OWNER | Desconto \> 20% do total | 30 min |
| LARGE\_WITHDRAWAL | CASHIER | MANAGER, OWNER | Sangria \> R$200 | 30 min |
| STOCK\_ADJUSTMENT | MANAGER | OWNER | Ajuste \> 10% do saldo | 60 min |
| VOID\_FISCAL\_NOTE | MANAGER | OWNER | Qualquer cancelamento de NFC-e | 60 min |
| DELETE\_EMPLOYEE | MANAGER | OWNER | Qualquer desativação | 24h |
| PRICE\_OVERRIDE | MANAGER | OWNER | Alteração de preço manual | 60 min |
| REOPEN\_DAILY\_REPORT | MANAGER | OWNER | Reabrir dia já fechado | 60 min |

## **Pipeline de Aprovação**

  Funcionario quer cancelar pedido  
              |  
  POST /approvals/request  
  { action: CANCEL\_ORDER, entityId: order.id, reason: "..." }  
              |  
  Validar: acao requer aprovacao?  
     /              \\  
   SIM               NAO (threshold nao atingido)  
    |                 |  
  Criar              Executar acao direto  
  ApprovalRequest    (sem pipeline)  
  status=PENDING  
    |  
  Notificar aprovadores via WebSocket  
  (MANAGER e OWNER online na unidade)  
    |  
  Aprovador ve notificacao no web-owner  
  ou web-waiter  
    |  
  POST /approvals/:id/resolve  
  { status: APPROVED }  
    |  
  Executar acao original  
  (cancelar o pedido)  
    |  
  Gravar AuditLog CRITICAL  
  com requestedBy \+ resolvedBy

## **Regras de Negócio**

R1. Solicitante e aprovador devem ser pessoas diferentes. Auto-aprovação é proibida.

R2. Aprovador deve ter role superior ou igual ao mínimo requerido pela ação.

R3. Timeout: se não resolvida no prazo, ApprovalRequest.status → EXPIRED. A ação não é executada.

R4. Solicitante pode cancelar a solicitação antes da resolução (status → CANCELLED).

R5. Rejeição: aprovador deve informar motivo (resolvedReason obrigatório para REJECTED).

R6. Aprovação é irrevogável: após APPROVED, a ação é executada e não pode ser desfeita pelo pipeline (apenas por nova ação).

R7. OWNER pode executar ações críticas sem pipeline de aprovação (ele é a autoridade máxima). A ação é auditada com nota "owner\_override".

# **Controle de Dispositivos**

Cada dispositivo que acessa o OASYS (celular do garçom, tablet da cozinha, PC do caixa) é identificado por fingerprint e deve ser autorizado. Isso previne acesso não autorizado — se o PIN de um funcionário vazar, o atacante ainda precisa de um dispositivo autorizado.

## **Fingerprint**

O fingerprint é um hash SHA-256 de atributos do navegador que geram uma identificação única (mas não perfeita) do dispositivo.

// apps/web-waiter/src/lib/device-fingerprint.ts (executado no cliente)  
async function generateFingerprint(): Promise\<string\> {  
  const components \= \[  
    navigator.userAgent,  
    screen.width \+ "x" \+ screen.height,  
    Intl.DateTimeFormat().resolvedOptions().timeZone,  
    navigator.language,  
    navigator.hardwareConcurrency,  
  \];  
  const raw \= components.join("|");  
  const buffer \= await crypto.subtle.digest("SHA-256",  
    new TextEncoder().encode(raw)  
  );  
  return Array.from(new Uint8Array(buffer))  
    .map(b \=\> b.toString(16).padStart(2, "0")).join("");  
}

// Enviado no header de cada request  
// X-Device-Fingerprint: a1b2c3d4...

## **Fluxo de Autorização**

  Funcionario tenta login (PIN \+ fingerprint)  
              |  
  Buscar AuthorizedDevice por (unitId, fingerprint)  
     /              \\  
  ENCONTRADO         NAO ENCONTRADO  
    |                     |  
  isBlocked?          Criar AuthorizedDevice  
   /       \\          isApproved \= false  
  SIM      NAO           |  
   |        |        Notificar gerentes:  
  403:     Login     "Novo dispositivo detectado"  
  "Disp.  normal        |  
  bloq."    |        Login permitido com  
           Atualizar  flag: pendingApproval=true  
           lastUsed     |  
           lastEmployee Funcionalidade limitada:  
                      so leitura ate aprovacao  
                         |  
                      Gerente aprova no web-owner:  
                      POST /devices/:id/approve  
                         |  
                      Acesso completo liberado  
R1. Primeiro login de dispositivo novo: permitido com funcionalidade limitada (somente leitura). Gerente deve aprovar para acesso completo.

R2. Dispositivo bloqueado: acesso completamente negado. JWT não é emitido.

R3. Gerente pode bloquear qualquer dispositivo remotamente (ex: celular roubado).

R4. Dispositivo sem uso por 90 dias é automaticamente desautorizado. Próximo login requer re-aprovação.

R5. Modo configurável: dono pode desabilitar controle de dispositivos (deviceControlEnabled \= false no Unit) para simplificar operação.

# **Health Check de Integrações**

## **GET /health**

Endpoint público (sem auth) que retorna o status de todas as dependências externas. Usado por monitoring (UptimeRobot, Datadog) e pelo dashboard do dono.

// GET /health  
// Response (200 se tudo OK, 503 se algum CRITICAL)  
{  
  "status": "degraded",  // "healthy" | "degraded" | "unhealthy"  
  "timestamp": "2026-03-02T22:15:00Z",  
  "version": "1.0.0",  
  "uptime": 345600,  // segundos  
  "checks": {  
    "database": {  
      "status": "healthy",  
      "responseTime": 12,  // ms  
      "details": "PostgreSQL 15.4 \- pool: 8/20 connections"  
    },  
    "redis": {  
      "status": "healthy",  
      "responseTime": 3,  
      "details": "Redis 7.2 \- memory: 45MB/256MB"  
    },  
    "pagarme": {  
      "status": "degraded",  
      "responseTime": 2100,  
      "details": "Response time above threshold (\>2000ms)"  
    },  
    "focusnfe": {  
      "status": "healthy",  
      "responseTime": 340,  
      "details": "FocusNFe v2 \- homologacao"  
    },  
    "whatsapp": {  
      "status": "healthy",  
      "responseTime": 180,  
      "details": "Graph API v18.0"  
    }  
  }  
}

## **Checks Individuais**

| Serviço | Como Verifica | Healthy | Degraded | Unhealthy |
| :---- | :---- | :---- | :---- | :---- |
| PostgreSQL | SELECT 1 \+ pool stats | \< 100ms, pool \< 80% | \> 500ms ou pool \> 80% | Timeout ou conexão recusada |
| Redis | PING \+ INFO memory | \< 50ms, mem \< 80% | \> 200ms ou mem \> 80% | Timeout ou conexão recusada |
| Pagar.me | GET /core/v5/tokens (test key) | \< 1000ms, 200 OK | \> 2000ms | Timeout ou 5xx |
| FocusNFe | GET /v2/nfce (health) | \< 500ms, 200 OK | \> 1000ms | Timeout ou 5xx |
| WhatsApp | GET /v18.0/me (Graph API) | \< 500ms, 200 OK | \> 1000ms | Timeout ou 4xx/5xx |

## **Alertas Automáticos**

Um job a cada 5 minutos executa o health check. Se qualquer serviço transicionar para degraded ou unhealthy:

• Criar Alert no banco (model existente) com severity baseada no status.

• Se unhealthy por mais de 5 minutos: notificar OWNER via WhatsApp (PRD-09) ou email.

• Dashboard do dono mostra indicador visual (verde/amarelo/vermelho) em tempo real.

# **UI Multi-Unidade**

O schema do OASYS já suporta multi-tenant via Organization → Unit\[\]. O que falta é a UI no web-owner para o dono navegar entre unidades e ver dados consolidados.

## **Context Switcher**

┌───────────────────────────────────────────┐  
│  OASYS      \[v Boteco do Ze \- Pinheiros\]   │  
│             ┌────────────────────────┐   │  
│             │  Todas as Unidades      │   │  
│             │  ──────────────────── │   │  
│             │  \* Pinheiros           │   │  
│             │    Vila Madalena       │   │  
│             │    Itaim               │   │  
│             └────────────────────────┘   │  
└───────────────────────────────────────────┘

## **Comportamento por Visão**

| Visão | Escopo de Dados | Funcionalidades |
| :---- | :---- | :---- |
| Unidade Específica | Filtra tudo por unitId selecionado | Mesma experiência atual. Dashboard, pedidos, estoque, equipe — tudo daquela unidade. |
| Todas as Unidades (Consolidado) | Agrega dados de todas as Units da Organization | KPIs somados/média. Ranking de unidades (PRD-10). Alertas de todas. Não permite operações individuais (só leitura). |

## **Implementação**

// apps/web-owner/src/stores/unit-context.store.ts

interface UnitContextStore {  
  organizationId: string;  
  units: Unit\[\];           // Todas as unidades da Organization  
  selectedUnitId: string | "ALL";  // "ALL" \= visao consolidada  
  selectedUnit: Unit | null;

  switchUnit: (unitId: string | "ALL") \=\> void;  
  loadUnits: () \=\> Promise\<void\>;  
}

// Hook para injetar unitId em toda API call  
function useApiContext() {  
  const { selectedUnitId } \= useUnitContext();  
  return {  
    unitId: selectedUnitId \=== "ALL" ? undefined : selectedUnitId,  
    isConsolidated: selectedUnitId \=== "ALL",  
  };  
}  
R1. JWT do OWNER contém organizationId. API valida que o unitId solicitado pertence à Organization.

R2. Visão "Todas" não permite operações de escrita. Apenas dashboards, ranking e alertas consolidados.

R3. A troca de unidade não requer re-login. O JWT é válido para toda a Organization.

R4. MANAGER só vê a unidade onde está alocado. Context switcher é exclusivo do OWNER.

# **Backup e Recuperação**

## **Estratégia de Backup**

| Tipo | Frequência | Retenção | Método |
| :---- | :---- | :---- | :---- |
| Full backup | Diário às 05:00 (baixo tráfego) | 30 dias | pg\_dump \--format=custom comprimido |
| WAL archiving | Contínuo | 7 dias | PostgreSQL WAL com archive\_command |
| Schema only | Cada migration | Indefinido (versionado) | prisma migrate diff salvo no repo |
| Uploads/assets | Diário | 30 dias | S3 sync (se houver uploads) |

## **pg\_dump Automatizado**

\#\!/bin/bash  
\# /scripts/backup.sh  
\# Executado via cron: 0 5 \* \* \* /scripts/backup.sh

DATE=$(date \+%Y%m%d\_%H%M%S)  
BACKUP\_DIR="/backups/postgresql"  
RETENTION\_DAYS=30

\# Full backup comprimido  
pg\_dump \\  
  \--host=$DATABASE\_HOST \\  
  \--port=$DATABASE\_PORT \\  
  \--username=$DATABASE\_USER \\  
  \--dbname=$DATABASE\_NAME \\  
  \--format=custom \\  
  \--compress=9 \\  
  \--file="$BACKUP\_DIR/oasys\_$DATE.dump"

\# Verificar integridade  
pg\_restore \--list "$BACKUP\_DIR/oasys\_$DATE.dump" \> /dev/null 2\>&1  
if \[ $? \-ne 0 \]; then  
  echo "BACKUP FAILED: integrity check" | notify\_owner  
  exit 1  
fi

\# Upload para storage remoto (S3/GCS)  
aws s3 cp "$BACKUP\_DIR/oasys\_$DATE.dump" \\  
  "s3://oasys-backups/postgresql/oasys\_$DATE.dump"

\# Limpar backups antigos  
find $BACKUP\_DIR \-name "\*.dump" \-mtime \+$RETENTION\_DAYS \-delete

echo "Backup completed: oasys\_$DATE.dump"

## **Procedimento de Recovery**

| Cenário | Procedimento | RTO | RPO |
| :---- | :---- | :---- | :---- |
| Correção de dado específico | Restaurar backup em banco temporário, extrair dado, aplicar no produção | 30 min | 0 (dado pontual) |
| Queda do banco de dados | Restaurar último full backup \+ WAL replay | 1h | \< 5 min (WAL) |
| Disaster recovery completo | Provisionar nova infra \+ restaurar backup \+ reconfigurar env vars \+ DNS | 4h | \< 24h (full backup) |
| Rollback de migration | prisma migrate resolve \+ restaurar backup pré-migration | 1h | 0 (versionado) |

RTO \= Recovery Time Objective (tempo máximo de downtime aceitável). RPO \= Recovery Point Objective (perda máxima de dados aceitável). Metas baseadas em SaaS para PMEs — não é sistema bancário.

# **Especificação de API — Endpoints**

## **Auditoria**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /audit-logs | MANAGER, OWNER | Buscar logs com filtros: employeeId, action, entityType, entityId, severity, dateRange |
| GET | /audit-logs/:id | MANAGER, OWNER | Detalhe de um log (inclui before/after) |
| GET | /audit-logs/stats | OWNER | Estatísticas: ações por tipo, severity, funcionário. Período configurável. |
| GET | /audit-logs/export | OWNER | Exportar logs em CSV/JSON para período (compliance) |

## **Aprovações**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /approvals/request | WAITER, CASHIER, MANAGER | Solicitar aprovação para ação crítica |
| GET | /approvals/pending | MANAGER, OWNER | Listar solicitações pendentes da unidade |
| POST | /approvals/:id/resolve | MANAGER, OWNER | Aprovar ou rejeitar solicitação |
| POST | /approvals/:id/cancel | WAITER, CASHIER, MANAGER | Cancelar própria solicitação |
| GET | /approvals/history | MANAGER, OWNER | Histórico de aprovações (filtros) |

## **Dispositivos**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /devices | MANAGER, OWNER | Listar dispositivos da unidade (aprovados, pendentes, bloqueados) |
| POST | /devices/:id/approve | MANAGER, OWNER | Aprovar dispositivo pendente |
| POST | /devices/:id/block | MANAGER, OWNER | Bloquear dispositivo (revogação) |
| POST | /devices/:id/unblock | OWNER | Desbloquear dispositivo |
| DELETE | /devices/:id | OWNER | Remover dispositivo (próximo login é como novo) |

## **Health e Multi-Unidade**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /health | PÚBLICO | Health check de todas as integrações |
| GET | /units | OWNER | Listar unidades da Organization do OWNER |

# **Estrutura de Arquivos**

packages/database/src/  
├── audit-middleware.ts           \# Prisma middleware de auditoria automatica  
└── sanitize.ts                   \# Funcao de sanitizacao de dados sensiveis

apps/api/src/lib/  
├── request-context.ts            \# AsyncLocalStorage para contexto de request  
└── device-fingerprint.ts         \# Validacao de fingerprint no servidor

apps/api/src/modules/audit/  
├── audit.routes.ts               \# Rotas de consulta de logs  
├── audit.service.ts              \# Busca, filtros, exportacao  
├── audit.schemas.ts              \# Schemas Zod  
└── \_\_tests\_\_/  
    └── audit.test.ts

apps/api/src/modules/approvals/  
├── approvals.routes.ts  
├── approvals.service.ts          \# Pipeline: request, resolve, expire  
├── approvals.schemas.ts  
├── approval-executor.ts          \# Executa a acao apos aprovacao  
└── \_\_tests\_\_/  
    └── approvals.test.ts

apps/api/src/modules/devices/  
├── devices.routes.ts  
├── devices.service.ts            \# CRUD, approve, block, cleanup  
├── devices.schemas.ts  
└── \_\_tests\_\_/  
    └── devices.test.ts

apps/api/src/modules/health/  
├── health.routes.ts              \# GET /health  
├── health.service.ts             \# Checks individuais \+ scheduler  
└── health.types.ts

apps/web-owner/src/  
├── pages/  
│   ├── AuditLogViewer.tsx        \# Busca e visualizacao de logs  
│   ├── ApprovalQueue.tsx         \# Fila de aprovacoes pendentes  
│   ├── DeviceManager.tsx         \# Lista e gestao de dispositivos  
│   └── SystemHealth.tsx          \# Dashboard de saude das integracoes  
├── components/  
│   ├── AuditLogTable.tsx         \# Tabela paginada de logs  
│   ├── AuditLogDetail.tsx        \# Modal com before/after diff  
│   ├── ApprovalCard.tsx          \# Card de solicitacao com approve/reject  
│   ├── DeviceCard.tsx            \# Card de dispositivo com acoes  
│   ├── HealthIndicator.tsx       \# Indicador verde/amarelo/vermelho  
│   └── UnitSwitcher.tsx          \# Dropdown de troca de unidade  
└── stores/  
    ├── audit.store.ts  
    ├── approvals.store.ts  
    └── unit-context.store.ts     \# Context switcher multi-unidade

scripts/  
├── backup.sh                     \# Script de backup diario  
└── restore.sh                    \# Script de restauracao

# **Estratégia de Testes**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Middleware — create Order gera log | Unit | AuditLog criado com action=Order.create, severity=INFO, after snapshot |
| Middleware — update Payment gera log com before/after | Unit | before=estado anterior, after=estado novo, campos sensíveis redacted |
| Middleware — findMany não gera log | Unit | Queries de leitura não auditadas (só escrita) |
| Middleware — falha não derruba operação | Unit | Se AuditLog.create falhar, operação original funciona normalmente |
| Sanitize — campos sensíveis removidos | Unit | pin, phone, cpf, xml aparecem como \[REDACTED\] |
| Aprovação — solicitar e aprovar | Unit | ApprovalRequest PENDING → APPROVED, ação executada |
| Aprovação — rejeitar com motivo | Unit | ApprovalRequest PENDING → REJECTED, resolvedReason preenchido |
| Aprovação — auto-aprovação proibida | Unit | Retorna 403 se requestedBy \= resolvedBy |
| Aprovação — timeout expira | Unit | PENDING → EXPIRED após timeout |
| Aprovação — OWNER bypass | Unit | OWNER executa ação sem pipeline, auditado como owner\_override |
| Aprovação — role insuficiente | Unit | WAITER tenta aprovar → 403 |
| Dispositivo — novo detectado | Unit | AuthorizedDevice criado com isApproved=false |
| Dispositivo — aprovar libera acesso | Unit | isApproved=true após POST /approve |
| Dispositivo — bloqueado nega login | Unit | Login retorna 403 com dispositivo bloqueado |
| Dispositivo — inatividade 90 dias | Unit | isApproved reset para false após 90 dias sem uso |
| Health — tudo healthy | Integration | Status 200, status=healthy |
| Health — DB down | Integration (mock) | Status 503, database=unhealthy |
| Health — Pagar.me degraded | Integration (mock) | Status 200, status=degraded, pagarme.responseTime \> threshold |
| Multi-unit — OWNER vê todas | Unit | GET /units retorna todas as units da Organization |
| Multi-unit — MANAGER só vê sua | Unit | GET /units retorna apenas a unit do MANAGER |
| Audit export — CSV | Unit | Exportação gera CSV válido com filtros aplicados |

# **Impacto Downstream e Riscos**

## **Dependências de Entrada**

| PRD | O que fornece para PRD-13 |
| :---- | :---- |
| PRD-01 | AuditLog model existente. authorizedBy em Cancellation. Employee com roles. |
| PRD-02 | Payment e CashRegister: operações auditadas. Webhook \= ponto de ataque (validação). |
| PRD-07 | DailyReport: reabertura é ação crítica que requer aprovação. |

## **Módulos que se Beneficiam de PRD-13**

| PRD | Como se Beneficia |
| :---- | :---- |
| PRD-02 | Pagamentos: estorno requer aprovação dual. Sangria grande requer aprovação. |
| PRD-06 | Fiscal: cancelamento de NFC-e requer aprovação. XML auditado. |
| PRD-08 | Estoque: ajuste manual requer aprovação se \> 10%. Movimentações auditadas. |
| PRD-10 | Dashboard: health check alimenta status de integrações. Audit stats para compliance. |
| PRD-12 | Pessoas: desativação de funcionário requer aprovação. ShiftLog auditado. |
| Todos | Auditoria automática cobre todas as operações sensíveis de todos os módulos. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Middleware de auditoria causa lentidão | Média | Médio | setImmediate para escrita async. Auditoria NUNCA bloqueia operação principal. Batch insert se volume alto. |
| Volume de logs cresce rápido | Alta | Baixo | Retenção de 90 dias para INFO. 1 ano para WARNING/CRITICAL. Partição por mês. |
| Aprovação dual atrasa operação | Média | Médio | Notificação instantânea via WebSocket. Timeout curto (30 min). OWNER bypass. |
| Fingerprint muda com update do browser | Alta | Baixo | Fingerprint é best-effort. Se mudar, dispositivo aparece como novo. Gerência re-aprova. |
| Backup falha silenciosamente | Baixa | Crítico | Alerta automático se backup não executou. Verificação de integridade (pg\_restore \--list). Monitoramento. |
| Multi-unit mistura dados de unidades | Baixa | Crítico | Isolamento por unitId em TODAS as queries (já existe). Testes de isolamento. Middleware valida unitId. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| Prisma middleware (não event sourcing) | Event sourcing completo | Event sourcing é arquitetura inteira. Middleware é aditive e não requer refactor. Custo-benefício. |
| AuditLog no mesmo banco | Banco de logs separado | Simplicidade. Volume de um bar não justifica infra separada. Partição resolve. |
| AsyncLocalStorage (não CLS-hooked) | cls-hooked package | AsyncLocalStorage é nativo do Node.js 16+. Sem dependência extra. Estável. |
| Fingerprint no cliente (não server) | Server-side device detection | Server não tem acesso a screen/timezone. Fingerprint do cliente é mais rico. Hash no server. |
| pg\_dump (não snapshot de cloud) | Cloud provider snapshots | pg\_dump é portável. Funciona em qualquer PostgreSQL. Não depende de provider específico. |
| OWNER bypass (não dual para todos) | Dual obrigatório sempre | OWNER é autoridade máxima e responsável legal. Obrigar dual para OWNER é punitívo sem ganho real. |

# **Sequência de Implementação (2 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Schema: migration com ApprovalRequest \+ AuthorizedDevice \+ expansão AuditLog. Backend: Prisma audit middleware (100% cobertura automática), AsyncLocalStorage \+ request context hook, ApprovalService (pipeline completo), HealthService (checks de todas as integrações). Frontend web-owner: AuditLogViewer, ApprovalQueue, SystemHealth. | Auditoria automática 100%. Aprovação dual funcional. Health check operacional. Dashboard de auditoria e saúde. |
| Sprint 2 | Backend: DeviceService (fingerprint \+ aprovação \+ bloqueio \+ cleanup), Multi-unit context no JWT \+ API. Frontend: DeviceManager, UnitSwitcher, AuditLogDetail (before/after diff), audit export CSV. Scripts: backup.sh \+ restore.sh \+ cron. Testes completos \+ documentação de DR. | Controle de dispositivos funcional. UI multi-unidade com context switcher. Backup automatizado com política de retenção. Documentação de disaster recovery. |

OASYS PRD-13 — Auditoria & Segurança  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*