# OASYS — Claude Code Development Guide

## How It Works

```
CLAUDE.md (system rules — loaded automatically, highest authority)
  └── docs/ (PRDs + Module Map — read on demand per task)
      └── Your prompts (interpreted within the rules above)
```

**CLAUDE.md** is the brain. Claude Code reads it automatically when you open
the Oasys folder. It defines conventions, commands, phase strategy, and
points to the PRD files for detailed specs.

**Your PRDs (.md) and Module Map (.jsx)** stay in `docs/`. Claude Code
only reads a PRD when working on that specific module — keeping context
clean for actual coding.

---

## Your Folder Structure (confirmed)

```
Oasys/                                              ← open this in Antigravity
├── CLAUDE.md                                       ← root level (auto-loaded)
├── apps/                                           ← greenfield — built per PRD
├── packages/                                       ← greenfield — built per PRD
└── docs/
    ├── Oasys Module Map.jsx                        ← master execution roadmap
    ├── OASYS_PRD-01_Schema_Foundation.md
    ├── OASYS_PRD-02_Payments_CashRegister.md
    ├── OASYS_PRD-03_Cardapio_Digital.md
    ├── OASYS_PRD-04_PDV_Gestao_Pedidos.md
    ├── OASYS_PRD-05_KDS_Producao.md
    ├── OASYS_PRD-06_Fiscal_NFCe.md
    ├── OASYS_PRD-07_Fechamento_Relatorios.md
    ├── OASYS_PRD-08_Estoque_Basico.md
    ├── OASYS_PRD-09_WhatsApp_Isis.md               (Phase 2)
    ├── OASYS_PRD-10_Dashboard_BI_Avancado.md        (Phase 2)
    ├── OASYS_PRD-11_CRM_Fidelizacao.md              (Phase 2)
    ├── OASYS_PRD-12_Pessoas_Turnos.md               (Phase 2)
    ├── OASYS_PRD-13_Auditoria_Seguranca.md          (Phase 2)
    └── OASYS_PRD-14_Delivery.md                     (Phase 2)
```

---

## First Session Prompt

Copy and paste this as your FIRST message to Claude Code:

```
You are starting a new session on the OASYS project.

Before doing anything else:
1. Read CLAUDE.md in the project root — this is your system of record.
2. Read docs/Oasys Module Map.jsx — this is the master execution roadmap
   with all 14 PRDs, their dependencies, sprint estimates, and coverage %.

Confirm you've read both files, then tell me:
- Current Phase (should be Phase 1 — Go-Live)
- The PRD execution order (PRD-01 through PRD-08)
- The P0 blockers (Payments at 0%, Fiscal at 0%)
- Which PRD we should start with and why

Then wait for my instruction on which PRD to work on. Do NOT start coding
until I confirm the target PRD.

When I give you a PRD to work on:
1. Read the full PRD file (.md) from docs/ for that module
2. Review the Done Definition and Success Criteria in that PRD
3. Propose an implementation plan with sprint breakdown
4. Wait for my approval before writing any code
5. After each step, run `npx tsc --noEmit` to verify zero errors
6. Write tests (Vitest) for every feature before marking complete

Remember: you are the technical co-founder, not a passive assistant. Challenge
me if I ask for something that violates the phase strategy, creates tech debt,
or skips dependencies.
```

---

## Continuing Sessions

For each new Claude Code session:

```
Continuing OASYS development.

Current target: PRD-[XX] — [Name]
Sprint: [number]
Last session completed: [brief description]
Today's focus: [specific feature or endpoint]

Read the PRD at docs/OASYS_PRD-[XX]_[Name].md and continue from where
we left off. Check git log for the latest commits if needed.
```

### Example:
```
Continuing OASYS development.

Current target: PRD-02 — Payments & CashRegister
Sprint: 1 of 3
Last session completed: Pagar.me webhook endpoint + HMAC validation
Today's focus: PIX QR code generation and payment status polling

Read the PRD at docs/OASYS_PRD-02_Payments_CashRegister.md and continue
from where we left off. Check git log for the latest commits.
```

---

## PRD Workflow — What to Expect at Each Phase

### PRD-01 — Schema Foundation (Sprint 1)
**Focus:** Prisma 5.8 schema, migrations, seed data, shared types.
**Quality checks to request:**
- Verify all 26 models and 14 enums are correctly defined
- Run `npx tsc --noEmit` — zero type errors across monorepo
- Validate Prisma migrations apply cleanly
- Ensure multi-tenant isolation (tenantId on every table)
- Check version-specific Prisma 5.8 syntax (not older patterns)

### PRD-02 — Payments & CashRegister (Sprints 2–4)
**Focus:** Pagar.me integration, PIX QR, payment lifecycle, cash register sessions.
**Quality checks to request:**
- Validate HMAC webhook signatures (Pagar.me security)
- Test all 22 scenarios defined in the PRD
- Review for XSS, injection, and unsafe patterns in payment handlers
- Verify Zod validation on every payment endpoint
- Check that CashRegister session logic uses Prisma transactions
- Use TDD: write Vitest tests BEFORE implementation

### PRD-03 — Cardápio Digital (Sprints 5–8)
**Focus:** Customer-facing web menu, cart, checkout, WebSocket real-time.
**Quality checks to request:**
- Bundle size target: <100KB for web-menu app
- First Contentful Paint: <1.5s on 4G
- Test WebSocket fallback and reconnection
- Verify multi-device same-Check behavior
- Review React component patterns (Zustand stores, React Query)
- Ensure production-grade UI (not generic — outdoor sun legibility,
  one-hand mobile operation for bar environments)

### PRD-04 — PDV & Gestão de Pedidos (Sprints 9–11)
**Focus:** Waiter app, order management, split/merge/transfer.
**Quality checks to request:**
- Test split/merge/transfer conta scenarios
- Verify PWA offline mode works
- WebSocket reconnection under poor connectivity
- Review real-time sync between waiter ↔ KDS ↔ menu apps

### PRD-05 — KDS & Produção (Sprints 12–13)
**Focus:** Kitchen Display System, station routing, bump flow, course sequencing.
**Quality checks to request:**
- TV mode layout (large buttons, legible in loud kitchen)
- PickupBoard display for completed orders
- Bump sequence and course timing validation
- Average prep time calculations

### PRD-06 — Fiscal & NFC-e (Sprints 14–15)
**Focus:** FocusNFe integration, NFC-e/NF-e XML, CNPJ/CPF handling.
**Quality checks to request:**
- Review CNPJ/CPF handling for LGPD compliance
- Validate fiscal XML structure
- Test NFC-e emission flow end-to-end
- Check that no PII is logged or exposed

### PRD-07 — Fechamento & Relatórios (Sprints 16–17)
**Focus:** Daily closing procedures, cash reconciliation, shift reports.
**Quality checks to request:**
- Verify closing depends on all payments settled
- Test reconciliation calculations
- Validate report generation with Brazilian fiscal formats

### PRD-08 — Estoque Básico (Sprints 18–19)
**Focus:** Basic stock management, ingredient tracking, low-stock alerts.
**Quality checks to request:**
- Verify stock deduction on order confirmation
- Test low-stock alert thresholds
- Validate CMV (Custo de Mercadoria Vendida) calculation foundations

---

## Session Management

**Context window filling up:**
- Use `/compact` to compress conversation history
- When compacting, tell Claude: "preserve PRD context, file list, and
  current implementation state"
- Split sessions at ~30 messages (OASYS convention)

**Useful commands inside Claude Code:**
- `/help` — see all available commands
- `/compact` — compress conversation to free context
- `/clear` — start fresh within same session
- Esc + Esc — rewind to a previous checkpoint

**Git workflow per session:**
- Create branch before starting: `feature/prd-XX-name`
- Conventional commits: `feat(module): description`
- Run `npx tsc --noEmit` before every commit
- Run `npx vitest run` before marking any feature complete
- PR into `main` only after all checks pass

---

## Troubleshooting

**Claude Code ignores CLAUDE.md rules:**
The file may be too long or rules are getting buried. Keep under 150
instructions. Use emphasis ("IMPORTANT", "YOU MUST") for critical rules.

**Claude Code can't find PRDs:**
Verify docs/ folder is inside the Oasys root that you opened in Antigravity.
Filenames must match exactly what's in the CLAUDE.md documentation table.

**Antigravity sidebar icons disappear:**
Known bug with Claude Code extension. Use "Claude Code: Open in New Tab"
from Command Palette (Ctrl+Shift+P) instead of the sidebar.

**Claude Code suggests Phase 2 features:**
Push back. Say: "This is Phase 2. Check the Module Map. What's the next
Phase 1 priority instead?"
