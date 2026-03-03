

**OASYS**  
Sistema Operacional para Bares de Alto Volume

**PRD-14 — Delivery**  
Motoboys, rastreamento, áreas de entrega, taxas, gestão de entregadores

| Versão | 1.0 |
| :---- | :---- |
| **Data** | 02 de Março de 2026 |
| **Fase** | Phase 2 — Growth & Scale |
| **Sprints Estimados** | 2 sprints |
| **Complexidade** | Média |
| **Cobertura Atual** | 0% |
| **Dependências** | PRD-02 (Payments & CashRegister), PRD-03 (Cardápio Digital) |
| **Gap Modules** | M12 — Delivery |
| **Apps Afetadas** | apps/api \+ apps/web-menu \+ apps/web-owner |
| **Autor** | Claude (Opus 4.6) — Geração Automatizada |
| **Classificação** | Documento confidencial — Uso interno |

# **Resumo Executivo**

PRD-14 (Delivery) expande o OASYS para além do salão do estabelecimento. Com 0% de cobertura atual, este é um módulo inteiramente novo que adiciona a capacidade de aceitar pedidos para entrega, gerenciar entregadores (motoboys próprios ou freelancers), calcular taxas por distância, definir áreas de cobertura, e permitir que o cliente acompanhe sua entrega em tempo real.

Este PRD é o último da fila de prioridade por uma razão estratégica: o OASYS nasceu para bares de alto volume, onde delivery não é o canal primário. Porém, para restaurantes, padarias e outros estabelecimentos F\&B que o OASYS suportará, delivery é essencial. É também o diferenciador que evita dependência total de marketplaces como iFood e Rappi — que cobram 12-27% de comissão.

A dependência de PRD-02 (Payments) é óbvia: delivery requer pagamento online obrigatório (PIX ou cartão). A dependência de PRD-03 (Cardápio Digital) é igualmente crítica: o web-menu é o canal de entrada do pedido delivery. O cliente acessa o menu digital, escolhe "Delivery" em vez de "Mesa", informa o endereço, paga online, e acompanha.

Este PRD cobre cinco subsistemas:

**1\. Gestão de Entregadores —** Cadastro de motoboys próprios e freelancers. Disponibilidade em tempo real. Aceite de corrida. Histórico de entregas. Pagamento por entrega.

**2\. Áreas de Entrega e Taxas —** Zonas de cobertura circulares por raio ou poligonais. Taxa de entrega calculada por distância (fixa por zona ou progressiva por km). Horários de operação de delivery. Pedido mínimo por zona.

**3\. Fluxo do Pedido Delivery —** Cliente faz pedido no web-menu com endereço de entrega. Pagamento online obrigatório (pré-pagamento). Pedido entra na fila do KDS. Quando pronto, entregador é despachado. Ciclo de vida específico: PLACED → CONFIRMED → PREPARING → READY → PICKED\_UP → IN\_TRANSIT → DELIVERED.

**4\. Rastreamento em Tempo Real —** Entregador compartilha localização via GPS. Cliente vê posição no mapa com ETA estimado. WebSocket para atualizações. Notificação WhatsApp em cada transição de status.

**5\. Painel de Operações Delivery —** Visão do gerente/dono: pedidos delivery em andamento, entregadores disponíveis, mapa com entregas ativas, métricas (tempo médio, taxa de atraso, custos).

## **Escopo de Mudanças**

| Categoria | Quantidade | Impacto |
| :---- | :---- | :---- |
| Novos Models (Schema) | 4 | DeliveryDriver, DeliveryZone, DeliveryOrder, DeliveryTracking |
| Novos Enums | 3 | DeliveryOrderStatus, DriverStatus, DeliveryZoneType |
| Endpoints Novos | 20 | Entregadores, zonas, pedidos delivery, rastreamento |
| Serviços Novos | 4 | DriverService, DeliveryZoneService, DeliveryOrderService, TrackingService |
| Componentes React (web-menu) | \~6 | Fluxo delivery no cardápio digital |
| Componentes React (web-owner) | \~8 | Painel de operações delivery |
| Integrações Externas | 1 | Google Maps Geocoding API (endereço → coordenadas) |

## **Critério de Sucesso (Done Definition)**

O PRD-14 está concluído quando TODOS os seguintes critérios são atendidos:

1\. Estabelecimento aceita pedidos delivery via cardápio digital (web-menu).

2\. Entregadores cadastrados com disponibilidade em tempo real.

3\. Áreas de entrega configuradas com cálculo automático de taxa.

4\. Cliente vê status do pedido e posição do entregador no mapa.

5\. Pagamento online obrigatório para delivery (PIX ou cartão via PRD-02).

6\. Painel de operações no web-owner com visão de entregas ativas.

7\. Zero erros de tipo no monorepo.

# **Estado Atual (0%)**

Não existe nenhuma infraestrutura de delivery no OASYS. O módulo é construído inteiramente do zero. Porém, reutiliza amplamente infraestrutura existente:

| Infraestrutura Existente | Como Delivery Reutiliza |
| :---- | :---- |
| PRD-02: Payments (PIX, Cartão) | Pagamento online obrigatório. Mesmos endpoints POST /payments/pix e /payments/card. |
| PRD-03: web-menu (cardápio digital) | Mesmo app. Adiciona modo "delivery" com endereço e taxa. |
| PRD-05: KDS (fila de produção) | Pedido delivery entra na mesma fila KDS. Source \= DELIVERY. |
| PRD-09: WhatsApp (Isis) | Notificações de status ao cliente via WhatsApp. |
| WebSocket (existente) | Rastreamento em tempo real e atualização de status. |
| Order model (existente) | Order.source \= "DELIVERY". Check vinculado ao DeliveryOrder. |

# **Alterações no Schema**

Migration: prd14\_delivery. Todos os novos campos opcionais ou com default.

## **Novos Enums**

enum DeliveryOrderStatus {  
  PLACED         // Pedido recebido, aguardando confirmacao do estabelecimento  
  CONFIRMED      // Confirmado pelo estabelecimento, entrando na producao  
  PREPARING      // Em preparo no KDS  
  READY          // Pronto, aguardando entregador  
  PICKING\_UP     // Entregador a caminho do estabelecimento  
  PICKED\_UP      // Entregador retirou o pedido  
  IN\_TRANSIT     // Em transito para o cliente  
  DELIVERED      // Entregue ao cliente  
  CANCELLED      // Cancelado  
  FAILED         // Falha na entrega (endereco nao encontrado, etc)  
}

enum DriverStatus {  
  AVAILABLE      // Disponivel para novas entregas  
  BUSY           // Em entrega  
  OFFLINE        // Fora de servico  
  RETURNING      // Voltando ao estabelecimento  
}

enum DeliveryZoneType {  
  RADIUS         // Circulo por raio (km) a partir do estabelecimento  
  POLYGON        // Area poligonal customizada (GeoJSON)  
}

## **Novo Model: DeliveryDriver**

Entregador pode ser funcionário do estabelecimento (Employee com role=DRIVER) ou freelancer externo. Para freelancers, os dados ficam neste model. Para funcionários, employeeId vincula ao Employee.

model DeliveryDriver {  
  id              String          @id @default(cuid())  
  unitId          String  
  unit            Unit            @relation(fields: \[unitId\], references: \[id\])  
  employeeId      String?         // Se for funcionario do estabelecimento  
  employee        Employee?       @relation(fields: \[employeeId\], references: \[id\])  
  name            String          // Nome do entregador  
  phone           String          // Telefone (obrigatorio para contato)  
  cpf             String?         // CPF (obrigatorio para freelancer)  
  vehicleType     String          // MOTORCYCLE, BICYCLE, CAR, WALKING  
  vehiclePlate    String?         // Placa (se MOTORCYCLE ou CAR)  
  status          DriverStatus    @default(OFFLINE)  
  currentLat      Decimal?        @db.Decimal(10, 7\)  // Latitude atual  
  currentLng      Decimal?        @db.Decimal(10, 7\)  // Longitude atual  
  lastLocationAt  DateTime?       // Timestamp da ultima localizacao  
  isActive        Boolean         @default(true)  
  rating          Decimal?        @db.Decimal(3, 2\)   // Avaliacao media (1-5)  
  totalDeliveries Int             @default(0)  
  payPerDelivery  Decimal?        @db.Decimal(10, 2\)  // Valor fixo por entrega  
  payPerKm        Decimal?        @db.Decimal(10, 2\)  // Valor por km  
  createdAt       DateTime        @default(now())  
  updatedAt       DateTime        @updatedAt

  deliveryOrders  DeliveryOrder\[\]  
  trackingPoints  DeliveryTracking\[\]

  @@index(\[unitId, status\])  
}

## **Novo Model: DeliveryZone**

Zona de entrega com taxa e configurações. Cada zona pode ser um raio circular ou um polígono customizado. Zonas são priorizadas por ordem (sortOrder) — a primeira zona que contém o endereço é usada.

model DeliveryZone {  
  id              String            @id @default(cuid())  
  unitId          String  
  unit            Unit              @relation(fields: \[unitId\], references: \[id\])  
  name            String            // Ex: "Ate 3km", "Pinheiros/V.Madalena", "Zona Expandida"  
  type            DeliveryZoneType  // RADIUS ou POLYGON  
  radiusKm        Decimal?          @db.Decimal(5, 2\)  // Raio em km (se RADIUS)  
  polygon         String?           // GeoJSON FeatureCollection (se POLYGON)  
  deliveryFee     Decimal           @db.Decimal(10, 2\)  // Taxa de entrega fixa  
  feePerKm        Decimal?          @db.Decimal(10, 2\)  // Taxa adicional por km  
  minOrderAmount  Decimal?          @db.Decimal(10, 2\)  // Pedido minimo para esta zona  
  estimatedMinutes Int?             // Tempo estimado de entrega (minutos)  
  sortOrder       Int               @default(0)  // Prioridade (menor \= primeiro)  
  isActive        Boolean           @default(true)  
  color           String?           // Cor para visualizacao no mapa (\#hex)  
  maxDailyOrders  Int?              // Limite de pedidos/dia na zona (capacidade)  
  createdAt       DateTime          @default(now())  
  updatedAt       DateTime          @updatedAt

  @@index(\[unitId, isActive\])  
}

## **Novo Model: DeliveryOrder**

Pedido de entrega. Estende o Order/Check existente com dados específicos de delivery: endereço, entregador, rastreamento, taxa.

model DeliveryOrder {  
  id                String              @id @default(cuid())  
  unitId            String  
  unit              Unit                @relation(fields: \[unitId\], references: \[id\])  
  checkId           String              @unique  
  check             Check               @relation(fields: \[checkId\], references: \[id\])  
  driverId          String?  
  driver            DeliveryDriver?     @relation(fields: \[driverId\], references: \[id\])  
  status            DeliveryOrderStatus @default(PLACED)

  // Endereco de entrega  
  customerName      String  
  customerPhone     String  
  streetAddress     String  
  addressNumber     String  
  addressComplement String?  
  neighborhood      String  
  city              String  
  state             String              // UF  
  zipCode           String  
  latitude          Decimal?            @db.Decimal(10, 7\)  
  longitude         Decimal?            @db.Decimal(10, 7\)  
  deliveryNotes     String?             // Instrucoes: "portao azul", "andar 3"

  // Taxas e financeiro  
  deliveryFee       Decimal             @db.Decimal(10, 2\)  // Taxa cobrada do cliente  
  distanceKm        Decimal?            @db.Decimal(5, 2\)   // Distancia calculada  
  driverPay         Decimal?            @db.Decimal(10, 2\)  // Valor pago ao entregador

  // Tempos  
  estimatedMinutes  Int?                // Tempo estimado de entrega  
  confirmedAt       DateTime?           // Quando o estabelecimento confirmou  
  readyAt           DateTime?           // Quando ficou pronto  
  pickedUpAt        DateTime?           // Quando entregador retirou  
  deliveredAt       DateTime?           // Quando foi entregue  
  cancelledAt       DateTime?  
  cancelReason      String?

  // Avaliacao  
  customerRating    Int?                // 1-5 (cliente avalia a entrega)  
  customerFeedback  String?

  createdAt         DateTime            @default(now())  
  updatedAt         DateTime            @updatedAt

  trackingPoints    DeliveryTracking\[\]

  @@index(\[unitId, status\])  
  @@index(\[driverId, status\])  
}

## **Novo Model: DeliveryTracking**

Pontos de rastreamento GPS do entregador durante a entrega. Gravados a cada 15-30 segundos enquanto o pedido está em trânsito.

model DeliveryTracking {  
  id              String          @id @default(cuid())  
  deliveryOrderId String  
  deliveryOrder   DeliveryOrder   @relation(fields: \[deliveryOrderId\], references: \[id\])  
  driverId        String  
  driver          DeliveryDriver  @relation(fields: \[driverId\], references: \[id\])  
  latitude        Decimal         @db.Decimal(10, 7\)  
  longitude       Decimal         @db.Decimal(10, 7\)  
  speed           Decimal?        @db.Decimal(5, 2\)  // km/h  
  heading         Int?            // Direcao em graus (0-360)  
  accuracy        Decimal?        @db.Decimal(6, 2\)  // Precisao GPS em metros  
  createdAt       DateTime        @default(now())

  @@index(\[deliveryOrderId, createdAt\])  
}

## **Relações em Models Existentes**

| Model | Nova Relação | Tipo |
| :---- | :---- | :---- |
| Unit | deliveryDrivers DeliveryDriver\[\] | hasMany |
| Unit | deliveryZones DeliveryZone\[\] | hasMany |
| Unit | deliveryOrders DeliveryOrder\[\] | hasMany |
| Employee | deliveryDriver DeliveryDriver? | hasOne (se for entregador) |
| Check | deliveryOrder DeliveryOrder? | hasOne |

# **Áreas de Entrega e Taxas**

## **Modelo de Zonas**

O dono define zonas de entrega no web-owner. Cada zona tem uma taxa, tempo estimado e pedido mínimo. Zonas são avaliadas por sortOrder — a primeira que contém o endereço do cliente é usada.

### **Exemplo: Boteco do Zé — Pinheiros**

| Zona | Tipo | Raio/Área | Taxa | Pedido Mín. | Tempo Est. | Prioridade |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Vizinhança | RADIUS | 2 km | R$ 5,00 | R$ 30,00 | 20 min | 1 |
| Pinheiros/V.Madalena | RADIUS | 4 km | R$ 8,00 | R$ 40,00 | 30 min | 2 |
| Zona Expandida | RADIUS | 7 km | R$ 12,00 | R$ 60,00 | 45 min | 3 |
| Butantã/Lapa (custom) | POLYGON | GeoJSON | R$ 15,00 | R$ 50,00 | 40 min | 4 |

## **Cálculo de Distância e Taxa**

async function calculateDeliveryFee(params: {  
  unitId: string;  
  customerLat: number;  
  customerLng: number;  
}): Promise\<DeliveryFeeResult | null\> {

  const unit \= await prisma.unit.findUnique({ where: { id: params.unitId } });  
  // Coordenadas do estabelecimento (geocodificadas do endereco no Unit)  
  const unitLat \= Number(unit.latitude);  
  const unitLng \= Number(unit.longitude);

  // Distancia em linha reta (Haversine)  
  const distanceKm \= haversineDistance(  
    unitLat, unitLng,  
    params.customerLat, params.customerLng  
  );

  // Buscar zonas ativas ordenadas por prioridade  
  const zones \= await prisma.deliveryZone.findMany({  
    where: { unitId: params.unitId, isActive: true },  
    orderBy: { sortOrder: "asc" },  
  });

  // Encontrar primeira zona que contem o endereco  
  for (const zone of zones) {  
    if (zone.type \=== "RADIUS") {  
      if (distanceKm \<= Number(zone.radiusKm)) {  
        const fee \= Number(zone.deliveryFee)  
          \+ (zone.feePerKm ? distanceKm \* Number(zone.feePerKm) : 0);  
        return {  
          zoneId: zone.id,  
          zoneName: zone.name,  
          distanceKm: Math.round(distanceKm \* 100\) / 100,  
          deliveryFee: Math.round(fee \* 100\) / 100,  
          minOrderAmount: Number(zone.minOrderAmount) || 0,  
          estimatedMinutes: zone.estimatedMinutes,  
        };  
      }  
    } else if (zone.type \=== "POLYGON") {  
      const polygon \= JSON.parse(zone.polygon\!);  
      if (pointInPolygon(\[params.customerLng, params.customerLat\], polygon)) {  
        const fee \= Number(zone.deliveryFee)  
          \+ (zone.feePerKm ? distanceKm \* Number(zone.feePerKm) : 0);  
        return { /\* same structure \*/ };  
      }  
    }  
  }

  return null; // Endereco fora de todas as zonas  
}

## **Geocodificação de Endereços**

Quando o cliente informa o endereço (ou CEP), o sistema converte para coordenadas (lat/lng) usando a Google Maps Geocoding API. Alternativas gratuitas: Nominatim (OpenStreetMap) para redução de custo, com fallback para Google.

// apps/api/src/modules/delivery/geocoding.service.ts

interface GeocodingResult {  
  latitude: number;  
  longitude: number;  
  formattedAddress: string;  
  neighborhood?: string;  
  city?: string;  
  state?: string;  
}

export class GeocodingService {  
  // Tenta Nominatim primeiro (gratis), fallback Google  
  async geocode(address: string): Promise\<GeocodingResult | null\> {  
    const result \= await this.nominatimGeocode(address);  
    if (result) return result;  
    return this.googleGeocode(address);  
  }

  // CEP rapido: ViaCEP (gratis, brasileiro) retorna endereco  
  async geocodeByZipCode(zipCode: string): Promise\<GeocodingResult | null\> {  
    const viaCepResponse \= await fetch(  
      \`https://viacep.com.br/ws/${zipCode}/json/\`  
    );  
    const data \= await viaCepResponse.json();  
    if (data.erro) return null;  
    // Compor endereco completo e geocodificar  
    const fullAddress \= \`${data.logradouro}, ${data.bairro}, ${data.localidade} \- ${data.uf}\`;  
    return this.geocode(fullAddress);  
  }  
}

## **Configuração de Delivery por Unit**

Campos adicionais no Unit (ou configuração separada) para controlar delivery:

| Campo | Tipo | Default | Propósito |
| :---- | :---- | :---- | :---- |
| deliveryEnabled | Boolean | false | Habilita/desabilita delivery para a unidade |
| deliveryHoursStart | String? | null | Horário de início de aceitação (HH:mm). Null \= segue operatingHours |
| deliveryHoursEnd | String? | null | Horário de fim de aceitação |
| maxConcurrentDeliveries | Int? | null | Máximo de entregas simultâneas (null \= sem limite) |
| autoAcceptDelivery | Boolean | false | Aceitar pedidos automaticamente (sem confirmação manual) |
| autoAssignDriver | Boolean | false | Atribuir entregador automaticamente ao pedido ficar pronto |
| deliveryLatitude | Decimal? | null | Lat do estabelecimento (ponto de origem para cálculo de distância) |
| deliveryLongitude | Decimal? | null | Lng do estabelecimento |

# **Fluxo do Pedido Delivery**

## **Ciclo de Vida**

  Cliente no web-menu seleciona "Delivery"  
              |  
  Informa endereco (CEP ou endereco completo)  
              |  
  Sistema geocodifica e calcula zona/taxa  
              |  
  Pedido minimo atendido?  
     /              \\  
   NAO               SIM  
    |                 |  
  Aviso:          Monta pedido (itens \+ taxa delivery)  
  "Min R$X"        |  
                  Pagamento online obrigatorio (PIX ou cartao)  
                    |  
                  Payment PENDING (aguardando confirmacao)  
                    |  
                  Webhook confirma pagamento  
                    |  
  DeliveryOrder.status \= PLACED  
              |  
  autoAccept? \---SIM---\> CONFIRMED (auto)  
    |  
   NAO  
    |  
  Gerente/dono confirma no web-owner  
  DeliveryOrder.status \= CONFIRMED  
              |  
  Order entra no KDS (source=DELIVERY)  
  DeliveryOrder.status \= PREPARING  
              |  
  KDS marca como pronto  
  DeliveryOrder.status \= READY  
              |  
  Atribuir entregador (manual ou auto)  
  DeliveryOrder.status \= PICKING\_UP  
  Notificar entregador  
              |  
  Entregador confirma retirada  
  DeliveryOrder.status \= PICKED\_UP  
              |  
  Entregador em transito (GPS tracking)  
  DeliveryOrder.status \= IN\_TRANSIT  
              |  
  Entregador confirma entrega  
  DeliveryOrder.status \= DELIVERED  
  DeliveryOrder.deliveredAt \= now()  
              |  
  Cliente avalia (opcional)  
  DeliveryOrder.customerRating \= 1-5

## **Transições de Status**

| De | Para | Quem | Trigger | Notificação ao Cliente |
| :---- | :---- | :---- | :---- | :---- |
| (novo) | PLACED | Sistema | Pagamento confirmado | "Seu pedido foi recebido\!" |
| PLACED | CONFIRMED | Gerente/Auto | Aceitar pedido | "Pedido confirmado\! Preparo iniciado." |
| CONFIRMED | PREPARING | KDS | Pedido entra na produção | — (silencioso) |
| PREPARING | READY | KDS | Bump: pedido pronto | "Pedido pronto\! Entregador a caminho." |
| READY | PICKING\_UP | Gerente/Auto | Entregador atribuído | — (silencioso) |
| PICKING\_UP | PICKED\_UP | Entregador | Confirma retirada no app | "Entregador retirou seu pedido\!" |
| PICKED\_UP | IN\_TRANSIT | Sistema | Automático ao sair do raio | "Pedido a caminho\! Acompanhe:" \+ link |
| IN\_TRANSIT | DELIVERED | Entregador | Confirma entrega no app | "Pedido entregue\! Avalie:" \+ link |
| Qualquer | CANCELLED | Gerente | Cancelamento com motivo | "Pedido cancelado. Estorno em até 24h." |
| IN\_TRANSIT | FAILED | Entregador | Falha (endereço não encontrado) | "Problema na entrega. Entraremos em contato." |

## **Cancelamento e Estorno**

Delivery com pagamento online obrigatório implica em política de cancelamento específica:

| Momento do Cancelamento | Estorno | Regra |
| :---- | :---- | :---- |
| PLACED (antes de confirmar) | 100% automático | Cliente ainda pode cancelar livremente |
| CONFIRMED ou PREPARING | 100% com aprovação | Gerente cancela e autoriza estorno (aprovação dual PRD-13) |
| READY | 100% com aprovação | Perda de insumos. Gerente decide. Registra motivo. |
| PICKED\_UP ou IN\_TRANSIT | Parcial ou nenhum | Avaliado caso a caso. Pré-autorização do dono. |
| DELIVERED | Nenhum automático | Reclamação: estorno manual pelo dono se justificado. |

# **Gestão de Entregadores**

## **Tipos de Entregador**

| Tipo | Cadastro | Pagamento | Vinculado a |
| :---- | :---- | :---- | :---- |
| Funcionário (DRIVER) | Employee com role DRIVER adicionado ao enum | Salário \+ gorjeta (PRD-12) | Employee.id via DeliveryDriver.employeeId |
| Freelancer | Cadastro direto no DeliveryDriver | Por entrega (fixo \+ km) | DeliveryDriver apenas |

## **Disponibilidade em Tempo Real**

Entregadores reportam disponibilidade através de status que atualiza via WebSocket ou chamada periódica:

| Status | Significado | Pode receber pedido? |
| :---- | :---- | :---- |
| AVAILABLE | Online e pronto para entregar | Sim |
| BUSY | Em entrega ativa | Não (mas pode receber próxima se quase finalizando) |
| RETURNING | Voltando ao estabelecimento após entrega | Sim (se rota compatível) |
| OFFLINE | Fora de serviço | Não |

## **Atribuição de Entregador**

Dois modos configuráveis:

**Manual:** Quando pedido fica READY, gerente vê entregadores disponíveis e atribui um. Mais controle, mas requer intervenção.

**Automático:** Sistema escolhe o melhor entregador disponível baseado em: (1) distância atual até o estabelecimento, (2) quantidade de entregas realizadas no dia (balanceamento), (3) rating.

async function autoAssignDriver(deliveryOrderId: string): Promise\<DeliveryDriver | null\> {  
  const order \= await prisma.deliveryOrder.findUnique({  
    where: { id: deliveryOrderId },  
    include: { unit: true },  
  });

  const availableDrivers \= await prisma.deliveryDriver.findMany({  
    where: {  
      unitId: order.unitId,  
      status: { in: \["AVAILABLE", "RETURNING"\] },  
      isActive: true,  
    },  
  });

  if (availableDrivers.length \=== 0\) return null;

  // Score: menor distancia \+ menor entregas hoje \+ maior rating  
  const scored \= availableDrivers.map(d \=\> {  
    const distance \= d.currentLat && d.currentLng  
      ? haversineDistance(  
          Number(d.currentLat), Number(d.currentLng),  
          Number(order.unit.deliveryLatitude), Number(order.unit.deliveryLongitude)  
        )  
      : 999; // Sem localizacao \= prioridade baixa  
    return {  
      driver: d,  
      score: (1 / (distance \+ 0.1)) \* 0.5  // Peso distancia: 50%  
        \+ (1 / (d.totalDeliveries \+ 1)) \* 0.3  // Peso balanceamento: 30%  
        \+ (Number(d.rating || 3\) / 5\) \* 0.2,  // Peso rating: 20%  
    };  
  });

  scored.sort((a, b) \=\> b.score \- a.score);  
  return scored\[0\].driver;  
}

## **Pagamento do Entregador**

Entregadores freelancers recebem por entrega. O valor é calculado e registrado em DeliveryOrder.driverPay:

function calculateDriverPay(driver: DeliveryDriver, distanceKm: number): number {  
  const fixedPay \= Number(driver.payPerDelivery || 0);  
  const kmPay \= Number(driver.payPerKm || 0\) \* distanceKm;  
  return Math.round((fixedPay \+ kmPay) \* 100\) / 100;  
}

// Exemplo: R$5 fixo \+ R$1,50/km para entrega de 4,2km  
// driverPay \= 5.00 \+ (1.50 \* 4.2) \= R$11,30  
Consolidação no fechamento (PRD-07): DailyReport inclui total de entregas, total pago a entregadores, e margem (taxa cobrada \- custo entregador).

# **Rastreamento em Tempo Real**

## **Arquitetura de Tracking**

  Entregador (celular)           API Server              Cliente (web-menu)  
       |                             |                        |  
       |-- POST /tracking/update \--\> |                        |  
       |   (lat, lng, speed)         |                        |  
       |                             |-- WebSocket push \-----\>|  
       |                             |   (position update)    |  
       |                             |                        |  
       | (a cada 15-30s)             |-- Salvar no banco \----\>|  
       |                             |   DeliveryTracking     |  
       |                             |                        |  
       |                             |-- Calcular ETA \-------\>|  
       |                             |   (distancia/speed)    |

## **Endpoint de Tracking do Entregador**

// POST /delivery/tracking/update  
// Chamado pelo app/PWA do entregador a cada 15-30 segundos  
const UpdateTrackingSchema \= z.object({  
  deliveryOrderId: z.string().cuid(),  
  latitude: z.number().min(-90).max(90),  
  longitude: z.number().min(-180).max(180),  
  speed: z.number().min(0).optional(),     // km/h  
  heading: z.number().min(0).max(360).optional(),  
  accuracy: z.number().min(0).optional(),  // metros  
});

// Logica:  
// 1\. Salvar DeliveryTracking no banco  
// 2\. Atualizar DeliveryDriver.currentLat/Lng  
// 3\. Publicar via WebSocket para o canal do pedido  
// 4\. Recalcular ETA

## **Cálculo de ETA**

function calculateETA(params: {  
  driverLat: number;  
  driverLng: number;  
  destinationLat: number;  
  destinationLng: number;  
  currentSpeed: number;  // km/h  
}): number {  // minutos

  const remainingKm \= haversineDistance(  
    params.driverLat, params.driverLng,  
    params.destinationLat, params.destinationLng  
  );

  // Velocidade media de motoboy em SP: 20-30 km/h (transito)  
  const effectiveSpeed \= params.currentSpeed \> 5  
    ? params.currentSpeed  
    : 25;  // Fallback: 25 km/h

  const etaMinutes \= (remainingKm / effectiveSpeed) \* 60;

  // Arredondar para cima com margem de 2 min (semaforos, portaria)  
  return Math.ceil(etaMinutes) \+ 2;  
}

## **Visão do Cliente**

O cliente acompanha a entrega no web-menu após fazer o pedido. A tela mostra:

• Status atual com timeline visual (PLACED → CONFIRMED → PREPARING → READY → PICKED\_UP → IN\_TRANSIT → DELIVERED).

• Mapa com posição do entregador (quando IN\_TRANSIT) e endereço de destino.

• ETA estimado com countdown atualizado a cada 15 segundos.

• Nome e telefone do entregador (para contato direto se necessário).

• Botão "Avaliar Entrega" após DELIVERED.

# **Especificação de API — Endpoints**

## **Entregadores**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /delivery/drivers | MANAGER, OWNER | Listar entregadores (filtro: status, isActive) |
| POST | /delivery/drivers | MANAGER, OWNER | Cadastrar novo entregador |
| PUT | /delivery/drivers/:id | MANAGER, OWNER | Atualizar dados do entregador |
| PATCH | /delivery/drivers/:id/status | DRIVER, MANAGER | Atualizar status (AVAILABLE, OFFLINE, etc) |
| DELETE | /delivery/drivers/:id | OWNER | Desativar entregador |

## **Zonas de Entrega**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| GET | /delivery/zones | MANAGER, OWNER | Listar zonas de entrega |
| POST | /delivery/zones | OWNER | Criar nova zona |
| PUT | /delivery/zones/:id | OWNER | Editar zona |
| DELETE | /delivery/zones/:id | OWNER | Desativar zona |
| POST | /delivery/zones/check | PUBLIC | Verificar se endereço está na área \+ calcular taxa |

## **Pedidos Delivery**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /delivery/orders | PUBLIC (session) | Criar pedido delivery (via web-menu) |
| GET | /delivery/orders | MANAGER, OWNER | Listar pedidos delivery (filtros: status, data, driver) |
| GET | /delivery/orders/:id | PUBLIC (session), MANAGER, OWNER | Detalhe do pedido (status, rastreamento) |
| PATCH | /delivery/orders/:id/status | MANAGER, DRIVER | Atualizar status do pedido |
| POST | /delivery/orders/:id/assign | MANAGER | Atribuir entregador ao pedido |
| POST | /delivery/orders/:id/rate | PUBLIC (session) | Cliente avalia a entrega |

## **Rastreamento**

| Método | Rota | Auth | Descrição |
| :---- | :---- | :---- | :---- |
| POST | /delivery/tracking/update | DRIVER | Entregador envia posição GPS |
| GET | /delivery/tracking/:orderId | PUBLIC (session), MANAGER | Posição atual \+ ETA do pedido |
| GET | /delivery/tracking/:orderId/history | MANAGER, OWNER | Histórico completo de pontos GPS |

# **UI — Web Menu e Web Owner**

## **Web Menu — Fluxo do Cliente**

| Componente | Tela | Responsabilidade |
| :---- | :---- | :---- |
| DeliveryToggle | Home do menu | Switch entre "Comer no local" e "Delivery" no topo do cardápio |
| AddressForm | Checkout delivery | CEP \+ endereço completo \+ complemento \+ instruções |
| DeliveryFeeCard | Checkout delivery | Exibe zona, taxa calculada, tempo estimado, pedido mínimo |
| DeliveryCheckout | Checkout delivery | Resumo: itens \+ taxa delivery \+ total. Pagamento obrigatório. |
| DeliveryTracker | Pós-pedido | Timeline de status \+ mapa com entregador \+ ETA |
| DeliveryRating | Pós-entrega | Estrelas 1-5 \+ feedback texto (opcional) |

## **Web Menu — Layout do Checkout Delivery**

┌────────────────────────────────────────┐  
│  ← Voltar       Entrega                 │  
├────────────────────────────────────────┤  
│                                        │  
│  Endereco de entrega:                  │  
│  CEP: \[05422-012\]  \[Buscar\]            │  
│  Rua: \[Rua dos Pinheiros       \]       │  
│  Numero: \[456\] Complemento: \[Apt 12\]   │  
│  Bairro: Pinheiros                     │  
│  Instrucoes: \[Portao azul, 3o andar\]   │  
│                                        │  
│  ┌──────────────────────────────────┐  │  
│  │  Zona: Pinheiros/V.Madalena      │  │  
│  │  Distancia: 2,8 km               │  │  
│  │  Taxa de entrega: R$ 8,00        │  │  
│  │  Tempo estimado: \~30 min         │  │  
│  └──────────────────────────────────┘  │  
│                                        │  
│  Itens:            R$ 106,60           │  
│  Taxa de entrega:  R$   8,00           │  
│  ────────────────────────            │  
│  TOTAL:            R$ 114,60           │  
│                                        │  
│  Seu nome: \[Joao\]                      │  
│  Telefone: \[(11) 99999-1234\]           │  
│                                        │  
│  ┌────────────┐ ┌─────────────┐       │  
│  │    PIX     │ │   Cartao    │       │  
│  └────────────┘ └─────────────┘       │  
│                                        │  
└────────────────────────────────────────┘

## **Web Owner — Painel de Delivery**

| Tela | Rota | Descrição |
| :---- | :---- | :---- |
| Delivery Dashboard | /delivery | Visão geral: pedidos ativos, entregadores online, KPIs do dia |
| Pedidos Delivery | /delivery/orders | Lista de pedidos com filtros (status, data). Aceitar, despachar, cancelar. |
| Mapa de Entregas | /delivery/map | Mapa com entregas ativas e entregadores em tempo real |
| Entregadores | /delivery/drivers | CRUD de entregadores. Status, histórico, pagamento acumulado. |
| Zonas de Entrega | /delivery/zones | Configuração visual de zonas no mapa. Taxas e limites. |
| Configurações | /delivery/settings | Liga/desliga delivery, horários, auto-accept, auto-assign. |

## **Web Owner — Layout do Dashboard Delivery**

┌─────────────────────────────────────────────┐  
│  Delivery Operations               🟢 Online │  
├─────────────────────────────────────────────┤  
│                                                 │  
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐  │  
│  │ Pedidos │ │ Em       │ │ Entreg. │ │ Tempo  │  │  
│  │ Hoje: 23│ │ Transito:│ │ Online: │ │ Medio: │  │  
│  │         │ │    4    │ │   3    │ │ 32 min │  │  
│  └─────────┘ └─────────┘ └─────────┘ └────────┘  │  
│                                                 │  
│  ┌─────────────────────────────────────────┐  │  
│  │  Pedidos aguardando acao:                   │  │  
│  │                                             │  │  
│  │  \#127 Joao \- Rua Augusta 456    \[Confirmar\]│  │  
│  │  \#128 Maria \- Al. Santos 789    \[Despachar\]│  │  
│  │  \#125 Pedro \- R. Pinheiros 12   ENTREGANDO │  │  
│  └─────────────────────────────────────────┘  │  
│                                                 │  
│  Entregadores:                                  │  
│  🟢 Carlos (moto) \- Disponivel \- 0.5km         │  
│  🟡 Ana (bike) \- Em entrega \#125 \- 2.1km       │  
│  🟢 Rafael (moto) \- Retornando \- 1.8km         │  
│  🔴 Lucas (moto) \- Offline                     │  
│                                                 │  
└─────────────────────────────────────────────┘

## **Componentes React**

| Componente | App | Responsabilidade |
| :---- | :---- | :---- |
| DeliveryToggle | web-menu | Switch entre modo presencial e delivery |
| AddressForm | web-menu | Formulário de endereço com auto-fill por CEP (ViaCEP) |
| DeliveryFeeCard | web-menu | Exibe zona, taxa, tempo estimado |
| DeliveryCheckout | web-menu | Checkout específico com taxa \+ pagamento obrigatório |
| DeliveryTracker | web-menu | Rastreamento: timeline \+ mapa \+ ETA |
| DeliveryRating | web-menu | Avaliação pós-entrega (estrelas \+ texto) |
| DeliveryDashboard | web-owner | KPIs \+ pedidos ativos \+ entregadores |
| DeliveryOrderList | web-owner | Lista de pedidos com ações (confirmar, despachar) |
| DeliveryMap | web-owner | Mapa com entregas ativas e entregadores |
| DriverManager | web-owner | CRUD de entregadores com status |
| ZoneEditor | web-owner | Editor visual de zonas no mapa (raio \+ polígono) |
| DeliverySettings | web-owner | Configurações de delivery por unidade |
| DriverCard | web-owner | Card de entregador com status e métricas |
| DeliveryOrderCard | web-owner | Card de pedido delivery com timeline de status |

# **Estrutura de Arquivos**

apps/api/src/modules/delivery/  
├── delivery.routes.ts            \# Registro de todas as rotas  
├── delivery-order.service.ts     \# Criar, confirmar, despachar, cancelar pedidos  
├── driver.service.ts             \# CRUD entregadores, atribuicao, status  
├── delivery-zone.service.ts      \# CRUD zonas, calculo de taxa e distancia  
├── tracking.service.ts           \# Gravar posicao, calcular ETA, WebSocket push  
├── geocoding.service.ts          \# ViaCEP \+ Nominatim \+ Google Maps fallback  
├── delivery.schemas.ts           \# Schemas Zod  
├── haversine.ts                  \# Calculo de distancia (utility)  
└── \_\_tests\_\_/  
    ├── delivery-order.test.ts  
    ├── driver.test.ts  
    ├── delivery-zone.test.ts  
    └── tracking.test.ts

apps/web-menu/src/  
├── pages/  
│   └── DeliveryCheckoutPage.tsx  
├── components/  
│   ├── DeliveryToggle.tsx  
│   ├── AddressForm.tsx  
│   ├── DeliveryFeeCard.tsx  
│   ├── DeliveryTracker.tsx  
│   └── DeliveryRating.tsx  
└── stores/  
    └── delivery.store.ts

apps/web-owner/src/  
├── pages/  
│   ├── DeliveryDashboard.tsx  
│   ├── DeliveryOrders.tsx  
│   ├── DeliveryDrivers.tsx  
│   ├── DeliveryZones.tsx  
│   └── DeliverySettings.tsx  
├── components/  
│   ├── DeliveryMap.tsx  
│   ├── DeliveryOrderCard.tsx  
│   ├── DriverCard.tsx  
│   └── ZoneEditor.tsx  
└── stores/  
    └── delivery.store.ts

# **Estratégia de Testes**

| Teste | Tipo | O que valida |
| :---- | :---- | :---- |
| Zona RADIUS — endereço dentro | Unit | Endereço a 2km retorna zona de 3km com taxa correta |
| Zona RADIUS — endereço fora | Unit | Endereço a 10km retorna null (fora de cobertura) |
| Zona POLYGON — point-in-polygon | Unit | Ponto dentro do polígono retorna zona correta |
| Taxa progressiva — fixo \+ km | Unit | R$5 \+ R$1,50/km para 4km \= R$11,00 |
| Pedido mínimo — bloqueio | Unit | Pedido de R$25 em zona com mínimo R$40 retorna erro |
| Criar pedido delivery — sucesso | Unit | DeliveryOrder criado com endereço, taxa, PLACED |
| Criar pedido — pagamento obrigatório | Unit | Sem pagamento confirmado, pedido não entra em produção |
| Ciclo completo — PLACED a DELIVERED | Integration | Todas as transições de status corretas com timestamps |
| Cancelamento PLACED — estorno 100% | Unit | Payment estornado automaticamente, DeliveryOrder CANCELLED |
| Cancelamento PICKED\_UP — sem estorno | Unit | Requer aprovação do dono. Sem estorno automático. |
| Atribuição automática — melhor driver | Unit | Driver mais próximo e disponível selecionado |
| Atribuição — nenhum disponível | Unit | Retorna null, pedido permanece READY |
| Tracking — gravar posição | Unit | DeliveryTracking criado, driver.currentLat/Lng atualizado |
| ETA — cálculo | Unit | 3km a 25km/h \= \~10min (+ margem 2min \= 12min) |
| Driver pagamento — cálculo | Unit | R$5 fixo \+ R$1,50 x 4,2km \= R$11,30 |
| Geocodificação CEP — ViaCEP | Unit (mock) | CEP 05422-012 retorna Rua dos Pinheiros, Pinheiros, SP |
| Avaliação — rating atualizado | Unit | Rating médio do driver recalculado após avaliação |
| Delivery desabilitado — bloqueio | Unit | Unit com deliveryEnabled=false rejeita pedidos delivery |
| Haversine — precisão | Unit | Distância entre 2 pontos conhecidos correta (±0.01km) |

# **Impacto Downstream e Riscos**

## **Dependências de Entrada**

| PRD | O que fornece para PRD-14 |
| :---- | :---- |
| PRD-02 | Pagamento online (PIX, cartão): obrigatório para delivery. Mesmos endpoints reutilizados. |
| PRD-03 | web-menu: canal de entrada do pedido. Cliente seleciona "Delivery" no mesmo cardápio. |
| PRD-05 | KDS: pedido delivery entra na mesma fila de produção (source=DELIVERY). |
| PRD-09 | WhatsApp: notificações de status ao cliente em cada transição. |
| PRD-13 | Aprovação dual: cancelamento após READY requer aprovação. Auditoria de estornos. |

## **Módulos que se Beneficiam de PRD-14**

| PRD | Como se Beneficia |
| :---- | :---- |
| PRD-07 | Fechamento: delivery no DailyReport. Taxas cobradas vs custo de entregadores. Margem de delivery. |
| PRD-08 | Estoque: baixa automática por pedido delivery (mesmo mecanismo de venda presencial). |
| PRD-10 | Dashboard: métricas de delivery (volume, tempo médio, área de cobertura, taxa de avaliação). |
| PRD-11 | CRM: cliente delivery é identificado por telefone. Histórico de pedidos delivery. |
| PRD-12 | Pessoas: entregadores como role DRIVER. Comissão e performance. |

## **Riscos e Mitigações**

| Risco | Probabilidade | Impacto | Mitigação |
| :---- | :---- | :---- | :---- |
| Geocodificação imprecisa (endereço errado) | Média | Médio | ViaCEP \+ Nominatim \+ Google fallback. Confirmação visual no mapa pelo cliente. |
| GPS do entregador impreciso | Alta | Baixo | Campo accuracy no tracking. Filtrar pontos com accuracy \> 100m. Suavização de rota. |
| Entregador não aparece para retirar | Média | Alto | Timeout: se READY há \> 15 min sem entregador, alerta ao gerente. Opção de re-assign. |
| Cliente informa endereço errado | Alta | Médio | Campo deliveryNotes para instruções. Telefone obrigatório. Entregador pode ligar. |
| Custo de API do Google Maps | Baixa | Baixo | Nominatim (gratis) como primário. Google só como fallback. Cache de resultados. |
| Volume de tracking data no banco | Média | Baixo | Retenção: 7 dias para pontos GPS. Histórico resumido após. Partição por data. |
| Canibalização de receita do salão | Baixa | Baixo | Delivery é adicional, não substitui. Pedido mínimo garante ticket. Taxa cobre custo operacional. |

## **Decisões de Arquitetura**

| Decisão | Alternativa Descartada | Razão |
| :---- | :---- | :---- |
| DeliveryOrder separado (não embed no Order) | Campos de delivery no Order | Order é genérico (mesa, balcão, WhatsApp, delivery). Dados específicos de entrega justificam model separado. |
| Haversine (não Google Directions) | Google Directions API para distância real | Directions é caro e lento. Haversine é suficiente para cálculo de taxa. Precisão de metros não importa para zona. |
| ViaCEP \+ Nominatim (não só Google) | Só Google Maps | Custo. ViaCEP é gratuito e excelente para CEP brasileiro. Nominatim para geocoding gratuito. Google é fallback. |
| Tracking no banco (não só memória) | Redis Streams para tracking | Volume de um bar (5-20 entregas/dia) não justifica Redis. PostgreSQL aguenta. Redis se escalar. |
| Zonas configuráveis (não taxa fixa) | Taxa única para todo delivery | Distâncias diferentes têm custos diferentes. Zonas permitem estratégia de preço. Flexibilidade \> simplicidade. |
| Pagamento online obrigatório | Dinheiro na entrega | Cash on delivery gera problemas: calote, entregador com dinheiro, reconciliação. Online-only para MVP. |

# **Sequência de Implementação (2 Sprints)**

| Sprint | Escopo | Entregável |
| :---- | :---- | :---- |
| Sprint 1 | Schema: migration com 4 novos models \+ 3 enums \+ campos no Unit. Backend: DeliveryZoneService (CRUD zonas \+ cálculo de taxa \+ point-in-polygon), GeocodingService (ViaCEP \+ Nominatim \+ Google fallback), DriverService (CRUD entregadores \+ status \+ atribuição), DeliveryOrderService (criar pedido \+ ciclo de vida \+ cancelamento). Frontend web-menu: DeliveryToggle, AddressForm, DeliveryFeeCard, DeliveryCheckout. Frontend web-owner: DeliveryZones (ZoneEditor), DeliveryDrivers. | Cliente faz pedido delivery completo no web-menu. Endereço geocodificado, taxa calculada, pagamento online, pedido entra no KDS. Entregadores cadastrados e atribuíveis. |
| Sprint 2 | Backend: TrackingService (gravar GPS, ETA, WebSocket push), auto-assign driver, notificações WhatsApp em cada transição, avaliação pós-entrega. Frontend web-menu: DeliveryTracker (timeline \+ mapa \+ ETA), DeliveryRating. Frontend web-owner: DeliveryDashboard (KPIs \+ pedidos ativos), DeliveryMap (mapa em tempo real), DeliverySettings. Testes E2E \+ polish. | Rastreamento em tempo real com mapa e ETA. Entregador despachado automaticamente. Cliente acompanha entrega. Dashboard operacional completo. Métricas de delivery. |

## **Configurações de Ambiente**

| Env Var | Valor | Propósito |
| :---- | :---- | :---- |
| GOOGLE\_MAPS\_API\_KEY | AIza... | Geocoding API (fallback). Restringir por IP/referrer. |
| NOMINATIM\_BASE\_URL | https://nominatim.openstreetmap.org | Geocoding gratuito (primário). Respeitar rate limit (1 req/s). |
| DELIVERY\_TRACKING\_INTERVAL\_MS | 15000 | Intervalo de envio de GPS pelo entregador (ms). |
| DELIVERY\_TRACKING\_RETENTION\_DAYS | 7 | Dias de retenção de pontos GPS detalhados. |

OASYS PRD-14 — Delivery  
Gerado automaticamente por Claude (Opus 4.6) — 02/03/2026  
*Documento confidencial — Uso interno*