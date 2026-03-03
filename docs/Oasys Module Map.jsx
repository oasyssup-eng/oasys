import { useState } from "react";

const PHASES = {
    1: {
        title: "Phase 1 — Go-Live",
        subtitle: "Sistema operacional end-to-end para primeiro cliente",
        color: "#22c55e",
        bgColor: "rgba(34, 197, 94, 0.06)",
    },
    2: {
        title: "Phase 2 — Growth & Scale",
        subtitle: "Diferenciação, automação e expansão de mercado",
        color: "#3b82f6",
        bgColor: "rgba(59, 130, 246, 0.06)",
    },
};

const MODULES = [
    {
        id: "PRD-01",
        name: "Schema Foundation",
        subtitle: "Prisma models, enums, campos fiscais, OrderPolicy",
        phase: 1,
        order: 1,
        sprints: 1,
        complexity: "Média",
        currentCoverage: "~30%",
        dependencies: [],
        gapModules: ["M3", "M4", "M5", "M9", "M11"],
        app: "packages/database",
        keyDeliverables: [
            "Campos fiscais no Unit (CNPJ, IE, razão social, endereço)",
            "CashRegister model completo",
            "OrderPolicy enum (PRE_PAYMENT, POST_PAYMENT, HYBRID)",
            "StockItem + StockMovement models",
            "authorizedBy no Cancellation",
            "Employee expandido (cpf, email, phone, isActive)",
            "serviceFeeRate no Unit",
            "orderNumber sequencial no Order",
        ],
        doneDefinition:
            "Migrations aplicadas, seed atualizado, zero erros de tipo no monorepo inteiro. Schema suporta todas as features de Phase 1.",
        rationale:
            "Sem schema correto, todo módulo construído sobre ele terá tech debt. Investimento de 1 sprint que evita retrabalho em todos os outros.",
    },
    {
        id: "PRD-02",
        name: "Payments & CashRegister",
        subtitle: "Dinheiro, PIX, cartão online, abertura/fechamento de caixa",
        phase: 1,
        order: 2,
        sprints: 3,
        complexity: "Alta",
        currentCoverage: "0%",
        dependencies: ["PRD-01"],
        gapModules: ["M4"],
        app: "apps/api + apps/web-waiter",
        keyDeliverables: [
            "POST /payments (cash, pix, card) — registro e processamento",
            "Integração Pagar.me para PIX (QR dinâmico) e cartão (link)",
            "Webhook de confirmação de pagamento",
            "CashRegister: abertura, operações, fechamento, reconciliação",
            "CashRegister tipo DIGITAL (automático) vs OPERADOR",
            "Pagamento parcial e múltiplos pagamentos por Check",
            "Check atualiza status quando totalmente pago",
            "UI no web-waiter para registrar pagamento presencial",
        ],
        doneDefinition:
            "Cliente pode pagar via PIX, cartão ou dinheiro. Caixa abre, registra operações e fecha com reconciliação. Todos os pagamentos vinculados a CashRegister.",
        rationale:
            "Sem pagamento, sistema é vitrine. Tudo depende disso: menu digital, fechamento, fiscal. É o gap mais crítico do OASYS.",
    },
    {
        id: "PRD-03",
        name: "Cardápio Digital",
        subtitle: "web-menu: QR Code → cardápio → pedido → pagamento → status",
        phase: 1,
        order: 3,
        sprints: 4,
        complexity: "Alta",
        currentCoverage: "~15%",
        dependencies: ["PRD-01", "PRD-02"],
        gapModules: ["M1", "M5"],
        app: "apps/web-menu (NOVO)",
        keyDeliverables: [
            "Nova app apps/web-menu no monorepo (React + Vite + Tailwind)",
            "Acesso público via slug do estabelecimento + parâmetro de mesa",
            "Navegação no cardápio com categorias, busca, filtros",
            "Montagem de pedido com modificadores e observações",
            "OrderPolicy: fluxo pré-pagamento e pós-pagamento",
            "Integração com Payments (PIX/cartão no menu)",
            "Status do pedido em tempo real via WebSocket",
            "Identificação: mesa (QR) ou nome/apelido (balcão)",
            "Responsivo mobile-first (cliente usa celular)",
        ],
        doneDefinition:
            "Cliente scanneia QR, vê cardápio, monta pedido, paga (se pré-pagamento), e acompanha status. Pedido chega no KDS e notifica garçom.",
        rationale:
            "Principal ponto de entrada do cliente na Phase 1. Substitui WhatsApp/Isis até Phase 2. Define a experiência do cliente final.",
    },
    {
        id: "PRD-04",
        name: "PDV & Gestão de Pedidos",
        subtitle: "web-waiter: mapa de mesas, pedidos, notificações, conta",
        phase: 1,
        order: 4,
        sprints: 3,
        complexity: "Média-Alta",
        currentCoverage: "~45%",
        dependencies: ["PRD-01", "PRD-02"],
        gapModules: ["M2", "M3"],
        app: "apps/web-waiter",
        keyDeliverables: [
            "Notificações reais via WebSocket (substituir mocks)",
            "Dividir conta (igual, por itens, personalizado)",
            "Juntar contas de mesas/comandas diferentes",
            "Transferir itens entre contas",
            "Registro de pagamento presencial (dinheiro, maquininha)",
            "Status DELIVERED com confirmação de entrega",
            "Cores de mesa funcionais (verde/vermelho/amarelo/estrela)",
            "Modo offline básico (PWA + IndexedDB + sync)",
        ],
        doneDefinition:
            "Garçom recebe notificações reais, gerencia mesas e pedidos, divide/junta contas, registra pagamentos e confirma entregas. App funciona offline com sync.",
        rationale:
            "Fusão de M2 (Garçom) e M3 (PDV) porque são o mesmo frontend. ~45% já existe — foco em completar operações críticas que faltam.",
    },
    {
        id: "PRD-05",
        name: "KDS & Produção",
        subtitle: "web-kds: fila de pedidos, bump, entrega, tempo médio",
        phase: 1,
        order: 5,
        sprints: 2,
        complexity: "Média",
        currentCoverage: "~33%",
        dependencies: ["PRD-01"],
        gapModules: ["M7"],
        app: "apps/web-kds",
        keyDeliverables: [
            "Status DELIVERED com botão e endpoint funcional",
            "Notificação ao cliente quando pedido fica READY",
            "Receber pedidos do web-menu (novo canal)",
            "Sequenciamento de cursos (entrada → principal → sobremesa)",
            "Hold/pause de pedido ('segurar pedido')",
            "Painel de retirada (TV mode) com senhas prontas",
            "Controle de cortesias e consumo interno",
        ],
        doneDefinition:
            "Bartender/cozinheiro recebe pedidos de todos os canais, gerencia fila, marca preparo/pronto/entregue. Cliente é notificado. Painel de retirada funcional.",
        rationale:
            "KDS é 33% pronto. Foco em completar o fluxo end-to-end e integrar com web-menu. Sprint mais curto porque base já existe.",
    },
    {
        id: "PRD-06",
        name: "Fiscal & NFC-e",
        subtitle: "Emissão de nota fiscal via FocusNFe, XML, DANFE",
        phase: 1,
        order: 6,
        sprints: 2,
        complexity: "Alta",
        currentCoverage: "0%",
        dependencies: ["PRD-01", "PRD-02"],
        gapModules: ["M4"],
        app: "apps/api (módulo fiscal)",
        keyDeliverables: [
            "Integração FocusNFe (API REST)",
            "Emissão automática de NFC-e ao fechar conta com pagamento",
            "Consulta de status da nota",
            "Cancelamento de nota fiscal",
            "Armazenamento de XML no banco (requisito legal)",
            "Link do DANFE retornado ao cliente",
            "Homologação antes de produção",
        ],
        doneDefinition:
            "NFC-e emitida automaticamente ao fechar conta. XML armazenado. DANFE acessível. Operação legal para estabelecimento com CNPJ.",
        rationale:
            "Obrigação legal — impossível operar sem. Depende de campos fiscais (PRD-01) e pagamentos (PRD-02). Separado de Payments porque requer pesquisa regulatória específica.",
    },
    {
        id: "PRD-07",
        name: "Fechamento & Relatórios",
        subtitle: "Fechamento do dia, DailyReport, consolidação financeira",
        phase: 1,
        order: 7,
        sprints: 2,
        complexity: "Média",
        currentCoverage: "~10%",
        dependencies: ["PRD-02", "PRD-06"],
        gapModules: ["M10"],
        app: "apps/api + apps/web-owner",
        keyDeliverables: [
            "Fechamento do dia (DailyReport populado)",
            "Consolidação: vendas, cancelamentos, descontos por meio de pagamento",
            "Verificação de Checks abertos e pagamentos pendentes",
            "Reabertura com motivo obrigatório",
            "Dashboard básico do dono (cards KPI + gráfico do dia)",
            "Comparativo com dia anterior",
            "Exportação CSV/PDF do fechamento",
            "Notas emitidas vs esperado (divergências)",
        ],
        doneDefinition:
            "Dono fecha o dia com um clique, vê consolidação financeira completa, identifica divergências e exporta para contador.",
        rationale:
            "Sem fechamento, dono não sabe se ganhou ou perdeu dinheiro. Fecha o ciclo operacional: pedido → preparo → entrega → pagamento → fechamento.",
    },
    {
        id: "PRD-08",
        name: "Estoque Básico",
        subtitle: "Itens, movimentações, baixa automática, alertas de mínimo",
        phase: 1,
        order: 8,
        sprints: 2,
        complexity: "Média",
        currentCoverage: "0%",
        dependencies: ["PRD-01"],
        gapModules: ["M6"],
        app: "apps/api + apps/web-owner",
        keyDeliverables: [
            "StockItem com quantidade, unidade, custo, mínimo",
            "ProductIngredient (link produto → insumos)",
            "Baixa automática por venda",
            "Entrada manual (compra/recebimento)",
            "Ajuste de inventário",
            "Alerta quando abaixo do mínimo",
            "Produto indisponível quando estoque = 0",
            "Histórico de movimentações",
        ],
        doneDefinition:
            "Vendas decrementam estoque automaticamente. Produtos ficam indisponíveis quando acabam. Dono vê alertas de estoque baixo.",
        rationale:
            "CMV é KPI central do PRD. Sem estoque, impossível calcular. Versão básica na Phase 1, avançado (lotes, validade, cotação) na Phase 2.",
    },
    {
        id: "PRD-09",
        name: "WhatsApp & Isis",
        subtitle: "Agente virtual, envio real, upsell, campanhas",
        phase: 2,
        order: 9,
        sprints: 4,
        complexity: "Alta",
        currentCoverage: "~35%",
        dependencies: ["PRD-03", "PRD-05"],
        gapModules: ["M1"],
        app: "apps/api (whatsapp module)",
        keyDeliverables: [
            "sendWhatsAppMessage() real via Graph API",
            "Mensagens de texto, botões interativos, listas",
            "Cardápio completo via WhatsApp com imagens",
            "Notificações de status (recebido → preparo → pronto)",
            "Upsell automático (scheduler a cada N minutos)",
            "Chamar garçom via WhatsApp (notificação real)",
            "Contexto de experiência (Date, Happy Hour, etc)",
            "Retry com fila persistente (Redis Streams)",
        ],
        doneDefinition:
            "Cliente faz pedido completo via WhatsApp, recebe status em tempo real, recebe sugestões de upsell. Garçom recebe chamadas. Mensagens com retry.",
        rationale:
            "Feature diferencial do OASYS. Deferida para Phase 2 porque digital menu (Phase 1) cobre a experiência do cliente. WhatsApp adiciona canal, não substitui.",
    },
    {
        id: "PRD-10",
        name: "Dashboard & BI Avançado",
        subtitle: "Analytics histórico, comparativo, CMV, recomendações",
        phase: 2,
        order: 10,
        sprints: 3,
        complexity: "Média-Alta",
        currentCoverage: "~14%",
        dependencies: ["PRD-07", "PRD-08"],
        gapModules: ["M10"],
        app: "apps/web-owner",
        keyDeliverables: [
            "Comparativo MoM e YoY (vendas, ticket, cancelamentos)",
            "Comparativo entre unidades (ranking, tendência)",
            "CMV teórico vs real por produto e por unidade",
            "Margem por item e por categoria",
            "FUP diário automático (WhatsApp/email para o dono)",
            "Análise mensal de custos por categoria",
            "Recomendações acionáveis (IA)",
            "Rentabilidade estimada por unidade",
        ],
        doneDefinition:
            "Dono tem visão estratégica completa: histórico, tendências, CMV real, margem, comparativo entre unidades. FUP diário enviado automaticamente.",
        rationale:
            "Dashboard básico vem no PRD-07 (Phase 1). BI avançado requer dados históricos — precisa que sistema opere por semanas antes de ter valor.",
    },
    {
        id: "PRD-11",
        name: "CRM & Fidelização",
        subtitle: "Cadastro, histórico, pontos, cashback, campanhas",
        phase: 2,
        order: 11,
        sprints: 3,
        complexity: "Média",
        currentCoverage: "~4%",
        dependencies: ["PRD-03", "PRD-09"],
        gapModules: ["M8"],
        app: "apps/api + apps/web-owner",
        keyDeliverables: [
            "Cadastro com consentimento LGPD completo",
            "Histórico de consumo por cliente",
            "Programa de fidelidade (pontos)",
            "Cashback configurável",
            "Cupons segmentados",
            "Campanhas via WhatsApp/SMS/email",
            "Reservas de mesa",
            "Segmentação por comportamento de consumo",
        ],
        doneDefinition:
            "Cliente acumula pontos/cashback, recebe cupons segmentados. Dono vê perfil de consumo e envia campanhas. Reservas funcionais.",
        rationale:
            "Depende de base de clientes que só existe após operação real. WhatsApp (PRD-09) potencializa campanhas. Valor cresce com volume de dados.",
    },
    {
        id: "PRD-12",
        name: "Pessoas & Turnos",
        subtitle: "Escalas, metas, comissões, bonificação, performance",
        phase: 2,
        order: 12,
        sprints: 2,
        complexity: "Média",
        currentCoverage: "~28%",
        dependencies: ["PRD-07"],
        gapModules: ["M9"],
        app: "apps/api + apps/web-owner + apps/web-waiter",
        keyDeliverables: [
            "Escalas e turnos (Schedule/Shift models)",
            "Metas por funcionário (vendas, tickets, itens)",
            "Cálculo automático de comissão ao fechar Check",
            "Ranking de funcionários com histórico",
            "Bonificação baseada em performance",
            "Controle de gorjeta por funcionário",
            "Tela de performance no app do garçom",
            "Registro de ocorrências",
        ],
        doneDefinition:
            "Dono define metas e vê performance. Comissões calculadas automaticamente. Garçom vê seus resultados diários. Turnos gerenciáveis.",
        rationale:
            "Auth e roles já existem (28%). Comissão e metas precisam de dados de vendas acumulados. Valor para o dono cresce com operação estável.",
    },
    {
        id: "PRD-13",
        name: "Auditoria & Segurança",
        subtitle: "Logs completos, LGPD, aprovação dual, dispositivos",
        phase: 2,
        order: 13,
        sprints: 2,
        complexity: "Média",
        currentCoverage: "~28%",
        dependencies: ["PRD-01"],
        gapModules: ["M11"],
        app: "apps/api (middleware) + apps/web-owner",
        keyDeliverables: [
            "Middleware Prisma para auditoria automática (todas as operações sensíveis)",
            "Aprovação dual (authorizedBy) em cancelamentos e estornos",
            "LGPD completo: revogação, exportação, direito ao esquecimento",
            "Logs imutáveis (append-only)",
            "Controle de dispositivos autorizados",
            "Health check de integrações (GET /health)",
            "UI multi-unidade (trocar unidade, visão consolidada)",
            "Backup automatizado (PostgreSQL snapshots)",
        ],
        doneDefinition:
            "Toda operação sensível é auditada com aprovação dual. LGPD completo. Dispositivos controlados. Logs imutáveis e exportáveis.",
        rationale:
            "Cobertura de auditoria está em ~1%. Critical para compliance mas não bloqueia operação inicial. Phase 2 permite implementar com dados reais de operação.",
    },
    {
        id: "PRD-14",
        name: "Delivery",
        subtitle: "Motoboys, rastreamento, áreas, taxas de entrega",
        phase: 2,
        order: 14,
        sprints: 2,
        complexity: "Média",
        currentCoverage: "0%",
        dependencies: ["PRD-02", "PRD-03"],
        gapModules: ["M12"],
        app: "apps/api + apps/web-menu",
        keyDeliverables: [
            "Gestão de motoboys/entregadores",
            "Rastreamento de entrega",
            "Áreas de entrega com geofencing",
            "Cálculo de taxa por distância",
            "Pedido delivery no web-menu",
            "Status de entrega para o cliente",
        ],
        doneDefinition:
            "Estabelecimento aceita pedidos delivery via cardápio digital. Entregadores gerenciáveis. Cliente rastreia entrega.",
        rationale:
            "0% implementado e não é core para bar de alto volume (foco primário). Valor para restaurantes e expansão de mercado. Último da fila.",
    },
];

const PhaseTag = ({ phase }) => {
    const p = PHASES[phase];
    return (
        <span
            style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "2px 8px",
                borderRadius: 4,
                background: p.color + "18",
                color: p.color,
                border: `1px solid ${p.color}33`,
            }}
        >
            Phase {phase}
        </span>
    );
};

const ComplexityDot = ({ level }) => {
    const colors = {
        Baixa: "#22c55e",
        Média: "#eab308",
        "Média-Alta": "#f97316",
        Alta: "#ef4444",
    };
    return (
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#a3a3a3" }}>
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: colors[level] || "#737373",
                    display: "inline-block",
                }}
            />
            {level}
        </span>
    );
};

const DependencyArrow = ({ deps }) => {
    if (!deps.length) return <span style={{ fontSize: "0.7rem", color: "#525252" }}>Nenhuma</span>;
    return (
        <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {deps.map((d) => (
                <span
                    key={d}
                    style={{
                        fontSize: "0.65rem",
                        padding: "1px 6px",
                        borderRadius: 3,
                        background: "#262626",
                        color: "#a3a3a3",
                        border: "1px solid #333",
                    }}
                >
                    {d}
                </span>
            ))}
        </span>
    );
};

const CoverageBar = ({ value }) => {
    const num = parseInt(value) || 0;
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
                style={{
                    flex: 1,
                    height: 6,
                    background: "#1a1a1a",
                    borderRadius: 3,
                    overflow: "hidden",
                    maxWidth: 80,
                }}
            >
                <div
                    style={{
                        width: `${num}%`,
                        height: "100%",
                        background: num === 0 ? "#ef4444" : num < 30 ? "#f97316" : num < 50 ? "#eab308" : "#22c55e",
                        borderRadius: 3,
                        transition: "width 0.3s ease",
                    }}
                />
            </div>
            <span style={{ fontSize: "0.7rem", color: "#737373", minWidth: 32 }}>{value}</span>
        </div>
    );
};

const ModuleCard = ({ mod, isSelected, onSelect }) => {
    const phase = PHASES[mod.phase];
    return (
        <div
            onClick={() => onSelect(mod.id)}
            style={{
                background: isSelected ? "#1a1a1a" : "#111",
                border: isSelected ? `1.5px solid ${phase.color}` : "1px solid #222",
                borderRadius: 8,
                padding: "14px 16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {isSelected && (
                <div
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: 4,
                        height: "100%",
                        background: phase.color,
                    }}
                />
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                        style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            color: phase.color,
                            fontFamily: "monospace",
                            letterSpacing: "0.02em",
                        }}
                    >
                        {mod.id}
                    </span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#e5e5e5" }}>{mod.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                        style={{
                            fontSize: "0.6rem",
                            color: "#525252",
                            background: "#1a1a1a",
                            padding: "1px 5px",
                            borderRadius: 3,
                            fontFamily: "monospace",
                        }}
                    >
                        {mod.sprints}S
                    </span>
                </div>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#737373", marginBottom: 8 }}>{mod.subtitle}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CoverageBar value={mod.currentCoverage} />
                <ComplexityDot level={mod.complexity} />
            </div>
        </div>
    );
};

const DetailPanel = ({ mod }) => {
    if (!mod) {
        return (
            <div
                style={{
                    background: "#111",
                    border: "1px solid #222",
                    borderRadius: 10,
                    padding: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 400,
                    color: "#525252",
                    fontSize: "0.85rem",
                }}
            >
                Selecione um módulo para ver os detalhes
            </div>
        );
    }

    const phase = PHASES[mod.phase];

    return (
        <div
            style={{
                background: "#111",
                border: `1px solid ${phase.color}33`,
                borderRadius: 10,
                padding: 24,
                overflow: "auto",
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 800, color: phase.color, fontSize: "0.8rem" }}>
                            {mod.id}
                        </span>
                        <PhaseTag phase={mod.phase} />
                    </div>
                    <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f5f5f5", margin: 0 }}>{mod.name}</h2>
                    <p style={{ fontSize: "0.8rem", color: "#737373", margin: "4px 0 0" }}>{mod.subtitle}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: phase.color, lineHeight: 1 }}>#{mod.order}</div>
                    <div style={{ fontSize: "0.6rem", color: "#525252", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        Ordem
                    </div>
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr",
                    gap: 12,
                    marginBottom: 20,
                    padding: "12px 0",
                    borderTop: "1px solid #1e1e1e",
                    borderBottom: "1px solid #1e1e1e",
                }}
            >
                {[
                    { label: "Sprints", value: mod.sprints, suffix: " sprints" },
                    { label: "Complexidade", value: mod.complexity },
                    { label: "Cobertura", value: mod.currentCoverage },
                    { label: "App", value: mod.app.split("+")[0].trim().split("/").pop() },
                ].map((stat) => (
                    <div key={stat.label}>
                        <div style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#525252", marginBottom: 2 }}>
                            {stat.label}
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#d4d4d4" }}>
                            {stat.value}
                            {stat.suffix || ""}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginBottom: 16 }}>
                <div
                    style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#525252", marginBottom: 6 }}
                >
                    Dependências
                </div>
                <DependencyArrow deps={mod.dependencies} />
            </div>

            <div style={{ marginBottom: 16 }}>
                <div
                    style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#525252", marginBottom: 6 }}
                >
                    Gap Modules (referência)
                </div>
                <span style={{ fontSize: "0.75rem", color: "#737373" }}>{mod.gapModules.join(", ")}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
                <div
                    style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#525252", marginBottom: 8 }}
                >
                    Entregáveis-Chave
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {mod.keyDeliverables.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: phase.color, fontSize: "0.65rem", marginTop: 3, flexShrink: 0 }}>→</span>
                            <span style={{ fontSize: "0.78rem", color: "#b5b5b5", lineHeight: 1.4 }}>{d}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div
                style={{
                    background: phase.color + "0a",
                    border: `1px solid ${phase.color}22`,
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12,
                }}
            >
                <div
                    style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: phase.color, marginBottom: 4, fontWeight: 700 }}
                >
                    Definição de "Done"
                </div>
                <div style={{ fontSize: "0.78rem", color: "#d4d4d4", lineHeight: 1.5 }}>{mod.doneDefinition}</div>
            </div>

            <div style={{ background: "#0a0a0a", borderRadius: 6, padding: 12, border: "1px solid #1a1a1a" }}>
                <div
                    style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#525252", marginBottom: 4, fontWeight: 700 }}
                >
                    Racional
                </div>
                <div style={{ fontSize: "0.78rem", color: "#a3a3a3", lineHeight: 1.5, fontStyle: "italic" }}>
                    {mod.rationale}
                </div>
            </div>
        </div>
    );
};

export default function OASYSModuleMap() {
    const [selectedId, setSelectedId] = useState(null);
    const [filterPhase, setFilterPhase] = useState(null);

    const selectedMod = MODULES.find((m) => m.id === selectedId) || null;
    const filteredModules = filterPhase ? MODULES.filter((m) => m.phase === filterPhase) : MODULES;

    const phase1 = MODULES.filter((m) => m.phase === 1);
    const phase2 = MODULES.filter((m) => m.phase === 2);
    const totalSprints = MODULES.reduce((a, m) => a + m.sprints, 0);
    const p1Sprints = phase1.reduce((a, m) => a + m.sprints, 0);
    const p2Sprints = phase2.reduce((a, m) => a + m.sprints, 0);

    return (
        <div style={{ background: "#0a0a0a", color: "#e5e5e5", minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
                {/* Header */}
                <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid #1a1a1a" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: "1.6rem", fontWeight: 800, color: "#22c55e", letterSpacing: "-0.03em" }}>
                            OASYS
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "#525252", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                            Module Map v2.0
                        </span>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "#737373", margin: 0 }}>
                        14 PRDs independentes por módulo funcional — Phase 1 (Go-Live) + Phase 2 (Growth)
                    </p>

                    {/* Summary stats */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(6, 1fr)",
                            gap: 12,
                            marginTop: 16,
                        }}
                    >
                        {[
                            { label: "Total PRDs", value: MODULES.length, color: "#e5e5e5" },
                            { label: "Phase 1", value: phase1.length, color: "#22c55e" },
                            { label: "Phase 2", value: phase2.length, color: "#3b82f6" },
                            { label: "Total Sprints", value: totalSprints, color: "#e5e5e5" },
                            { label: "P1 Sprints", value: p1Sprints, color: "#22c55e" },
                            { label: "P2 Sprints", value: p2Sprints, color: "#3b82f6" },
                        ].map((s) => (
                            <div
                                key={s.label}
                                style={{
                                    background: "#111",
                                    borderRadius: 6,
                                    padding: "10px 12px",
                                    border: "1px solid #1a1a1a",
                                    textAlign: "center",
                                }}
                            >
                                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: "0.55rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#525252" }}>
                                    {s.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Phase filter */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[
                        { label: "Todos", value: null },
                        { label: "Phase 1 — Go-Live", value: 1, color: "#22c55e" },
                        { label: "Phase 2 — Growth", value: 2, color: "#3b82f6" },
                    ].map((f) => (
                        <button
                            key={f.label}
                            onClick={() => setFilterPhase(f.value)}
                            style={{
                                padding: "6px 14px",
                                borderRadius: 6,
                                border: filterPhase === f.value ? `1px solid ${f.color || "#555"}` : "1px solid #222",
                                background: filterPhase === f.value ? (f.color || "#555") + "18" : "#111",
                                color: filterPhase === f.value ? f.color || "#e5e5e5" : "#737373",
                                cursor: "pointer",
                                fontSize: "0.72rem",
                                fontWeight: filterPhase === f.value ? 600 : 400,
                                transition: "all 0.15s ease",
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Main content */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                    {/* Module list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {[1, 2]
                            .filter((p) => !filterPhase || filterPhase === p)
                            .map((phaseNum) => (
                                <div key={phaseNum}>
                                    <div
                                        style={{
                                            fontSize: "0.65rem",
                                            fontWeight: 700,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.1em",
                                            color: PHASES[phaseNum].color,
                                            padding: "8px 0 6px",
                                            borderBottom: `1px solid ${PHASES[phaseNum].color}22`,
                                            marginBottom: 6,
                                        }}
                                    >
                                        {PHASES[phaseNum].title}
                                        <span style={{ fontWeight: 400, color: "#525252", marginLeft: 8 }}>
                                            {PHASES[phaseNum].subtitle}
                                        </span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                        {filteredModules
                                            .filter((m) => m.phase === phaseNum)
                                            .map((mod) => (
                                                <ModuleCard
                                                    key={mod.id}
                                                    mod={mod}
                                                    isSelected={selectedId === mod.id}
                                                    onSelect={setSelectedId}
                                                />
                                            ))}
                                    </div>
                                </div>
                            ))}
                    </div>

                    {/* Detail panel */}
                    <div style={{ position: "sticky", top: 20 }}>
                        <DetailPanel mod={selectedMod} />
                    </div>
                </div>

                {/* Dependency graph */}
                <div style={{ marginTop: 28, padding: 20, background: "#111", borderRadius: 10, border: "1px solid #1a1a1a" }}>
                    <div
                        style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            color: "#525252",
                            marginBottom: 14,
                        }}
                    >
                        Grafo de Dependências — Ordem de Execução
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {MODULES.map((mod) => {
                            const phase = PHASES[mod.phase];
                            return (
                                <div
                                    key={mod.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        padding: "6px 10px",
                                        borderRadius: 6,
                                        background: selectedId === mod.id ? "#1a1a1a" : "transparent",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => setSelectedId(mod.id)}
                                >
                                    <span
                                        style={{
                                            fontFamily: "monospace",
                                            fontSize: "0.65rem",
                                            fontWeight: 800,
                                            color: phase.color,
                                            minWidth: 52,
                                        }}
                                    >
                                        {mod.id}
                                    </span>
                                    <span style={{ fontSize: "0.78rem", color: "#d4d4d4", minWidth: 180 }}>{mod.name}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                                        {mod.dependencies.length > 0 && (
                                            <>
                                                <span style={{ fontSize: "0.6rem", color: "#525252" }}>depende de</span>
                                                {mod.dependencies.map((d) => (
                                                    <span
                                                        key={d}
                                                        style={{
                                                            fontSize: "0.6rem",
                                                            padding: "1px 5px",
                                                            borderRadius: 3,
                                                            background: "#222",
                                                            color: "#a3a3a3",
                                                            fontFamily: "monospace",
                                                        }}
                                                    >
                                                        {d}
                                                    </span>
                                                ))}
                                            </>
                                        )}
                                        {mod.dependencies.length === 0 && (
                                            <span style={{ fontSize: "0.6rem", color: "#333" }}>independente</span>
                                        )}
                                    </div>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 2,
                                        }}
                                    >
                                        {Array.from({ length: mod.sprints }).map((_, i) => (
                                            <div
                                                key={i}
                                                style={{
                                                    width: 14,
                                                    height: 6,
                                                    borderRadius: 2,
                                                    background: phase.color + "44",
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ textAlign: "center", padding: "20px 0 8px", color: "#333", fontSize: "0.65rem" }}>
                    OASYS Module Map v2.0 — {MODULES.length} PRDs, {totalSprints} sprints — Março 2026
                </div>
            </div>
        </div>
    );
}
