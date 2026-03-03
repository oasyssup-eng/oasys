# OASYS — F&B Operations Platform

## WHAT
OASYS is a Foods & Beverages operational platform (NOT bar-only) for high-volume establishments.
Turborepo monorepo: 4 web apps + Fastify API + Prisma/PostgreSQL.

## PROJECT STRUCTURE
```
oasys/
├── apps/
│   ├── api/                 # Fastify 4 + TypeScript + Zod (backend)
│   ├── web-owner/           # Owner dashboard (React 18 + Vite 5 + Tailwind 3)
│   ├── web-waiter/          # Waiter app (React 18 + Vite 5 + Tailwind 3)
│   ├── web-kds/             # Kitchen Display System (React 18 + Vite 5 + Tailwind 3)
│   └── web-menu/            # Digital menu — NEW in PRD-03
├── packages/
│   ├── database/            # Prisma 5.8 schema + migrations
│   └── shared/              # Shared types + utilities
├── docs/
│   ├── Oasys Module Map.jsx                        # Master roadmap — READ FIRST
│   ├── OASYS_PRD-01_Schema_Foundation.md            # Phase 1
│   ├── OASYS_PRD-02_Payments_CashRegister.md        # Phase 1
│   ├── OASYS_PRD-03_Cardapio_Digital.md             # Phase 1
│   ├── OASYS_PRD-04_PDV_Gestao_Pedidos.md           # Phase 1
│   ├── OASYS_PRD-05_KDS_Producao.md                 # Phase 1
│   ├── OASYS_PRD-06_Fiscal_NFCe.md                  # Phase 1
│   ├── OASYS_PRD-07_Fechamento_Relatorios.md        # Phase 1
│   ├── OASYS_PRD-08_Estoque_Basico.md               # Phase 1
│   ├── OASYS_PRD-09_WhatsApp_Isis.md                # Phase 2
│   ├── OASYS_PRD-10_Dashboard_BI_Avancado.md        # Phase 2
│   ├── OASYS_PRD-11_CRM_Fidelizacao.md              # Phase 2
│   ├── OASYS_PRD-12_Pessoas_Turnos.md               # Phase 2
│   ├── OASYS_PRD-13_Auditoria_Seguranca.md          # Phase 2
│   └── OASYS_PRD-14_Delivery.md                     # Phase 2
├── turbo.json
└── CLAUDE.md                # This file
```

## COMMANDS
```bash
# Dev
npm run dev                    # All apps parallel
npx turbo run dev --filter=api # Single app

# Database
npx prisma migrate dev         # Apply migrations (packages/database/)
npx prisma generate            # Regenerate client after schema change
npx prisma db seed             # Seed with Brazilian test data

# MUST pass before any commit
npx tsc --noEmit               # Zero type errors across monorepo

# Tests
npx vitest run                 # All tests
npx vitest run --filter=payments # Module-specific
```

## CRITICAL RULES

**IMPORTANT — Before starting ANY task:**
1. Read `docs/Oasys Module Map.jsx` to verify Phase, dependencies, and priority.
2. Read the specific PRD (.md) from `docs/` for that module (see table below).
3. If the task belongs to Phase 2, STOP and flag it. Do not implement.

**YOU MUST follow these conventions:**
- Files: `kebab-case.ts` | Components: `PascalCase.tsx` | Functions: `camelCase`
- Types: PascalCase with suffix (`UserDTO`, `CreateOrderInput`)
- Validation: Always Zod on every API endpoint
- Database: Always Prisma transactions for multi-step operations
- API: RESTful with proper HTTP status codes
- Tests: Vitest. Write tests BEFORE marking any feature complete.
- Zero technical debt. Production-grade only. No shortcuts.

**YOU MUST NOT:**
- Skip phases. Phase 2 features get flagged, not built.
- Hardcode prices. Pricing is NOT defined yet.
- Build WhatsApp/Isis features. That is Phase 2 (PRD-09).
- Merge without `npx tsc --noEmit` passing with zero errors.
- Create files outside the monorepo convention.

## PHASE STRATEGY
**Phase 1 — Go-Live (CURRENT):** PRD-01 through PRD-08
Core flow: order -> prepare -> deliver -> pay -> close

**Phase 2 — Growth:** PRD-09 through PRD-14
WhatsApp, BI, CRM, people, audit, delivery

## DECISION FRAMEWORK
Evaluate BEFORE executing any request:
1. Phase alignment — Is this Phase 1? If not, flag it.
2. Priority — P0 blockers first: Payments > Menu > KDS > Fiscal > Close
3. Dependencies — Does this need something not built yet?
4. Tech debt — Will this create shortcuts we regret?
5. Done Definition — Check the PRD's specific success criteria.

## DOCUMENTATION (read only when relevant to the current task)

| Working on...              | Read this file from `docs/`                    |
|----------------------------|------------------------------------------------|
| Execution order / scope    | `Oasys Module Map.jsx`                         |
| Schema changes             | `OASYS_PRD-01_Schema_Foundation.md`            |
| Payments / CashRegister    | `OASYS_PRD-02_Payments_CashRegister.md`        |
| Digital menu (customer)    | `OASYS_PRD-03_Cardapio_Digital.md`             |
| Waiter app / PDV / Orders  | `OASYS_PRD-04_PDV_Gestao_Pedidos.md`           |
| KDS / Production stations  | `OASYS_PRD-05_KDS_Producao.md`                 |
| Fiscal / NFC-e / NF-e      | `OASYS_PRD-06_Fiscal_NFCe.md`                  |
| Daily closing / Reports    | `OASYS_PRD-07_Fechamento_Relatorios.md`        |
| Stock / Purchasing         | `OASYS_PRD-08_Estoque_Basico.md`               |

## TECH STACK (pinned versions)
- **Runtime:** Node.js 20 LTS
- **Backend:** Fastify 4 + TypeScript + Zod
- **ORM:** Prisma 5.8 + PostgreSQL
- **Auth:** PIN + JWT (@fastify/jwt)
- **Real-time:** @fastify/websocket + In-Memory Pub/Sub
- **Frontend:** React 18 + Vite 5 + TailwindCSS 3
- **State:** Zustand 4 + React Query 5
- **Tests:** Vitest
- **Monorepo:** Turborepo + npm workspaces

## BUSINESS CONTEXT
- Market: Brazilian F&B
- Fiscal: NFC-e/NF-e via FocusNFe (PRD-06)
- Payments: Pagar.me (PIX QR + link). NOT Stripe.
- Language: PT-BR user-facing, English in code/comments
- Target: Bars 100+ customers/night, restaurants, bakeries

## GIT WORKFLOW
- Branch per PRD: `feature/prd-02-payments`
- Commits: `feat(payments): add PIX QR generation endpoint`
- PR into `main` only after: tests pass + tsc clean + review
- Never commit directly to `main`
