

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-08 — Estoque Básico**  
Itens, movimentações, baixa automática por venda, alertas de mínimo, ficha técnica

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 1 — Go-Live |
| **Sprints Estimados** | 2 sprints |
| **Complexidade** | Média |
| **Cobertura Atual** | 0% |
| **Dependências** | PRD-01 (Schema Foundation) |
| **Gap Modules** | M6 — Estoque / Compras |
| **Apps Afetadas** | apps/api \+ apps/web-owner |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-08 (Estoque Básico) implementa o controle de insumos que permite ao dono saber exatamente o que tem, o que está acabando, e quanto custa cada produto vendido. CMV (Custo de Mercadoria Vendida) é o KPI central para rentabilidade em Food & Beverage — sem estoque, é impossível calculá-lo.

A cobertura atual é 0% — nenhum código de estoque existe. O schema (PRD-01) já contém os models StockItem, StockMovement e ProductIngredient com todos os campos necessários. Este PRD constrói a lógica de negócio, endpoints de API, e interface no web-owner.

Este é o estoque BÁSICO de Phase 1\. Features avançadas como lotes com validade, cotação de fornecedores, compras automatizadas, e transferências entre depósitos ficam para Phase 2 (PRD-10 Dashboard BI inclui CMV teórico vs. real).

Este PRD cobre cinco subsistemas:

**1\. Cadastro de Insumos (StockItem) —** CRUD de itens de estoque com unidade de medida, quantidade, custo, mínimo. Cada insumo pertence a uma Unit (multi-tenant).

**2\. Ficha Técnica (ProductIngredient) —** Vínculo entre produto do cardápio e seus insumos, com quantidade consumida por unidade vendida. Essencial para baixa automática e cálculo de CMV.

**3\. Baixa Automática por Venda —** Quando um pedido é confirmado (Order.status \= PREPARING), o sistema decrementa automaticamente o estoque dos insumos conforme a ficha técnica. Se estoque chegar a zero, produto fica indisponível.

**4\. Movimentações Manuais —** Entrada (compra/recebimento), ajuste (inventário físico), perda (quebra/vencimento). Cada movimentação registra tipo, quantidade, motivo e responsável.

**5\. Alertas e Disponibilidade —** Alerta quando insumo cai abaixo do mínimo. Produto automaticamente indisponível quando qualquer ingrediente tem estoque zero. Notificação para o dono.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Endpoints API | 14 | CRUD StockItem, CRUD ProductIngredient, movimentações, alertas, dashboard estoque |
| Endpoints Modificados | 1 | Order creation (PRD-04/05) dispara baixa automática |
| Event Listeners | 2 | order.preparing → deduct stock, stock.below\_minimum → alert |
| Serviços Novos | 2 | StockService (movimentações) \+ AvailabilityService (disponibilidade) |
| Jobs/Workers | 1 | Reconciliação de estoque diária (opcional, no fechamento) |
| Componentes React (web-owner) | \~12 | Lista insumos, ficha técnica, movimentações, alertas, dashboard |

## **Critério de Sucesso (Done Definition)**

O PRD-08 está concluído quando TODOS os seguintes critérios são atendidos:

1\. CRUD de StockItem funcional: criar, listar, editar, desativar insumos.

2\. Ficha técnica (ProductIngredient) funcional: vincular produtos a insumos com quantidades.

3\. Baixa automática funcional: venda de Chopp 300ml decrementa 0.350L de Chopp Pilsen automaticamente.

4\. Produto fica indisponível (Product.isAvailable \= false) quando qualquer ingrediente chega a zero.

5\. Entrada manual funcional: registrar recebimento de compra com quantidade e custo.

6\. Ajuste de inventário funcional: correção após contagem física com motivo obrigatório.

7\. Registro de perda funcional: quebra, vencimento, furto com motivo e responsável.

8\. Alerta criado quando insumo cai abaixo do mínimo (Alert.type \= STOCK\_LOW).

9\. Dashboard de estoque no web-owner: visão geral, alertas, movimentações recentes.

10\. Zero erros de tipo no monorepo.

# **Conceitos de Estoque para F\&B**

## **Terminologia**

| Conceito | Definição | Exemplo |
| :---- | :---- | :---- |
| Insumo (StockItem) | Matéria-prima ou produto final que é estocado e consumido | Chopp Pilsen (barril 50L), Limão Taiti, Heineken Long Neck |
| Ficha Técnica (ProductIngredient) | Receita: quanto de cada insumo é consumido por unidade vendida | Caipirinha: 60ml Cachaça \+ 2 Limões |
| Baixa Automática | Decremento de estoque quando item é vendido, usando a ficha técnica | Vendeu 1 Caipirinha → \-60ml Cachaça, \-2 Limões |
| CMV (Custo de Mercadoria Vendida) | Custo dos insumos consumidos para produzir o que foi vendido | Caipirinha custou R$1,40 (cachaça R$0,90 \+ limões R$1,00) — erro, exemplo correto abaixo |
| Margem | Preço de venda \- CMV. Quanto sobra por unidade vendida. | Caipirinha R$22,90 \- CMV R$1,90 \= Margem R$21,00 (91,7%) |
| Estoque Mínimo | Quantidade abaixo da qual o sistema alerta o dono | Chopp Pilsen: mínimo 20L. Se cair para 18L → alerta. |
| Desperdício (Waste) | Quantidade extra consumida além do volume servido | Chopp 300ml consome 350ml (50ml de colarinho/desperdício) |
| Unidade de Medida | Como o insumo é medido: UN, KG, L, ML, G, DOSE | Chopp em L, Limão em UN, Batata em KG |

## **Ciclo do Estoque em Bar**

┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐  
│   COMPRA  │ →→→ │  ESTOQUE  │ →→→ │   VENDA   │ →→→ │  RECEITA  │  
│ (entrada) │     │(quantidade)│     │ (baixa)   │     │ (dinheiro)│  
└───────────┘     └────┬──────┘     └───────────┘     └───────────┘  
                    │                                            
              ┌─────▼─────┐                                      
              │   PERDAS   │  (quebra, vencimento, furto)           
              └───────────┘                                      
              ┌───────────┐                                      
              │  AJUSTES   │  (contagem fisica \!= sistema)          
              └───────────┘                                      
              ┌───────────┐                                      
              │ CORTESIAS  │  (consumo, nao cobrado)                
              └───────────┘                                    

## **Por que o CMV é o KPI Central**

O CMV representa quanto o bar gasta em matéria-prima para cada real faturado. Na indústria de F\&B brasileira, o CMV ideal fica entre 25% e 35%. Acima de 35% indica problemas: desperdício excessivo, furto, preços de compra altos, ou ficha técnica desalinhada.

| CMV % | Diagnóstico | Ação |
| :---- | :---- | :---- |
| \< 25% | Excelente. Margens altas. | Manter. Verificar se preços estão competitivos. |
| 25-30% | Saudável. Padrão para bares. | Monitorar. Sem ação urgente. |
| 30-35% | Atenção. Margem apertada. | Revisar ficha técnica. Negociar com fornecedores. |
| 35-40% | Problema. Perdas prováveis. | Auditar estoque. Investigar desperdício/furto. |
| \> 40% | Crítico. Operação dá prejuízo. | Revisão urgente de preços, fichas e processos. |

Na Phase 1, o OASYS calcula o CMV teórico (baseado na ficha técnica: se vendeu X, deveria ter consumido Y). Na Phase 2 (PRD-10), inclui o CMV real (baseado no inventário físico: começou com A, comprou B, terminou com C, então consumiu A+B-C). A diferença entre teórico e real é o indicador de desperdício.

# **Arquitetura**

## **Fluxo de Baixa Automática**

┌───────────────┐  
│ Order criado   │  (KDS aceita, status \= PREPARING)  
│ com 2 items:   │  
│ 1x Caipirinha  │  
│ 1x Chopp 300ml │  
└─────┬─────────┘  
      │  
      ▼  
┌──────────────────────────────────────┐  
│ deductStockForOrder(orderId)          │  
│                                        │  
│ Para cada OrderItem:                   │  
│   Buscar ProductIngredients do Product  │  
│   Para cada ingrediente:               │  
│     quantidade \= ficha \* qty vendida    │  
└─────┬────────────────────────────────┘  
      │  
      ▼  
┌──────────────────────────────────────┐  
│ Caipirinha Limao:                      │  
│   Cachaca 51:  \-60 ML  (ficha: 60ml)   │  
│   Limao Taiti: \-2 UN   (ficha: 2 un)   │  
│                                        │  
│ Chopp Pilsen 300ml:                    │  
│   Chopp Pilsen: \-0.350 L (350ml+waste) │  
└─────┬────────────────────────────────┘  
      │  
      ▼  
┌──────────────────────────────────────┐  
│ Para cada StockItem decrementado:      │  
│                                        │  
│ 1\. Criar StockMovement (type: OUT)     │  
│ 2\. Atualizar StockItem.quantity         │  
│ 3\. Verificar: quantity \< minQuantity?   │  
│    Se sim \-\> criar Alert STOCK\_LOW      │  
│ 4\. Verificar: quantity \<= 0?            │  
│    Se sim \-\> Product.isAvailable \= false │  
└──────────────────────────────────────┘

## **Momento da Baixa: PREPARING (não RECEIVED)**

A baixa acontece quando o pedido entra em produção (PREPARING), não quando é criado (RECEIVED). Razão: um pedido pode ser cancelado antes de entrar em produção (RECEIVED → CANCELLED) sem consumir insumos. Se o pedido é cancelado APÓS entrar em produção (PREPARING → CANCELLED), os insumos já foram consumidos fisicamente — a baixa NÃO é revertida (registra-se como perda).

| Transição de Status | Ação de Estoque | Razão |
| :---- | :---- | :---- |
| RECEIVED → PREPARING | Baixa automática (OUT) | Insumos estão sendo consumidos fisicamente |
| RECEIVED → CANCELLED | Nenhuma | Nada foi produzido, estoque intacto |
| PREPARING → CANCELLED | NÃO reverte | Insumos já foram consumidos. Perda registrada separadamente se necessário. |
| RECEIVED → HELD | Nenhuma | Pedido retido, ainda não produzido |
| HELD → RECEIVED → PREPARING | Baixa na transição para PREPARING | Padrão normal |

# **Especificação de API — Endpoints**

Todos os endpoints requerem JWT e isolamento por unitId. Prefixo: /api/v1.

## **StockItem Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /stock/items | MANAGER, OWNER | Lista insumos com filtros (ativo, abaixo do mínimo, busca) |
| GET | /stock/items/:id | MANAGER, OWNER | Detalhe de um insumo com movimentações recentes |
| POST | /stock/items | MANAGER, OWNER | Criar novo insumo |
| PUT | /stock/items/:id | MANAGER, OWNER | Atualizar insumo (nome, mínimo, custo, ativo) |
| DELETE | /stock/items/:id | OWNER | Desativar insumo (soft delete: isActive \= false) |
| GET | /stock/items/:id/movements | MANAGER, OWNER | Histórico de movimentações do insumo (paginado) |

## **Movimentação Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /stock/movements/in | MANAGER, OWNER | Entrada de estoque (compra, recebimento) |
| POST | /stock/movements/adjustment | MANAGER, OWNER | Ajuste de inventário (contagem física) |
| POST | /stock/movements/loss | MANAGER, OWNER | Registrar perda (quebra, vencimento, furto) |
| GET | /stock/movements | MANAGER, OWNER | Lista movimentações com filtros (tipo, período, insumo) |

## **Ficha Técnica Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /stock/recipes/:productId | MANAGER, OWNER | Lista ingredientes de um produto |
| POST | /stock/recipes/:productId | MANAGER, OWNER | Adicionar ingrediente ao produto |
| PUT | /stock/recipes/:productId/:ingredientId | MANAGER, OWNER | Atualizar quantidade de ingrediente |
| DELETE | /stock/recipes/:productId/:ingredientId | MANAGER, OWNER | Remover ingrediente do produto |

## **Dashboard de Estoque Endpoints**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /stock/dashboard | MANAGER, OWNER | Visão geral: alertas, valor em estoque, movimentações do dia |
| GET | /stock/alerts | MANAGER, OWNER | Lista insumos abaixo do mínimo |

# **Detalhamento de Endpoints**

## **POST /stock/items — Criar Insumo**

### **Request Body**

const CreateStockItemSchema \= z.object({  
  name: z.string().min(2).max(100),  
  sku: z.string().max(50).optional(),  
  unitType: z.enum(\["UN", "KG", "L", "ML", "G", "DOSE"\]),  
  quantity: z.number().min(0).default(0),  
  minQuantity: z.number().min(0).optional(),  
  costPrice: z.number().min(0).optional(),  
});

// Exemplo:  
{  
  "name": "Chopp Pilsen (barril 50L)",  
  "sku": "CHOPP-PILS-50",  
  "unitType": "L",  
  "quantity": 100,  
  "minQuantity": 20,  
  "costPrice": 4.50  
}

### **Regras de Negócio**

R1. Nome único por Unit (não pode ter 2 "Chopp Pilsen" na mesma unidade). SKU único por Unit se informado (@@unique(\[unitId, sku\]) no schema).

R2. unitType define como a quantidade é medida. NÃO pode ser alterado após criação (mudaria todas as movimentações históricas).

R3. quantity inicial registra movimentação IN automática se \> 0 ("Estoque inicial").

R4. costPrice é o custo unitário ATUAL. Atualizado manualmente ou na entrada de compra. Histórico de custo fica nas movimentações.

## **POST /stock/movements/in — Entrada de Estoque**

### **Request Body**

const StockEntrySchema \= z.object({  
  stockItemId: z.string().cuid(),  
  quantity: z.number().positive(),  
  costPrice: z.number().min(0).optional(),  
  reason: z.string().max(500).optional(),  
  // reason ex: "Compra Distribuidora X \- NF 12345"  
});

// Exemplo:  
{  
  "stockItemId": "clx8stk...",  
  "quantity": 50,  
  "costPrice": 4.30,  
  "reason": "Compra Distribuidora Bebidas SP \- NF 45678"  
}

### **Lógica**

async function registerStockEntry(input: StockEntryInput, employeeId: string): Promise\<StockMovement\> {  
  return prisma.$transaction(async (tx) \=\> {

    // 1\. Criar movimento IN  
    const movement \= await tx.stockMovement.create({  
      data: {  
        stockItemId: input.stockItemId,  
        type: "IN",  
        quantity: input.quantity,  
        reason: input.reason,  
        employeeId,  
        costPrice: input.costPrice,  
      },  
    });

    // 2\. Incrementar quantidade  
    const updated \= await tx.stockItem.update({  
      where: { id: input.stockItemId },  
      data: {  
        quantity: { increment: input.quantity },  
        ...(input.costPrice ? { costPrice: input.costPrice } : {}),  
      },  
    });

    // 3\. Verificar se algum produto estava indisponivel e pode voltar  
    await checkAndRestoreAvailability(updated, tx);

    return movement;  
  });  
}

## **POST /stock/movements/adjustment — Ajuste de Inventário**

### **Request Body**

const StockAdjustmentSchema \= z.object({  
  stockItemId: z.string().cuid(),  
  actualQuantity: z.number().min(0),  
  // actualQuantity \= quantidade real encontrada na contagem fisica  
  reason: z.string().min(5).max(500),  
  // reason OBRIGATORIO para ajustes  
});

// Exemplo:  
{  
  "stockItemId": "clx8stk...",  
  "actualQuantity": 82.5,  
  "reason": "Contagem fisica semanal. Sistema mostrava 85L, encontramos 82.5L."  
}

### **Lógica**

async function registerAdjustment(input: AdjustmentInput, employeeId: string): Promise\<StockMovement\> {  
  return prisma.$transaction(async (tx) \=\> {  
    const item \= await tx.stockItem.findUnique({ where: { id: input.stockItemId } });

    const diff \= input.actualQuantity \- item.quantity.toNumber();  
    // diff positivo \= sobra (estranho mas possivel)  
    // diff negativo \= falta (esperado: desperdicios nao contabilizados)

    const movement \= await tx.stockMovement.create({  
      data: {  
        stockItemId: input.stockItemId,  
        type: "ADJUSTMENT",  
        quantity: Math.abs(diff),  // sempre positivo no registro  
        reason: \`${input.reason} | Diferenca: ${diff \> 0 ? "+" : ""}${diff.toFixed(3)}\`,  
        employeeId,  
      },  
    });

    // Atualizar para quantidade real  
    await tx.stockItem.update({  
      where: { id: input.stockItemId },  
      data: { quantity: input.actualQuantity },  
    });

    // Se diferenca significativa (\> 10%), criar alerta  
    const pctDiff \= Math.abs(diff) / item.quantity.toNumber();  
    if (pctDiff \> 0.10) {  
      await createAlert({  
        unitId: item.unitId,  
        type: "STOCK\_ADJUSTMENT\_LARGE",  
        severity: "HIGH",  
        message: \`Ajuste de ${(pctDiff \* 100).toFixed(1)}% no ${item.name}. \` \+  
          \`Sistema: ${item.quantity}, Real: ${input.actualQuantity}.\`,  
      });  
    }

    return movement;  
  });  
}

## **POST /stock/movements/loss — Registrar Perda**

const StockLossSchema \= z.object({  
  stockItemId: z.string().cuid(),  
  quantity: z.number().positive(),  
  reason: z.string().min(5).max(500),  
  // Motivo obrigatorio: "Garrafa quebrou", "Vencimento", etc.  
});  
Mesma lógica de saída: cria StockMovement type=LOSS, decrementa StockItem.quantity, verifica mínimo e disponibilidade. Perdas acima de R$100 (quantity \* costPrice) geram Alert HIGH.

# **Baixa Automática por Venda**

Função central do módulo de estoque. Chamada quando Order.status transiciona para PREPARING. Deve ser resiliente: falha na baixa NÃO bloqueia a produção.

## **deductStockForOrder()**

async function deductStockForOrder(  
  orderId: string,  
  prisma: PrismaClient  
): Promise\<DeductionResult\> {

  const order \= await prisma.order.findUnique({  
    where: { id: orderId },  
    include: {  
      items: {  
        include: {  
          product: {  
            include: { ingredients: { include: { stockItem: true } } }  
          }  
        }  
      },  
      check: { include: { unit: true } }  
    },  
  });

  const deductions: StockDeduction\[\] \= \[\];  
  const alerts: StockAlert\[\] \= \[\];  
  const unavailableProducts: string\[\] \= \[\];

  await prisma.$transaction(async (tx) \=\> {

    for (const item of order.items) {  
      const ingredients \= item.product.ingredients;

      if (ingredients.length \=== 0\) {  
        // Produto sem ficha tecnica: skip (nao rastreado)  
        continue;  
      }

      for (const ingredient of ingredients) {  
        const deductQty \= ingredient.quantity.toNumber() \* item.quantity;

        // 1\. Criar movimentacao OUT  
        await tx.stockMovement.create({  
          data: {  
            stockItemId: ingredient.stockItemId,  
            type: "OUT",  
            quantity: deductQty,  
            reference: \`order:${orderId}\`,  
            employeeId: null,  // automatico  
            costPrice: ingredient.stockItem.costPrice,  
          },  
        });

        // 2\. Decrementar estoque  
        const updated \= await tx.stockItem.update({  
          where: { id: ingredient.stockItemId },  
          data: { quantity: { decrement: deductQty } },  
        });

        deductions.push({  
          stockItemId: ingredient.stockItemId,  
          name: ingredient.stockItem.name,  
          deducted: deductQty,  
          remaining: updated.quantity.toNumber(),  
        });

        // 3\. Verificar minimo  
        const min \= ingredient.stockItem.minQuantity?.toNumber() || 0;  
        if (updated.quantity.toNumber() \< min && updated.quantity.toNumber() \> 0\) {  
          alerts.push({  
            type: "STOCK\_LOW",  
            stockItemName: ingredient.stockItem.name,  
            current: updated.quantity.toNumber(),  
            minimum: min,  
          });  
        }

        // 4\. Verificar esgotado  
        if (updated.quantity.toNumber() \<= 0\) {  
          unavailableProducts.push(item.product.id);  
        }  
      }  
    }

    // 5\. Marcar produtos indisponiveis  
    if (unavailableProducts.length \> 0\) {  
      await tx.product.updateMany({  
        where: { id: { in: unavailableProducts } },  
        data: { isAvailable: false },  
      });  
    }  
  });

  // 6\. Criar alertas (fora da transacao)  
  for (const alert of alerts) {  
    await createAlert({  
      unitId: order.check.unitId,  
      type: "STOCK\_LOW",  
      severity: "MEDIUM",  
      message: \`${alert.stockItemName} abaixo do minimo: \` \+  
        \`${alert.current.toFixed(3)} (min: ${alert.minimum.toFixed(3)}).\`,  
    });  
  }

  return { deductions, alerts, unavailableProducts };  
}

# **Disponibilidade de Produtos**

A disponibilidade de um produto no cardápio depende de dois fatores: (a) flag manual Product.isAvailable e (b) estoque dos ingredientes. Se QUALQUER ingrediente está em zero, o produto fica automaticamente indisponível.

## **checkAndRestoreAvailability()**

Chamada quando estoque é incrementado (entrada, ajuste positivo). Verifica se algum produto que estava indisponível pode voltar a ficar disponível.

async function checkAndRestoreAvailability(  
  stockItem: StockItem,  
  tx: PrismaTransactionClient  
): Promise\<void\> {

  if (stockItem.quantity.toNumber() \<= 0\) return;

  // Buscar todos os produtos que usam este insumo  
  const ingredients \= await tx.productIngredient.findMany({  
    where: { stockItemId: stockItem.id },  
    include: {  
      product: {  
        include: { ingredients: { include: { stockItem: true } } }  
      },  
    },  
  });

  for (const ing of ingredients) {  
    const product \= ing.product;

    // Verificar se TODOS os ingredientes tem estoque \> 0  
    const allInStock \= product.ingredients.every(pi \=\> {  
      if (pi.stockItemId \=== stockItem.id) {  
        return stockItem.quantity.toNumber() \> 0;  
      }  
      return pi.stockItem.quantity.toNumber() \> 0;  
    });

    // Se sim e produto esta indisponivel, restaurar  
    if (allInStock && \!product.isAvailable) {  
      await tx.product.update({  
        where: { id: product.id },  
        data: { isAvailable: true },  
      });  
    }  
  }  
}

## **Regras de Disponibilidade**

| Situação | Product.isAvailable | Visível no Cardápio? | Quem controla |
| :---- | :---- | :---- | :---- |
| Todos os ingredientes com estoque \> 0 | true | Sim | Automático (baixa/entrada) |
| Qualquer ingrediente com estoque \= 0 | false | Não (marcado esgotado) | Automático (baixa) |
| Dono desativou manualmente | false | Não | Manual (dono no web-owner) |
| Estoque reabastecido | true (restaurado) | Sim (volta automático) | Automático (entrada) |
| Produto sem ficha técnica | Sempre true (manual) | Sim | Somente manual |
| Produto com estoque negativo (erro) | false | Não | Automático \+ Alert para correção |

IMPORTANTE: Produto sem ficha técnica (zero ProductIngredients) não tem controle automático de estoque. O dono controla manualmente. Isso permite adicionar produtos ao cardápio sem configurar estoque imediatamente.

# **Ficha Técnica (ProductIngredient)**

A ficha técnica vincula um produto do cardápio aos seus insumos. Define a quantidade de cada insumo consumida por unidade vendida. É a base para baixa automática e cálculo de CMV.

## **Exemplos de Ficha Técnica**

| Produto | Insumo | Qtd/Venda | Unidade | Lógica de Desperdício |
| :---- | :---- | :---- | :---- | :---- |
| Chopp Pilsen 300ml | Chopp Pilsen | 0.350 | L | 300ml servidos \+ 50ml desperdício (colarinho, lavagem) |
| Chopp Pilsen 500ml | Chopp Pilsen | 0.570 | L | 500ml \+ 70ml desperdício |
| Caipirinha Limão | Cachaça 51 | 60 | ML | Dose padrão |
| Caipirinha Limão | Limão Taiti | 2 | UN | 2 limões cortados por drink |
| Gin Tônica | Gin Gordon's | 60 | ML | Dose padrão |
| Gin Tônica | Tônica Schweppes | 1 | UN | 1 garrafa 350ml por drink |
| Porção de Fritas | Batata Congelada | 0.400 | KG | 400g por porção |
| Bolinho Bacalhau 6un | Bacalhau Desfiado | 0.200 | KG | 200g de bacalhau por 6 bolinhos |
| Heineken Long Neck | Heineken Long Neck | 1 | UN | 1:1 direto (produto \= insumo) |
| Agua Mineral 500ml | Agua Mineral 500ml | 1 | UN | 1:1 direto |
| Suco Natural Laranja | Suco Laranja | 0.350 | L | 350ml por copo |

## **POST /stock/recipes/:productId**

const AddIngredientSchema \= z.object({  
  stockItemId: z.string().cuid(),  
  quantity: z.number().positive(),  
  // quantity \= quanto deste insumo e consumido por unidade vendida  
  // na unidade do StockItem (L, ML, KG, UN, etc)  
});

// Exemplo: adicionar Cachaca na Caipirinha  
{  
  "stockItemId": "clx8cachaca...",  
  "quantity": 60  // 60 ML por drink  
}  
R1. Unique constraint: (productId, stockItemId). Não pode vincular o mesmo insumo duas vezes.

R2. Ao salvar, recalcular custo teórico do produto: SUM(ingredient.quantity \* stockItem.costPrice). Exibir no frontend como referência.

# **Dashboard de Estoque**

## **GET /stock/dashboard**

### **Response (200)**

{  
  "summary": {  
    "totalItems": 15,  
    "activeItems": 15,  
    "belowMinimum": 2,  
    "outOfStock": 0,  
    "totalStockValue": 8245.50,  
    // totalStockValue \= SUM(quantity \* costPrice) de todos os itens  
    "todayMovements": 47  
  },

  "alerts": \[  
    {  
      "stockItemId": "clx8...",  
      "name": "Chopp Pilsen",  
      "current": 18.5,  
      "minimum": 20,  
      "unitType": "L",  
      "estimatedRunout": "\~3h",  
      "severity": "MEDIUM"  
    },  
    {  
      "stockItemId": "clx8...",  
      "name": "Limao Taiti",  
      "current": 12,  
      "minimum": 20,  
      "unitType": "UN",  
      "estimatedRunout": "\~2h",  
      "severity": "HIGH"  
    }  
  \],

  "topConsumed": \[  
    { "name": "Chopp Pilsen", "consumed": 28.35, "unit": "L", "cost": 127.58 },  
    { "name": "Cachaca 51", "consumed": 1620, "unit": "ML", "cost": 24.30 },  
    { "name": "Limao Taiti", "consumed": 54, "unit": "UN", "cost": 27.00 },  
    { "name": "Batata Congelada", "consumed": 8.4, "unit": "KG", "cost": 100.80 },  
    { "name": "Heineken Long Neck", "consumed": 22, "unit": "UN", "cost": 121.00 }  
  \],

  "recentMovements": \[  
    {  
      "id": "clx9...",  
      "type": "OUT",  
      "stockItemName": "Chopp Pilsen",  
      "quantity": 0.350,  
      "reference": "order:clx7...",  
      "createdAt": "2026-03-02T22:15:00Z"  
    },  
    {  
      "id": "clx9...",  
      "type": "IN",  
      "stockItemName": "Heineken Long Neck",  
      "quantity": 48,  
      "reason": "Compra Distribuidora",  
      "employeeName": "Maria Oliveira",  
      "createdAt": "2026-03-02T16:30:00Z"  
    }  
  \],

  "cmv": {  
    "theoretical": 3847.20,  
    "netRevenue": 12744.80,  
    "cmvPercentage": 30.19  
  }  
}

## **Estimativa de Esgotamento (estimatedRunout)**

Calcula em quanto tempo o insumo vai acabar baseado no consumo médio das últimas 3 horas de operação. Fórmula: currentQuantity / (consumo médio por hora das últimas 3h). Exibido como "\~3h" no alerta. Se consumo \= 0 (horario sem vendas), não exibe estimativa.

# **UI — Web Owner (apps/web-owner)**

## **Tela: Lista de Insumos**

┌─────────────────────────────────────────────────┐  
│  Estoque              \[+ Novo Insumo\]    │  
├─────────────────────────────────────────────────┤  
│  \[Buscar...\]   \[Todos\] \[Baixo\] \[Esgotado\]│  
├─────────────────────────────────────────────────┤  
│                                                 │  
│  ⚠ Chopp Pilsen         18.5 / 20L    R$ 4,50/L │  
│    \[██████████████───\]  92%            \~3h   │  
│                                                 │  
│  ⚠ Limao Taiti          12 / 20 UN    R$ 0,50   │  
│    \[████████─────────\]  60%            \~2h   │  
│                                                 │  
│  ✓ IPA Artesanal        24.0 / 10L    R$ 8,00/L │  
│    \[█████████████████\] 100%           OK    │  
│                                                 │  
│  ✓ Heineken Long Neck   98 / 24 UN    R$ 5,50   │  
│    \[█████████████████\] 100%           OK    │  
│                                                 │  
│  ... (15 insumos)                               │  
└─────────────────────────────────────────────────┘

## **Componentes React**

| Componente | Arquivo | Status | Responsabilidade |
| :---- | :---- | :---- | :---- |
| StockDashboard | pages/StockDashboard.tsx | Novo | Visão geral: alertas, valor, top consumidos, CMV |
| StockItemList | pages/StockItemList.tsx | Novo | Lista com busca, filtros (baixo, esgotado), ordenação |
| StockItemDetail | pages/StockItemDetail.tsx | Novo | Detalhe do insumo com movimentações e gráfico de nível |
| StockItemForm | components/StockItemForm.tsx | Novo | Form de criação/edição de insumo |
| StockLevelBar | components/StockLevelBar.tsx | Novo | Barra visual de nível (verde/amarelo/vermelho) |
| StockAlertCard | components/StockAlertCard.tsx | Novo | Card de alerta com insumo, nível, estimativa |
| MovementHistory | components/MovementHistory.tsx | Novo | Timeline de movimentações com tipo e responsável |
| StockEntryModal | components/StockEntryModal.tsx | Novo | Modal: entrada de compra (quantidade \+ custo) |
| AdjustmentModal | components/AdjustmentModal.tsx | Novo | Modal: ajuste (quantidade real \+ motivo) |
| LossModal | components/LossModal.tsx | Novo | Modal: perda (quantidade \+ motivo) |
| RecipeEditor | components/RecipeEditor.tsx | Novo | Ficha técnica: lista de ingredientes com quantidades editáveis |
| CMVIndicator | components/CMVIndicator.tsx | Novo | Indicador visual de CMV % com cor por faixa |

# **Estrutura de Arquivos**

apps/api/src/modules/stock/  
├── stock.routes.ts               \# Registro de rotas  
├── stock.service.ts              \# CRUD StockItem, movimentacoes, dashboard  
├── stock.schemas.ts              \# Schemas Zod  
├── deduction.service.ts          \# deductStockForOrder() \- baixa automatica  
├── availability.service.ts       \# checkAndRestoreAvailability()  
├── recipe.service.ts             \# CRUD ProductIngredient (ficha tecnica)  
├── recipe.routes.ts              \# Rotas de ficha tecnica  
├── cmv.calculator.ts             \# Calculo de CMV teorico  
└── \_\_tests\_\_/  
    ├── stock.test.ts               \# Testes CRUD \+ movimentacoes  
    ├── deduction.test.ts           \# Testes de baixa automatica  
    ├── availability.test.ts        \# Testes de disponibilidade  
    └── cmv.test.ts                 \# Testes de calculo CMV

apps/web-owner/src/  
├── pages/  
│   ├── StockDashboard.tsx  
│   ├── StockItemList.tsx  
│   └── StockItemDetail.tsx  
├── components/  
│   ├── StockItemForm.tsx  
│   ├── StockLevelBar.tsx  
│   ├── StockAlertCard.tsx  
│   ├── MovementHistory.tsx  
│   ├── StockEntryModal.tsx  
│   ├── AdjustmentModal.tsx  
│   ├── LossModal.tsx  
│   ├── RecipeEditor.tsx  
│   └── CMVIndicator.tsx  
└── stores/  
    └── stock.store.ts

# **Tratamento de Erros e Edge Cases**

| Cenário | Comportamento Esperado | HTTP |
| :---- | :---- | :---- |
| Produto sem ficha técnica | Skip baixa automática. Produto controlado manualmente. | N/A |
| Estoque fica negativo | Permitir negativo (realidade operacional). Alert CRITICAL. Indicar necessidade de ajuste. | N/A |
| Baixa falha (erro de banco) | Log error. NÃO bloquear produção. Pedido continua. Corrigir estoque depois. | N/A |
| Dois pedidos baixam o mesmo insumo simultaneamente | Prisma transaction serializa. Sem race condition. | N/A |
| Insumo desativado com ficha técnica ativa | 400: "Remova o insumo das fichas técnicas antes de desativar." | 400 |
| Alterar unitType de insumo existente | 400: "Unidade de medida não pode ser alterada." | 400 |
| SKU duplicado na mesma Unit | 409: "SKU já existe nesta unidade." | 409 |
| Entrada com quantidade 0 | Validação Zod rejeita (z.number().positive()) | 400 |
| Ajuste com diferença \> 10% | Alert HIGH para o dono (investigação recomendada). | 200 \+ Alert |
| Perda \> R$100 | Alert HIGH para o dono. | 200 \+ Alert |
| Cancelamento após PREPARING | Baixa NÃO revertida. Insumo já consumido. Perda separada se necessário. | N/A |
| Cortesia / consumo interno | Baixa normal (insumo consumido). Não cobrado na conta. | N/A |
| Produto volta a ficar disponível | Ao registrar entrada, checkAndRestoreAvailability reconecta. | N/A |
| Estoque atualizado durante contagem | Movimentação OUT pode ocorrer entre contar e salvar ajuste. Aceitar risco na Phase 1\. | N/A |

# **Estratégia de Testes**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| CRUD StockItem — criar com estoque inicial | Unit | Cria item \+ movimentação IN automática |
| CRUD StockItem — SKU duplicado | Unit | 409 Conflict |
| CRUD StockItem — alterar unitType | Unit | 400 Forbidden |
| Entrada — incrementa quantidade e atualiza custo | Unit | quantity incrementada, costPrice atualizado |
| Ajuste — correção para baixo | Unit | quantity \= actualQuantity, movimentação ADJUSTMENT criada |
| Ajuste — diferença \> 10% gera Alert | Unit | Alert HIGH criado |
| Perda — decrementa e gera Alert se \> R$100 | Unit | quantity decrementada, Alert criado |
| Baixa automática — Caipirinha | Integration | Cachaça \-60ml, Limão \-2un, movimentações OUT criadas |
| Baixa automática — produto sem ficha | Unit | Skip, nenhuma movimentação criada |
| Baixa automática — estoque zera | Integration | Product.isAvailable \= false |
| Baixa automática — abaixo do mínimo | Integration | Alert STOCK\_LOW criado |
| Disponibilidade — restaurar após entrada | Integration | Product volta isAvailable \= true |
| Disponibilidade — múltiplos ingredientes | Integration | Produto só volta se TODOS os ingredientes \> 0 |
| Ficha técnica — vincular insumo | Unit | ProductIngredient criado |
| Ficha técnica — duplicata | Unit | 409 (unique constraint) |
| CMV teórico — cálculo correto | Unit | CMV% \= SUM(cost of deductions) / netRevenue |
| Dashboard — alertas e valor em estoque | Integration | Totais corretos, alertas listados |
| Estoque negativo — permite mas alerta | Unit | quantity \< 0 aceito, Alert CRITICAL |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-08**

| PRD | Módulo | Como Usa Estoque |
| :---- | :---- | :---- |
| PRD-03 | Cardápio Digital | Product.isAvailable controla o que aparece no menu. Esgotados marcados automaticamente. |
| PRD-05 | KDS | Cortesias e consumo interno disparam baixa normal (insumo consumido). |
| PRD-07 | Fechamento | CMV teórico do dia incluso no relatório de fechamento. |
| PRD-10 | Dashboard BI | CMV teórico vs. real. Histórico de consumo. Margem por produto. Análise de desperdício. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Ficha técnica incorreta (erros de medida) | Alta | Alto | Validação de unidades compatíveis. Exemplos pré-populados no seed. Guia para o dono. |
| Dono não cadastra fichas técnicas | Alta | Médio | Produtos sem ficha funcionam normalmente (controle manual). Alerta suave sugerindo cadastro. |
| Estoque diverge muito do físico | Alta | Médio | Reconciliação semanal sugerida. Alerta quando ajuste \> 10%. Phase 2: contagem com bloqueio. |
| Baixa automática falha (erro técnico) | Baixa | Médio | Não bloqueia produção. Log error. Reconciliação pega divergência. |
| Performance com muitas movimentações | Baixa | Baixo | Índice (stockItemId, createdAt) já definido. Volume Phase 1 é baixo. |
| Unidades incompatíveis na ficha (ML no item KG) | Média | Médio | Phase 1: confiança no dono. Phase 2: validação de compatibilidade de unidades. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| Baixa no PREPARING (não RECEIVED) | Baixar no RECEIVED | Cancelamento antes de produzir não consome insumo. PREPARING \= insumo fisicamente consumido. |
| Não reverter baixa em cancelamento pós-PREPARING | Reverter automaticamente | Insumo já foi cortado/misturado. Reverter cria ilusao de estoque que não existe. |
| Permitir estoque negativo | Bloquear venda quando estoque \= 0 | Realidade operacional: bartender usa insumo antes da baixa. Negativo é sinal de ajuste pendente. |
| Falha na baixa não bloqueia produção | Bloquear pedido se estoque erro | Operação \> controle de estoque. Estoque é ferramental, não gatekeeper. |
| CMV teórico apenas (Phase 1\) | CMV teórico \+ real | Real requer inventario fisico regular. Simplificar Phase 1\. Real na Phase 2 (PRD-10). |
| Produto sem ficha \= controle manual | Exigir ficha para todos | Permite onboarding gradual. Dono cadastra fichas no ritmo dele. |

# **Sequência de Implementação (2 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: CRUD StockItem \+ movimentações (IN, ADJUSTMENT, LOSS) \+ ficha técnica CRUD \+ baixa automática (deductStockForOrder) \+ disponibilidade (auto-disable/restore) \+ alertas. Testes unitários e integração. | Estoque funcional via API. Baixa automática ao vender. Produto esgota quando insumo acaba. 18 testes passando. |
| Sprint 2 | Frontend: StockDashboard \+ StockItemList \+ StockItemDetail \+ RecipeEditor \+ modais (entrada, ajuste, perda) \+ CMVIndicator. Backend: dashboard endpoint \+ CMV calculator \+ estimatedRunout. | Interface completa de estoque no web-owner. Dono gerencia insumos, fichas, movimentações. CMV visível no dashboard. |

## **Phase 2 — Escopo Futuro (NÃO incluir na Phase 1\)**

Para referência, as features abaixo estão explicitamente FORA do escopo de PRD-08 e serão implementadas na Phase 2:

| Feature | PRD Destino | Razão de Diferimento |
| :---- | :---- | :---- |
| Lotes com validade (batch tracking) | PRD-10 ou novo | Complexidade alta. Phase 1 não precisa. |
| CMV real (inventario físico periódico) | PRD-10 | Requer dados históricos acumulados. |
| Cotação de fornecedores | Novo PRD | Não-core para operação diária. |
| Compra automática (sugestão de pedido) | Novo PRD | Requer histórico de consumo. |
| Transferência entre depósitos | PRD-01 já tem MovementType.TRANSFER | Só necessário com múltiplos depósitos. |
| Contagem física com bloqueio de movimentação | Novo PRD | Requer UX específica e locking. |
| Custo médio ponderado (PEPS/UEPS) | PRD-10 | Phase 1 usa custo unitário simples. |

OASYS PRD-08 — Estoque Básico  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*