---
title: "Agent-Skills Import — Wave 2 (Médio Prazo)"
mode: full
status: active
created: 2026-05-22
---

# Exec Plan: Agent-Skills Import — Wave 2

**PRD:** [PRD.md](./PRD.md)
**Date:** 2026-05-22
**Status:** planned
**Total:** 4 planos | 14 fases | ~15h
**Depende de:** Wave 1 (`../2026-05-22-agent-skills-import-wave1/`) — aprovado, planejado, não mergeado

---

## Goal

Entregar os 5 itens estratégicos da Wave 2: refinar 13 agentes auditores com 5 patterns (positive_observations, verdict canônico, severity→SLA, triad PoC/Impact/Fix, anti-degeneration genérica+específica, Composition), bumpar JSON contract de `1.0` para `2.0.0` (MAJOR — breaking via campos obrigatórios), portar 3 skills novas (`source-driven-development`, `doubt-driven-development`, `git-workflow-and-versioning`), e adicionar pedagogia ADR (`## When to Write an ADR`) à `decision-registry`.

---

## Scope

**Em scope:**
- 13 arquivos em [agents/](../../../../agents/) — refinamento completo com 5 patterns (Planos 01 + 02)
- [docs/design-docs/subagent-contract-v1.md](../../../design-docs/subagent-contract-v1.md) — bumpar para `contract_version: 2.0.0` + migration guide (Plano 01)
- 3 skills novas: `skills/source-driven-development/SKILL.md`, `skills/doubt-driven-development/SKILL.md`, `skills/git-workflow-and-versioning/SKILL.md` (Plano 03)
- [skills/decision-registry/SKILL.md](../../../../skills/decision-registry/SKILL.md) — adicionar seção `## When to Write an ADR` (Plano 04)
- `.claude-plugin/plugin.json` + `plugin-manifest.json` — checksums regenerados (Planos 03 + 04)

**Fora de scope:** Wave 1 (não tocada), Wave 3 (consolidações + refactors SKILL.md das 5 críticas — out of scope desta wave). Hooks de enforcement (`@ts-ignore` blocker, commit-msg hook). Implementação cross-model. Refactor `enhance-prompt` com MCP table.

---

## Assumptions

1. Wave 1 está aprovado e seus artefatos (`docs/references/` seeds, skills `incremental-implementation` + `code-simplification`) existem ou serão mergeados antes da execução desta Wave.
2. `bun run harness:validate && bun run test && bun run lint` passam atualmente (baseline verde).
3. `Infos/agent-skills-main/skills/{source,doubt,git,documentation}-*/SKILL.md` (~1015 linhas total) estão disponíveis intactos.
4. Apenas 1 arquivo de contrato JSON existe (`docs/design-docs/subagent-contract-v1.md`) — audit prévio (Plano 01 fase-01) vai confirmar/refutar.
5. Os 13 agentes em [agents/](../../../../agents/) seguem layout uniforme com bloco JSON `contract_version: "1.0"` (confirmado em security-auditor.md:99).

---

## Risks

| Risco (do PRD) | Mitigação no plano |
|----------------|--------------------|
| **R-02 (Alta/Alto):** Bump 1.0 → 2.0.0 MAJOR quebra parsers existentes | Plano 01 fase-01 faz audit exaustivo de consumidores ANTES do bump. Fase-02 emite migration guide. Fase-03 (TB) atualiza caller(s) no mesmo PR conceitual |
| **R-01 (Alta/Médio):** 13 agentes refinados por subagentes paralelos divergem de padrão | Plano 01 fase-03 produz `security-auditor.md` como **gold standard**. Plano 02 spawna subagentes em waves de 4 com gold standard + template VERBATIM. Fase-04 do Plano 02 valida via grep batch |
| **R-03 (Média/Médio):** `positive_observations` vira ruído genérico ("everything fine") | Plano 01 fase-04 implementa validação regex blacklist (CA-02 — 4 testes anti-genérico). Toda fase de refinamento referencia esta validação |
| **R-04 (Média/Médio):** Skills novas sobrepõem com consultant/design-twice/iterate | Plano 03 inclui cross-reference no `description:` frontmatter de cada skill nova + topo do SKILL.md documenta diferenças |
| **R-06 (Média/Baixo):** Pedagogia ADR colide com automação `adr-writer.ts` | Plano 04 fase-01: pedagogia precede o CRUD existente (adição, não substituição). CRUD continua autoridade técnica |
| **R-07 (Alta/Baixo):** Custo token paralelizado 13 × 50k = 650k | Aceito (custo único). Plano 02 paralelizado em waves de 4 (vs sequencial = 13 ciclos) |

---

## Execution Steps

### Dependências entre Planos

```
Plano 01 (Foundation + TB) ──→ Plano 02 (12 agentes restantes)
                                                ↘
Plano 03 (3 skills novas) ─────────────────────→ Plano 04 (pedagogia ADR + validação final)
```

**Paralelismo possível:** Planos 02 e 03 podem ser executados em paralelo (independentes entre si, ambos dependem apenas do Plano 01).

### Plano 01 — Foundation + Tracer Bullet (~3h)

> **Tracer Bullet:** Refinar 1 agente (security-auditor) end-to-end com 5 patterns + bumpar schema doc + atualizar caller(s). Prova o template canônico e o bump MAJOR antes de escalar para os outros 12.

| # | Fase | Sizing |
|---|------|--------|
| 01 | Audit consumidores `contract_version` (grep map em `lib/`, `skills/`, `agents/`, `scripts/`) | XS (~30min) |
| 02 | Bumpar `docs/design-docs/subagent-contract-v1.md` → v2.0.0 + migration guide no CHANGELOG | S (~1h) |
| 03 | **TB:** Refinar `agents/security-auditor.md` (5 patterns aplicados) + adaptar callers da fase-01 | S (~1.5h) |
| 04 | Fixture/validação `positive_observations` + `verdict` (regex blacklist anti-genérico CA-02) | XS (~30min) |

### Plano 02 — Refinar 12 Agentes Restantes (~6h)

| # | Fase | Sizing |
|---|------|--------|
| 01 | Wave A: refinar `react-auditor`, `api-auditor`, `database-analyzer`, `tdd-verifier` (4 subagentes paralelos) | M (~1.5h) |
| 02 | Wave B: refinar `code-smell-detector`, `solid-auditor`, `infrastructure-auditor`, `design-explorer` | M (~1.5h) |
| 03 | Wave C: refinar `documentation-writer`, `lesson-evaluator`, `plan-executor`, `plan-verifier` | M (~1.5h) |
| 04 | Validação consolidada: grep batch dos 13 agentes (≥52 anti-degen, contract v2.0.0 uniforme, triad PoC em critical/high) | S (~1h) |

### Plano 03 — Skills Novas (~4h, independente do Plano 02)

| # | Fase | Sizing |
|---|------|--------|
| 01 | Portar `source-driven-development/SKILL.md` (copy literal + frontmatter + telemetria + cross-ref `references/`) | S (~1.5h) |
| 02 | Portar `doubt-driven-development/SKILL.md` (CLAIM→EXTRACT→DOUBT→RECONCILE→STOP + cross-model docs) | S (~1.5h) |
| 03 | Portar `git-workflow-and-versioning/SKILL.md` (conventional commits + integração com `/iterate`, `/incident-response`) | S (~1h) |
| 04 | Atualizar `.claude-plugin/plugin.json` + `plugin-manifest.json` (checksums das 3 skills novas) | XS (~30min) |

### Plano 04 — Pedagogia ADR + Validação Final (~2h)

| # | Fase | Sizing |
|---|------|--------|
| 01 | Adicionar `## When to Write an ADR` em `decision-registry/SKILL.md` (ANTES do CRUD existente) | S (~1h) |
| 02 | Regenerar manifest final + `bun run harness:validate && bun run test && bun run lint` | S (~1h) |

---

## Review Checklist

- [ ] `bun run harness:validate` verde após cada plano
- [ ] `bun run test && bun run lint` verde após cada plano
- [ ] Nenhum arquivo fora do escopo desta Wave foi tocado
- [ ] Os 13 agentes contêm **simultaneamente** as 3 seções: `## Output Contract (additions)`, `## Anti-Degeneration Rules`, `## Composition`
- [ ] Cada agente emite `positive_observations` (≥1) + `verdict` ∈ `{"approve","request_changes","block"}`
- [ ] Cada agente tem ≥2 anti-degen GENÉRICAS + ≥2 ESPECÍFICAS (≥52 regras catalogadas no plugin)
- [ ] `contract_version: "2.0.0"` em todos os agentes (grep batch valida)
- [ ] Migration guide para callers do contrato existe em CHANGELOG ou doc dedicado
- [ ] 3 skills novas com frontmatter completo + telemetria + cross-references
- [ ] `decision-registry/SKILL.md` tem `## When to Write an ADR` ANTES da primeira menção a `add`/`list`/`query`
- [ ] Checksums SHA-256 regenerados em `plugin-manifest.json` e `.claude-plugin/plugin.json`

---

## Validation Log

*(preenchido durante execução via /execute-plan)*

---

## Compound Opportunity

*(avaliar ao fechar cada plano — patterns como "subagentes paralelos com gold standard verbatim", "schema MAJOR bump com audit prévio obrigatório" podem virar compound notes)*

---

## Lessons Captured

*(preenchido ao fechar a Wave)*

---

## Exit Criteria

- [ ] **CA-01 a CA-12** do PRD verificados (12 critérios de aceite)
- [ ] 13/13 agentes refinados com 5 patterns aplicados
- [ ] ≥52 regras anti-degeneração catalogadas no plugin (13 × ≥4)
- [ ] `skills/source-driven-development/SKILL.md`, `skills/doubt-driven-development/SKILL.md`, `skills/git-workflow-and-versioning/SKILL.md` existem e validam
- [ ] `skills/decision-registry/SKILL.md` contém `## When to Write an ADR` com tabela "Common Rationalizations"
- [ ] `contract_version: "2.0.0"` em schema doc + todos os 13 agentes + migration guide presente
- [ ] `bun run harness:validate && bun run test && bun run lint` verde na branch final
- [ ] CA-11 verificado: `verify-work` (caller principal) continua funcionando sem mudança de código (backward-compat por adição)

---

## Decisões do PRD Aplicadas

| Decisão | Onde se aplica |
|---------|----------------|
| DT-1 — Subagentes paralelos em waves de 4 | Plano 02 (3 waves × 4 agentes) |
| DT-2 — Bump MAJOR `2.0.0` | Plano 01 fase-02 (schema doc + migration guide) |
| DT-3 — Severity→SLA inline + ref em `docs/references/` | Plano 01 fase-03 (gold standard inline); Plano 02 (replicar) |
| DT-4 — Pedagogia ADR é ADIÇÃO, não substituição | Plano 04 fase-01 (seção antes do CRUD existente) |
| DT-5 — Cross-model documentado, não implementado | Plano 03 fase-02 (DDD docs) |
| DT-6 — Conventional commits via skill + hook opcional documentado | Plano 03 fase-03 (skill educativa, sem hook bloqueante) |
| DT-7 — `positive_observations` obrigatório mesmo em `clean` | Plano 01 fase-04 (validação regex); Planos 02 + replicar |

---

<!-- Gerado por /plan-feature em 2026-05-22 -->
