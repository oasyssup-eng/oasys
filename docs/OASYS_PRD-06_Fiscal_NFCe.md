

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-06 — Fiscal & NFC-e**  
Emissão de Nota Fiscal Eletrônica via FocusNFe, XML, DANFE, cancelamento

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 1 — Go-Live |
| **Sprints Estimados** | 2 sprints |
| **Complexidade** | Alta |
| **Cobertura Atual** | 0% |
| **Dependências** | PRD-01 (Schema Foundation), PRD-02 (Payments & CashRegister) |
| **Gap Modules** | M4 — Pagamentos / Fiscal |
| **Apps Afetadas** | apps/api (módulo fiscal) |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-06 (Fiscal & NFC-e) é a obrigação legal que viabiliza a operação comercial. Nenhum estabelecimento com CNPJ pode operar legalmente sem emitir documento fiscal eletrônico. Este PRD integra o OASYS com o FocusNFe — um intermediador autorizado pela SEFAZ — para emissão de NFC-e (Nota Fiscal de Consumidor Eletrônica), a modalidade obrigatória para vendas presenciais ao consumidor final.

A cobertura atual é 0% — nenhum código fiscal existe. O schema (PRD-01) já contém o model FiscalNote com todos os campos necessários, e o Unit já tem campos fiscais (CNPJ, IE, razão social, endereço completo, código IBGE). Este PRD constrói exclusivamente a camada de integração e orquestração.

Este PRD cobre quatro subsistemas:

**1\. Emissão Automática —** Quando um Check transiciona para PAID (PRD-02), o sistema automaticamente monta o payload fiscal, envia ao FocusNFe, e armazena a resposta. Zero intervenção humana no fluxo principal.

**2\. Ciclo de Vida da Nota —** Acompanhamento do status (PENDING → PROCESSING → AUTHORIZED / REJECTED / ERROR). Callback do FocusNFe atualiza o status. Retry automático para falhas transitórias.

**3\. Cancelamento —** Cancelamento de NFC-e dentro do prazo legal (24 horas na maioria dos estados). Motivo obrigatório. Aprovação de gerente/dono.

**4\. Armazenamento & Compliance —** XML completo da nota armazenado no banco (obrigação legal: 5 anos). DANFE (versão visual) acessível via URL. Relatório de notas emitidas vs. esperadas para auditoria.

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Endpoints API | 7 | Emitir, consultar, cancelar, webhook, DANFE, relatório, retry |
| Endpoints Modificados | 1 | Check close (PRD-02) dispara emissão fiscal |
| Serviços Novos | 2 | FocusNFeService (integração) \+ FiscalService (orquestração) |
| Jobs/Workers | 2 | Retry de notas falhadas \+ reconciliação diária |
| Env Vars | 4 | FOCUSNFE\_TOKEN, FOCUSNFE\_BASE\_URL, FOCUSNFE\_ENVIRONMENT, FOCUSNFE\_WEBHOOK\_URL |
| Componentes UI (web-owner) | \~4 | Lista de notas, filtros, status, ações |

## **Critério de Sucesso (Done Definition)**

O PRD-06 está concluído quando TODOS os seguintes critérios são atendidos:

1\. NFC-e emitida automaticamente ao fechar conta com pagamento (Check.status \= PAID).

2\. XML completo armazenado no FiscalNote.xml. Acessível por 5 anos (requisito legal).

3\. DANFE acessível via URL retornada pelo FocusNFe. Link disponibilizado ao cliente.

4\. Status da nota atualizado via callback do FocusNFe (AUTHORIZED, REJECTED, ERROR).

5\. Notas rejeitadas geram alerta para o dono com mensagem de erro do SEFAZ.

6\. Cancelamento de nota funcional dentro do prazo legal, com motivo e aprovação.

7\. Retry automático para falhas transitórias (3 tentativas com backoff exponencial).

8\. Relatório de notas emitidas vs. esperadas identifica divergências.

9\. Homologação completa em ambiente de teste do FocusNFe antes de produção.

10\. Zero erros de tipo no monorepo.

# **Contexto Regulatório Brasileiro**

A emissão de documento fiscal eletrônico é obrigatória para todo estabelecimento com CNPJ que realiza vendas ao consumidor final. O OASYS precisa atender a legislação vigente para que seus clientes operem legalmente.

## **NFC-e vs. NF-e**

| Característica | NFC-e (Nota Fiscal de Consumidor) | NF-e (Nota Fiscal Eletrônica) |
| :---- | :---- | :---- |
| Uso | Venda presencial ao consumidor final | Venda entre empresas (B2B) |
| Destinatário | CPF opcional (identificação não obrigatória) | CNPJ obrigatório do destinatário |
| Modelo | Modelo 65 | Modelo 55 |
| Obrigatoriedade | Todo varejo e food service | Comércio atacadista e indústria |
| DANFE | Simplificado (pode ser digital) | Completo com detalhamento de itens |
| Cancelamento | Até 24h na maioria dos estados | Até 24h |
| Uso no OASYS | Sim — foco principal de Phase 1 | Futuro — compras de fornecedores |

## **Campos Fiscais Obrigatórios para NFC-e**

Para emitir NFC-e, o estabelecimento deve ter os seguintes dados cadastrados no OASYS (campos do model Unit, definidos no PRD-01):

| Campo | Campo Prisma (Unit) | Obrigatório NFC-e | Exemplo |
| :---- | :---- | :---- | :---- |
| CNPJ | cnpj | Sim | 12345678000199 |
| Inscrição Estadual | stateRegistration | Sim | 123456789012 |
| Razão Social | legalName | Sim | Boteco do Zé Comércio de Bebidas Ltda |
| Logradouro | streetAddress | Sim | Rua dos Pinheiros |
| Número | addressNumber | Sim | 1234 |
| Bairro | neighborhood | Sim | Pinheiros |
| Cidade | city | Sim | São Paulo |
| UF | state | Sim | SP |
| CEP | zipCode | Sim | 05422012 |
| Código IBGE | ibgeCode | Sim | 3550308 |
| Complemento | addressComplement | Não | Sala 1 |

IMPORTANTE: O sistema deve validar que todos os campos obrigatórios estão preenchidos ANTES de tentar emitir. Se qualquer campo estiver faltando, a emissão não deve ser tentada — deve gerar um alerta para o dono configurar os dados fiscais.

## **NCM e CFOP**

Cada produto vendido em NFC-e precisa de código NCM (Nomenclatura Comum do Mercosul) e CFOP (Código Fiscal de Operações e Prestações). Para simplificar na Phase 1, o OASYS usa valores padrão para food service:

| Código | Valor Padrão | Descrição | Nota |
| :---- | :---- | :---- | :---- |
| NCM (bebidas) | 2203.00.00 | Cerveja de malte | Aplicar a cervejas e chopps |
| NCM (destilados) | 2208.40.00 | Rum e aguardente de cana | Aplicar a cachaça |
| NCM (alimentos) | 2106.90.90 | Preparações alimentícias | Genérico para petiscos/porções |
| NCM (água) | 2201.10.00 | Água mineral |  |
| NCM (refrigerante) | 2202.10.00 | Águas com adição de açúcar | Inclui refrigerantes e sucos |
| CFOP | 5.102 | Venda de mercadoria adquirida | Padrão para revenda no varejo |
| CSOSN | 102 | Tributação Simples Nacional | Para empresas no Simples Nacional |

Na Phase 2, o Product model pode ser expandido com campos ncm e cfop para configuração por produto. Na Phase 1, usamos mapeamento por Category com fallback para o valor genérico.

# **Arquitetura**

## **Fluxo de Emissão — Happy Path**

┌────────────┐                                                  
│ Check.status │                                                  
│  \= PAID      │  (PRD-02: checkPaymentCompletion)                
└────┬───────┘                                                  
     │                                                          
     ▼                                                          
┌───────────────────┐                                            
│ 1\. Validar dados   │  Unit tem CNPJ, IE, endereco?              
│    fiscais da Unit │  Se nao \-\> Alert \+ skip emissao            
└────────┬──────────┘                                            
         │                                                      
         ▼                                                      
┌───────────────────┐                                            
│ 2\. Montar payload  │  Produtos, quantidades, NCM, CFOP,         
│    NFC-e           │  totais, metodo pagamento, CPF cliente      
└────────┬──────────┘                                            
         │                                                      
         ▼                                                      
┌───────────────────┐                                            
│ 3\. Criar FiscalNote│  status: PENDING, externalRef: UUID        
│    no banco        │  Salvar antes de chamar API externa         
└────────┬──────────┘                                            
         │                                                      
         ▼                                                      
┌───────────────────┐   POST /v2/nfce    ┌───────────┐      
│ 4\. Enviar para     │ ────────────→ │ FocusNFe  │      
│    FocusNFe        │                   │  (SEFAZ)  │      
└────────┬──────────┘                   └────┬──────┘      
         │                                │               
         │  FiscalNote.status \= PROCESSING │               
         │                                │               
         ▼                                ▼               
┌───────────────────┐   callback POST    ┌───────────┐      
│ 5\. Callback        │ ←───────────── │ FocusNFe  │      
│    (autorização)   │                   │  retorna  │      
└────────┬──────────┘                   └───────────┘      
         │                                                
         ▼                                                
┌───────────────────┐                                            
│ 6\. Atualizar nota  │  status: AUTHORIZED                        
│    FiscalNote      │  xml: XML completo, accessKey, number       
│                    │  danfeUrl: link para visualizacao           
└───────────────────┘                                          

## **State Machine da Nota Fiscal**

| De | Para | Trigger | Ação |
| :---- | :---- | :---- | :---- |
| (novo) | PENDING | Check transiciona para PAID | Cria FiscalNote no banco, monta payload |
| PENDING | PROCESSING | POST enviado ao FocusNFe com sucesso | Atualiza status, aguarda callback |
| PROCESSING | AUTHORIZED | Callback do FocusNFe: autorizada pelo SEFAZ | Salva XML, accessKey, number, danfeUrl, issuedAt |
| PROCESSING | REJECTED | Callback do FocusNFe: rejeitada pelo SEFAZ | Salva errorMessage. Cria Alert para o dono. |
| PROCESSING | ERROR | Falha de comunicação ou timeout | Agenda retry. Cria Alert se 3 falhas consecutivas. |
| PENDING | ERROR | FocusNFe indisponível no momento do envio | Agenda retry automático. |
| ERROR | PROCESSING | Retry automático ou manual | Reenvia ao FocusNFe. |
| REJECTED | PROCESSING | Correção manual \+ reenvio | Novo payload com correções. |
| AUTHORIZED | CANCELLED | Cancelamento dentro do prazo legal | Envia cancelamento ao FocusNFe. Registra cancelledAt. |

# **Integração FocusNFe — Especificação Técnica**

O FocusNFe é um intermediador autorizado pela SEFAZ que simplifica a emissão de documentos fiscais. Ele recebe o payload em JSON, converte para XML conforme o layout da SEFAZ, envia, e retorna o resultado via callback (webhook).

## **Configuração**

| Env Var | Valor | Propósito |
| :---- | :---- | :---- |
| FOCUSNFE\_TOKEN | token\_xxx | Token de autenticação da API (Base64 do token:) |
| FOCUSNFE\_BASE\_URL | https://homologacao.focusnfe.com.br (teste) ou https://api.focusnfe.com.br (prod) | Base URL da API v2 |
| FOCUSNFE\_ENVIRONMENT | homologation ou production | Ambiente ativo |
| FOCUSNFE\_WEBHOOK\_URL | https://api.oasys.com.br/api/v1/fiscal/webhook | URL de callback para notificações |

## **Autenticação**

// FocusNFe usa autenticacao Basic com token como username  
const auth \= Buffer.from(process.env.FOCUSNFE\_TOKEN \+ ":").toString("base64");

const headers \= {  
  "Authorization": "Basic " \+ auth,  
  "Content-Type": "application/json",  
  "Accept": "application/json",  
};

## **Emitir NFC-e — POST /v2/nfce**

Envia uma NFC-e para autorização no SEFAZ via FocusNFe. O ref (referência única) é gerado pelo OASYS e usado para rastrear a nota.

### **Payload de Emissão**

// POST {FOCUSNFE\_BASE\_URL}/v2/nfce?ref={externalRef}\&token={token}  
{  
  "natureza\_operacao": "VENDA AO CONSUMIDOR",  
  "forma\_pagamento": "0",  // 0 \= a vista  
  "tipo\_documento": "1",   // 1 \= saida  
  "finalidade\_emissao": "1",  // 1 \= normal  
  "consumidor\_final": "1",  
  "presenca\_comprador": "1",  // 1 \= presencial

  // Emitente (dados do Unit)  
  "cnpj\_emitente": "12345678000199",  
  "nome\_emitente": "Boteco do Ze Comercio de Bebidas Ltda",  
  "inscricao\_estadual\_emitente": "123456789012",  
  "logradouro\_emitente": "Rua dos Pinheiros",  
  "numero\_emitente": "1234",  
  "bairro\_emitente": "Pinheiros",  
  "municipio\_emitente": "Sao Paulo",  
  "uf\_emitente": "SP",  
  "cep\_emitente": "05422012",  
  "codigo\_municipio\_emitente": "3550308",

  // Destinatario (opcional para NFC-e)  
  "cpf\_destinatario": "12345678901",  // se cliente informou  
  "nome\_destinatario": "Joao Silva",

  // Itens (array de produtos vendidos)  
  "items": \[  
    {  
      "numero\_item": "1",  
      "codigo\_produto": "PROD001",  
      "descricao": "Chopp Pilsen 300ml",  
      "codigo\_ncm": "2203.00.00",  
      "cfop": "5102",  
      "unidade\_comercial": "UN",  
      "quantidade\_comercial": "2.00",  
      "valor\_unitario\_comercial": "12.90",  
      "valor\_bruto": "25.80",  
      "unidade\_tributavel": "UN",  
      "quantidade\_tributavel": "2.00",  
      "valor\_unitario\_tributavel": "12.90",  
      "icms\_origem": "0",  
      "icms\_situacao\_tributaria": "102",  // Simples Nacional  
      "valor\_total\_tributos": "3.87"  // estimativa de tributos  
    },  
    {  
      "numero\_item": "2",  
      "codigo\_produto": "PROD011",  
      "descricao": "Porcao de Fritas",  
      "codigo\_ncm": "2106.90.90",  
      "cfop": "5102",  
      "unidade\_comercial": "UN",  
      "quantidade\_comercial": "1.00",  
      "valor\_unitario\_comercial": "28.90",  
      "valor\_bruto": "28.90",  
      "unidade\_tributavel": "UN",  
      "quantidade\_tributavel": "1.00",  
      "valor\_unitario\_tributavel": "28.90",  
      "icms\_origem": "0",  
      "icms\_situacao\_tributaria": "102",  
      "valor\_total\_tributos": "4.34"  
    }  
  \],

  // Pagamento  
  "formas\_pagamento": \[  
    {  
      "forma\_pagamento": "01",  // 01=dinheiro, 03=cartao credito, 04=cartao debito, 17=PIX  
      "valor\_pagamento": "54.70"  
    }  
  \],

  // Totais  
  "valor\_produtos": "54.70",  
  "valor\_desconto": "0.00",  
  "valor\_total": "54.70",

  // Info adicional  
  "informacoes\_adicionais\_contribuinte": "Obrigado pela preferencia\! OASYS \- Sistema Operacional para F\&B"  
}

### **Response do FocusNFe (sucesso)**

{  
  "cnpj\_emitente": "12345678000199",  
  "ref": "oasys\_check\_clx1abc...",  
  "status": "autorizado",  
  "status\_sefaz": "100",  
  "mensagem\_sefaz": "Autorizado o uso da NF-e",  
  "chave\_nfe": "35260312345678000199650010000001231234567890",  
  "numero": "123",  
  "serie": "1",  
  "caminho\_xml\_nota\_fiscal": "/v2/nfce/oasys\_check\_clx1abc.xml",  
  "caminho\_danfe": "/v2/nfce/oasys\_check\_clx1abc.html",  
  "url\_danfe": "https://focusnfe.com.br/danfe/oasys\_check\_clx1abc.html"  
}

## **Mapeamento de Formas de Pagamento**

O SEFAZ exige código específico para cada forma de pagamento. Mapear os PaymentMethod do OASYS para os códigos fiscais:

| PaymentMethod (OASYS) | Código Fiscal | Descrição SEFAZ |
| :---- | :---- | :---- |
| CASH | 01 | Dinheiro |
| CARD (crédito) | 03 | Cartão de Crédito |
| CARD (débito) | 04 | Cartão de Débito |
| PIX | 17 | Pagamento Instantâneo (PIX) |
| VOUCHER | 05 | Vale Alimentação |

function mapPaymentMethodToFiscal(method: PaymentMethod, isDebit?: boolean): string {  
  const map: Record\<string, string\> \= {  
    CASH: "01",  
    CARD: isDebit ? "04" : "03",  
    PIX: "17",  
    VOUCHER: "05",  
  };  
  return map\[method\] || "99"; // 99 \= outros  
}

## **Consultar Status — GET /v2/nfce/{ref}**

Consulta o status de uma nota específica. Usado no retry e na reconciliação.

// GET {FOCUSNFE\_BASE\_URL}/v2/nfce/{ref}?token={token}

// Response:  
{  
  "ref": "oasys\_check\_clx1abc...",  
  "status": "autorizado",       // ou "erro\_autorizacao", "cancelado"  
  "status\_sefaz": "100",  
  "mensagem\_sefaz": "Autorizado o uso da NF-e",  
  "chave\_nfe": "35260312345678000199...",  
  "numero": "123",  
  "serie": "1",  
  "caminho\_xml\_nota\_fiscal": "/v2/nfce/ref.xml",  
  "url\_danfe": "https://focusnfe.com.br/danfe/ref.html"  
}

## **Cancelar NFC-e — DELETE /v2/nfce/{ref}**

// DELETE {FOCUSNFE\_BASE\_URL}/v2/nfce/{ref}?token={token}  
// Body:  
{ "justificativa": "Cancelamento solicitado pelo cliente. Pedido devolvido." }

// justificativa minimo 15 caracteres (exigencia SEFAZ)

// Response (sucesso):  
{  
  "status": "cancelado",  
  "status\_sefaz": "135",  
  "mensagem\_sefaz": "Evento registrado e vinculado a NF-e",  
  "caminho\_xml\_cancelamento": "/v2/nfce/ref.cancel.xml"  
}

## **Baixar XML — GET /v2/nfce/{ref}.xml**

Retorna o XML completo da nota fiscal. Deve ser armazenado no FiscalNote.xml (campo @db.Text). Obrigação legal: manter por 5 anos.

# **Especificação de API — Endpoints OASYS**

Endpoints internos do OASYS para gestão fiscal. Todos requerem JWT, isolamento por unitId. Prefixo: /api/v1.

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /fiscal/emit | MANAGER, OWNER | Emitir NFC-e manualmente (re-emissão, correção) |
| POST | /fiscal/webhook | PUBLIC (validação por token) | Callback do FocusNFe com status da nota |
| GET | /fiscal/notes | MANAGER, OWNER | Lista notas fiscais com filtros (status, período, checkId) |
| GET | /fiscal/notes/:id | MANAGER, OWNER | Detalhe de uma nota fiscal específica |
| POST | /fiscal/notes/:id/cancel | OWNER | Cancelar nota autorizada (dentro do prazo legal) |
| POST | /fiscal/notes/:id/retry | MANAGER, OWNER | Re-tentar emissão de nota com erro |
| GET | /fiscal/notes/:id/danfe | WAITER, MANAGER, OWNER, PUBLIC\* | Redireciona para URL do DANFE no FocusNFe |
| GET | /fiscal/report | MANAGER, OWNER | Relatório: notas emitidas vs. esperadas (divergências) |

\* PUBLIC: link do DANFE pode ser compartilhado com o cliente (porém, acessado via token temporário no web-menu, não autenticação completa).

# **Emissão Automática — Trigger no Check PAID**

A emissão automática é o fluxo principal. Quando o Check transiciona para PAID via checkPaymentCompletion (PRD-02), a função emitNFCeForCheck() é chamada. Nenhuma ação manual necessária.

## **Orquestração — emitNFCeForCheck()**

async function emitNFCeForCheck(checkId: string, prisma: PrismaClient): Promise\<void\> {

  // 1\. Buscar Check completo com Orders, Items, Payments, Unit  
  const check \= await prisma.check.findUnique({  
    where: { id: checkId },  
    include: {  
      orders: { include: { items: { include: { product: { include: { category: true } } } } } },  
      payments: { where: { status: "CONFIRMED" } },  
      unit: true,  
    },  
  });

  // 2\. Validar dados fiscais da Unit  
  const missingFields \= validateFiscalFields(check.unit);  
  if (missingFields.length \> 0\) {  
    await createAlert({  
      unitId: check.unitId,  
      type: "FISCAL\_CONFIG\_MISSING",  
      severity: "HIGH",  
      message: \`Campos fiscais faltando: ${missingFields.join(", ")}. NFC-e nao emitida para conta \#${check.id}.\`,  
    });  
    return; // Skip emissao, nao bloqueia operacao  
  }

  // 3\. Gerar referencia unica  
  const externalRef \= \`oasys\_${check.unitId}\_${check.id}\_${Date.now()}\`;

  // 4\. Criar FiscalNote no banco (PENDING)  
  const fiscalNote \= await prisma.fiscalNote.create({  
    data: {  
      unitId: check.unitId,  
      checkId: check.id,  
      externalRef,  
      status: "PENDING",  
      type: "NFCE",  
      totalAmount: check.grossTotal,  
      customerCpf: check.customerCpf || null,  
    },  
  });

  // 5\. Montar payload FocusNFe  
  const payload \= buildNFCePayload(check, externalRef);

  // 6\. Enviar ao FocusNFe  
  try {  
    const response \= await focusNFeService.emitNFCe(externalRef, payload);

    // 7\. Atualizar status para PROCESSING  
    await prisma.fiscalNote.update({  
      where: { id: fiscalNote.id },  
      data: { status: "PROCESSING" },  
    });

  } catch (error) {  
    // 8\. Marcar como ERROR, agendar retry  
    await prisma.fiscalNote.update({  
      where: { id: fiscalNote.id },  
      data: { status: "ERROR", errorMessage: error.message },  
    });  
    scheduleRetry(fiscalNote.id, 1); // 1a tentativa  
  }  
}

## **Montagem do Payload — buildNFCePayload()**

function buildNFCePayload(check: CheckWithRelations, ref: string): NFCePayload {  
  const unit \= check.unit;

  // Coletar todos os itens de todos os pedidos nao-cortesia  
  const allItems \= check.orders  
    .filter(o \=\> o.status \!== "CANCELLED" && \!o.isCortesia)  
    .flatMap(o \=\> o.items);

  // Agrupar por produto (mesmo produto em pedidos diferentes)  
  const groupedItems \= groupByProductId(allItems);

  // Montar itens fiscais  
  const items \= groupedItems.map((group, index) \=\> ({  
    numero\_item: String(index \+ 1),  
    codigo\_produto: group.productId,  
    descricao: group.productName.substring(0, 120), // SEFAZ max 120 chars  
    codigo\_ncm: mapCategoryToNCM(group.category),  
    cfop: "5102",  
    unidade\_comercial: "UN",  
    quantidade\_comercial: group.totalQuantity.toFixed(2),  
    valor\_unitario\_comercial: group.unitPrice.toFixed(2),  
    valor\_bruto: group.totalValue.toFixed(2),  
    unidade\_tributavel: "UN",  
    quantidade\_tributavel: group.totalQuantity.toFixed(2),  
    valor\_unitario\_tributavel: group.unitPrice.toFixed(2),  
    icms\_origem: "0",  
    icms\_situacao\_tributaria: "102", // Simples Nacional  
    valor\_total\_tributos: estimateTaxes(group.totalValue).toFixed(2),  
  }));

  // Mapear pagamentos  
  const formas\_pagamento \= check.payments.map(p \=\> ({  
    forma\_pagamento: mapPaymentMethodToFiscal(p.method, p.isDebit),  
    valor\_pagamento: p.amount.toFixed(2),  
  }));

  return {  
    natureza\_operacao: "VENDA AO CONSUMIDOR",  
    forma\_pagamento: "0",  
    tipo\_documento: "1",  
    finalidade\_emissao: "1",  
    consumidor\_final: "1",  
    presenca\_comprador: "1",  
    cnpj\_emitente: unit.cnpj,  
    nome\_emitente: unit.legalName,  
    inscricao\_estadual\_emitente: unit.stateRegistration,  
    logradouro\_emitente: unit.streetAddress,  
    numero\_emitente: unit.addressNumber,  
    complemento\_emitente: unit.addressComplement || "",  
    bairro\_emitente: unit.neighborhood,  
    municipio\_emitente: unit.city,  
    uf\_emitente: unit.state,  
    cep\_emitente: unit.zipCode,  
    codigo\_municipio\_emitente: unit.ibgeCode,  
    ...(check.customerCpf ? {  
      cpf\_destinatario: check.customerCpf,  
      nome\_destinatario: check.customerName || "CONSUMIDOR",  
    } : {}),  
    items,  
    formas\_pagamento,  
    valor\_produtos: sumItemValues(items).toFixed(2),  
    valor\_desconto: (check.discountAmount || 0).toFixed(2),  
    valor\_total: check.grossTotal.toFixed(2),  
    informacoes\_adicionais\_contribuinte:  
      \`Obrigado pela preferencia\! ${unit.name}\`,  
  };  
}

# **Callback do FocusNFe (POST /fiscal/webhook)**

O FocusNFe envia uma notificação ao OASYS quando a nota é processada pelo SEFAZ. Este endpoint é público, mas validado pelo token na URL de callback.

### **Payload do Callback**

// FocusNFe envia POST para a URL configurada:  
// POST https://api.oasys.com.br/api/v1/fiscal/webhook

// Body:  
{  
  "cnpj\_emitente": "12345678000199",  
  "ref": "oasys\_check\_clx1abc...",  
  "status": "autorizado",        // ou "erro\_autorizacao", "cancelado"  
  "status\_sefaz": "100",  
  "mensagem\_sefaz": "Autorizado o uso da NF-e",  
  "chave\_nfe": "35260312345678000199650010000001231234567890",  
  "numero": "123",  
  "serie": "1",  
  "caminho\_xml\_nota\_fiscal": "/v2/nfce/ref.xml",  
  "url\_danfe": "https://focusnfe.com.br/danfe/ref.html"  
}

### **Lógica do Callback Handler**

async function handleFocusNFeCallback(payload: FocusNFeCallback): Promise\<void\> {

  // 1\. Buscar FiscalNote pelo externalRef  
  const note \= await prisma.fiscalNote.findFirst({  
    where: { externalRef: payload.ref },  
  });

  if (\!note) {  
    logger.warn({ ref: payload.ref }, "Callback for unknown fiscal note");  
    return; // 200 OK (idempotente)  
  }

  // 2\. Mapear status do FocusNFe para status OASYS  
  if (payload.status \=== "autorizado") {

    // 3a. Baixar XML completo  
    const xml \= await focusNFeService.downloadXML(payload.ref);

    // 3b. Atualizar FiscalNote  
    await prisma.fiscalNote.update({  
      where: { id: note.id },  
      data: {  
        status: "AUTHORIZED",  
        number: payload.numero,  
        series: payload.serie,  
        accessKey: payload.chave\_nfe,  
        xml,  // XML completo (obrigacao legal: 5 anos)  
        danfeUrl: payload.url\_danfe,  
        issuedAt: new Date(),  
      },  
    });

    logger.info({ ref: payload.ref, number: payload.numero }, "NFC-e authorized");

  } else if (payload.status \=== "erro\_autorizacao") {

    // 3c. Nota rejeitada pelo SEFAZ  
    await prisma.fiscalNote.update({  
      where: { id: note.id },  
      data: {  
        status: "REJECTED",  
        errorMessage: \`SEFAZ ${payload.status\_sefaz}: ${payload.mensagem\_sefaz}\`,  
      },  
    });

    // Alertar o dono  
    await createAlert({  
      unitId: note.unitId,  
      type: "FISCAL\_NOTE\_REJECTED",  
      severity: "HIGH",  
      message: \`NFC-e rejeitada pelo SEFAZ: ${payload.mensagem\_sefaz}. Ref: ${payload.ref}\`,  
    });

    logger.error({ ref: payload.ref, sefaz: payload.status\_sefaz }, "NFC-e rejected");

  } else if (payload.status \=== "cancelado") {

    // 3d. Cancelamento confirmado  
    await prisma.fiscalNote.update({  
      where: { id: note.id },  
      data: { status: "CANCELLED", cancelledAt: new Date() },  
    });  
  }  
}

# **Cancelamento de NFC-e**

O cancelamento é uma operação regulatória com prazo legal. Na maioria dos estados, NFC-e pode ser cancelada em até 24 horas após autorização. Após esse prazo, deve-se emitir NFC-e de devolução (fora do escopo de Phase 1).

## **POST /fiscal/notes/:id/cancel**

### **Request Body**

const CancelFiscalNoteSchema \= z.object({  
  justification: z.string().min(15).max(255),  
  // SEFAZ exige minimo 15 caracteres na justificativa  
});

// Exemplo:  
{ "justification": "Cancelamento solicitado pelo cliente. Pedido devolvido integralmente." }

### **Response (200)**

{  
  "id": "clx5fis...",  
  "status": "CANCELLED",  
  "cancelledAt": "2026-03-02T23:45:00Z",  
  "message": "NFC-e cancelada com sucesso."  
}

### **Regras de Negócio**

R1. Nota deve estar com status AUTHORIZED. Não pode cancelar nota PENDING, PROCESSING, ERROR ou já CANCELLED.

R2. Prazo legal: issuedAt \+ 24h. Se expirado, retornar 400: "Prazo de cancelamento expirado. Use nota de devolução.".

R3. Justificativa mínimo 15 caracteres (exigência SEFAZ). Zod valida.

R4. Somente OWNER pode cancelar (operação de alto impacto fiscal).

R5. Enviar DELETE ao FocusNFe. Aguardar callback de confirmação.

R6. Registrar no AuditLog: quem cancelou, motivo, data, número da nota.

R7. NÃO reverter o pagamento automaticamente. Estorno é operação separada (PRD-02).

# **Retry Automático e Reconciliação**

## **Retry de Notas com Erro**

Falhas transitórias (FocusNFe indisponível, timeout de rede, SEFAZ instabilidade) devem ter retry automático. O sistema tenta até 3 vezes com backoff exponencial.

async function scheduleRetry(fiscalNoteId: string, attempt: number): Promise\<void\> {  
  const MAX\_RETRIES \= 3;  
  if (attempt \> MAX\_RETRIES) {  
    // Desistir e alertar o dono  
    await createAlert({  
      type: "FISCAL\_RETRY\_EXHAUSTED",  
      severity: "CRITICAL",  
      message: \`NFC-e falhou apos ${MAX\_RETRIES} tentativas. Intervencao manual necessaria.\`,  
    });  
    return;  
  }

  // Backoff: 30s, 2min, 10min  
  const delays \= \[30\_000, 120\_000, 600\_000\];  
  const delay \= delays\[attempt \- 1\] || 600\_000;

  setTimeout(async () \=\> {  
    const note \= await prisma.fiscalNote.findUnique({ where: { id: fiscalNoteId } });  
    if (note.status \!== "ERROR") return; // ja foi resolvido

    try {  
      await focusNFeService.emitNFCe(note.externalRef, note.payload);  
      await prisma.fiscalNote.update({  
        where: { id: fiscalNoteId },  
        data: { status: "PROCESSING", errorMessage: null },  
      });  
    } catch (error) {  
      await prisma.fiscalNote.update({  
        where: { id: fiscalNoteId },  
        data: { errorMessage: \`Tentativa ${attempt}: ${error.message}\` },  
      });  
      scheduleRetry(fiscalNoteId, attempt \+ 1);  
    }  
  }, delay);  
}

## **Reconciliação Diária**

Um job de reconciliação roda diariamente (ou no fechamento do dia via PRD-07) e verifica:

1\. Checks PAID sem FiscalNote correspondente: alerta "Conta \#X paga sem nota fiscal emitida".

2\. FiscalNotes com status PROCESSING há mais de 1 hora: consulta GET /v2/nfce/{ref} no FocusNFe para atualizar status.

3\. FiscalNotes com status ERROR não resolvido: lista para ação manual.

4\. Total de notas AUTHORIZED vs. total de Checks PAID: deve ser 1:1. Divergências geram alerta.

async function dailyFiscalReconciliation(unitId: string, date: Date): Promise\<ReconciliationReport\> {

  // Checks pagos no dia sem nota fiscal  
  const checksWithoutNote \= await prisma.check.findMany({  
    where: {  
      unitId,  
      status: "PAID",  
      closedAt: { gte: startOfDay(date), lte: endOfDay(date) },  
      fiscalNotes: { none: {} },  
    },  
  });

  // Notas presas em PROCESSING  
  const stuckNotes \= await prisma.fiscalNote.findMany({  
    where: {  
      unitId,  
      status: "PROCESSING",  
      createdAt: { lt: subHours(new Date(), 1\) },  
    },  
  });

  // Re-consultar status das notas presas  
  for (const note of stuckNotes) {  
    const remoteStatus \= await focusNFeService.getStatus(note.externalRef);  
    // Atualizar conforme resposta...  
  }

  // Notas com erro pendente  
  const errorNotes \= await prisma.fiscalNote.findMany({  
    where: { unitId, status: "ERROR" },  
  });

  return {  
    checksWithoutNote: checksWithoutNote.length,  
    stuckNotes: stuckNotes.length,  
    errorNotes: errorNotes.length,  
    totalPaidChecks: totalPaid,  
    totalAuthorizedNotes: totalAuthorized,  
    isDivergent: totalPaid \!== totalAuthorized,  
  };  
}

# **Relatório Fiscal (GET /fiscal/report)**

Relatório consumido pelo dashboard do dono (PRD-07) e pela reconciliação diária.

### **Query Parameters**

const FiscalReportQuerySchema \= z.object({  
  startDate: z.string().datetime(),  
  endDate: z.string().datetime(),  
});

### **Response (200)**

{  
  "period": { "start": "2026-03-02", "end": "2026-03-02" },  
  "summary": {  
    "totalChecks": 47,  
    "totalNotes": 45,  
    "authorized": 43,  
    "rejected": 1,  
    "error": 1,  
    "cancelled": 2,  
    "pending": 0,  
    "processing": 0,  
    "missingNotes": 2,   // checks sem nota  
    "totalFiscalAmount": 12847.50,  
    "totalChecksAmount": 13210.30,  
    "amountDivergence": 362.80  // cortesias \+ erros  
  },  
  "divergences": \[  
    {  
      "type": "CHECK\_WITHOUT\_NOTE",  
      "checkId": "clx1...",  
      "amount": 285.50,  
      "reason": "Campos fiscais nao configurados no momento do pagamento"  
    },  
    {  
      "type": "NOTE\_REJECTED",  
      "fiscalNoteId": "clx5...",  
      "checkId": "clx2...",  
      "amount": 77.30,  
      "sefazCode": "302",  
      "reason": "CNPJ do emitente nao cadastrado na SEFAZ"  
    }  
  \],  
  "byPaymentMethod": {  
    "CASH": { "count": 18, "amount": 4250.00 },  
    "PIX": { "count": 15, "amount": 4120.50 },  
    "CARD": { "count": 12, "amount": 4477.00 },  
    "VOUCHER": { "count": 2, "amount": 363.80 }  
  }  
}

# **Serviço de Integração — FocusNFeService**

// apps/api/src/modules/fiscal/focusnfe.service.ts

export class FocusNFeService {  
  private baseUrl: string;  
  private token: string;  
  private environment: "homologation" | "production";

  constructor() {  
    this.baseUrl \= process.env.FOCUSNFE\_BASE\_URL\!;  
    this.token \= process.env.FOCUSNFE\_TOKEN\!;  
    this.environment \= process.env.FOCUSNFE\_ENVIRONMENT as any;  
  }

  private getAuth(): string {  
    return "Basic " \+ Buffer.from(this.token \+ ":").toString("base64");  
  }

  async emitNFCe(ref: string, payload: NFCePayload): Promise\<FocusNFeResponse\> {  
    const url \= \`${this.baseUrl}/v2/nfce?ref=${ref}\&token=${this.token}\`;  
    const response \= await fetch(url, {  
      method: "POST",  
      headers: { Authorization: this.getAuth(), "Content-Type": "application/json" },  
      body: JSON.stringify(payload),  
      signal: AbortSignal.timeout(15\_000), // 15s timeout  
    });  
    if (\!response.ok) throw new FocusNFeError(await response.json());  
    return response.json();  
  }

  async getStatus(ref: string): Promise\<FocusNFeStatusResponse\> {  
    const url \= \`${this.baseUrl}/v2/nfce/${ref}?token=${this.token}\`;  
    const response \= await fetch(url, {  
      headers: { Authorization: this.getAuth() },  
      signal: AbortSignal.timeout(10\_000),  
    });  
    return response.json();  
  }

  async cancelNFCe(ref: string, justification: string): Promise\<FocusNFeCancelResponse\> {  
    const url \= \`${this.baseUrl}/v2/nfce/${ref}?token=${this.token}\`;  
    const response \= await fetch(url, {  
      method: "DELETE",  
      headers: { Authorization: this.getAuth(), "Content-Type": "application/json" },  
      body: JSON.stringify({ justificativa: justification }),  
      signal: AbortSignal.timeout(15\_000),  
    });  
    if (\!response.ok) throw new FocusNFeError(await response.json());  
    return response.json();  
  }

  async downloadXML(ref: string): Promise\<string\> {  
    const url \= \`${this.baseUrl}/v2/nfce/${ref}.xml?token=${this.token}\`;  
    const response \= await fetch(url, {  
      headers: { Authorization: this.getAuth() },  
      signal: AbortSignal.timeout(10\_000),  
    });  
    return response.text(); // XML completo como string  
  }  
}

# **Estrutura de Arquivos**

apps/api/src/modules/fiscal/  
├── fiscal.routes.ts              \# Registro de rotas Fastify  
├── fiscal.service.ts             \# Orquestracao: emitir, cancelar, reconciliar  
├── fiscal.schemas.ts             \# Schemas Zod (request/response)  
├── focusnfe.service.ts           \# Integracao FocusNFe (HTTP calls)  
├── focusnfe.types.ts             \# Tipos do FocusNFe (request/response)  
├── payload-builder.ts            \# buildNFCePayload() e helpers de mapeamento  
├── ncm-mapper.ts                 \# Mapeamento Category \-\> NCM  
├── callback.handler.ts           \# Processamento do callback FocusNFe  
├── retry.worker.ts               \# Retry automatico com backoff  
├── reconciliation.worker.ts      \# Reconciliacao diaria  
└── \_\_tests\_\_/  
    ├── fiscal.test.ts              \# Testes unitarios  
    ├── payload-builder.test.ts     \# Testes de montagem de payload  
    └── focusnfe.mock.ts            \# Mock do FocusNFe para testes

## **UI Fiscal (apps/web-owner)**

Interface mínima no dashboard do dono para visualizar e gerenciar notas fiscais. Não é uma tela complexa — foco em visibilidade e ações corretivas.

| Componente | Arquivo | Responsabilidade |
| :---- | :---- | :---- |
| FiscalNotesList | pages/FiscalNotes.tsx | Lista de notas com filtros (status, data, check) |
| FiscalNoteDetail | components/FiscalNoteDetail.tsx | Detalhe: status, XML, DANFE link, histórico |
| FiscalDivergenceAlert | components/FiscalDivergenceAlert.tsx | Banner de divergências no dashboard |
| FiscalConfigWarning | components/FiscalConfigWarning.tsx | Aviso quando dados fiscais incompletos |

# **Estratégia de Homologação**

A homologação é obrigatória antes de emitir notas em produção. O FocusNFe oferece ambiente de homologação que simula o SEFAZ sem valor fiscal real.

## **Fases de Homologação**

| Fase | Ambiente | Objetivo | Critério de Aceitação |
| :---- | :---- | :---- | :---- |
| 1\. Testes unitários | Local (mock) | Validar payload builder, mapeamentos, orquestração | Todos os testes passam. Payload gerado corretamente. |
| 2\. Homologação FocusNFe | homologacao.focusnfe.com.br | Enviar notas reais ao SEFAZ de homologação | 10 notas autorizadas consecutivas. 1 cancelamento. |
| 3\. Validação com contador | Homologação | Contador do cliente valida XML e DANFE | Contador aprova formato e dados. |
| 4\. Produção controlada | api.focusnfe.com.br | Primeiras notas reais com acompanhamento | 5 notas emitidas e autorizadas em produção. |

### **Dados de Teste para Homologação**

O FocusNFe em homologação aceita qualquer CNPJ válido. Usar os dados do seed (Boteco do Zé) para testes. O ambiente retorna respostas simuladas do SEFAZ com status "autorizado" para payloads válidos.

# **Tratamento de Erros e Edge Cases**

| Cenário | Comportamento Esperado | HTTP |
| :---- | :---- | :---- |
| Dados fiscais incompletos na Unit | Skip emissão \+ Alert HIGH para dono. Operação não bloqueada. | N/A |
| FocusNFe indisponível | FiscalNote criada como ERROR. Retry automático (3x backoff). | N/A |
| SEFAZ rejeitou a nota | Status REJECTED. Alert HIGH com mensagem do SEFAZ. Ação manual. | N/A |
| SEFAZ instabilidade (timeout) | Status ERROR. Retry automático. Consulta status após 1h. | N/A |
| Cancelamento fora do prazo (\>24h) | 400: "Prazo de cancelamento expirado." | 400 |
| Cancelar nota não AUTHORIZED | 400: "Somente notas autorizadas podem ser canceladas." | 400 |
| Justificativa \< 15 caracteres | Validação Zod rejeita | 400 |
| Callback para nota desconhecida | 200 OK (idempotente, log warning, não processa) | 200 |
| Callback duplicado (já AUTHORIZED) | 200 OK (idempotente, não reprocessa) | 200 |
| Check PAID sem itens (cortesia total) | Skip emissão. Cortesias não geram NFC-e. | N/A |
| Check com múltiplos métodos pagamento | Payload inclui array formas\_pagamento com todos os métodos. | N/A |
| Produto sem NCM mapeado | Usar NCM genérico 2106.90.90 \+ log warning | N/A |
| XML \> limite do campo (Prisma Text) | FiscalNote.xml é @db.Text, sem limite prático. OK. | N/A |
| Retry exaurido (3 falhas) | Alert CRITICAL para dono. Botão retry manual no dashboard. | N/A |

# **Estratégia de Testes**

## **Cenários de Teste — Backend**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| buildNFCePayload — happy path | Unit | Payload montado corretamente com itens, NCM, pagamentos |
| buildNFCePayload — múltiplos métodos pag. | Unit | Array formas\_pagamento com CASH \+ PIX |
| buildNFCePayload — com desconto | Unit | valor\_desconto preenchido corretamente |
| buildNFCePayload — sem CPF cliente | Unit | Campos de destinatário omitidos |
| buildNFCePayload — cortesia excluída | Unit | Itens de cortesia não aparecem no payload |
| mapCategoryToNCM — todas categorias | Unit | Cada categoria mapeia para NCM correto |
| mapPaymentMethodToFiscal — todos métodos | Unit | CASH=01, PIX=17, CARD crédito=03, débito=04 |
| emitNFCeForCheck — happy path | Integration (mock) | Cria FiscalNote PENDING, envia, atualiza PROCESSING |
| emitNFCeForCheck — dados fiscais faltando | Unit | Cria Alert, skip emissão, não bloqueia |
| emitNFCeForCheck — FocusNFe down | Unit (mock) | FiscalNote \= ERROR, retry agendado |
| Callback — autorizado | Unit | PROCESSING → AUTHORIZED, XML salvo, danfeUrl salvo |
| Callback — rejeitado | Unit | PROCESSING → REJECTED, Alert criado |
| Callback — desconhecido | Unit | 200 OK, não processa, log warning |
| Cancelamento — sucesso | Integration (mock) | AUTHORIZED → CANCELLED, cancelledAt registrado |
| Cancelamento — fora do prazo | Unit | 400 retornado, nota não modificada |
| Retry — 3 tentativas com backoff | Unit | Retry agenda 30s, 2min, 10min. Após 3: Alert CRITICAL. |
| Reconciliação — detecta divergências | Integration | Checks sem nota \+ notas presas identificados |
| Relatório fiscal — totais corretos | Integration | Totais por status e método de pagamento corretos |

# **Impacto Downstream e Riscos**

## **Módulos que Dependem de PRD-06**

| PRD | Módulo | Como Usa Fiscal |
| :---- | :---- | :---- |
| PRD-02 | Payments | Check PAID dispara emissão automática. Função emitNFCeForCheck() chamada no checkPaymentCompletion. |
| PRD-03 | Cardápio Digital | Web-menu pode exibir link do DANFE ao cliente após pagamento. |
| PRD-07 | Fechamento | Relatório fiscal é parte do fechamento do dia. Divergências identificadas no DailyReport. |
| PRD-13 | Auditoria | Toda operação fiscal (emissão, cancelamento) registrada no AuditLog. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| NCM incorreto para o produto | Média | Médio | Mapeamento por Category com fallback genérico. Revisão com contador. Phase 2: NCM por Product. |
| CNPJ/IE não cadastrado na SEFAZ | Baixa | Alto | Validação prévia no cadastro da Unit. Homologação obrigatória antes de produção. |
| FocusNFe muda API (breaking change) | Baixa | Alto | Camada de abstração (FocusNFeService) isola dependência. Versão v2 no código. |
| XML perdido (banco corrompido) | Baixa | Crítico | Backup diário do PostgreSQL. XML também acessível via FocusNFe por 5 anos. |
| Emissão bloqueia operação (timeout) | Média | Alto | Emissão é assíncrona. Não bloqueia Check.status \= PAID. Nota criada PENDING/ERROR e processada em background. |
| Legislação fiscal muda | Baixa | Médio | FocusNFe abstrai mudanças do SEFAZ. OASYS só precisa atualizar campos se layout mudar. |
| Cliente não configura dados fiscais | Alta | Médio | Sistema opera sem fiscal (Alert \+ skip). Onboarding inclui checklist fiscal obrigatório. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| FocusNFe (intermediador) | Emissão direta ao SEFAZ | Emissão direta requer certificado digital A1, tratamento de XML complexo, e comunicação SOAP. FocusNFe abstrai tudo com REST/JSON. |
| Emissão assíncrona (não bloqueia pagamento) | Síncrona (bloquear até SEFAZ responder) | SEFAZ pode levar 5-30s para responder. Bloquear pagamento é inaceitável em bar lotado. |
| NCM por Category (não por Product) | NCM individual por produto | Simplifica Phase 1\. 95% dos produtos de uma categoria têm o mesmo NCM. Phase 2 refina. |
| Skip emissão sem dados fiscais | Bloquear operação | Não bloquear vendas por falta de cadastro fiscal. Alert insistente para o dono resolver. |
| Armazenar XML no banco (Text) | Armazenar em S3/bucket | Simplifica backup (já incluso no dump do PostgreSQL). Volume de Phase 1 não justifica storage externo. |
| Retry via setTimeout \+ cronjob | Fila dedicada (Redis/BullMQ) | Volume de Phase 1 não justifica infraestrutura de fila. setTimeout \+ cronjob é suficiente para MVP. |

# **Sequência de Implementação (2 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Backend: FocusNFeService \+ payload builder \+ NCM mapper \+ emitNFCeForCheck() \+ callback handler \+ retry worker \+ cancelamento. Testes unitários com mock do FocusNFe. | Emissão automática funcional em homologação. Callback processando. Cancelamento funcional. Retry automático. 18 testes passando. |
| Sprint 2 | Reconciliação diária \+ relatório fiscal \+ UI no web-owner (lista, detalhe, divergências, config warning) \+ homologação completa com FocusNFe \+ validação com contador. | Reconciliação funcional. Relatório no dashboard. 10 notas homologadas. Pronto para produção. |

OASYS PRD-06 — Fiscal & NFC-e  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*